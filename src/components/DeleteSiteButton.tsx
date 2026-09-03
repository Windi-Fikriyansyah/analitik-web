'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { C } from '@/lib/colors';

export default function DeleteSiteButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      'Apakah Anda yakin ingin menghapus penyewa ini? Semua data analitik, event, dan heatmap yang terkait akan dihapus secara permanen. Tindakan ini TIDAK BISA dibatalkan.'
    );

    if (!confirmDelete) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Gagal menghapus penyewa');
      }

      alert('Penyewa berhasil dihapus.');
      // Arahkan kembali ke dashboard utama yang akan merender ulang daftar site atau membuat site baru
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 24, padding: 24, border: `1px solid ${C.red}40`, borderRadius: 8, background: '#FEF2F2' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: C.red }}>Zona Berbahaya (Danger Zone)</h3>
      <p style={{ fontSize: 13.5, color: '#991B1B', marginBottom: 16, lineHeight: 1.5 }}>
        Menghapus penyewa (project) ini akan menghapus semua data rekaman analitik, sesi, *heatmap*, dan pengaturan secara permanen dari server. Tindakan ini tidak dapat dipulihkan.
      </p>

      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', background: C.red, color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          fontFamily: "'Work Sans', sans-serif"
        }}
      >
        <Trash2 size={16} />
        {loading ? 'Menghapus...' : 'Hapus Penyewa Secara Permanen'}
      </button>
    </div>
  );
}
