# Visitor Tracker SaaS (MVP)

Multi-tenant landing-page analytics. Tenants generate a `site_id`, drop a
`<script>` tag + `data-lp-section` markers on any landing page (Scalev,
Mayar, WordPress, plain HTML), and see visitor/device/section analytics
in a dashboard.

## Stack

- **Next.js 14** (App Router, TypeScript) — dashboard, auth pages, API routes
- **Supabase** — Postgres (data), Auth (tenant login), Row Level Security (tenant isolation)
- **Vanilla JS `tracker.js`** — zero-dependency, async, IntersectionObserver-based
- **Upstash Redis (optional)** — production-grade rate limiting; falls back to in-memory

## Project layout

```
public/
  tracker.js          # the tracking script served to tenants
  demo.html           # a plain-HTML page you can open to test tracker.js locally
supabase/
  schema.sql          # run this in the Supabase SQL editor
src/
  app/
    page.tsx                       # marketing home
    login/page.tsx                 # Supabase auth (sign up / log in)
    dashboard/page.tsx             # list of tenant's sites
    dashboard/[siteId]/page.tsx    # analytics dashboard for one site
    sites/new/page.tsx             # create a site -> generates site_id + snippet
    api/
      track/route.ts               # POST ingestion endpoint (called by tracker.js)
      sites/route.ts               # GET/POST sites (create + list)
      sites/[siteId]/route.ts      # GET/DELETE a single site
      dashboard/[siteId]/summary/route.ts   # aggregate stats (JSON API)
      dashboard/[siteId]/sections/route.ts  # section journey stats (JSON API)
  lib/
    supabaseAdmin.ts    # service-role client (server-only, bypasses RLS)
    supabaseServer.ts   # cookie-bound client (respects RLS) for dashboard
    supabaseBrowser.ts  # browser client for login/signup
    rateLimit.ts         # Upstash Redis or in-memory rate limiter
    validateSite.ts       # UUID validation + site_id existence check (with cache)
  middleware.ts          # protects /dashboard and /sites, refreshes auth session
```

## 1. Set up Supabase

1. Create a project at https://supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`. This creates:
   - `sites`, `visitors`, `sessions`, `section_views` tables
   - a `section_stats` view used for the section-journey dashboard
   - Row Level Security policies so a tenant can only ever read their own
     data (`owner_id = auth.uid()`)
3. In Supabase Auth settings, enable Email/Password sign-in (default is fine
   for MVP — email confirmation can be turned off for faster local testing).
4. Copy your Project URL, `anon` key, and `service_role` key.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase settings
- `SUPABASE_SERVICE_ROLE_KEY` — **never** expose this to the browser; it's only
  used inside API routes (`/api/track`, dashboard aggregation)
- `NEXT_PUBLIC_APP_URL` — the URL this app will be hosted at (used to build the
  `<script src>` shown to tenants)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional; if omitted,
  rate limiting falls back to an in-memory limiter (fine for MVP/single instance)

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, create a site, and copy the generated
snippet. To test the tracker end-to-end without deploying anywhere:

1. Open `public/demo.html` in your editor, replace `YOUR_SITE_ID` with the
   `site_id` you just created, and note the script points at `/tracker.js`
   (relative), so serve it from the same Next.js app — e.g. visit
   `http://localhost:3000/demo.html`.
2. Scroll through the sections; open the Network tab and watch batched
   `POST /api/track` requests fire every ~5s and on tab close.
3. Go back to `/dashboard/[siteId]` and refresh — you should see visitor
   count, device breakdown, and section journey update.

## How the pieces fit together

### `site_id` generation & tenant isolation
- `site_id` **is** the `sites.id` UUID column (`gen_random_uuid()` default),
  created via `POST /api/sites` while the tenant is authenticated.
- Every ingestion request is checked against `siteExists()` before any write
  happens — unknown `site_id`s are rejected with `404` and never touch the
  visitor/session/section tables.
- Dashboard reads go through the cookie-bound Supabase client
  (`supabaseServer.ts`), which respects Row Level Security — a tenant
  physically cannot query another tenant's rows, even if they guessed a
  `site_id`.
- Ingestion writes use the service-role client (`supabaseAdmin.ts`), which
  bypasses RLS by design (tracker.js is unauthenticated), but every write is
  explicitly scoped with `site_id` and re-validated against a real site.

### tracker.js: async, non-blocking, batched
- Wrapped in a single IIFE + try/catch — it can never throw an error onto
  the host page, and it does no synchronous work that could block rendering.
- Load it with `async` (or `defer`); it waits for `DOMContentLoaded` itself
  if the DOM isn't ready yet before attaching `IntersectionObserver`s.
- Visitor id → `localStorage` (persistent across sessions). Session id →
  `sessionStorage`, rotated after 30 minutes of inactivity.
- Device/OS/browser detected from `navigator.userAgent` with lightweight
  regex — no external UA-parsing library, keeping the script tiny.
- Section visibility uses a single shared `IntersectionObserver` (threshold
  0.5) across all `[data-lp-section]` elements — cheap even with many sections.
- Events are pushed into an in-memory queue and flushed:
  - every 5 seconds (interval timer), or
  - immediately if the queue hits 20 events, or
  - on `visibilitychange` → `hidden` and on `pagehide` (via `navigator.sendBeacon`,
    which is designed to survive page unload — far more reliable than
    `beforeunload` + `fetch`, especially on mobile Safari/Chrome).
- This means a page with 5 tracked sections generates roughly one HTTP
  request every few seconds, not one request per scroll/section — satisfying
  the "batch events, minimize requests" requirement.

### No sensitive data
- Only `visitor_id` (random UUID), device type/OS/browser string, screen
  dimensions, page URL, referrer, and section timing are stored.
- No IP address is persisted to the database (only used transiently, in
  memory, for rate-limit keys).
- No cookies with third-party tracking implications — `localStorage`/`sessionStorage`
  scoped to the tenant's own domain where the script runs.

### Rate limiting & abuse protection
- `checkRateLimit(site_id:ip)` in `src/lib/rateLimit.ts` — configurable via
  `TRACK_RATE_LIMIT_MAX` / `TRACK_RATE_LIMIT_WINDOW_SECONDS`.
- Uses Upstash Redis (`INCR` + `EXPIRE`) when configured — correct across
  multiple serverless instances. Falls back to an in-memory `Map` otherwise.
- CORS on `/api/track` and `/tracker.js` is intentionally open
  (`Access-Control-Allow-Origin: *`) because the script is embedded on
  arbitrary third-party domains you don't control (that's the whole point of
  the product) — the security boundary here is `site_id` validation +
  rate limiting, not CORS.

## What's intentionally out of scope for this MVP

Per the spec: no heatmaps, no session recording, no Meta Ads integration, no
AI features. The schema and API are structured so those can be added later
without breaking existing tenants (e.g. a `page_events` table for
click/scroll heatmaps could reuse the same `session_id`/`site_id` foreign keys).

## Deployment notes

- Any Node.js host that supports Next.js API routes works (Vercel is the
  path of least resistance given the App Router + Supabase SSR helpers used
  here).
- Point tenants at `https://<your-domain>/tracker.js` — CORS headers for
  that path are already configured in `next.config.js`.
- For real production traffic, set up Upstash Redis for rate limiting —
  the in-memory fallback resets on every deploy/cold start and doesn't
  share state across instances.
