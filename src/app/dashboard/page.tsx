import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardContent from '@/components/DashboardContent';
import OnboardingModal from '@/components/OnboardingModal';

export const dynamic = 'force-dynamic';

export default async function DashboardIndexPage() {
  const supabase = getSupabaseServer();
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, domain, created_at')
    .order('created_at', { ascending: false });

  // Jika sudah ada project/site, langsung redirect ke site pertama
  if (sites && sites.length > 0) {
    redirect(`/dashboard/${sites[0].id}`);
  }

  // Jika belum ada project/site, tampilkan dashboard (seperti tampilan [siteId]) + Modal Onboarding
  const demoSite = { id: 'new', name: 'Situs Baru' };

  const emptyKpis = [
    { label: "Kunjungan", value: "0", delta: "", up: true },
    { label: "Sesi", value: "0", delta: "", up: true },
    { label: "Durasi Rata-rata", value: "0s", delta: "", up: true },
    { label: "Pentalan", value: "0%", delta: "", up: false },
  ];

  return (
    <DashboardLayout currentSite={demoSite} sites={[]}>
      <DashboardContent
        siteId="new"
        totalVisitsFormatted="0"
        kpis={emptyKpis}
        sectionRows={[]}
        buttonRows={[]}
        trafficData={[]}
        insightsData={[]}
      />
      <OnboardingModal />
    </DashboardLayout>
  );
}
