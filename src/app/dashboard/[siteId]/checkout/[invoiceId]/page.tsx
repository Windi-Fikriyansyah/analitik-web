import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import CheckoutClient from '@/components/CheckoutClient';

export const revalidate = 0;

export default async function CheckoutPage({ params }: { params: { siteId: string, invoiceId: string } }) {
  const supabase = getSupabaseServer();

  // Validate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.invoiceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!invoice) notFound();

  return <CheckoutClient siteId={params.siteId} initialInvoice={invoice} />;
}
