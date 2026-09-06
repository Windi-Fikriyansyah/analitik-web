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

  const { data: site } = await supabase
    .from('sites')
    .select('id, zernio_api_key, meta_connected_account')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json(
      { status: false, error: 'Site tidak ditemukan atau Anda tidak memiliki akses.' },
      { status: 404 }
    );
  }

  // 2. Parse request payload
  let body: { zernio_api_key?: string; redirect_url?: string; profile_id?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const zernioApiKey = (body.zernio_api_key || site.zernio_api_key || '').trim();

  if (!zernioApiKey) {
    return NextResponse.json(
      { status: false, error: 'Zernio API Key belum diisi. Silakan masukkan API Key Zernio Anda (sk_...).' },
      { status: 400 }
    );
  }

  // 3. Build redirect_url for Zernio OAuth callback
  const origin =
    body.redirect_url ||
    req.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const callbackUrl = `${origin}/dashboard/${siteId}/settings?zernio_callback=true`;

  // 4. Resolve profileId (required by Zernio)
  let profileId = (body as any).profile_id || '';
  if (!profileId) {
    try {
      const profRes = await fetch('https://zernio.com/api/v1/profiles', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${zernioApiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (profRes.ok) {
        const profData = await profRes.json();
        const profiles: any[] = Array.isArray(profData.profiles) ? profData.profiles : [];
        const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0];
        if (defaultProfile) {
          profileId = defaultProfile._id || defaultProfile.id;
        }
      }
    } catch (profErr) {
      console.warn('[zernio/connect] Could not auto-fetch Zernio profiles:', profErr);
    }
  }

  if (!profileId) {
    return NextResponse.json(
      {
        status: false,
        error:
          'Tidak dapat menemukan profile di akun Zernio Anda. Pastikan akun Zernio memiliki minimal satu Profile di dashboard zernio.com.',
      },
      { status: 400 }
    );
  }

  // Persist the Zernio API key and selected profileId to sites table
  try {
    const admin = getSupabaseAdmin();
    const existingMeta = (site.meta_connected_account as Record<string, any>) || {};
    await admin
      .from('sites')
      .update({
        zernio_api_key: zernioApiKey,
        meta_connected_account: {
          ...existingMeta,
          profileId: profileId,
        },
      })
      .eq('id', siteId);
  } catch (dbErr) {
    console.warn('[zernio/connect] Note: could not update profileId in db:', dbErr);
  }

  // 5. Request OAuth URL from Zernio
  const zernioConnectEndpoint = `https://zernio.com/api/v1/connect/facebook?profileId=${encodeURIComponent(
    profileId
  )}&redirect_url=${encodeURIComponent(callbackUrl)}`;

  try {
    const zernioRes = await fetch(zernioConnectEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${zernioApiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await zernioRes.json();

    if (!zernioRes.ok || !data) {
      if (zernioRes.status === 401) {
        return NextResponse.json(
          {
            status: false,
            error: 'Zernio API Key tidak valid atau belum aktif. Periksa kembali API Key Anda di dashboard zernio.com.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          status: false,
          error: data?.error || `Gagal menghubungi Zernio OAuth (Status: ${zernioRes.status})`,
        },
        { status: 400 }
      );
    }

    const authUrl = data.authUrl || data.data?.authUrl;

    if (!authUrl) {
      return NextResponse.json(
        {
          status: false,
          error: 'Zernio tidak mengembalikan tautan otorisasi OAuth (authUrl).',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: true,
      authUrl,
      redirect_url: callbackUrl,
    });
  } catch (err: any) {
    console.error('[zernio/connect] Network error:', err);
    return NextResponse.json(
      {
        status: false,
        error: `Terjadi kendala jaringan saat menghubungi Zernio: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
