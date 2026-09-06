import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import TrackEventsClient, { TrackEventItem } from '@/components/TrackEventsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TrackEventsPage({
  params,
  searchParams,
}: {
  params: { siteId: string };
  searchParams: { range?: string };
}) {
  const supabase = getSupabaseServer();

  // Validate tenant ownership through RLS
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  // Determine dynamic appUrl from headers to match client browser port/host
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  // Range filter
  const rangeDays = parseInt(searchParams.range || '14', 10);
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - rangeDays);
  const thresholdIso = dateThreshold.toISOString();

  // Fetch track events using admin client (scoped strictly to validated site.id)
  const admin = getSupabaseAdmin();
  const { data: events, error } = await admin
    .from('track_events')
    .select('id, site_id, phone_number, sender_name, event_name, message, device_number, status, metadata, created_at')
    .eq('site_id', site.id)
    .gte('created_at', thresholdIso)
    .order('created_at', { ascending: false });

  const tableMissing = error?.code === 'PGRST205' || error?.message?.includes('schema cache');

  return (
    <TrackEventsClient
      siteId={site.id}
      siteName={site.name}
      initialEvents={(events as TrackEventItem[]) || []}
      tableMissing={Boolean(tableMissing)}
      initialAppUrl={appUrl}
    />
  );
}
