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

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: site } = await supabase
    .from('sites')
    .select('id, zernio_api_key')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ status: false, error: 'Site not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const apiKey = (searchParams.get('api_key') || site.zernio_api_key || '').trim();

  if (!apiKey) {
    return NextResponse.json({ status: true, profiles: [] });
  }

  try {
    const res = await fetch('https://zernio.com/api/v1/profiles', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { status: false, error: data?.error || 'Gagal memuat profile dari Zernio' },
        { status: 400 }
      );
    }

    const profiles = Array.isArray(data.profiles)
      ? data.profiles.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          isDefault: Boolean(p.isDefault),
        }))
      : [];

    return NextResponse.json({ status: true, profiles });
  } catch (err: any) {
    return NextResponse.json(
      { status: false, error: err?.message || 'Network error' },
      { status: 500 }
    );
  }
}
