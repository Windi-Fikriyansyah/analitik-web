import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import AIAnalysisContent from '@/components/AIAnalysisContent';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { C } from '@/lib/colors';

export const revalidate = 0;

export default async function AIReportViewPage({ 
  params 
}: { 
  params: { siteId: string, reportId: string } 
}) {
  const supabase = getSupabaseServer();

  // Validate site ownership implicitly by querying through RLS
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  // Fetch the specific report
  const { data: report } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('id', params.reportId)
    .eq('site_id', params.siteId)
    .maybeSingle();

  if (!report) notFound();

  // Reconstruct the result format expected by AIAnalysisContent
  const initialResult = {
    conversionScore: report.conversion_score,
    summary: report.summary,
    insights: report.insights,
    recommendations: report.recommendations,
  };

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(report.created_at));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link 
          href={`/dashboard/${params.siteId}/ai/history`} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          Kembali ke Riwayat
        </Link>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <div style={{ padding: '12px 16px', background: `${C.moss}10`, border: `1px solid ${C.moss}30`, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.moss }}>Laporan diarsipkan:</span>
            <span style={{ fontSize: 13, color: C.moss }}>{formattedDate} WIB</span>
          </div>
        </div>
      </div>

      <AIAnalysisContent 
        siteId={params.siteId} 
        initialResult={initialResult}
        isHistory={true} 
      />
    </div>
  );
}
