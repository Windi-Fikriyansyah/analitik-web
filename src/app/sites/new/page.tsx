'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TrackingSnippet from '@/components/TrackingSnippet';
import { C } from '@/lib/colors';

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSiteId, setCreatedSiteId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, domain }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'Gagal membuat penyewa');
      return;
    }

    setCreatedSiteId(json.site.id);
  }

  if (createdSiteId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.paper, fontFamily: "'Work Sans', sans-serif" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; }
          .mono { font-family: 'Space Mono', monospace; }
        ` }} />
        <div style={{ width: '100%', maxWidth: 700, background: '#FFFFFF', borderRadius: 8, border: `1px solid ${C.line}`, padding: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: C.ink }}>Penyewa Anda siap 🎉</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px' }}>
            Salin kode berikut ke dalam halaman landing Anda, tepat sebelum <code>&lt;/body&gt;</code>.
          </p>

          <TrackingSnippet siteId={createdSiteId} />

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              onClick={() => router.push(`/dashboard/${createdSiteId}`)}
              style={{ background: C.moss, color: C.paper, border: 'none', padding: '10px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Ke dashboard penyewa
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink, padding: '10px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Kembali ke daftar penyewa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.paper, fontFamily: "'Work Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .mono { font-family: 'Space Mono', monospace; }
        input:focus { outline: none; border-color: ${C.moss} !important; }
      ` }} />
      <div style={{ width: '100%', maxWidth: 440, background: '#FFFFFF', borderRadius: 8, border: `1px solid ${C.line}`, padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 24px', color: C.ink }}>Buat penyewa baru</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.ink }}>Nama penyewa</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Landing Page Produk A"
              style={{ width: '100%', borderRadius: 6, border: `1px solid ${C.line}`, padding: '10px 12px', fontSize: 14, fontFamily: "'Work Sans', sans-serif" }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.ink }}>Domain (opsional)</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mylandingpage.com"
              style={{ width: '100%', borderRadius: 6, border: `1px solid ${C.line}`, padding: '10px 12px', fontSize: 14, fontFamily: "'Work Sans', sans-serif" }}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: C.red, margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', borderRadius: 6, background: C.ink, padding: '10px 0', 
              fontSize: 14, fontWeight: 600, color: '#FFF', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 8
            }}
          >
            {loading ? 'Membuat…' : 'Buat penyewa'}
          </button>
        </form>
      </div>
    </div>
  );
}
