import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUuid, siteExists } from '@/lib/validateSite';

export const runtime = 'nodejs';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-site-id',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET handler to allow easy ping / health check verification from webhook tools
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('site_id') || searchParams.get('siteId');

  if (siteId && !isValidUuid(siteId)) {
    return NextResponse.json(
      { status: false, error: 'Invalid site_id format' },
      { status: 400, headers: corsHeaders() }
    );
  }

  return NextResponse.json(
    {
      status: true,
      message: 'Fonnte webhook endpoint is active and listening',
      site_id: siteId || null,
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: corsHeaders() }
  );
}

/**
 * Normalizes incoming phone numbers:
 * - Strips WhatsApp suffix (@s.whatsapp.net, @c.us, @g.us)
 * - Removes non-digit characters (except leading +)
 * - Converts Indonesian 08xxx to 628xxx for standard international consistency
 */
function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  // Remove WhatsApp JID domain
  let clean = raw.split('@')[0].trim();
  // Remove non-digit characters
  clean = clean.replace(/[^0-9]/g, '');

  if (clean.startsWith('08')) {
    clean = '628' + clean.slice(2);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 1. Identify site_id from query params, header, or body
  let siteId = searchParams.get('site_id') || searchParams.get('siteId') || req.headers.get('x-site-id');

  // 2. Parse payload safely (JSON or form-data / urlencoded)
  let body: Record<string, any> = {};
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      // Fallback: try reading as text/json
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        params.forEach((value, key) => {
          body[key] = value;
        });
      }
    }
  } catch (err) {
    console.error('[fonnte webhook] Failed to parse request body:', err);
    return NextResponse.json(
      { status: false, error: 'Malformed request payload' },
      { status: 400, headers: corsHeaders() }
    );
  }

  // Fallback siteId from body if not in query
  if (!siteId && (body.site_id || body.siteId)) {
    siteId = String(body.site_id || body.siteId);
  }

  // 3. Validate site_id
  if (!siteId || !isValidUuid(siteId)) {
    return NextResponse.json(
      {
        status: false,
        error: 'Missing or invalid site_id. Please specify ?site_id=<UUID> in the webhook URL.',
      },
      { status: 400, headers: corsHeaders() }
    );
  }

  const validSite = await siteExists(siteId);
  if (!validSite) {
    return NextResponse.json(
      { status: false, error: 'Tenant site not found' },
      { status: 404, headers: corsHeaders() }
    );
  }

  // 4. Extract parameters according to Fonnte webhook specifications
  // Fonnte sends: sender (chat sender phone), message (content), name (contact name), device (connected device)
  const rawSender = String(body.sender || body.from || body.phone || '');
  const message = String(body.message || body.text || '').trim();
  const senderName = body.name ? String(body.name).trim() : null;
  const deviceNumber = body.device ? String(body.device).trim() : null;
  const customEvent = body.event_name ? String(body.event_name).trim() : null;

  const cleanPhone = normalizePhoneNumber(rawSender);

  // If no sender number is provided, we cannot track this event
  if (!cleanPhone) {
    return NextResponse.json(
      {
        status: false,
        error: 'Missing or invalid sender phone number in webhook payload',
      },
      { status: 400, headers: corsHeaders() }
    );
  }

  // 5. Determine event name
  // Default is 'whatsapp_chat', but can be categorized if needed
  let eventName = customEvent || 'whatsapp_chat';
  if (!customEvent && message) {
    const lower = message.toLowerCase();
    if (lower.startsWith('order') || lower.includes('pesan sekarang') || lower.includes('checkout')) {
      eventName = 'whatsapp_order_intent';
    } else if (lower.includes('tanya') || lower.includes('halo') || lower.includes('konsultasi')) {
      eventName = 'whatsapp_lead_inquiry';
    }
  }

  // 6. Check if phone number already exists for this site (only save new numbers)
  const supabase = getSupabaseAdmin();

  const phoneVariations = [cleanPhone];
  if (cleanPhone.startsWith('628')) {
    phoneVariations.push('08' + cleanPhone.slice(3));
    phoneVariations.push('+' + cleanPhone);
  } else if (cleanPhone.startsWith('08')) {
    phoneVariations.push('628' + cleanPhone.slice(2));
    phoneVariations.push('+628' + cleanPhone.slice(2));
  }
  if (rawSender && !phoneVariations.includes(rawSender)) {
    phoneVariations.push(rawSender);
  }

  const { data: existingEvent } = await supabase
    .from('track_events')
    .select('id, phone_number, sender_name, created_at')
    .eq('site_id', siteId)
    .in('phone_number', phoneVariations)
    .limit(1)
    .maybeSingle();

  if (existingEvent) {
    console.log(
      `[fonnte webhook] Nomor ${cleanPhone} sudah ada di site ${siteId} (ID: ${existingEvent.id}). Melewati penyimpanan data baru.`
    );
    return NextResponse.json(
      {
        status: true,
        message: 'Nomor WhatsApp sudah ada sebelumnya, tidak disimpan ulang (hanya simpan nomor baru)',
        skipped: true,
        phone_number: cleanPhone,
        existing_event_id: existingEvent.id,
      },
      { status: 200, headers: corsHeaders() }
    );
  }

  // 7. Persist to track_events table via Supabase Admin (bypasses RLS)
  const nowIso = new Date().toISOString();

  const eventPayload = {
    site_id: siteId,
    phone_number: cleanPhone,
    sender_name: senderName,
    event_name: eventName,
    message: message || null,
    device_number: deviceNumber,
    status: 'received',
    metadata: {
      raw_sender: rawSender,
      fonnte_id: body.id || body.inboxid || null,
      location: body.location || null,
      attachment: body.url
        ? {
            url: body.url,
            filename: body.filename || null,
            extension: body.extension || null,
          }
        : null,
      pollname: body.pollname || null,
      choices: body.choices || null,
      member: body.member || null,
    },
    created_at: body.timestamp
      ? new Date(
          typeof body.timestamp === 'number' && body.timestamp < 1e11
            ? body.timestamp * 1000
            : body.timestamp
        ).toISOString()
      : nowIso,
  };

  const { data, error } = await supabase
    .from('track_events')
    .insert([eventPayload])
    .select('id, phone_number, event_name, created_at')
    .single();

  if (error) {
    console.error('[fonnte webhook] Database insert failed:', error);
    return NextResponse.json(
      { status: false, error: 'Database error saving track event' },
      { status: 500, headers: corsHeaders() }
    );
  }

  // 7. Return 200 OK required by Fonnte to confirm receipt
  return NextResponse.json(
    {
      status: true,
      message: 'WhatsApp chat event tracked successfully',
      event_id: data.id,
      phone_number: cleanPhone,
      event_name: eventName,
    },
    { status: 200, headers: corsHeaders() }
  );
}
