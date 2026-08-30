import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { C } from '@/lib/colors';
import TrackingSnippet from '@/components/TrackingSnippet';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  return (
    <div style={{ paddingTop: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: C.ink }}>Pengaturan Penyewa</h2>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
        Kelola preferensi domain dan skrip pelacakan untuk penyewa ini.
      </p>

      <div style={{ display: 'grid', gap: 24, maxWidth: 700 }}>
        <div style={{ padding: 24, border: `1px solid ${C.line}`, borderRadius: 8, background: '#FFFFFF' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Detail Domain</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
              <span style={{ color: C.muted }}>Nama Penyewa</span>
              <span style={{ fontWeight: 600 }}>{site.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
              <span style={{ color: C.muted }}>Domain</span>
              <span style={{ fontWeight: 600 }}>{site.domain || 'Belum diatur'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
              <span style={{ color: C.muted }}>Site ID</span>
              <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{site.id}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: 24, border: `1px solid ${C.line}`, borderRadius: 8, background: '#FFFFFF' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Cara Memasang Skrip Pelacakan</h3>
          <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Salin kode di bawah ini dan tempelkan ke dalam kode HTML website Anda. Pastikan elemen yang ingin Anda lacak sudah ditambahkan atribut <code>data-lp-section</code> (untuk melacak waktu audiens membaca/melihat bagian tertentu) atau <code>data-lp-button</code> (untuk melacak klik tombol).
          </p>
          <TrackingSnippet siteId={site.id} />
        </div>
      </div>
    </div>
  );
}
