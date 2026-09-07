import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUuid } from '@/lib/validateSite';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  return handleCheckStatus(req, params.siteId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  return handleCheckStatus(req, params.siteId);
}

async function handleCheckStatus(req: NextRequest, siteId: string) {
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ status: false, error: 'Invalid site ID' }, { status: 400 });
  }

  // 1. Authenticate user & site ownership
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { status: false, error: 'Unauthorized. Silakan login kembali.' },
      { status: 401 }
    );
  }

  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, owner_id, zernio_api_key, meta_connected_account')
    .eq('id', siteId)
    .maybeSingle();

  if (siteError) {
    console.error('[zernio/status] Supabase site query error:', siteError);
    return NextResponse.json(
      { status: false, error: 'Gagal memuat data site: ' + siteError.message },
      { status: 500 }
    );
  }

  if (!site) {
    return NextResponse.json(
      { status: false, error: 'Site tidak ditemukan atau Anda tidak memiliki akses.' },
      { status: 404 }
    );
  }

  if (site.owner_id !== user.id) {
    return NextResponse.json(
      { status: false, error: 'Anda tidak memiliki akses ke site ini.' },
      { status: 403 }
    );
  }

  // 2. Check for API key (from query or body or database)
  const { searchParams } = new URL(req.url);
  let keyFromReq = searchParams.get('api_key') || '';

  if (!keyFromReq && req.method === 'POST') {
    try {
      const body = await req.json();
      keyFromReq = body.zernio_api_key || '';
    } catch {}
  }

  const zernioApiKey = (keyFromReq || site.zernio_api_key || '').trim();

  if (!zernioApiKey) {
    return NextResponse.json({
      status: true,
      connected: false,
      account: null,
      message: 'Zernio API Key belum diatur.',
    });
  }

  // 3. Query Zernio API for connected accounts
  try {
    const zernioRes = await fetch('https://zernio.com/api/v1/accounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${zernioApiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await zernioRes.json();

    if (!zernioRes.ok) {
      if (zernioRes.status === 401) {
        return NextResponse.json(
          {
            status: false,
            connected: false,
            error: 'Zernio API Key tidak valid atau expired. Silakan periksa kembali di dashboard Zernio.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          status: false,
          connected: false,
          error: data?.error || 'Gagal memeriksa status akun dari Zernio.',
        },
        { status: 400 }
      );
    }

    const accounts: any[] = Array.isArray(data.accounts) ? data.accounts : [];

    // Look for Meta/Facebook/Instagram connected accounts
    const metaAccounts = accounts.filter(
      (acc) =>
        acc.platform === 'facebook' ||
        acc.platform === 'meta' ||
        acc.platform === 'instagram'
    );

    if (metaAccounts.length > 0) {
      const primaryAccount = metaAccounts[0];
      const rawProfile = primaryAccount.profileId || (site.meta_connected_account as any)?.profileId;
      const profileIdStr = typeof rawProfile === 'object' && rawProfile !== null
        ? rawProfile._id || rawProfile.id || ''
        : String(rawProfile || '');
      const profileNameStr = typeof rawProfile === 'object' && rawProfile !== null
        ? rawProfile.name || ''
        : '';

      const accountSummary = {
        id: primaryAccount.id || primaryAccount._id,
        name: primaryAccount.name || primaryAccount.displayName || 'Meta Account',
        username: primaryAccount.username || primaryAccount.handle || null,
        platform: primaryAccount.platform,
        status: primaryAccount.status || 'connected',
        avatarUrl: primaryAccount.avatarUrl || primaryAccount.profilePictureUrl || null,
        profileId: profileIdStr || null,
        profileName: profileNameStr || null,
        last_checked: new Date().toISOString(),
      };

      // Persist latest connected status into sites table
      try {
        const admin = getSupabaseAdmin();
        await admin
          .from('sites')
          .update({
            meta_connected_account: accountSummary,
            zernio_api_key: zernioApiKey,
          })
          .eq('id', siteId);
      } catch (dbErr) {
        console.warn('[zernio/status] Note: could not update db cache:', dbErr);
      }

      return NextResponse.json({
        status: true,
        connected: true,
        account: accountSummary,
        all_meta_accounts: metaAccounts,
        message: 'Akun Meta Ads / Facebook terhubung via Zernio.',
      });
    }

    // If no Meta accounts found, clear database cached status if present
    try {
      if (site.meta_connected_account) {
        const admin = getSupabaseAdmin();
        await admin
          .from('sites')
          .update({ meta_connected_account: null })
          .eq('id', siteId);
      }
    } catch {}

    return NextResponse.json({
      status: true,
      connected: false,
      account: null,
      message: 'Belum ada akun Meta/Facebook yang terhubung. Silakan klik tombol "Connect ke Meta Ads".',
    });
  } catch (err: any) {
    console.error('[zernio/status] Error:', err);
    // If network error, fallback to cached status in database if available
    if (site.meta_connected_account) {
      return NextResponse.json({
        status: true,
        connected: true,
        account: site.meta_connected_account,
        cached: true,
        message: 'Status terhubung (dari cache database)',
      });
    }

    return NextResponse.json(
      {
        status: false,
        error: `Terjadi kendala jaringan saat menghubungi Zernio: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
