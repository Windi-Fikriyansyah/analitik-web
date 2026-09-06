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
