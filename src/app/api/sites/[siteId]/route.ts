import { NextRequest, NextResponse } from 'next/server';
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

  // RLS ensures this only returns a row if the current user owns it.
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, domain, created_at')
    .eq('id', params.siteId)
    .maybeSingle();

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

  let body: { name?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updateData: { name?: string; domain?: string } = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.domain !== undefined) updateData.domain = body.domain.trim();

  const { error } = await supabase
    .from('sites')
    .update(updateData)
    .eq('id', params.siteId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
