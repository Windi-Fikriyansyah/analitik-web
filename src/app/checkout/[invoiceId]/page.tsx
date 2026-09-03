import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import CheckoutClient from '@/components/CheckoutClient';
import Script from 'next/script';

export const revalidate = 0;

export default async function StandaloneCheckoutPage({ params }: { params: { invoiceId: string } }) {
  const supabase = getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.invoiceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: site } = await supabase.from('sites').select('id').eq('owner_id', user.id).limit(1).maybeSingle();
  const siteId = site?.id || '';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..700;1,400..700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <div className="bg-surface-container-low text-on-surface antialiased min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary">
        <header className="w-full bg-surface border-b border-surface-container-highest docked full-width top-0 z-40">
          <div className="flex justify-between items-center w-full px-8 py-4 max-w-[1360px] mx-auto">
            <div className="font-headline-md text-[24px] tracking-wider text-on-surface font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
              Booknesia
            </div>
            <div className="flex items-center gap-3 text-secondary">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container border border-surface-container-highest rounded-lg text-[11px] font-medium text-primary">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Enkripsi 256-Bit SSL & Garansi Pembayaran</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow max-w-[1360px] w-full mx-auto px-4 sm:px-8 py-8 md:py-12">
          <CheckoutClient siteId={siteId} initialInvoice={invoice} />
        </main>

        <footer className="w-full bg-surface-container-low border-t border-surface-container-highest mt-16 docked full-width bottom">
          <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 py-8 max-w-[1360px] mx-auto gap-4">
            <p className="text-secondary text-[11px] font-medium">
              © 2024 Atelier Épure. Seluruh hak cipta dilindungi. Transaksi aman terenkripsi 256-bit.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <a className="text-secondary text-[11px] font-medium hover:underline transition-all duration-150" href="#">Ketentuan Layanan</a>
              <a className="text-secondary text-[11px] font-medium hover:underline transition-all duration-150" href="#">Kebijakan Privasi</a>
              <a className="text-secondary text-[11px] font-medium hover:underline transition-all duration-150" href="#">Keamanan Pembayaran</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
