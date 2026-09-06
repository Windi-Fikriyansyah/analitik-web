import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { isValidUuid } from '@/lib/validateSite';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const { siteId } = params;
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ status: false, error: 'Invalid site ID' }, { status: 400 });
  }

  // 1. Authenticate user & site ownership
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: site } = await supabase
    .from('sites')
    .select('id, zernio_api_key, meta_connected_account')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ status: false, error: 'Site tidak ditemukan' }, { status: 404 });
  }

  const apiKey = (site.zernio_api_key || '').trim();
  const connectedAccount = site.meta_connected_account as Record<string, any> | null;

  if (!apiKey || !connectedAccount) {
    return NextResponse.json({
      status: true,
      connected: false,
      adAccounts: [],
      pixels: [],
      audiences: [],
      message: 'Akun Meta Ads belum terhubung.',
    });
  }

  const { searchParams } = new URL(req.url);
  const requestedAdAccountId = searchParams.get('adAccountId') || '';

  // Extract raw profileId
  const rawProfileId = connectedAccount.profileId;
  const profileId =
    typeof rawProfileId === 'object' && rawProfileId !== null
      ? rawProfileId._id || rawProfileId.id || ''
      : String(rawProfileId || '');

  try {
    // 2. Fetch connected social accounts in this profile to find both facebook & metaads accounts
    let accountsUrl = 'https://zernio.com/api/v1/accounts';
    if (profileId) {
      accountsUrl += `?profileId=${encodeURIComponent(profileId)}`;
    }

    const accsRes = await fetch(accountsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    let metaAdsAccountId = '';
    let facebookAccountId = connectedAccount.id || '';

    if (accsRes.ok) {
      const accsData = await accsRes.json();
      const accounts: any[] = Array.isArray(accsData.accounts) ? accsData.accounts : [];
      const metaAdsAcc = accounts.find((a) => a.platform === 'metaads');
      const fbAcc = accounts.find((a) => a.platform === 'facebook');

      if (metaAdsAcc) metaAdsAccountId = metaAdsAcc._id || metaAdsAcc.id;
      if (fbAcc && !facebookAccountId) facebookAccountId = fbAcc._id || fbAcc.id;
    }

    // 3. Fetch Tracking Tags / Pixels
    let pixels: any[] = [];
    const pixelTargetAccountId = metaAdsAccountId || facebookAccountId;

    if (pixelTargetAccountId) {
      try {
        const tagsRes = await fetch(
          `https://zernio.com/api/v1/accounts/${pixelTargetAccountId}/tracking-tags`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: 'no-store',
          }
        );

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          pixels = Array.isArray(tagsData.tags) ? tagsData.tags : [];
        } else if (!metaAdsAccountId) {
          // If metaads account wasn't found directly, try conversion-destinations fallback
          const destRes = await fetch(
            `https://zernio.com/api/v1/accounts/${pixelTargetAccountId}/conversion-destinations`,
            {
              headers: { Authorization: `Bearer ${apiKey}` },
              cache: 'no-store',
            }
          );
          if (destRes.ok) {
            const destData = await destRes.json();
            pixels = Array.isArray(destData.destinations) ? destData.destinations : [];
          }
        }
      } catch (pixErr) {
        console.warn('[zernio/meta-data] Error fetching pixels:', pixErr);
      }
    }

    // 4. Fetch Meta Ad Accounts
    let adAccounts: any[] = [];
    const adAccCallerId = facebookAccountId || metaAdsAccountId;

    if (adAccCallerId) {
      try {
        const adAccRes = await fetch(
          `https://zernio.com/api/v1/ads/accounts?accountId=${encodeURIComponent(adAccCallerId)}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: 'no-store',
          }
        );

        if (adAccRes.ok) {
          const adAccData = await adAccRes.json();
          adAccounts = Array.isArray(adAccData.accounts) ? adAccData.accounts : [];
        }
      } catch (adAccErr) {
        console.warn('[zernio/meta-data] Error fetching ad accounts:', adAccErr);
      }
    }

    // 5. Determine active target ad account for audiences
    let selectedAdAccountId = requestedAdAccountId;
    if (!selectedAdAccountId && adAccounts.length > 0) {
      // Pick first active and selectable ad account, or one with existing audiences
      const preferred =
        adAccounts.find((a) => a.accountStatus === 1 && a.selectable) ||
        adAccounts.find((a) => a.selectable) ||
        adAccounts[0];
      if (preferred) selectedAdAccountId = preferred.id;
    }

    // 6. Fetch Custom Audiences for the selected ad account
    let audiences: any[] = [];
    if (adAccCallerId && selectedAdAccountId) {
      try {
        const audRes = await fetch(
          `https://zernio.com/api/v1/ads/audiences?accountId=${encodeURIComponent(
            adAccCallerId
          )}&adAccountId=${encodeURIComponent(selectedAdAccountId)}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: 'no-store',
          }
        );

        if (audRes.ok) {
          const audData = await audRes.json();
          audiences = Array.isArray(audData.audiences) ? audData.audiences : [];
        }
      } catch (audErr) {
        console.warn('[zernio/meta-data] Error fetching audiences:', audErr);
      }
    }

    return NextResponse.json({
      status: true,
      connected: true,
      metaAdsAccountId,
      facebookAccountId,
      adAccounts,
      pixels,
      audiences,
      selectedAdAccountId,
    });
  } catch (err: any) {
    console.error('[zernio/meta-data] Error:', err);
    return NextResponse.json(
      {
        status: false,
        error: `Gagal memuat data Meta Ads dari Zernio: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
