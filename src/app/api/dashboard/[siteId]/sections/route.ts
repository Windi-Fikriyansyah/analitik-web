import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { isValidUuid } from '@/lib/validateSite';

/**
 * Returns per-section stats ordered like a funnel/journey:
 * visitor_count desc as a proxy for "how far visitors got", which
 * matches the example in the spec (Hero > Benefit > Testimonial > ...).
 *
 * Reads from the `section_stats` view defined in supabase/schema.sql.
 */
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

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('section_stats')
    .select('section_id, visitor_count, avg_duration_seconds, avg_entry_offset_seconds')
    .eq('site_id', siteId)
    .order('avg_entry_offset_seconds', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    sections: (data ?? []).map((row) => ({
      section_id: row.section_id,
      visitor_count: row.visitor_count,
      avg_duration_seconds: Number(row.avg_duration_seconds ?? 0),
    })),
  });
}
