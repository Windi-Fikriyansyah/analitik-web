'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

type Invoice = {
  id: string;
  plan_name: string;
  status: string;
  amount: number;
  payment_method: string | null;
  payment_number: string | null;
};

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS', logo: '/qris.svg' },
  { id: 'bni_va', label: 'BNI Virtual Account', logo: 'https://www.google.com/s2/favicons?domain=bni.co.id&sz=64' },
  { id: 'bri_va', label: 'BRI Virtual Account', logo: 'https://www.google.com/s2/favicons?domain=bri.co.id&sz=64' },
  { id: 'cimb_niaga_va', label: 'CIMB Niaga Virtual Account', logo: 'https://www.google.com/s2/favicons?domain=cimbniaga.co.id&sz=64' },
  { id: 'permata_va', label: 'Permata Virtual Account', logo: 'https://www.google.com/s2/favicons?domain=permatabank.com&sz=64' },
];

export default function CheckoutClient({ 
  siteId, 
  initialInvoice 
}: { 
  siteId: string, 
  initialInvoice: Invoice 
}) {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [selectedMethod, setSelectedMethod] = useState<string>('qris');
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const supabase = getSupabaseBrowser();

  const handleCopy = () => {
    if (invoice.payment_number) {
      navigator.clipboard.writeText(invoice.payment_number);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getAdminFee = (methodId: string, baseAmount: number) => {
    if (!methodId) return 0;
    if (methodId === 'qris') {
      return Math.ceil(baseAmount * 0.007) + 310;
    }
    return 3500; // All Virtual Accounts are Rp 3.500
  };

  const adminFee = getAdminFee(invoice.payment_number ? (invoice.payment_method || 'qris') : selectedMethod, invoice.amount);
  const totalAmount = invoice.amount + adminFee;

  useEffect(() => {
    if (invoice.status !== 'pending' || !invoice.payment_number) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', invoice.id)
        .single();
      
      if (!error && data) {
        if (data.status !== invoice.status) {
          setInvoice(prev => ({ ...prev, status: data.status }));
        }
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [invoice.id, invoice.status, invoice.payment_number, supabase]);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, payment_method: selectedMethod })
      });
      const data = await res.json();

      if (res.ok && data.payment) {
        setInvoice(prev => ({
          ...prev,
          payment_method: selectedMethod,
          payment_number: data.payment.payment_number
        }));
      } else {
        alert(data.error || 'Terjadi kesalahan saat memproses metode pembayaran');
      }
    } catch (err) {
      alert('Koneksi ke server gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav aria-label="Alur Pembelian" className="mb-8 border-b border-surface-container-highest pb-4">
        <ol className="flex flex-wrap items-center gap-2 md:gap-3 text-[11px] md:text-label-md font-label-md">
          <li className="flex items-center gap-1.5 md:gap-2 text-secondary">
            <span className="flex items-center gap-1.5 opacity-50">
              <span className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-secondary flex items-center justify-center text-[9px] md:text-[11px]">
                <span className="material-symbols-outlined text-[12px] md:text-[14px]">check</span>
              </span>
              <span>Pilih Paket</span>
            </span>
          </li>
          <li className="text-secondary">/</li>
          
          {!invoice.payment_number ? (
            <>
              <li aria-current="step" className="flex items-center gap-1.5 md:gap-2 text-primary font-semibold border-b border-primary pb-0.5">
                <span className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[9px] md:text-[11px]">2</span>
                <span>Pembayaran</span>
              </li>
              <li className="text-secondary">/</li>
              <li className="flex items-center gap-1.5 md:gap-2 text-secondary opacity-50">
                <span className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-secondary flex items-center justify-center text-[9px] md:text-[11px]">3</span>
                <span>Konfirmasi</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-1.5 md:gap-2 text-secondary">
                <span className="flex items-center gap-1.5 opacity-50">
                  <span className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-secondary flex items-center justify-center text-[9px] md:text-[11px]">
                    <span className="material-symbols-outlined text-[12px] md:text-[14px]">check</span>
                  </span>
                  <span>Pembayaran</span>
                </span>
              </li>
              <li className="text-secondary">/</li>
              <li aria-current="step" className="flex items-center gap-1.5 md:gap-2 text-primary font-semibold border-b border-primary pb-0.5">
                <span className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[9px] md:text-[11px]">3</span>
                <span>Konfirmasi</span>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="max-w-[840px] mx-auto w-full bg-surface border border-surface-container-highest rounded-lg p-6 md:p-10 space-y-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-surface-container-highest pb-6 gap-2">
          <div>
            <span className="text-caption font-caption text-secondary uppercase tracking-wider">Pembayaran Langganan</span>
            <h2 className="font-headline-md text-[20px] md:text-[24px] text-on-surface mt-1">Konfirmasi & Metode Pembayaran</h2>
          </div>
          <div className="flex items-center gap-1.5 text-caption font-caption text-secondary">
            <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
            <span>Enkripsi Standar PCI-DSS</span>
          </div>
        </div>

        {invoice.status === 'completed' ? (
          <div className="bg-[#ecfdf5] text-[#059669] p-8 rounded-lg border border-[#10b981] text-center space-y-4">
            <div className="flex justify-center mb-4">
              <svg className="w-24 h-24 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes checkmark {
                    0% { stroke-dashoffset: 24; }
                    100% { stroke-dashoffset: 0; }
                  }
                  @keyframes circle {
                    0% { transform: scale(0); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                  }
                  .animate-circle {
                    animation: circle 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    transform-origin: center;
                  }
                  .animate-check {
                    stroke-dasharray: 24;
                    stroke-dashoffset: 24;
                    animation: checkmark 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.3s forwards;
                  }
                `}} />
                <circle cx="12" cy="12" r="10" strokeWidth="1.5" className="animate-circle" stroke="#10b981" fill="#d1fae5"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" className="animate-check" d="M7.5 12.5l3 3 6-6" />
              </svg>
            </div>
            <h3 className="text-[20px] font-semibold m-0">Pembayaran Berhasil!</h3>
            <p className="m-0">Paket {invoice.plan_name} Anda telah aktif.</p>
            <a href={siteId ? `/dashboard/${siteId}/billing` : '/dashboard'} className="inline-block mt-4 bg-primary text-on-primary px-6 py-3 rounded-lg no-underline font-semibold text-[14px]">
              Masuk ke Dashboard
            </a>
          </div>
        ) : invoice.status === 'failed' || invoice.status === 'canceled' ? (
          <div className="bg-[#fef2f2] text-[#dc2626] p-8 rounded-lg border border-[#ef4444] text-center space-y-4">
            <div className="text-[48px] mb-2">❌</div>
            <h3 className="text-[20px] font-semibold m-0">Pembayaran Gagal</h3>
            <p className="m-0">Silakan coba lakukan pembayaran lagi.</p>
            <a href={siteId ? `/dashboard/${siteId}/billing` : '/dashboard'} className="inline-block mt-4 bg-[#dc2626] text-white px-6 py-3 rounded-lg no-underline font-semibold text-[14px]">
              Kembali
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h3 className="text-label-md font-label-md text-on-surface uppercase tracking-wider">
                {!invoice.payment_number ? 'Pilih Metode Auto-Debit' : 'Selesaikan Pembayaran'}
              </h3>
              
              {!invoice.payment_number ? (
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(method => (
                    <div key={method.id} className={`border rounded-lg overflow-hidden ${selectedMethod === method.id ? 'border-primary' : 'border-surface-container-highest'}`}>
                      <label className="flex items-center justify-between p-4 bg-surface hover:bg-surface-container-low cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <input 
                            className="w-4 h-4 text-primary border-on-surface focus:ring-0" 
                            name="payment_channel" 
                            type="radio"
                            value={method.id}
                            checked={selectedMethod === method.id}
                            onChange={(e) => setSelectedMethod(e.target.value)}
                          />
                          <span className="font-semibold text-[14px] text-on-surface">{method.label}</span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={method.logo} alt={method.label} className="h-6 object-contain" />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-primary rounded-lg p-6 bg-surface-container-low text-center">
                  {invoice.payment_method === 'qris' ? (
                    <div className="flex flex-col items-center">
                      <div className="mb-4 text-caption font-caption text-secondary uppercase tracking-wider">
                        Scan QRIS via M-Banking / E-Wallet
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-surface-container-highest inline-block shadow-sm">
                        <QRCodeSVG value={invoice.payment_number} size={200} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="mb-4 text-caption font-caption text-secondary uppercase tracking-wider">
                        Nomor Virtual Account
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-full overflow-hidden">
                        <div className="bg-white px-4 md:px-6 py-3 md:py-4 rounded-lg border border-surface-container-highest shadow-sm font-headline-lg font-bold tracking-widest text-on-surface text-[18px] md:text-[24px] w-full text-center overflow-x-auto">
                          {invoice.payment_number}
                        </div>
                        <button 
                          onClick={handleCopy}
                          className="w-full sm:w-auto p-3 md:p-4 rounded-lg border border-surface-container-highest bg-white hover:bg-surface-container-low transition-colors text-secondary flex items-center justify-center shadow-sm shrink-0"
                          title="Salin nomor"
                        >
                          {isCopied ? (
                            <span className="material-symbols-outlined text-primary text-[20px] md:text-[24px]">check</span>
                          ) : (
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">content_copy</span>
                          )}
                        </button>
                      </div>
                      <div className="text-[13px] text-secondary mt-3">
                        Salin nomor di atas dan bayar melalui ATM/Internet Banking Anda.
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex items-center justify-center gap-2 text-[11px] md:text-[13px] text-primary font-medium bg-primary-fixed bg-opacity-20 py-2 px-3 md:px-4 rounded-lg border border-primary-fixed w-full text-center">
                    <span className="material-symbols-outlined text-[14px] md:text-[16px] animate-spin shrink-0">refresh</span>
                    Menunggu pembayaran... (Otomatis memuat ulang)
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-surface-container-highest space-y-3">
              <h3 className="text-label-md font-label-md text-on-surface uppercase tracking-wider mb-2">Rincian Pembayaran</h3>
              <div className="flex justify-between text-body-md text-secondary">
                <span>Paket {invoice.plan_name}</span>
                <span className="text-on-surface font-medium">Rp {invoice.amount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-body-md text-secondary">
                <span>Biaya Layanan</span>
                <span className="text-on-surface font-medium">Rp {adminFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-baseline pt-4 border-t border-surface-container-highest text-on-surface gap-2 sm:gap-0">
                <span className="font-headline-md text-[18px] md:text-[20px]">Total</span>
                <div className="text-left sm:text-right">
                  <span className="font-headline-lg text-[28px] md:text-[36px] font-semibold tracking-tight text-on-surface block leading-none">Rp {totalAmount.toLocaleString('id-ID')}</span>
                  <span className="text-caption font-caption text-secondary mt-1 block">Termasuk biaya gateway</span>
                </div>
              </div>
            </div>

            {!invoice.payment_number && (
              <div className="space-y-4 pt-2">
                <button 
                  onClick={handlePay}
                  disabled={loading}
                  className="w-full h-12 bg-on-surface text-surface hover:bg-on-surface-variant text-label-md font-label-md uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm disabled:opacity-70 disabled:cursor-wait" 
                  type="button"
                >
                  <span>{loading ? 'Memproses...' : `Konfirmasi Pembayaran — Rp ${totalAmount.toLocaleString('id-ID')}`}</span>
                  {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
                <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-caption font-caption text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">security</span>
                    <span>Transaksi Aman & Transparan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
                    <span>Enkripsi 256-Bit</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
