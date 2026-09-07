import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { C } from '@/lib/colors';
import TrackingSnippet from '@/components/TrackingSnippet';
import SiteSettingsForm from '@/components/SiteSettingsForm';
import DeleteSiteButton from '@/components/DeleteSiteButton';
import MetaAdsDataViewer from '@/components/MetaAdsDataViewer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  let { data: site, error } = await supabase
    .from('sites')
    .select('id, name, domain, zernio_api_key, meta_connected_account')
    .eq('id', params.siteId)
    .maybeSingle();

  let migrationPending = false;
  if (error && error.code === '42703') {
    migrationPending = true;
    const fallback = await supabase
      .from('sites')
      .select('id, name, domain')
      .eq('id', params.siteId)
      .maybeSingle();
    site = fallback.data
      ? {
          ...fallback.data,
          zernio_api_key: null,
          meta_connected_account: null,
        }
      : null;
  }

  if (!site) notFound();

  const isMetaConnected = Boolean(site.meta_connected_account);
  const connectedAccount = site.meta_connected_account as Record<string, any> | null;
  const initialSelectedPixel = connectedAccount?.selectedPixel || null;
  const initialSelectedAudiences = connectedAccount?.selectedAudiences || [];

  return (
    <div style={{ paddingTop: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: C.ink }}>Pengaturan Penyewa</h2>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
        Kelola preferensi domain, integrasi Meta Ads, data pixel, dan custom audience untuk penyewa ini.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMetaConnected ? 'repeat(auto-fit, minmax(420px, 1fr))' : 'minmax(0, 700px)',
          gap: 24,
          alignItems: 'start',
          maxWidth: isMetaConnected ? 1320 : 700,
        }}
      >
        {/* Kolom Kiri: Detail Domain & Integrasi Meta Ads, Skrip Pelacakan, Hapus Penyewa */}
        <div style={{ display: 'grid', gap: 24 }}>
          <div style={{ padding: 24, border: `1px solid ${C.line}`, borderRadius: 8, background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Detail Domain & Integrasi Meta Ads</h3>
            <SiteSettingsForm site={site} migrationPending={migrationPending} />
            
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ color: C.muted, fontSize: 13.5 }}>Site ID</span>
               <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{site.id}</span>
            </div>
          </div>

          <div style={{ padding: 24, border: `1px solid ${C.line}`, borderRadius: 8, background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Cara Memasang Skrip Pelacakan</h3>
            <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
              Salin kode di bawah ini dan tempelkan ke dalam kode HTML website Anda. Pastikan elemen yang ingin Anda lacak sudah ditambahkan atribut <code>data-lp-section</code> (untuk melacak waktu audiens membaca/melihat bagian tertentu) atau <code>data-lp-button</code> (untuk melacak klik tombol).
            </p>
            <TrackingSnippet siteId={site.id} />
          </div>

          <DeleteSiteButton siteId={site.id} />
        </div>

        {/* Kolom Kanan: Data Custom Audience & Data Pixel Meta Ads */}
        {isMetaConnected && (
          <div style={{ display: 'grid', gap: 24 }}>
            <MetaAdsDataViewer
              siteId={site.id}
              isConnected={true}
              initialSelectedPixel={initialSelectedPixel}
              initialSelectedAudiences={initialSelectedAudiences}
            />
          </div>
        )}
      </div>
    </div>
  );
}
