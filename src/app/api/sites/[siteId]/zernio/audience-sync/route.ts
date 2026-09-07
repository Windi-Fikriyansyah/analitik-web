import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUuid } from '@/lib/validateSite';
export const dynamic = 'force-dynamic';

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

  if (!apiKey) {
    return NextResponse.json(
      { status: false, error: 'Zernio API Key belum diatur.' },
      { status: 400 }
    );
  }

  let body: {
    audienceId?: string;
    audienceName?: string;
    adAccountId?: string;
    phoneNumbers?: string[];
    users?: Array<{ phone?: string; email?: string }>;
    eventIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { audienceId, phoneNumbers, users, adAccountId } = body;

  if (!audienceId) {
    return NextResponse.json({ status: false, error: 'audienceId wajib diisi' }, { status: 400 });
  }

  const rawUsersList: Array<{ phone?: string; email?: string }> =
    Array.isArray(users) && users.length > 0
      ? users
      : Array.isArray(phoneNumbers)
      ? phoneNumbers.map((p) => ({ phone: p }))
      : [];

  if (rawUsersList.length === 0) {
    return NextResponse.json(
      { status: false, error: 'Daftar nomor WhatsApp atau email wajib diisi' },
      { status: 400 }
    );
  }

  // Resolve the Meta Ads account ID for Zernio
  const rawProfileId = connectedAccount?.profileId;
  const profileId =
    typeof rawProfileId === 'object' && rawProfileId !== null
      ? rawProfileId._id || rawProfileId.id || ''
      : String(rawProfileId || '');

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
    console.warn('[zernio/audience-sync] Could not fetch accounts:', err);
  }

  if (!accountId) {
    return NextResponse.json(
      { status: false, error: 'Tidak ditemukan akun Meta Ads yang terhubung.' },
      { status: 400 }
    );
  }

  let targetAdAccountId = adAccountId || connectedAccount?.selectedPixel?.ownerAdAccountId || '';
  if (!targetAdAccountId) {
    try {
      const adAccRes = await fetch(
        `https://zernio.com/api/v1/ads/accounts?accountId=${encodeURIComponent(accountId)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: 'no-store',
        }
      );
      if (adAccRes.ok) {
        const adAccData = await adAccRes.json();
        const adAccounts: any[] = Array.isArray(adAccData.accounts) ? adAccData.accounts : [];
        const active =
          adAccounts.find((a) => a.accountStatus === 1 && a.selectable) ||
          adAccounts.find((a) => a.selectable) ||
          adAccounts[0];
        if (active?.id) targetAdAccountId = active.id;
      }
    } catch (e) {
      console.warn('[zernio/audience-sync] Error fetching ad accounts:', e);
    }
  }

  try {
    const formattedUsers: Array<{ phone?: string; email?: string }> = [];
    for (const u of rawUsersList) {
      const item: { phone?: string; email?: string } = {};
      if (u.phone && u.phone !== '-') {
        const clean = normalizePhone(u.phone);
        if (clean.length >= 8) {
          item.phone = clean.startsWith('+') ? clean : `+${clean}`;
        }
      }
      if (u.email && u.email.trim() && u.email.includes('@')) {
        item.email = u.email.trim().toLowerCase();
      }
      if (item.phone || item.email) {
        formattedUsers.push(item);
      }
    }

    if (formattedUsers.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Tidak ada nomor WhatsApp atau email valid untuk disinkronkan' },
        { status: 400 }
      );
    }

    // Validate if audienceId is a 24-char hex Zernio ObjectId
    const isZernioId = /^[0-9a-fA-F]{24}$/.test(audienceId);
    let resolvedAudienceId = audienceId;

    if (!isZernioId) {
      console.log(
        `[zernio/audience-sync] audienceId "${audienceId}" is not a 24-char Zernio ObjectId. Resolving...`
      );

      // 1. Check if cached in selectedAudiences
      const cachedAud = (connectedAccount?.selectedAudiences || []).find(
        (a: any) =>
          (a.platformAudienceId === audienceId || a.id === audienceId || a.name === body.audienceName) &&
          a.id &&
          /^[0-9a-fA-F]{24}$/.test(a.id)
      );

      if (cachedAud?.id) {
        resolvedAudienceId = cachedAud.id;
        console.log(`[zernio/audience-sync] Found cached Zernio audience ID: ${resolvedAudienceId}`);
      } else {
        // 2. Query Zernio audiences to find matching audience with a valid Zernio ObjectId
        let foundId = '';
        if (targetAdAccountId) {
          try {
            const listRes = await fetch(
              `https://zernio.com/api/v1/ads/audiences?accountId=${encodeURIComponent(
                accountId
              )}&adAccountId=${encodeURIComponent(targetAdAccountId)}`,
              {
                headers: { Authorization: `Bearer ${apiKey}` },
                cache: 'no-store',
              }
            );
            if (listRes.ok) {
              const listData = await listRes.json();
              const matching = (listData.audiences || []).find(
                (a: any) =>
                  (a.platformAudienceId === audienceId || a.name === body.audienceName) &&
                  a.id &&
                  /^[0-9a-fA-F]{24}$/.test(a.id)
              );
              if (matching?.id) {
                foundId = matching.id;
              }
            }
          } catch (e) {
            console.warn('[zernio/audience-sync] Error checking audiences list:', e);
          }
        }

        if (foundId) {
          resolvedAudienceId = foundId;
          console.log(`[zernio/audience-sync] Resolved existing Zernio audience ID: ${resolvedAudienceId}`);
        } else {
          // Do NOT create a new custom audience on Meta!
          console.warn(
            `[zernio/audience-sync] Custom audience "${body.audienceName || audienceId}" has no valid Zernio ID.`
          );
          return NextResponse.json(
            {
              status: false,
              error: `Custom Audience "${body.audienceName || audienceId}" dibuat langsung di Meta Ads Manager (bukan melalui Zernio), sehingga Zernio tidak dapat mengunggah kontak ke audiens ini. Silakan buat Custom Audience baru melalui menu Pengaturan agar terdaftar di Zernio dan dapat disinkronkan nomor WhatsApp-nya.`,
            },
            { status: 400 }
          );
        }
      }
    }

    console.log(
      `[zernio/audience-sync] Syncing ${formattedUsers.length} users to Zernio audience ${resolvedAudienceId}`
    );

    // Official Zernio OpenAPI schema: POST /v1/ads/audiences/{audienceId}/users with { users: [{ phone }] }
    const syncRes = await fetch(
      `https://zernio.com/api/v1/ads/audiences/${encodeURIComponent(resolvedAudienceId)}/users`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: formattedUsers }),
        cache: 'no-store',
      }
    );

    const syncData = await syncRes.json();
    console.log('[zernio/audience-sync] Response from Zernio:', syncRes.status, syncData);

    if (!syncRes.ok) {
      return NextResponse.json(
        {
          status: false,
          error: syncData?.error || syncData?.message || `Gagal sync audience (HTTP ${syncRes.status})`,
          details: syncData,
        },
        { status: syncRes.status }
      );
    }

    if (Array.isArray(body.eventIds) && body.eventIds.length > 0) {
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

        const validEventIds = body.eventIds.filter(
          (id) => typeof id === 'string' && isValidUuid(id)
        );

        if (validEventIds.length > 0) {
          const targetAudienceRecord = {
            id: audienceId,
            name: body.audienceName || audienceId,
            synced_at: nowIso,
            synced_at_wib: nowWib,
          };

          const CHUNK_SIZE = 100;

          for (let i = 0; i < validEventIds.length; i += CHUNK_SIZE) {
            const chunkIds = validEventIds.slice(i, i + CHUNK_SIZE);
            const { data: chunkEvts, error: fetchErr } = await admin
              .from('track_events')
              .select('*')
              .eq('site_id', siteId)
              .in('id', chunkIds);

            if (fetchErr) {
              console.error('[zernio/audience-sync] Error fetching chunk:', fetchErr);
              continue;
            }

            if (Array.isArray(chunkEvts) && chunkEvts.length > 0) {
              const rowsToUpsert = chunkEvts.map((currentEvt) => {
                const existingAudiences = Array.isArray(currentEvt?.metadata?.synced_audiences)
                  ? currentEvt.metadata.synced_audiences
                  : [];

                const updatedAudiences = [
                  ...existingAudiences.filter(
                    (a: any) => (typeof a === 'string' ? a !== audienceId : a?.id !== audienceId)
                  ),
                  targetAudienceRecord,
                ];

                return {
                  ...currentEvt,
                  metadata: {
                    ...(currentEvt?.metadata || {}),
                    audience_synced: true,
                    audience_synced_at: nowIso,
                    audience_synced_at_wib: nowWib,
                    synced_audiences: updatedAudiences,
                  },
                };
              });

              const { error: upsertErr } = await admin
                .from('track_events')
                .upsert(rowsToUpsert, { onConflict: 'id' });

              if (upsertErr) {
                console.error('[zernio/audience-sync] Error upserting chunk:', upsertErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[zernio/audience-sync] Could not update event metadata:', err);
      }
    }

    return NextResponse.json({
      status: true,
      message: `Berhasil menambahkan ${rawUsersList.length} kontak ke Custom Audience`,
      data: syncData,
    });
  } catch (err: any) {
    console.error('[zernio/audience-sync] Error:', err);
    return NextResponse.json(
      { status: false, error: `Gagal sync audience: ${err.message}` },
      { status: 500 }
    );
  }
}
