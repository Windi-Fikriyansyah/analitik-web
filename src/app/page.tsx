import Link from 'next/link';
import { Activity, BarChart3, MousePointerClick, Gauge, Shield, Zap, ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react';

const C = {
  paper: "#F6F3EA",
  line: "#E3DCC9",
  ink: "#221F19",
  muted: "#6E6650",
  faint: "#9A927A",
  red: "#B23A2A",
  moss: "#4C6444",
  brass: "#A87C2C",
  screen: "#151F17",
  phosphor: "#9AC98F",
};

export default function HomePage() {
  return (
    <main style={{ background: C.paper, color: C.ink, fontFamily: "'Work Sans', sans-serif", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .mono { font-family: 'Space Mono', monospace; }

        /* Animations */
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes wave-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .fade-up { animation: fadeUp 0.7s ease-out backwards; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .fade-up-4 { animation-delay: 0.4s; }
        .fade-up-5 { animation-delay: 0.5s; }

        .cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; background: ${C.red}; color: #fff;
          border: none; border-radius: 8px; font-size: 15.5px; font-weight: 700;
          font-family: 'Work Sans', sans-serif; text-decoration: none;
          cursor: pointer; transition: all 0.2s ease;
          box-shadow: 0 2px 12px rgba(178,58,42,0.2);
        }
        .cta-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(178,58,42,0.3); }

        .cta-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 14px 28px; background: transparent; color: ${C.ink};
          border: 1.5px solid ${C.line}; border-radius: 8px; font-size: 15px; font-weight: 600;
          font-family: 'Work Sans', sans-serif; text-decoration: none;
          cursor: pointer; transition: all 0.2s ease;
        }
        .cta-ghost:hover { border-color: ${C.ink}; background: rgba(34,31,25,0.03); }

        .feature-card {
          padding: 28px 24px; border: 1px solid ${C.line}; border-radius: 12px;
          background: #FFFFFF; transition: all 0.25s ease;
        }
        .feature-card:hover { box-shadow: 0 8px 28px rgba(34,31,25,0.08); transform: translateY(-3px); }

        .stat-item { text-align: center; }

        .nav-link {
          font-size: 14px; color: ${C.muted}; text-decoration: none; font-weight: 500;
          transition: color 0.15s ease;
        }
        .nav-link:hover { color: ${C.ink}; }

        .section-pad { max-width: 1100px; margin: 0 auto; padding: 0 28px; }

        .step-card {
          display: flex; align-items: flex-start; gap: 18px;
          padding: 22px 24px; border: 1px solid ${C.line}; border-radius: 10px;
          background: #FFFFFF;
        }

        .check-item { display: flex; align-items: flex-start; gap: 10px; }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-title { font-size: 32px !important; line-height: 1.2 !important; margin-bottom: 16px !important; }
          .hero-sub { font-size: 15px !important; padding: 0 !important; margin-bottom: 24px !important; }
          .features-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .stats-row { grid-template-columns: 1fr !important; gap: 24px !important; padding: 24px !important; }
          .steps-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .cta-row { flex-direction: column !important; width: 100% !important; gap: 12px !important; }
          .cta-btn, .cta-ghost { width: 100% !important; justify-content: center !important; }
          .two-col { grid-template-columns: 1fr !important; gap: 40px !important; }
          .nav-links { display: none !important; }
          .section-pad { padding: 0 20px !important; }
          header .section-pad { padding: 12px 20px !important; }
          section { padding-top: 48px !important; padding-bottom: 48px !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .header-actions { display: none !important; }
        }
      ` }} />

      {/* ========== NAVBAR ========== */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: `${C.paper}E8`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="section-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: C.ink }}>
            <Activity size={20} color={C.red} strokeWidth={2.25} />
            <span className="mono" style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.01em" }}>Booknesia</span>
          </Link>
          <nav className="nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#fitur" className="nav-link">Fitur</a>
            <a href="#cara-kerja" className="nav-link">Cara Kerja</a>
            <a href="#ai" className="nav-link">AI Analysis</a>
            <a href="#harga" className="nav-link">Harga</a>
          </nav>
          <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/login" className="nav-link" style={{ fontWeight: 600 }}>Masuk</Link>
            <Link href="/login" className="cta-btn" style={{ padding: "10px 22px", fontSize: 13.5 }}>
              Mulai Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section style={{ padding: "80px 28px 60px", textAlign: "center" }}>
        <div className="section-pad">
          {/* Badge */}
          <div className="fade-up" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 20, border: `1px solid ${C.line}`,
            background: "#FFFFFF", fontSize: 13, color: C.muted, fontWeight: 500, marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.moss, animation: "pulse-dot 2s infinite" }} />
            Dipercaya pemilik landing page di Indonesia
          </div>

          <h1 className="hero-title fade-up fade-up-1" style={{
            fontSize: 52, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.025em",
            maxWidth: 780, margin: "0 auto 24px",
          }}>
            Tahu Persis Kenapa
            <span style={{ color: C.red }}> Pengunjung Pergi</span>
            <br />Tanpa Konversi
          </h1>

          <p className="hero-sub fade-up fade-up-2" style={{
            fontSize: 18, color: C.muted, lineHeight: 1.7, maxWidth: 600, margin: "0 auto 36px",
          }}>
            Pasang 1 script tag — langsung lihat perilaku pengunjung per bagian, durasi sesi,
            klik tombol, dan dapatkan <strong style={{ color: C.ink }}>saran perbaikan dari AI</strong> untuk
            meningkatkan konversi landing page Anda.
          </p>

          {/* CTA */}
          <div className="cta-row fade-up fade-up-3" style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link href="/login" className="cta-btn">
              Mulai Analisa Gratis <ArrowRight size={17} />
            </Link>
            <a href="#cara-kerja" className="cta-ghost">
              Lihat Cara Kerja <ChevronRight size={16} />
            </a>
          </div>

          {/* Trust signals */}
          <div className="fade-up fade-up-4" style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 28, flexWrap: "wrap" }}>
            {["Tanpa cookie banner", "Tanpa data pribadi", "Setup 30 detik"].map((t) => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.faint }}>
                <CheckCircle2 size={14} color={C.moss} /> {t}
              </span>
            ))}
          </div>

          {/* Preview code snippet */}
          <div className="fade-up fade-up-5" style={{
            maxWidth: 580, margin: "48px auto 0", borderRadius: 10, overflow: "hidden",
            border: `1px solid ${C.line}`, boxShadow: "0 4px 20px rgba(34,31,25,0.06)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
              background: C.screen, borderBottom: `1px solid rgba(154,201,143,0.15)`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E25950" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E9B840" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CC240" }} />
              <span className="mono" style={{ fontSize: 11, color: C.phosphor, marginLeft: 8, opacity: 0.6 }}>index.html</span>
            </div>
            <pre className="mono" style={{
              background: C.screen, color: C.phosphor, padding: "18px 20px", fontSize: 12.5,
              lineHeight: 1.7, overflowX: "auto", margin: 0, textAlign: "left",
            }}>{`<script
  src="https://app.Booknesia.id/tracker.js"
  data-site-id="YOUR_SITE_ID"
  async>
</script>

<!-- Cukup tambahkan atribut ini -->
<div data-lp-section="hero">...</div>
<div data-lp-section="pricing">...</div>
<button data-lp-button="cta-utama">Daftar</button>`}</pre>
          </div>
        </div>
      </section>

      {/* ========== STATS ========== */}
      <section style={{ padding: "40px 28px 60px" }}>
        <div className="section-pad stats-row" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32,
          maxWidth: 800, margin: "0 auto",
          padding: "32px 40px", borderRadius: 12, border: `1px solid ${C.line}`, background: "#FFFFFF",
        }}>
          {[
            { value: "30 dtk", label: "Setup cepat" },
            { value: "0", label: "Cookie digunakan" },
            { value: "100%", label: "Privasi aman" },
            { value: "AI", label: "Saran otomatis" },
          ].map((s) => (
            <div key={s.label} className="stat-item">
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: C.red }}>{s.value}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="fitur" style={{ padding: "60px 28px 80px" }}>
        <div className="section-pad">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="mono" style={{ fontSize: 12, color: C.red, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              FITUR LENGKAP
            </span>
            <h2 style={{ fontSize: 34, fontWeight: 800, margin: "12px 0 14px", letterSpacing: "-0.02em" }}>
              Semua yang Anda butuhkan untuk<br />
              <span style={{ color: C.red }}>menaikkan konversi</span>
            </h2>
            <p style={{ fontSize: 16, color: C.muted, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
              Bukan sekadar analytics — ini adalah alat diagnosa konversi yang memberitahu Anda
              apa yang harus diperbaiki.
            </p>
          </div>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              {
                icon: BarChart3, color: C.red, title: "Funnel Per Bagian",
                desc: "Lihat berapa pengunjung sampai ke setiap bagian landing page. Temukan di mana mereka berhenti scrolling dan pergi.",
              },
              {
                icon: MousePointerClick, color: C.brass, title: "Pelacakan Klik Tombol",
                desc: "Ketahui tombol mana yang paling banyak diklik — dan mana yang diabaikan. Optimasi CTA berdasarkan data nyata.",
              },
              {
                icon: Gauge, color: C.moss, title: "Diagnosa AI Otomatis",
                desc: "AI menganalisa seluruh metrik dan memberikan saran perbaikan spesifik langkah-demi-langkah untuk meningkatkan konversi.",
              },
              {
                icon: Zap, color: C.brass, title: "Durasi Sesi Real-time",
                desc: "Lihat berapa lama pengunjung bertahan di landing page. Durasi rendah = hook Anda perlu diperbaiki.",
              },
              {
                icon: Shield, color: C.moss, title: "Privacy-First, Tanpa Cookie",
                desc: "Tidak menyimpan data pribadi, tidak perlu cookie banner. Sepenuhnya patuh GDPR dan aman untuk audiens Anda.",
              },
              {
                icon: Activity, color: C.red, title: "Setup Instant, 30 Detik",
                desc: "Salin 1 script tag ke halaman Anda — langsung berjalan. Kompatibel dengan Scalev, Mayar, WordPress, dan HTML biasa.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="feature-card">
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${f.color}10`, display: "flex",
                    alignItems: "center", justifyContent: "center", marginBottom: 16,
                  }}>
                    <Icon size={22} color={f.color} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{f.title}</h3>
                  <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section style={{ padding: "80px 28px", background: C.paper, borderTop: `1px solid ${C.line}` }}>
        <div className="section-pad">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="mono" style={{ fontSize: 12, color: C.red, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              KATA MEREKA
            </span>
            <h2 style={{ fontSize: 34, fontWeight: 800, margin: "12px 0 14px", letterSpacing: "-0.02em" }}>
              Digunakan oleh marketer yang<br />
              <span style={{ color: C.red }}>fokus pada konversi</span>
            </h2>
          </div>
          <div className="testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              {
                quote: "Booknesia menunjukkan bahwa 60% visitor saya scroll melewati tombol Beli tanpa klik karena warnanya nge-blend. Setelah diubah berkat saran AI, konversi naik 2.4%.",
                author: "Budi Santoso",
                role: "Performance Marketer"
              },
              {
                quote: "Dulu saya nebak-nebak kenapa landing page boncos. Sekarang saya tahu persis bagian mana yang bikin visitor bosan. Setup-nya beneran cuma 30 detik.",
                author: "Rina Wijaya",
                role: "Pemilik Brand Skincare"
              },
              {
                quote: "Fitur AI-nya gila. Dia bisa baca copywriting landing page saya dan ngasih saran perbaikan kalimat yang jauh lebih nendang.",
                author: "Agus Pratama",
                role: "Digital Agency Owner"
              }
            ].map((t, i) => (
              <div key={i} style={{
                padding: "32px", border: `1px solid ${C.line}`, borderRadius: 12,
                background: "#FFFFFF", position: "relative"
              }}>
                <div style={{ fontSize: 40, color: `${C.moss}20`, position: "absolute", top: 20, left: 24, lineHeight: 1 }}>"</div>
                <p style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.6, position: "relative", zIndex: 1, margin: "0 0 24px", fontStyle: "italic" }}>
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.brass}20`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.brass }}>
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{t.author}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="cara-kerja" style={{ padding: "60px 28px 80px", background: "#FFFFFF", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div className="section-pad">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="mono" style={{ fontSize: 12, color: C.red, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              CARA KERJA
            </span>
            <h2 style={{ fontSize: 34, fontWeight: 800, margin: "12px 0 14px", letterSpacing: "-0.02em" }}>
              3 langkah menuju landing page<br />
              <span style={{ color: C.red }}>high-conversion</span>
            </h2>
          </div>

          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 900, margin: "0 auto" }}>
            {[
              {
                step: "01", title: "Pasang Script Tag",
                desc: "Salin 1 baris kode ke landing page Anda. Tambahkan atribut data-lp-section pada setiap bagian yang ingin dilacak. Selesai dalam 30 detik.",
              },
              {
                step: "02", title: "Kumpulkan Data Pengunjung",
                desc: "Booknesia akan otomatis merekam setiap sesi: berapa lama mereka membaca, bagian mana yang dilihat, tombol mana yang diklik.",
              },
              {
                step: "03", title: "Dapatkan Saran AI",
                desc: "Buka Diagnosa AI untuk mendapatkan analisa dan saran perbaikan spesifik yang bisa langsung Anda terapkan di landing page.",
              },
            ].map((s) => (
              <div key={s.step} className="step-card" style={{ flexDirection: "column", gap: 0, padding: "28px 24px" }}>
                <span className="mono" style={{
                  fontSize: 36, fontWeight: 700, color: `${C.red}18`, lineHeight: 1, marginBottom: 14,
                  display: "block",
                }}>
                  {s.step}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== AI SECTION ========== */}
      <section id="ai" style={{ padding: "80px 28px" }}>
        <div className="section-pad two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <span className="mono" style={{ fontSize: 12, color: C.red, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              POWERED BY AI
            </span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 16px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Bukan cuma data —<br />
              <span style={{ color: C.red }}>AI yang memberitahu apa yang harus diperbaiki</span>
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: "0 0 24px" }}>
              Kebanyakan tool analitik hanya menunjukkan angka. Booknesia melangkah lebih jauh:
              AI kami menganalisa semua metrik secara otomatis dan memberikan rekomendasi perbaikan
              yang spesifik dan langsung bisa diterapkan.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Skor konversi 0-100 untuk landing page Anda",
                "Identifikasi masalah kritis yang menurunkan konversi",
                "Saran perbaikan dengan langkah-langkah actionable",
                "Estimasi dampak setiap perbaikan",
              ].map((item) => (
                <div key={item} className="check-item">
                  <CheckCircle2 size={17} color={C.moss} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: C.ink, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Preview Card */}
          <div style={{
            border: `1px solid ${C.line}`, borderRadius: 14, background: "#FFFFFF",
            padding: "28px", boxShadow: "0 8px 32px rgba(34,31,25,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Gauge size={18} color={C.red} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Diagnosa AI</span>
              <span className="mono" style={{ fontSize: 11, color: C.faint, marginLeft: "auto" }}>Live preview</span>
            </div>

            {/* Mock Score */}
            <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
              <div className="mono" style={{ fontSize: 48, fontWeight: 700, color: C.brass }}>62</div>
              <div style={{ fontSize: 12, color: C.muted }}>Skor Konversi — Cukup</div>
            </div>

            {/* Mock insights */}
            {[
              { level: "Kritis", color: C.red, title: "CTA utama tidak terlihat di mobile", impact: "+2.1pp konversi" },
              { level: "Peluang", color: C.moss, title: "Segmen referral punya intensi tertinggi", impact: "+540 prospek" },
            ].map((ins) => (
              <div key={ins.title} style={{
                padding: "14px 16px", borderLeft: `3px solid ${ins.color}`,
                border: `1px solid ${C.line}`, borderRadius: 8,
                marginBottom: 10, background: "#FDFCF8",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: ins.color, textTransform: "uppercase" }}>
                  {ins.level}
                </span>
                <p style={{ fontSize: 13.5, fontWeight: 600, margin: "4px 0 2px", color: C.ink }}>{ins.title}</p>
                <span style={{ fontSize: 12, color: ins.color, fontWeight: 500 }}>Dampak: {ins.impact}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="harga" style={{ padding: "80px 28px", background: "#FFFFFF", borderTop: `1px solid ${C.line}` }}>
        <div className="section-pad" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="mono" style={{ fontSize: 12, color: C.red, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              HARGA
            </span>
            <h2 style={{ fontSize: 34, fontWeight: 800, margin: "12px 0 14px", letterSpacing: "-0.02em" }}>
              Pilih Paket yang Sesuai.<br />Upgrade saat Anda siap.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20 }}>
            {[
              {
                name: "Free", price: "Rp0",
                features: ["1.000 Visitor/bln", "1 Landing Page", "Retensi 7 hari", "1 Analisa AI/bulan", "Basic analytics"],
                cta: "Daftar Gratis", popular: false,
              },
              {
                name: "Starter", price: "Rp49rb",
                features: ["5.000 Visitor/bln", "3 Landing Page", "Retensi 30 hari", "10 Analisa AI/bulan", "Visitor, session, device, section"],
                cta: "Pilih Starter", popular: false,
              },
              {
                name: "Growth", price: "Rp99rb",
                features: ["15.000 Visitor/bln", "10 Landing Page", "Retensi 90 hari", "40 Analisa AI/bulan", "Semua Starter + funnel + heatmap"],
                cta: "Pilih Growth", popular: true,
              },
              {
                name: "Business", price: "Rp199rb",
                features: ["50.000 Visitor/bln", "30 Landing Page", "Retensi 180 hari", "150 Analisa AI/bulan", "Semua Growth + conversion tracking"],
                cta: "Pilih Business", popular: false,
              },
              {
                name: "Pro", price: "Rp399rb",
                features: ["150.000 Visitor/bln", "100 Landing Page", "Retensi 1 tahun", "500 Analisa AI/bulan", "Semua Business + advanced analytics"],
                cta: "Pilih Pro", popular: false,
              },
            ].map(plan => (
              <div key={plan.name} style={{
                padding: "32px 20px",
                border: plan.popular ? `2px solid ${C.red}` : `1px solid ${C.line}`,
                borderRadius: 16,
                background: plan.popular ? "#FDFCF8" : "#FFFFFF",
                position: "relative",
                boxShadow: plan.popular ? "0 8px 32px rgba(178,58,42,0.08)" : "none",
                display: "flex", flexDirection: "column"
              }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: C.red, color: "#FFF", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    Rekomendasi
                  </div>
                )}
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
                <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 24, color: C.ink, letterSpacing: "-0.03em" }}>
                  {plan.price}<span style={{ fontSize: 13, color: C.muted, fontWeight: 500, letterSpacing: "normal" }}>/bln</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12, flexGrow: 1 }}>
                  {plan.features.map(feat => (
                    <li key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.ink, lineHeight: 1.4 }}>
                      <CheckCircle2 size={16} color={C.moss} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={plan.popular ? "cta-btn" : "cta-ghost"} style={{ width: "100%", justifyContent: "center", fontSize: 13.5, padding: "10px 16px" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section style={{ padding: "80px 28px", background: C.paper, borderTop: `1px solid ${C.line}` }}>
        <div className="section-pad" style={{ maxWidth: 700 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { q: "Apakah script ini akan memperlambat loading website saya?", a: "Sama sekali tidak. Script Booknesia ukurannya sangat kecil (di bawah 5KB) dan dimuat secara asinkron (async), sehingga web Anda tetap ngebut seperti biasa." },
              { q: "Platform landing page apa saja yang didukung?", a: "Semua platform! Selama Anda bisa memasukkan custom HTML/Javascript, Booknesia bisa digunakan. Mulai dari Scalev, Mayar, WordPress, Shopify, hingga custom HTML buatan sendiri." },
              { q: "Apakah Booknesia menggunakan cookie?", a: "Tidak. Booknesia 100% cookieless dan tidak melacak data pribadi (PII) lintas website. Ini berarti Anda tidak perlu repot memasang banner cookie yang menurunkan estetika web Anda." },
              { q: "Bagaimana cara kerja AI analisanya?", a: "Saat Anda klik tombol Analisa, server kami akan menarik data metrik perilaku visitor, lalu mengunjungi landing page Anda untuk membaca teks (headline, CTA) di dalamnya. AI kemudian menggabungkan data ini untuk memberi saran spesifik." }
            ].map((faq, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: `1px solid ${C.line}`, borderRadius: 12, padding: "24px" }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: C.ink }}>{faq.q}</h4>
                <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section style={{
        padding: "80px 28px", textAlign: "center",
        background: C.screen,
      }}>
        <div className="section-pad">
          <h2 style={{ fontSize: 34, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", margin: "0 0 14px", lineHeight: 1.2 }}>
            Berhenti menebak-nebak.<br />
            <span style={{ color: C.phosphor }}>Mulai optimalkan dengan data.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.6 }}>
            Setiap hari tanpa tracking adalah hari di mana Anda kehilangan konversi.
            Setup gratis, 30 detik, tanpa kartu kredit.
          </p>
          <Link href="/login" className="cta-btn" style={{
            background: C.phosphor, color: C.screen,
            boxShadow: "0 2px 16px rgba(154,201,143,0.3)",
          }}>
            Mulai Analisa Gratis Sekarang <ArrowRight size={17} />
          </Link>
          <p className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 16 }}>
            Tanpa kartu kredit · Setup 30 detik · Batalkan kapan saja
          </p>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{ padding: "32px 28px", borderTop: `1px solid ${C.line}` }}>
        <div className="section-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} color={C.red} strokeWidth={2.25} />
            <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>Booknesia</span>
          </div>
          <p style={{ fontSize: 12.5, color: C.faint }}>
            © {new Date().getFullYear()} Booknesia. Landing page analytics untuk Indonesia.
          </p>
        </div>
      </footer>
    </main>
  );
}
