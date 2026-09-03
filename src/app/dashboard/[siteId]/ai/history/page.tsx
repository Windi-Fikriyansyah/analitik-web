import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { C } from '@/lib/colors';
import Link from 'next/link';
import { FileText, Calendar, ArrowLeft } from 'lucide-react';

export const revalidate = 0; // Don't cache this page

export default async function AIHistoryPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  // Fetch AI reports history for this site
  const { data: reports } = await supabase
    .from('ai_reports')
    .select('id, created_at, conversion_score, summary')
    .eq('site_id', site.id)
    .order('created_at', { ascending: false });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingTop: 10 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .history-card:hover {
          border-color: ${C.moss} !important;
        }
      `}} />
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href={`/dashboard/${site.id}/ai`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, textDecoration: 'none', fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
            <ArrowLeft size={14} />
            Kembali ke Diagnosa AI
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: C.ink, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={24} color={C.moss} />
            Riwayat Laporan AI
          </h1>
          <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Daftar laporan analisa AI yang pernah Anda lakukan untuk penyewa ini. Membuka laporan lama tidak akan mengurangi kuota bulanan Anda.
          </p>
        </div>
      </div>

      {(!reports || reports.length === 0) ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: 12 }}>
          <FileText size={48} color={C.line} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>Belum ada riwayat laporan</h3>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px' }}>Lakukan Diagnosa AI pertama Anda untuk melihat laporan di sini.</p>
          <Link 
            href={`/dashboard/${site.id}/ai`}
            style={{ display: 'inline-flex', padding: '10px 16px', background: C.moss, color: '#fff', textDecoration: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 }}
          >
            Mulai Diagnosa AI
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {reports.map((report) => {
            const date = new Date(report.created_at);
            const formattedDate = new Intl.DateTimeFormat('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }).format(date);

            let scoreColor = C.red;
            if (report.conversion_score >= 80) scoreColor = C.moss;
            else if (report.conversion_score >= 60) scoreColor = C.brass;

            return (
              <Link 
                key={report.id} 
                href={`/dashboard/${site.id}/ai/history/${report.id}`}
                className="history-card"
                style={{ 
                  display: 'flex', alignItems: 'flex-start', gap: 20,
                  padding: 24, background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: 12,
                  textDecoration: 'none', transition: 'border-color 0.2s'
                }}
              >
                <div style={{ 
                  width: 56, height: 56, borderRadius: '50%', background: `${scoreColor}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, border: `2px solid ${scoreColor}30`
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>
                    {report.conversion_score}
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Calendar size={14} color={C.faint} />
                    <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{formattedDate} WIB</span>
                  </div>
                  <p style={{ fontSize: 14.5, color: C.ink, margin: 0, lineHeight: 1.6 }}>
                    {report.summary}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
