import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { C } from '@/lib/colors';

export const dynamic = 'force-dynamic';

export default async function PagesOverviewPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  const { data: sections } = await supabase
    .from('section_stats')
    .select('section_id, visitor_count, avg_duration_seconds')
    .eq('site_id', site.id)
    .order('visitor_count', { ascending: false });

  return (
    <div style={{ paddingTop: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: C.ink }}>Halaman Arahan & Bagian</h2>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
        Daftar bagian (section) landing page yang sedang dipantau oleh pelacak aktif.
      </p>

      <div className="table-scroll">
        <table className="pages-table">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th style={{ textAlign: 'left', padding: '0 0 10px', fontSize: 11.5, color: C.faint, fontWeight: 500 }}>ID Bagian</th>
              <th style={{ textAlign: 'left', padding: '0 0 10px', fontSize: 11.5, color: C.faint, fontWeight: 500 }}>Total Pengunjung</th>
              <th style={{ textAlign: 'left', padding: '0 0 10px', fontSize: 11.5, color: C.faint, fontWeight: 500 }}>Rata-rata Waktu</th>
            </tr>
          </thead>
          <tbody>
            {(!sections || sections.length === 0) ? (
              <tr>
                <td colSpan={3} style={{ padding: '24px 0', textDecoration: 'none', color: C.faint, fontSize: 13 }}>
                  Belum ada bagian yang terdeteksi. Pasang tag <code>data-lp-section</code> pada landing page Anda.
                </td>
              </tr>
            ) : (
              sections.map((s) => (
                <tr key={s.section_id} className="rowline" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td style={{ padding: '13px 20px 13px 0', fontWeight: 600 }}>{s.section_id}</td>
                  <td className="mono" style={{ padding: '13px 20px 13px 0' }}>{s.visitor_count.toLocaleString('id-ID')}</td>
                  <td className="mono" style={{ padding: '13px 0' }}>{Number(s.avg_duration_seconds ?? 0).toFixed(1)}s</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
