/*!
 * Visitor Tracker - tracker.js (MVP)
 * Lightweight, asynchronous, dependency-free tracking script.
 * Embed with:
 *   <script src="https://your-domain.com/tracker.js" data-site-id="SITE_ID" async></script>
 *
 * Mark sections to track with:
 *   <div data-lp-section="hero">...</div>
 *
 * Design goals:
 *  - Never throw / never block page rendering.
 *  - No external dependencies, no synchronous XHR.
 *  - Batches events and flushes on an interval + on page hide/unload.
 *  - No PII collected: only device/browser/screen metadata and
 *    randomly-generated visitor/session ids stored in localStorage.
 */
(function () {
  'use strict';

  // Run everything inside a try/catch shell - a tracking bug must never
  // break the host page.
  try {
    var CURRENT_SCRIPT = document.currentScript;
    if (!CURRENT_SCRIPT) return;

    var SITE_ID = CURRENT_SCRIPT.getAttribute('data-site-id');
    if (!SITE_ID) {
      console.warn('[tracker.js] Missing data-site-id attribute, tracking disabled.');
      return;
    }

    // Derive API base from the script's own src so this file works
    // regardless of which domain it's hosted/served from.
    var API_BASE = (function () {
      try {
        var src = CURRENT_SCRIPT.src;
        var u = new URL(src);
        return u.origin;
      } catch (e) {
        return '';
      }
    })();

    var TRACK_ENDPOINT = API_BASE + '/api/track';

    var FLUSH_INTERVAL_MS = 5000; // batch flush interval
    var MAX_BATCH_SIZE = 20; // flush early if queue gets this big
    var HEARTBEAT_INTERVAL_MS = 15000; // "last active" ping
    var SECTION_VISIBLE_THRESHOLD = 0.5; // 50% of section in viewport counts as "seen"
    var VISITOR_STORAGE_KEY = 'lp_visitor_id';
    var SESSION_STORAGE_KEY = 'lp_session_id';
    var SESSION_STARTED_KEY = 'lp_session_started_at';
    var SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min -> new session

    // ---------------------------------------------------------------
    // Utilities
    // ---------------------------------------------------------------
    function uuidv4() {
      if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
      }
      // Fallback UUIDv4 generator (RFC4122-ish, good enough for an id)
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    function safeGet(storage, key) {
      try {
        return storage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    function safeSet(storage, key, value) {
      try {
        storage.setItem(key, value);
      } catch (e) {
        /* storage may be disabled (private mode, etc.) - fail silently */
      }
    }

    function nowIso() {
      return new Date().toISOString();
    }

    // ---------------------------------------------------------------
    // Visitor identity (persistent, no PII - random UUID only)
    // ---------------------------------------------------------------
    var visitorId = safeGet(window.localStorage, VISITOR_STORAGE_KEY);
    if (!visitorId) {
      visitorId = uuidv4();
      safeSet(window.localStorage, VISITOR_STORAGE_KEY, visitorId);
    }

    // ---------------------------------------------------------------
    // Session identity - reuse sessionStorage session unless idle too long
    // ---------------------------------------------------------------
    var sessionId = safeGet(window.sessionStorage, SESSION_STORAGE_KEY);
    var sessionStartedAt = safeGet(window.sessionStorage, SESSION_STARTED_KEY);
    var lastActiveAtStored = Number(safeGet(window.localStorage, 'lp_last_active_' + SITE_ID)) || 0;

    var isNewSession = false;
    if (!sessionId || !sessionStartedAt || Date.now() - lastActiveAtStored > SESSION_IDLE_TIMEOUT_MS) {
      sessionId = uuidv4();
      sessionStartedAt = nowIso();
      isNewSession = true;
      safeSet(window.sessionStorage, SESSION_STORAGE_KEY, sessionId);
      safeSet(window.sessionStorage, SESSION_STARTED_KEY, sessionStartedAt);
    }

    var sessionStartTimeMs = Date.parse(sessionStartedAt) || Date.now();
    // Track whether the current session has already been ended (to prevent
    // double session_end events from visibilitychange + pagehide firing together).
    var sessionEnded = false;

    // ---------------------------------------------------------------
    // Device / OS / Browser detection (lightweight UA parsing)
    // ---------------------------------------------------------------
    function detectDevice(ua) {
      var isTablet = /iPad|Android(?!.*Mobile)|Tablet|Kindle|PlayBook/i.test(ua);
      var isMobile = !isTablet && /Mobi|Android|iPhone|iPod|Windows Phone|BlackBerry/i.test(ua);
      if (isTablet) return 'tablet';
      if (isMobile) return 'mobile';
      return 'desktop';
    }

    function detectOS(ua) {
      if (/Windows NT/i.test(ua)) return 'Windows';
      if (/Mac OS X/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return 'macOS';
      if (/Android/i.test(ua)) return 'Android';
      if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
      if (/Linux/i.test(ua)) return 'Linux';
      return 'Unknown';
    }

    function detectBrowser(ua) {
      if (/Edg\//i.test(ua)) return 'Edge';
      if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
      if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
      if (/CriOS\//i.test(ua)) return 'Chrome (iOS)';
      if (/Firefox\//i.test(ua)) return 'Firefox';
      if (/Safari\//i.test(ua) && /Version\//i.test(ua)) return 'Safari';
      return 'Unknown';
    }

    var ua = navigator.userAgent || '';
    var deviceInfo = {
      device_type: detectDevice(ua),
      os: detectOS(ua),
      browser: detectBrowser(ua),
      screen_width: (window.screen && window.screen.width) || 0,
      screen_height: (window.screen && window.screen.height) || 0,
    };

    // ---------------------------------------------------------------
    // Event queue + batched sending
    // ---------------------------------------------------------------
    var queue = [];
    var flushTimer = null;

    function buildPayload(events) {
      return {
        site_id: SITE_ID,
        visitor_id: visitorId,
        device: deviceInfo,
        session: {
          id: sessionId,
          page_url: window.location.href,
          referrer: document.referrer || '',
          started_at: sessionStartedAt,
        },
        events: events,
      };
    }

    function send(events, useBeacon) {
      if (!events.length) return;
      var payload = JSON.stringify(buildPayload(events));

      if (useBeacon && navigator.sendBeacon) {
        try {
          var blob = new Blob([payload], { type: 'application/json' });
          var ok = navigator.sendBeacon(TRACK_ENDPOINT, blob);
          if (ok) return;
        } catch (e) {
          /* fall through to fetch */
        }
      }

      try {
        fetch(TRACK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true, // lets the request survive page unload
        }).catch(function () {
          /* network errors are silently dropped - tracking is best-effort */
        });
      } catch (e) {
        /* ignore */
      }
    }

    function flush(useBeacon) {
      if (queue.length === 0) return;
      var events = queue;
      queue = [];
      send(events, !!useBeacon);
    }

    function enqueue(event) {
      queue.push(event);
      if (queue.length >= MAX_BATCH_SIZE) {
        flush(false);
      }
    }

    flushTimer = setInterval(function () {
      flush(false);
    }, FLUSH_INTERVAL_MS);

    // ---------------------------------------------------------------
    // Heartbeat - keeps "last active" fresh without waiting for unload
    // ---------------------------------------------------------------
    setInterval(function () {
      safeSet(window.localStorage, 'lp_last_active_' + SITE_ID, String(Date.now()));
      if (document.visibilityState === 'visible' && !sessionEnded) {
        enqueue({ type: 'heartbeat', last_active_at: nowIso() });
      }
    }, HEARTBEAT_INTERVAL_MS);

    // ---------------------------------------------------------------
    // Section tracking via IntersectionObserver
    // ---------------------------------------------------------------
    var sectionEnterTimes = Object.create(null); // section_id -> timestamp ms

    function handleIntersection(entries) {
      entries.forEach(function (entry) {
        var sectionId = entry.target.getAttribute('data-lp-section');
        if (!sectionId) return;

        if (entry.isIntersecting) {
          if (!sectionEnterTimes[sectionId]) {
            sectionEnterTimes[sectionId] = Date.now();
          }
        } else if (sectionEnterTimes[sectionId]) {
          var enteredAtMs = sectionEnterTimes[sectionId];
          var leftAtMs = Date.now();
          delete sectionEnterTimes[sectionId];

          enqueue({
            type: 'section_view',
            section_id: sectionId,
            entered_at: new Date(enteredAtMs).toISOString(),
            left_at: new Date(leftAtMs).toISOString(),
            duration_seconds: Math.round(((leftAtMs - enteredAtMs) / 1000) * 10) / 10,
          });
        }
      });
    }

    function observeSections() {
      if (!('IntersectionObserver' in window)) return;

      var observer = new IntersectionObserver(handleIntersection, {
        threshold: SECTION_VISIBLE_THRESHOLD,
      });

      var elements = document.querySelectorAll('[data-lp-section]');
      elements.forEach(function (el) {
        observer.observe(el);
      });

      // Flush any sections still "open" (visible) when the session ends.
      window.__lpFlushOpenSections = function () {
        var now = Date.now();
        Object.keys(sectionEnterTimes).forEach(function (sectionId) {
          var enteredAtMs = sectionEnterTimes[sectionId];
          enqueue({
            type: 'section_view',
            section_id: sectionId,
            entered_at: new Date(enteredAtMs).toISOString(),
            left_at: new Date(now).toISOString(),
            duration_seconds: Math.round(((now - enteredAtMs) / 1000) * 10) / 10,
          });
        });
        sectionEnterTimes = Object.create(null);
      };
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeSections);
    } else {
      observeSections();
    }

    // ---------------------------------------------------------------
    // Button click tracking
    // ---------------------------------------------------------------
    document.addEventListener('click', function (e) {
      var target = e.target.closest('[data-lp-button]');
      if (!target) return;

      var buttonId = target.getAttribute('data-lp-button');
      if (!buttonId) return;

      console.log('[tracker.js] Button click detected:', buttonId);

      var clickEvent = {
        type: 'button_click',
        button_id: buttonId,
        clicked_at: nowIso()
      };

      // Check if the clicked element is an anchor tag navigating away in the same tab
      var isAnchor = target.tagName.toLowerCase() === 'a' && target.href;
      var targetAttr = isAnchor ? target.getAttribute('target') : null;
      var isNewTab = targetAttr && targetAttr.toLowerCase() === '_blank';
      var isHashLink = isAnchor && target.getAttribute('href').startsWith('#');
      var willNavigate = isAnchor && !isNewTab && !isHashLink;

      if (willNavigate) {
        // For links that navigate in the same tab, we must send the data
        // BEFORE the browser leaves the page.
        e.preventDefault();
        var href = target.href;

        // Add the click event to the queue then flush everything
        enqueue(clickEvent);
        flush(true);

        console.log('[tracker.js] Data flushed, navigating to:', href);

        // Also fire a direct fetch as backup (keepalive survives page unload)
        try {
          var directPayload = JSON.stringify(buildPayload([clickEvent]));
          fetch(TRACK_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: directPayload,
            keepalive: true
          }).catch(function() {});
        } catch(ex) {}

        // Navigate after a short delay to let the requests complete
        setTimeout(function() {
          window.location.href = href;
        }, 350);
      } else {
        // For buttons, new-tab links, or hash links — just enqueue normally
        enqueue(clickEvent);
        console.log('[tracker.js] Click event enqueued for:', buttonId);
      }
    });

    // ---------------------------------------------------------------
    // Heatmap click tracking (Fase 4)
    // ---------------------------------------------------------------
    document.addEventListener('click', function (e) {
      // Don't track if they clicked the exact same button that has [data-lp-button] 
      // because that's already tracked (optional, but good for avoiding duplicate data).
      // Actually, heatmap tracks ALL clicks to see dead clicks too.
      // But we will send it as a separate lightweight event.
      var x = e.pageX;
      var y = e.pageY;
      var w = window.innerWidth || document.documentElement.clientWidth;
      
      var clickEvent = {
        type: 'heatmap_click',
        x: x,
        y: y,
        w: w,
        url: window.location.pathname + window.location.search,
        clicked_at: nowIso()
      };
      
      enqueue(clickEvent);
    });

    // ---------------------------------------------------------------
    // Session end + final flush on page hide / unload / tab switch
    // ---------------------------------------------------------------
    function endSessionAndFlush() {
      if (sessionEnded) return; // prevent double-firing
      sessionEnded = true;

      if (typeof window.__lpFlushOpenSections === 'function') {
        window.__lpFlushOpenSections();
      }
      var durationSeconds = Math.round(((Date.now() - sessionStartTimeMs) / 1000) * 10) / 10;
      enqueue({ type: 'session_end', ended_at: nowIso(), duration_seconds: durationSeconds });
      flush(true); // use sendBeacon - the page may be going away
    }

    function startNewSession() {
      sessionId = uuidv4();
      sessionStartedAt = nowIso();
      sessionStartTimeMs = Date.now();
      sessionEnded = false;
      isNewSession = true;
      safeSet(window.sessionStorage, SESSION_STORAGE_KEY, sessionId);
      safeSet(window.sessionStorage, SESSION_STARTED_KEY, sessionStartedAt);

      // Update the exposed debug info
      if (window.__lpTracker) {
        window.__lpTracker.sessionId = sessionId;
        window.__lpTracker.isNewSession = true;
      }

      // Fire initial heartbeat so the new session appears in dashboard
      enqueue({ type: 'heartbeat', last_active_at: nowIso() });

      // Re-mark currently visible sections as freshly entered
      var now = Date.now();
      var elements = document.querySelectorAll('[data-lp-section]');
      elements.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        var visibleRatio = 0;
        if (rect.height > 0) {
          var visibleTop = Math.max(0, rect.top);
          var visibleBottom = Math.min(viewportHeight, rect.bottom);
          visibleRatio = Math.max(0, visibleBottom - visibleTop) / rect.height;
        }
        if (visibleRatio >= SECTION_VISIBLE_THRESHOLD) {
          var sectionId = el.getAttribute('data-lp-section');
          if (sectionId) {
            sectionEnterTimes[sectionId] = now;
          }
        }
      });
    }

    // 'pagehide' fires reliably on both desktop & mobile (incl. bfcache),
    // unlike 'beforeunload' which is inconsistent on mobile browsers.
    window.addEventListener('pagehide', endSessionAndFlush);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        // Tab switched away or minimized → treat as session end
        endSessionAndFlush();
      } else {
        // Tab came back → start a fresh session
        startNewSession();
      }
    });

    // Fire an initial "page view" style event immediately so a session
    // shows up in the dashboard even for very short visits.
    enqueue({ type: 'heartbeat', last_active_at: nowIso() });

    // Expose minimal debug info (no PII) for tenant troubleshooting.
    window.__lpTracker = { siteId: SITE_ID, visitorId: visitorId, sessionId: sessionId, isNewSession: isNewSession };
  } catch (e) {
    // Never let tracking errors surface to the host page.
    try {
      console.warn('[tracker.js] disabled due to error:', e);
    } catch (_) {}
  }
})();
