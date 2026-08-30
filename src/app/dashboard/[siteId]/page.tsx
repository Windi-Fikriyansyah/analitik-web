import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import TrackingSnippet from '@/components/TrackingSnippet';
import DashboardContent from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

function formatSeconds(seconds: number) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export default async function SiteDashboardPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  const [{ data: visitors }, { data: sessions }, { data: sections }] = await Promise.all([
    supabase.from('visitors').select('id, device_type, first_seen').eq('site_id', site.id),
    supabase.from('sessions').select('duration_seconds, started_at').eq('site_id', site.id),
    supabase
      .from('section_stats')
      .select('section_id, visitor_count, avg_duration_seconds, avg_entry_offset_seconds')
      .eq('site_id', site.id)
      .order('avg_entry_offset_seconds', { ascending: true }),
  ]);

  const totalVisitors = visitors?.length ?? 0;
  const totalSessions = sessions?.length ?? 0;

  const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
  (visitors ?? []).forEach((v) => {
    if (v.device_type && v.device_type in deviceBreakdown) {
      deviceBreakdown[v.device_type as keyof typeof deviceBreakdown] += 1;
    }
  });

  const completedDurations = (sessions ?? [])
    .map((s) => s.duration_seconds)
    .filter((d): d is number => typeof d === 'number' && d >= 0);
  const avgDuration =
    completedDurations.length > 0
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
      : 0;

  const bounceRate = totalSessions > 0
    ? ((completedDurations.filter(d => d < 5).length / totalSessions) * 100).toFixed(1)
    : '0';

  const maxSectionVisitors = Math.max(1, ...(sections ?? []).map((s) => s.visitor_count));

  // Build data for client component
  const kpis = [
    { label: "Kunjungan", value: totalVisitors.toLocaleString("id-ID"), delta: "", up: true },
    { label: "Sesi", value: totalSessions.toLocaleString("id-ID"), delta: "", up: true },
    { label: "Durasi Rata-rata", value: formatSeconds(avgDuration), delta: "", up: true },
    { label: "Pentalan", value: `${bounceRate}%`, delta: "", up: false },
  ];

  const sectionRows = (sections ?? []).map((s) => ({
    section_id: s.section_id,
    visitor_count: s.visitor_count,
    avg_duration: formatSeconds(Number(s.avg_duration_seconds ?? 0)),
    pct: (s.visitor_count / maxSectionVisitors) * 100,
  }));

  // Generate Traffic data for last 14 days
  const trafficMap = new Map<string, { visits: number, conv: number }>();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const display = d.toLocaleString('id-ID', { day: 'numeric', month: 'short' });
    if (!trafficMap.has(display)) {
       trafficMap.set(display, { visits: 0, conv: 0 });
    }
  }

  (visitors ?? []).forEach(v => {
    if (v.first_seen) {
      const d = new Date(v.first_seen);
      const display = d.toLocaleString('id-ID', { day: 'numeric', month: 'short' });
      const entry = trafficMap.get(display);
      if (entry) entry.visits += 1;
    }
  });

  (sessions ?? []).forEach(s => {
    if (s.started_at) {
      const d = new Date(s.started_at);
      const display = d.toLocaleString('id-ID', { day: 'numeric', month: 'short' });
      const entry = trafficMap.get(display);
      // Asumsi konversi jika durasi > 5 detik
      if (entry && typeof s.duration_seconds === 'number' && s.duration_seconds > 5) {
        entry.conv += 1;
      }
    }
  });

  const trafficData = Array.from(trafficMap.entries()).map(([d, val]) => ({
    d,
    visits: val.visits,
    conv: val.conv
  }));

  // Generate Insights based on real data
  const insightsData: any[] = [];
  if (Number(bounceRate) > 60) {
    insightsData.push({
      level: "kritis" as const,
      title: "Tingkat pentalan tinggi",
      desc: `Sebanyak ${bounceRate}% pengunjung pergi sebelum 5 detik.`,
      confidence: 88,
      impact: "Perbaiki hook utama"
    });
  }
  if (totalSessions > 0 && avgDuration > 30) {
    insightsData.push({
      level: "peluang" as const,
      title: "Audiens tertarik membaca konten",
      desc: `Rata-rata audiens membaca landing page lebih dari 30 detik.`,
      confidence: 90,
      impact: "Sangat baik"
    });
  }
  if (insightsData.length === 0) {
    insightsData.push({
      level: "peringatan" as const,
      title: "Belum cukup data",
      desc: "Tunggu lebih banyak pengunjung untuk diagnosa yang akurat.",
      confidence: 100,
      impact: "Data kurang"
    });
  }

  return (
    <DashboardContent
      siteId={site.id}
      totalVisitsFormatted={totalVisitors.toLocaleString("id-ID")}
      kpis={kpis}
      sectionRows={sectionRows}
      trafficData={trafficData}
      insightsData={insightsData}
    />
  );
}
