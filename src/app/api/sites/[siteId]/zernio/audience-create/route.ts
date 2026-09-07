import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUuid } from '@/lib/validateSite';

export const dynamic = 'force-dynamic';

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
    name?: string;
    description?: string;
    adAccountId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const audienceName = (body.name || '').trim();
  if (!audienceName) {
    return NextResponse.json({ status: false, error: 'Nama Custom Audience wajib diisi' }, { status: 400 });
  }

  // Find metaads account ID
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
    console.warn('[zernio/audience-create] Could not fetch accounts:', err);
  }

  if (!accountId) {
    return NextResponse.json(
      { status: false, error: 'Tidak ditemukan akun Meta Ads yang terhubung.' },
      { status: 400 }
    );
  }

  let targetAdAccountId = body.adAccountId || connectedAccount?.selectedPixel?.ownerAdAccountId || '';
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
      console.warn('[zernio/audience-create] Error fetching ad accounts:', e);
    }
  }

  if (!targetAdAccountId) {
    return NextResponse.json(
      { status: false, error: 'Tidak ditemukan Ad Account aktif untuk membuat Custom Audience.' },
      { status: 400 }
    );
  }

  try {
    const createRes = await fetch('https://zernio.com/api/v1/ads/audiences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        adAccountId: targetAdAccountId,
        name: audienceName,
        type: 'customer_list',
        description: body.description || `Custom Audience untuk WhatsApp Leads`,
      }),
      cache: 'no-store',
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData.audience?.id) {
      return NextResponse.json(
        {
          status: false,
          error: createData?.error || createData?.message || 'Gagal membuat Custom Audience di Meta Ads.',
          details: createData,
        },
        { status: createRes.status }
      );
    }

    const newAudience = {
      id: createData.audience.id,
      platformAudienceId: createData.audience.platformAudienceId || '',
      name: audienceName,
      type: 'customer_list',
      description: createData.audience.description || '',
    };

    // Automatically add to selectedAudiences in DB
    try {
      const currentAudiences: any[] = Array.isArray(connectedAccount?.selectedAudiences)
        ? connectedAccount!.selectedAudiences
        : [];
      const updated = [
        ...currentAudiences.filter((a: any) => a.id !== newAudience.id && a.platformAudienceId !== newAudience.platformAudienceId),
        newAudience,
      ];

      const admin = getSupabaseAdmin();
      await admin
        .from('sites')
        .update({
          meta_connected_account: {
            ...connectedAccount,
            selectedAudiences: updated,
          },
        })
        .eq('id', siteId);
    } catch (dbErr) {
      console.warn('[zernio/audience-create] Error updating selectedAudiences in DB:', dbErr);
    }

    return NextResponse.json({
      status: true,
      message: `Custom Audience "${audienceName}" berhasil dibuat di Meta Ads!`,
      audience: newAudience,
    });
  } catch (err: any) {
    console.error('[zernio/audience-create] Error:', err);
    return NextResponse.json(
      { status: false, error: `Gagal membuat Custom Audience: ${err.message}` },
      { status: 500 }
    );
  }
}
