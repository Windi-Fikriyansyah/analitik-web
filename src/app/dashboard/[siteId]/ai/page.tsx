import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { C } from '@/lib/colors';
import { Gauge, CircleAlert, TriangleAlert, Lightbulb } from 'lucide-react';

export const revalidate = 30;

const INSIGHTS = [
  { level: "kritis" as const, title: "CTA utama tenggelam di lipatan kedua",
    desc: "68% pengunjung mobile keluar sebelum tombol “Mulai Coba Gratis” terlihat.",
    confidence: 91, impact: "+2,1 pp konversi mobile" },
  { level: "peringatan" as const, title: "Waktu muat hero image 3,4 detik",
    desc: "Halaman memuat gambar tanpa kompresi, berkorelasi dengan lonjakan pentalan.",
    confidence: 84, impact: "-120 sesi per minggu" },
  { level: "peluang" as const, title: "Segmen referral punya intensi tertinggi",
    desc: "Pengunjung dari tautan referral bertahan 2,3x lebih lama di halaman harga.",
    confidence: 77, impact: "+540 prospek" },
  { level: "peluang" as const, title: "Judul varian B unggul signifikan",
    desc: "Uji A/B pada webinar: varian B menang dengan keyakinan statistik tinggi.",
    confidence: 96, impact: "Jadikan default" },
];

const LEVEL = {
  kritis: { color: C.red, icon: CircleAlert, label: "Kritis" },
  peringatan: { color: C.brass, icon: TriangleAlert, label: "Peringatan" },
  peluang: { color: C.moss, icon: Lightbulb, label: "Peluang" },
};

export default async function AIDiagnosisPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Gauge size={22} color={C.red} />
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.ink }}>Diagnosa AI & Rekomendasi Optimization</h2>
      </div>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
        Analisis otomatis berbasis heuristik perilaku audiens untuk meningkatkan tingkat konversi.
      </p>

      <div style={{ display: 'grid', gap: 18, maxWidth: 800 }}>
        {INSIGHTS.map((ins, i) => {
          const s = LEVEL[ins.level];
          const Icon = s.icon;
          return (
            <div key={i} style={{ padding: 20, border: `1px solid ${C.line}`, borderRadius: 8, background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.color, fontSize: 13, fontWeight: 600 }}>
                  <Icon size={16} /> {s.label}
                </span>
                <span className="mono" style={{ fontSize: 12, color: C.faint }}>{ins.confidence}% keyakinan</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: C.ink }}>{ins.title}</h3>
              <p style={{ fontSize: 13.5, color: C.muted, margin: '0 0 10px', lineHeight: 1.5 }}>{ins.desc}</p>
              <div style={{ fontSize: 13, color: s.color, fontWeight: 600, background: 'rgba(34,31,25,0.03)', display: 'inline-block', padding: '4px 10px', borderRadius: 4 }}>
                Estimasi Dampak: {ins.impact}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
