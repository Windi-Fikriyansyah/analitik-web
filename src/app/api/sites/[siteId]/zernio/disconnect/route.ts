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
    return NextResponse.json(
      { status: false, error: 'Unauthorized. Silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('sites')
      .update({ meta_connected_account: null })
      .eq('id', siteId);

    if (error) {
      return NextResponse.json({ status: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      message: 'Koneksi akun Meta Ads telah berhasil diputuskan.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: false, error: err.message || 'Gagal memutuskan koneksi' },
      { status: 500 }
    );
  }
}
