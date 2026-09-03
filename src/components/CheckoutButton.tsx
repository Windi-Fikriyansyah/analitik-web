'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C } from '@/lib/colors';

export default function CheckoutButton({ 
  siteId, 
  planName, 
  amount,
  isCurrent
}: { 
  siteId: string, 
  planName: string, 
  amount: number,
  isCurrent: boolean
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (isCurrent) {
    return (
      <button disabled style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#f3f4f6', color: C.faint, border: 'none', fontWeight: 600, fontSize: 14 }}>
        Paket Saat Ini
      </button>
    );
  }

  // Free doesn't need checkout
  if (amount === 0) {
    return (
      <button disabled style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#f3f4f6', color: C.faint, border: 'none', fontWeight: 600, fontSize: 14 }}>
        Versi Berbayar Diperlukan
      </button>
    );
  }

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_name: planName, amount })
      });
      const data = await res.json();
      
      if (res.ok && data.invoiceId) {
        router.push(`/checkout/${data.invoiceId}`);
      } else {
        alert(data.error || 'Terjadi kesalahan saat memproses pembayaran');
        setLoading(false);
      }
    } catch (err) {
      alert('Koneksi ke server gagal');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleUpgrade}
      disabled={loading}
      style={{ 
        width: '100%', padding: '12px', borderRadius: 8, 
        background: C.ink, color: '#fff', border: 'none', 
        fontWeight: 600, fontSize: 14, cursor: loading ? 'wait' : 'pointer',
        transition: 'opacity 0.2s',
        opacity: loading ? 0.7 : 1
      }}
    >
      {loading ? 'Memproses...' : `Upgrade ke ${planName}`}
    </button>
  );
}
