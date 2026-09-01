import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';
import { isValidUuid, siteExists } from '@/lib/validateSite';

export const runtime = 'nodejs';

// ---- Payload shape sent by tracker.js ----------------------------------
type DeviceInfo = {
  device_type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screen_width: number;
  screen_height: number;
};

type SessionInfo = {
  id: string;
  page_url: string;
  referrer: string;
  started_at: string; // ISO
};

type TrackEvent =
  | {
      type: 'section_view';
      section_id: string;
      entered_at: string;
      left_at: string;
      duration_seconds: number;
    }
  | { type: 'heartbeat'; last_active_at: string }
  | { type: 'session_end'; ended_at: string; duration_seconds: number }
  | { type: 'button_click'; button_id: string; clicked_at: string };

type TrackPayload = {
  site_id: string;
  visitor_id: string;
  device: DeviceInfo;
  session: SessionInfo;
  events: TrackEvent[];
};

const ALLOWED_DEVICE_TYPES = new Set(['mobile', 'tablet', 'desktop']);
const MAX_EVENTS_PER_BATCH = 100;

function corsHeaders(req?: NextRequest) {
  const origin = req?.headers.get('origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin === '*' ? '*' : origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function badRequest(req: NextRequest, message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  let payload: TrackPayload;
  try {
    payload = await req.json();
  } catch {
    return badRequest(req, 'Invalid JSON body');
  }

  const { site_id, visitor_id, device, session, events } = payload ?? {};

  // ---- 1. Structural validation --------------------------------------
  if (!isValidUuid(site_id)) return badRequest(req, 'Invalid or missing site_id');
  if (!isValidUuid(visitor_id)) return badRequest(req, 'Invalid or missing visitor_id');
  if (!session || !isValidUuid(session.id)) return badRequest(req, 'Invalid or missing session.id');
  if (!device || !ALLOWED_DEVICE_TYPES.has(device.device_type)) {
    return badRequest(req, 'Invalid or missing device.device_type');
  }
  if (!Array.isArray(events) || events.length === 0) {
    return badRequest(req, 'events must be a non-empty array');
  }
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return badRequest(req, `Too many events in one batch (max ${MAX_EVENTS_PER_BATCH})`);
  }

  // ---- 2. Tenant isolation: site_id must exist ------------------------
  const validSite = await siteExists(site_id);
  if (!validSite) {
    return NextResponse.json({ error: 'Unknown site_id' }, { status: 404, headers: corsHeaders(req) });
  }

  // ---- 3. Rate limiting (per tenant + per client IP) ------------------
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`${site_id}:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: corsHeaders(req) }
    );
  }

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // ---- 4. Upsert visitor (device info rarely changes after first seen,
  //         but we keep last_seen fresh) --------------------------------
  const { error: visitorError } = await supabase.from('visitors').upsert(
    {
      id: visitor_id,
      site_id,
      device_type: device.device_type,
      os: device.os?.slice(0, 100) ?? null,
      browser: device.browser?.slice(0, 100) ?? null,
      screen_width: Number.isFinite(device.screen_width) ? device.screen_width : null,
      screen_height: Number.isFinite(device.screen_height) ? device.screen_height : null,
      last_seen: nowIso,
    },
    { onConflict: 'id', ignoreDuplicates: false }
  );
  if (visitorError) {
    console.error('visitor upsert failed', visitorError);
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders(req) });
  }

  // ---- 5. Upsert session (created on first batch, updated afterwards) --
  const { error: sessionError } = await supabase.from('sessions').upsert(
    {
      id: session.id,
      site_id,
      visitor_id,
      page_url: session.page_url?.slice(0, 2048) ?? null,
      referrer: session.referrer?.slice(0, 2048) ?? null,
      started_at: session.started_at ?? nowIso,
      last_active_at: nowIso,
    },
    { onConflict: 'id', ignoreDuplicates: false }
  );
  if (sessionError) {
    console.error('session upsert failed', sessionError);
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders(req) });
  }

  // ---- 6. Process the batched events -----------------------------------
  const sectionViewRows: {
    site_id: string;
    session_id: string;
    visitor_id: string;
    section_id: string;
    entered_at: string;
    left_at: string;
    duration_seconds: number;
  }[] = [];

  const buttonClickRows: {
    site_id: string;
    session_id: string;
    visitor_id: string;
    button_id: string;
    clicked_at: string;
  }[] = [];

  let sessionUpdate: { last_active_at?: string; ended_at?: string; duration_seconds?: number } = {};

  for (const evt of events) {
    if (!evt || typeof evt !== 'object') continue;

    switch (evt.type) {
      case 'section_view': {
        if (
          typeof evt.section_id === 'string' &&
          evt.section_id.length <= 200 &&
          typeof evt.duration_seconds === 'number' &&
          evt.duration_seconds >= 0
        ) {
          sectionViewRows.push({
            site_id,
            session_id: session.id,
            visitor_id,
            section_id: evt.section_id,
            entered_at: evt.entered_at,
            left_at: evt.left_at,
            duration_seconds: evt.duration_seconds,
          });
        }
        break;
      }
      case 'heartbeat': {
        sessionUpdate.last_active_at = evt.last_active_at ?? nowIso;
        break;
      }
      case 'session_end': {
        sessionUpdate.ended_at = evt.ended_at ?? nowIso;
        sessionUpdate.duration_seconds = evt.duration_seconds;
        break;
      }
      case 'button_click': {
        if (typeof evt.button_id === 'string' && evt.button_id.length <= 100) {
          buttonClickRows.push({
            site_id,
            session_id: session.id,
            visitor_id,
            button_id: evt.button_id,
            clicked_at: evt.clicked_at ?? nowIso,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  if (sectionViewRows.length > 0) {
    const { error: sectionError } = await supabase.from('section_views').insert(sectionViewRows);
    if (sectionError) {
      console.error('section_views insert failed', sectionError);
      // Don't fail the whole request just because section rows failed -
      // session/visitor tracking is more important than losing this detail.
    }
  }

  if (buttonClickRows.length > 0) {
    const { error: buttonError } = await supabase.from('button_clicks').insert(buttonClickRows);
    if (buttonError) {
      console.error('button_clicks insert failed', buttonError);
    }
  }

  if (Object.keys(sessionUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from('sessions')
      .update(sessionUpdate)
      .eq('id', session.id)
      .eq('site_id', site_id); // extra tenant-isolation guard
    if (updateError) {
      console.error('session update failed', updateError);
    }
  }

  return NextResponse.json({ ok: true }, { status: 202, headers: corsHeaders(req) });
}
