import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import AIAnalysisContent from '@/components/AIAnalysisContent';

export const revalidate = 30;

export default async function AIDiagnosisPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  return <AIAnalysisContent siteId={site.id} />;
}
