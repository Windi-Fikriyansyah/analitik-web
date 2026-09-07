import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUuid } from '@/lib/validateSite';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const { siteId } = params;
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ error: 'Invalid site id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: 'Unauthorized or site not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const rangeDays = parseInt(searchParams.get('range') || '14', 10);
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - rangeDays);
  const thresholdIso = dateThreshold.toISOString();

  const admin = getSupabaseAdmin();
  const { data: events, error } = await admin
    .from('track_events')
    .select('id, site_id, phone_number, sender_name, event_name, message, device_number, status, metadata, created_at')
    .eq('site_id', siteId)
    .gte('created_at', thresholdIso)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      status: true,
      events: events || [],
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const { siteId } = params;
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ status: false, error: 'Invalid site id' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, owner_id')
      .eq('id', siteId)
      .maybeSingle();

    if (siteError || !site || site.owner_id !== user.id) {
      return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 403 });
    }

    let body: { eventIds?: string[]; deleteAll?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ status: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Option 1: Delete all events for this site
    if (body.deleteAll === true) {
      const { error: delAllError } = await admin
        .from('track_events')
        .delete()
        .eq('site_id', siteId);

      if (delAllError) {
        console.error('[DELETE /events] Error deleting all events:', delAllError);
        return NextResponse.json({ status: false, error: delAllError.message }, { status: 500 });
      }

      return NextResponse.json({
        status: true,
        message: 'Berhasil menghapus seluruh data event',
        deletedAll: true,
      });
    }

    // Option 2: Delete specific eventIds with batching to avoid URL length limit
    const { eventIds } = body;
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Daftar ID event (eventIds) wajib diisi' },
        { status: 400 }
      );
    }

    // Filter valid UUIDs to prevent PostgreSQL syntax error 22P02
    const validIds = eventIds.filter((id) => typeof id === 'string' && isValidUuid(id));
    if (validIds.length === 0) {
      return NextResponse.json({
        status: true,
        message: 'Tidak ada ID event valid yang dihapus',
        deletedCount: 0,
      });
    }

    // Batch deletion in chunks of 100 to prevent PostgREST URI length limit
    const BATCH_SIZE = 100;
    let deletedCount = 0;

    for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
      const chunk = validIds.slice(i, i + BATCH_SIZE);
      const { error: chunkError } = await admin
        .from('track_events')
        .delete()
        .eq('site_id', siteId)
        .in('id', chunk);

      if (chunkError) {
        console.error('[DELETE /events] Error deleting chunk:', chunkError);
        return NextResponse.json(
          { status: false, error: chunkError.message },
          { status: 500 }
        );
      }
      deletedCount += chunk.length;
    }

    return NextResponse.json({
      status: true,
      message: `Berhasil menghapus ${deletedCount} data event`,
      deletedCount,
    });
  } catch (err: any) {
    console.error('[DELETE /events] Unexpected error:', err);
    return NextResponse.json(
      { status: false, error: err.message || 'Terjadi kesalahan pada server saat menghapus data' },
      { status: 500 }
    );
  }
}

