import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { isValidUuid } from '@/lib/validateSite';

export const dynamic = 'force-dynamic';

const ACCOUNT_STATUS_MAP: Record<number, string> = {
  1: 'ACTIVE (Aktif)',
  2: 'DISABLED (Dinonaktifkan)',
  3: 'UNSETTLED (Tagihan Tertunda)',
  7: 'PENDING_RISK_REVIEW (Review Risiko)',
  8: 'PENDING_SETTLEMENT',
  9: 'IN_GRACE_PERIOD',
  100: 'PENDING_CLOSURE',
  101: 'CLOSED (Ditutup)',
};

export async function POST(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const { siteId } = params;
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ status: false, error: 'Invalid site ID' }, { status: 400 });
  }

  // 1. Authenticate user and verify site ownership
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: false, error: 'Unauthorized. Silakan login kembali.' }, { status: 401 });
  }

  const { data: site } = await supabase
    .from('sites')
    .select('id, meta_access_token, meta_ad_account_id')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ status: false, error: 'Site tidak ditemukan atau Anda tidak memiliki akses.' }, { status: 404 });
  }

  // 2. Parse payload or fallback to database stored credentials
  let body: { access_token?: string; ad_account_id?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const accessToken = (body.access_token || site.meta_access_token || '').trim();
  let adAccountId = (body.ad_account_id || site.meta_ad_account_id || '').trim();

  if (!accessToken) {
    return NextResponse.json(
      { status: false, error: 'Access Token belum diisi. Masukkan Meta Access Token Anda.' },
      { status: 400 }
    );
  }

  if (!adAccountId) {
    return NextResponse.json(
      { status: false, error: 'Ad Account ID belum diisi. Masukkan ID Akun Iklan Meta Anda (contoh: act_1234567890).' },
      { status: 400 }
    );
  }

  // 3. Normalize Ad Account ID (Meta Graph API requires 'act_' prefix)
  if (!adAccountId.startsWith('act_')) {
    adAccountId = `act_${adAccountId}`;
  }

  // 4. Test connection via Meta Graph API
  const graphApiUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=id,name,account_status,currency,timezone_name,business_name&access_token=${encodeURIComponent(
    accessToken
  )}`;

  try {
    const metaRes = await fetch(graphApiUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'AnalitikWeb/1.0' },
      cache: 'no-store',
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      const err = metaData.error || {};
      let friendlyError = err.message || 'Gagal terhubung ke Meta Ads API.';

      if (err.code === 190) {
        friendlyError =
          'Access Token tidak valid atau sudah kadaluarsa (expired). Silakan buat / refresh Access Token baru di Meta Events Manager atau Pengaturan Bisnis Meta.';
      } else if (err.code === 100) {
        friendlyError = `Akun iklan dengan ID "${adAccountId}" tidak ditemukan. Pastikan Ad Account ID yang dimasukkan sudah benar.`;
      } else if (err.code === 200 || err.code === 273) {
        friendlyError =
          'Token tidak memiliki izin untuk mengelola Ad Account ini. Pastikan User/System User telah diberikan akses pada Ad Account tersebut di Business Manager.';
      }

      return NextResponse.json(
        {
          status: false,
          error: friendlyError,
          meta_code: err.code || null,
          meta_type: err.type || null,
        },
        { status: 400 }
      );
    }

    const statusText =
      ACCOUNT_STATUS_MAP[metaData.account_status] || `Status ${metaData.account_status || 'Unknown'}`;

    return NextResponse.json({
      status: true,
      message: `Koneksi ke Meta Ads Berhasil! Terhubung ke Akun: "${metaData.name || adAccountId}"`,
      account: {
        id: metaData.id,
        name: metaData.name || 'Tidak ada nama akun',
        status: statusText,
        currency: metaData.currency || '-',
        timezone: metaData.timezone_name || '-',
        business_name: metaData.business_name || null,
      },
    });
  } catch (networkErr: any) {
    return NextResponse.json(
      {
        status: false,
        error: `Gagal menghubungi server Meta Graph API: ${networkErr?.message || 'Network timeout'}`,
      },
      { status: 500 }
    );
  }
}
