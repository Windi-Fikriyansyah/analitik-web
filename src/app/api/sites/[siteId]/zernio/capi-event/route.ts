import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUuid } from '@/lib/validateSite';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

function hashSHA256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(raw: string): string {
  let clean = raw.replace(/[^0-9]/g, '');
  if (clean.startsWith('08')) clean = '628' + clean.slice(2);
  else if (clean.startsWith('8')) clean = '62' + clean;
  return clean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const { siteId } = params;
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ status: false, error: 'Invalid site ID' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, owner_id, zernio_api_key, meta_connected_account')
    .eq('id', siteId)
    .maybeSingle();

  if (siteError) {
    return NextResponse.json({ status: false, error: siteError.message }, { status: 500 });
  }
  if (!site) {
    return NextResponse.json({ status: false, error: 'Site tidak ditemukan' }, { status: 404 });
  }
  if (site.owner_id !== user.id) {
    return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 403 });
  }

  const apiKey = (site.zernio_api_key || '').trim();
  const connectedAccount = site.meta_connected_account as Record<string, any> | null;
  const selectedPixel = connectedAccount?.selectedPixel;

  if (!apiKey || !selectedPixel?.id) {
    return NextResponse.json(
      { status: false, error: 'Pixel Meta Ads belum dipilih atau Zernio API Key belum diatur.' },
      { status: 400 }
    );
  }

  let body: {
    eventId?: string;
    eventName?: string;
    phoneNumber?: string;
    email?: string;
    eventData?: Record<string, any>;
    items?: Array<{
      eventId?: string;
      phoneNumber?: string;
      email?: string;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = body.eventName || 'Lead';
  const isPurchase = eventName.toLowerCase() === 'purchase';
  const rawVal = body.eventData?.value;
  const hasNumericValue =
    rawVal !== undefined &&
    rawVal !== null &&
    rawVal !== '' &&
    !isNaN(Number(rawVal));

  const rawItems: Array<{ eventId?: string; phoneNumber?: string; email?: string }> =
    Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : [{ eventId: body.eventId, phoneNumber: body.phoneNumber, email: body.email }];

  // Resolve the Meta Ads account ID for Zernio
  const rawProfileId = connectedAccount?.profileId;
  const profileId =
    typeof rawProfileId === 'object' && rawProfileId !== null
      ? rawProfileId._id || rawProfileId.id || ''
      : String(rawProfileId || '');

  // Find metaads or facebook account ID
  let accountId = connectedAccount?.id || '';
  try {
    let accountsUrl = 'https://zernio.com/api/v1/accounts';
    if (profileId) accountsUrl += `?profileId=${encodeURIComponent(profileId)}`;

    const accsRes = await fetch(accountsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (accsRes.ok) {
      const accsData = await accsRes.json();
      const accounts: any[] = Array.isArray(accsData.accounts) ? accsData.accounts : [];
      const metaAdsAcc = accounts.find((a) => a.platform === 'metaads');
      const fbAcc = accounts.find((a) => a.platform === 'facebook');
      if (metaAdsAcc) accountId = metaAdsAcc._id || metaAdsAcc.id;
      else if (fbAcc && !accountId) accountId = fbAcc._id || fbAcc.id;
    }
  } catch (err) {
    console.warn('[zernio/capi-event] Could not fetch accounts:', err);
  }

  if (!accountId) {
    return NextResponse.json(
      { status: false, error: 'Tidak ditemukan akun Meta Ads yang terhubung.' },
      { status: 400 }
    );
  }

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const conversionEvents: any[] = [];
    const eventIdsToUpdate: string[] = [];

    for (const item of rawItems) {
      const phoneNumber = item.phoneNumber || '';
      const email = (item.email || '').trim().toLowerCase();
      const normalizedPhone = phoneNumber && phoneNumber !== '-' ? normalizePhone(phoneNumber) : '';

      if (!normalizedPhone && !email) continue;

      const userPayload: Record<string, any> = {};
      if (normalizedPhone && normalizedPhone.length >= 8) {
        userPayload.phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
      }
      if (email && email.includes('@')) {
        userPayload.email = email;
      }

      const evtId = item.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      if (item.eventId) {
        eventIdsToUpdate.push(item.eventId);
      }

      const conv: Record<string, any> = {
        eventName,
        eventTime: nowSec,
        eventId: evtId,
        user: userPayload,
      };

      if (hasNumericValue) {
        conv.value = Number(rawVal);
        conv.currency = String(body.eventData?.currency || 'IDR').toUpperCase();
      } else if (isPurchase) {
        conv.value = 0;
        conv.currency = String(body.eventData?.currency || 'IDR').toUpperCase();
      } else if (body.eventData?.currency) {
        conv.currency = String(body.eventData.currency).toUpperCase();
      }

      conversionEvents.push(conv);
    }

    if (conversionEvents.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Tidak ada data nomor WhatsApp atau email valid untuk dikirim ke CAPI' },
        { status: 400 }
      );
    }

    // Official Zernio OpenAPI schema: required [accountId, destinationId, events]
    const capiPayload = {
      accountId,
      destinationId: String(selectedPixel.id),
      events: conversionEvents,
    };

    console.log(`[zernio/capi-event] Sending ${conversionEvents.length} events to Zernio`);

    const capiRes = await fetch('https://zernio.com/api/v1/ads/conversions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(capiPayload),
      cache: 'no-store',
    });

    const capiData = await capiRes.json();
    console.log('[zernio/capi-event] Response from Zernio:', capiRes.status, capiData);

    if (!capiRes.ok) {
      return NextResponse.json(
        {
          status: false,
          error:
            capiData?.error ||
            capiData?.message ||
            `Gagal mengirim CAPI event (HTTP ${capiRes.status})`,
          details: capiData,
        },
        { status: capiRes.status }
      );
    }

    if (
      capiData.eventsFailed > 0 &&
      Array.isArray(capiData.failures) &&
      capiData.failures.length > 0
    ) {
      const failMsg = capiData.failures[0]?.message || 'Event rejected by platform';
      return NextResponse.json(
        {
          status: false,
          error: `Gagal mengirim CAPI event: ${failMsg}`,
          details: capiData,
        },
        { status: 400 }
      );
    }

    if (eventIdsToUpdate.length > 0) {
      try {
        const admin = getSupabaseAdmin();
        const now = new Date();
        const nowIso = now.toISOString();
        const nowWib = now.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB';

        const finalValue = hasNumericValue ? Number(rawVal) : isPurchase ? 0 : undefined;
        const CHUNK_SIZE = 100;

        for (let i = 0; i < eventIdsToUpdate.length; i += CHUNK_SIZE) {
          const chunkIds = eventIdsToUpdate.slice(i, i + CHUNK_SIZE);
          const { data: chunkEvts, error: fetchErr } = await admin
            .from('track_events')
            .select('*')
            .eq('site_id', siteId)
            .in('id', chunkIds);

          if (fetchErr) {
            console.error('[zernio/capi-event] Error fetching chunk:', fetchErr);
            continue;
          }

          if (Array.isArray(chunkEvts) && chunkEvts.length > 0) {
            const rowsToUpsert = chunkEvts.map((evt) => ({
              ...evt,
              metadata: {
                ...(evt.metadata || {}),
                capi_sent: true,
                capi_sent_at: nowIso,
                capi_sent_at_wib: nowWib,
                capi_pixel_id: selectedPixel.id,
                capi_pixel_name: selectedPixel.name || selectedPixel.id,
                capi_event_name: eventName,
                ...(finalValue !== undefined ? { capi_value: finalValue } : {}),
              },
            }));

            const { error: upsertErr } = await admin
              .from('track_events')
              .upsert(rowsToUpsert, { onConflict: 'id' });

            if (upsertErr) {
              console.error('[zernio/capi-event] Error upserting chunk:', upsertErr);
            }
          }
        }
      } catch (err) {
        console.warn('[zernio/capi-event] Could not update event metadata:', err);
      }
    }

    return NextResponse.json({
      status: true,
      message: conversionEvents.length === 1
        ? `Event "${eventName}" berhasil dikirim ke Pixel ${selectedPixel.name || selectedPixel.id}`
        : `Berhasil mengirim ${conversionEvents.length} event "${eventName}" sekaligus ke Pixel ${selectedPixel.name || selectedPixel.id}`,
      count: conversionEvents.length,
      data: capiData,
    });
  } catch (err: any) {
    console.error('[zernio/capi-event] Error:', err);
    return NextResponse.json(
      { status: false, error: `Gagal mengirim CAPI event: ${err.message}` },
      { status: 500 }
    );
  }
}
