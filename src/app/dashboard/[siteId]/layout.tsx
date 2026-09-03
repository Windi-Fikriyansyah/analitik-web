import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import DashboardLayout from '@/components/DashboardLayout';

export const revalidate = 30;

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

  // Fetch user subscription for the sidebar
  const { data: { user } } = await supabase.auth.getUser();
  let currentPlan = 'FREE';
  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('plan_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (sub?.plan_name) {
      currentPlan = sub.plan_name;
    }
  }

  return (
    <DashboardLayout currentSite={currentSite} sites={sites ?? []} currentPlan={currentPlan}>
      {children}
    </DashboardLayout>
  );
}
