import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { isValidUuid } from '@/lib/validateSite';

export async function GET(_req: NextRequest, { params }: { params: { siteId: string } }) {
  if (!isValidUuid(params.siteId)) {
    return NextResponse.json({ error: 'Invalid site id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Attempt to select all site fields including Zernio credentials
  let { data, error } = await supabase
    .from('sites')
    .select('id, name, domain, zernio_api_key, meta_connected_account, created_at')
    .eq('id', params.siteId)
    .maybeSingle();

  // Fallback if newer columns have not been migrated yet
  if (error && error.code === '42703') {
    const fallback = await supabase
      .from('sites')
      .select('id, name, domain, created_at')
      .eq('id', params.siteId)
      .maybeSingle();
    data = fallback.data
      ? {
          ...fallback.data,
          zernio_api_key: null,
          meta_connected_account: null,
        }
      : null;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ site: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { siteId: string } }) {
  if (!isValidUuid(params.siteId)) {
    return NextResponse.json({ error: 'Invalid site id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('sites').delete().eq('id', params.siteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/dashboard', 'layout');
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { siteId: string } }) {
  if (!isValidUuid(params.siteId)) {
    return NextResponse.json({ error: 'Invalid site id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    name?: string;
    domain?: string;
    zernio_api_key?: string | null;
    meta_connected_account?: Record<string, any> | null;
    profile_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updateData: {
    name?: string;
    domain?: string;
    zernio_api_key?: string | null;
    meta_connected_account?: Record<string, any> | null;
  } = {};

  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    updateData.name = trimmed;
  }
  if (body.domain !== undefined) {
    const trimmed = body.domain.trim();
    if (!trimmed) return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    updateData.domain = trimmed;
  }
  if (body.zernio_api_key !== undefined) {
    updateData.zernio_api_key = body.zernio_api_key ? body.zernio_api_key.trim() : null;
  }
  if (body.meta_connected_account !== undefined) {
    updateData.meta_connected_account = body.meta_connected_account;
  } else if (body.profile_id !== undefined) {
    const { data: currentSite } = await supabase
      .from('sites')
      .select('meta_connected_account')
      .eq('id', params.siteId)
      .maybeSingle();
    const existing = (currentSite?.meta_connected_account as Record<string, any>) || {};
    updateData.meta_connected_account = {
      ...existing,
      profileId: body.profile_id || null,
    };
  }

  const { error } = await supabase
    .from('sites')
    .update(updateData)
    .eq('id', params.siteId);

  if (error) {
    if (error.code === '42703') {
      return NextResponse.json(
        {
          error:
            'Kolom zernio_api_key atau meta_connected_account belum dibuat di tabel sites. Silakan jalankan query migrasi di supabase/zernio_migration.sql terlebih dahulu.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath('/dashboard', 'layout');
  return NextResponse.json({ ok: true });
}
