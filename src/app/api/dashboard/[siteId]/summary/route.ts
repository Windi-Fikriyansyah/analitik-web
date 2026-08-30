import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { isValidUuid } from '@/lib/validateSite';

export async function GET(_req: NextRequest, { params }: { params: { siteId: string } }) {
  const { siteId } = params;
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ error: 'Invalid site id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Ownership check (RLS also protects this, but we fail fast with a
  // clear 404 instead of silently returning empty aggregates).
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [visitorCountRes, sessionRes] = await Promise.all([
    supabase
      .from('visitors')
      .select('id, device_type', { count: 'exact' })
      .eq('site_id', siteId),
    supabase
      .from('sessions')
      .select('duration_seconds', { count: 'exact' })
      .eq('site_id', siteId),
  ]);

  if (visitorCountRes.error) {
    return NextResponse.json({ error: visitorCountRes.error.message }, { status: 500 });
  }
  if (sessionRes.error) {
    return NextResponse.json({ error: sessionRes.error.message }, { status: 500 });
  }

  const visitors = visitorCountRes.data ?? [];
  const sessions = sessionRes.data ?? [];

  const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
  for (const v of visitors) {
    if (v.device_type && v.device_type in deviceBreakdown) {
      deviceBreakdown[v.device_type as keyof typeof deviceBreakdown] += 1;
    }
  }

  const completedDurations = sessions
    .map((s) => s.duration_seconds)
    .filter((d): d is number => typeof d === 'number' && d >= 0);

  const avgDurationSeconds =
    completedDurations.length > 0
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
      : 0;

  return NextResponse.json({
    total_visitors: visitorCountRes.count ?? visitors.length,
    total_sessions: sessionRes.count ?? sessions.length,
    device_breakdown: deviceBreakdown,
    avg_session_duration_seconds: Math.round(avgDurationSeconds * 10) / 10,
  });
}
