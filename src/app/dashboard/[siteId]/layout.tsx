import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import DashboardLayout from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

export default async function SiteDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { siteId: string };
}) {
  const supabase = getSupabaseServer();

  // Fetch all sites for the tenant switcher
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .order('created_at', { ascending: false });

  // Fetch the current site
  const { data: currentSite } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!currentSite) {
    notFound();
  }

  return (
    <DashboardLayout currentSite={currentSite} sites={sites ?? []}>
      {children}
    </DashboardLayout>
  );
}
