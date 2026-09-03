import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/';

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate ownership & get plan
  const { data: site } = await supabase
    .from('sites')
    .select('owner_id')
    .eq('id', params.siteId)
    .single();

  if (!site || site.owner_id !== user.id) {
    return NextResponse.json({ error: 'Site not found or unauthorized' }, { status: 403 });
  }

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const planName = sub?.plan_name || 'Free';

  // 3. Enforce Premium Feature (Growth, Business, Pro)
  if (planName === 'Free' || planName === 'Starter') {
    return NextResponse.json(
      { error: `Fitur Heatmap eksklusif untuk paket Growth ke atas.` },
      { status: 403 }
    );
  }

  const rangeDays = parseInt(url.searchParams.get('range') || '14', 10);
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - rangeDays);
  const thresholdIso = dateThreshold.toISOString();

  // 4. Fetch click data (limit to 2000 for performance)
  const { data: clicks, error } = await supabase
    .from('heatmap_clicks')
    .select('x_position, y_position, screen_width')
    .eq('site_id', params.siteId)
    .like('page_url', `%${path}%`) // simplified path matching
    .gte('clicked_at', thresholdIso)
    .order('clicked_at', { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch heatmap data' }, { status: 500 });
  }

  return NextResponse.json({ clicks });
}
