import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import HeatmapViewer from '@/components/HeatmapViewer';
import { C } from '@/lib/colors';

export const revalidate = 0;

export default async function HeatmapPage({ 
  params,
  searchParams 
}: { 
  params: { siteId: string },
  searchParams: { range?: string }
}) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, domain')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan_name')
    .eq('user_id', user?.id)
    .maybeSingle();

  const planName = sub?.plan_name || 'Free';
  const isPremium = planName === 'Growth' || planName === 'Business' || planName === 'Pro';
  const range = searchParams.range || '14';

  return (
    <div style={{ paddingTop: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Heatmap Visualizer (BETA)</h3>
        <span style={{ fontSize: 12.5, color: C.faint }}>Visualisasi area yang paling sering diklik ({range} hari terakhir)</span>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {!isPremium ? (
          <div style={{ 
            padding: 24, 
            backgroundColor: '#FEF2F2', 
            border: '1px solid #F87171',
            color: '#B91C1C', 
            borderRadius: 8, 
            textAlign: 'center',
            marginTop: 20
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Fitur Premium</h4>
            <p style={{ margin: 0, fontSize: 14 }}>
              Fitur Heatmap Visualizer eksklusif untuk paket Growth, Business, dan Pro. 
              Paket Anda saat ini: <strong>{planName}</strong>.
            </p>
          </div>
        ) : (
          <HeatmapViewer siteId={site.id} domain={site.domain} range={range} />
        )}
      </div>
    </div>
  );
}
