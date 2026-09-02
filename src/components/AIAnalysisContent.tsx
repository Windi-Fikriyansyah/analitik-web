"use client";

import { useState } from "react";
import {
  Sparkles,
  Gauge,
  CircleAlert,
  TriangleAlert,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { C } from "@/lib/colors";

// ---------- Types ----------
type AIInsight = {
  level: "kritis" | "peringatan" | "peluang";
  title: string;
  desc: string;
  confidence: number;
  impact: string;
};

type AIRecommendation = {
  priority: "tinggi" | "sedang" | "rendah";
  title: string;
  desc: string;
  sectionTarget?: string;
  textBefore?: string;
  textAfter?: string;
  steps: string[];
};

type AIAnalysisResult = {
  conversionScore: number;
  summary: string;
  insights: AIInsight[];
  recommendations: AIRecommendation[];
};

const LEVEL_CONFIG = {
  kritis: { color: C.red, icon: CircleAlert, label: "Kritis", bg: "rgba(178,58,42,0.06)" },
  peringatan: { color: C.brass, icon: TriangleAlert, label: "Peringatan", bg: "rgba(168,124,44,0.06)" },
  peluang: { color: C.moss, icon: Lightbulb, label: "Peluang", bg: "rgba(76,100,68,0.06)" },
};

const PRIORITY_CONFIG = {
  tinggi: { color: C.red, icon: Zap, label: "Prioritas Tinggi", bg: "rgba(178,58,42,0.05)" },
  sedang: { color: C.brass, icon: Target, label: "Prioritas Sedang", bg: "rgba(168,124,44,0.05)" },
  rendah: { color: C.moss, icon: TrendingUp, label: "Prioritas Rendah", bg: "rgba(76,100,68,0.05)" },
};

function getScoreLabel(score: number) {
  if (score >= 80) return { label: "Sangat Baik", color: C.moss };
  if (score >= 60) return { label: "Baik", color: "#5A8A4E" };
  if (score >= 40) return { label: "Cukup", color: C.brass };
  if (score >= 20) return { label: "Perlu Perbaikan", color: "#C4712B" };
  return { label: "Kritis", color: C.red };
}

// ---------- Score Gauge Component ----------
function ScoreGauge({ score }: { score: number }) {
  const { label, color } = getScoreLabel(score);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference * 0.75; // 270 degree arc
  const rotation = 135; // start angle

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
      <div style={{ position: "relative", width: 200, height: 160 }}>
        <svg width="200" height="160" viewBox="0 0 200 180" style={{ overflow: "visible" }}>
          {/* Background arc */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={C.line}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            transform={`rotate(${rotation} 100 100)`}
          />
          {/* Score arc */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(${rotation} 100 100)`}
            style={{ transition: "stroke-dashoffset 1.5s ease-out, stroke 0.5s ease" }}
          />
        </svg>
        {/* Center text */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -30%)",
            textAlign: "center",
          }}
        >
          <div className="mono" style={{ fontSize: 48, fontWeight: 700, color, lineHeight: 1 }}>
            {score}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>dari 100</div>
        </div>
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color,
          marginTop: 4,
          padding: "4px 16px",
          borderRadius: 20,
          background: `${color}10`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ---------- Expandable Recommendation Card ----------
function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const config = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.sedang;
  const Icon = config.icon;

  return (
    <div
      style={{
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        background: "#FFFFFF",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(34,31,25,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          width: "100%",
          padding: "18px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: config.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <Icon size={18} color={config.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: config.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {config.label}
            </span>
          </div>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: C.ink, lineHeight: 1.4 }}>
            {rec.title}
          </h4>
          <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0", lineHeight: 1.55 }}>
            {rec.desc}
          </p>
        </div>
        <div style={{ flexShrink: 0, marginTop: 4 }}>
          {expanded ? <ChevronUp size={18} color={C.faint} /> : <ChevronDown size={18} color={C.faint} />}
        </div>
      </button>

      {/* Expandable steps */}
      <div
        style={{
          maxHeight: expanded ? 800 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <div style={{ padding: "0 20px 20px 70px" }}>
          
          {(rec.sectionTarget || rec.textBefore || rec.textAfter) && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#FDFCF8", border: `1px solid ${C.line}`, borderRadius: 8 }}>
              {rec.sectionTarget && (
                <div style={{ fontSize: 13, color: C.ink }}>
                  <span style={{ fontWeight: 600, color: C.muted, marginRight: 6 }}>Target Bagian:</span> 
                  {rec.sectionTarget}
                </div>
              )}
              {(rec.textBefore || rec.textAfter) && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: rec.sectionTarget ? 10 : 0 }}>
                  {rec.textBefore && (
                    <div style={{ background: "#FEF2F2", padding: "10px", borderRadius: 6, border: "1px solid #FEE2E2" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", marginBottom: 4 }}>Teks Saat Ini</div>
                      <div style={{ fontSize: 13, color: "#7F1D1D", textDecoration: "line-through", opacity: 0.8, lineHeight: 1.5 }}>"{rec.textBefore}"</div>
                    </div>
                  )}
                  {rec.textAfter && (
                    <div style={{ background: "#F0FDF4", padding: "10px", borderRadius: 6, border: "1px solid #DCFCE7" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: 4 }}>Disarankan</div>
                      <div style={{ fontSize: 13, color: "#14532D", fontWeight: 500, lineHeight: 1.5 }}>"{rec.textAfter}"</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Langkah Perbaikan
          </div>
          {rec.steps.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 0",
                borderTop: idx === 0 ? "none" : `1px dashed ${C.line}`,
              }}
            >
              <span
                className="mono"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: config.bg,
                  color: config.color,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {idx + 1}
              </span>
              <p style={{ fontSize: 13.5, color: C.ink, margin: 0, lineHeight: 1.55 }}>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Loading Animation ----------
function AnalysisLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: 20 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ai-pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes ai-dots {
          0%, 20% { opacity: 0; }
          40% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        .ai-spinner {
          animation: ai-pulse 2s ease-in-out infinite;
        }
        .ai-dot-1 { animation: ai-dots 1.4s ease-in-out infinite; }
        .ai-dot-2 { animation: ai-dots 1.4s ease-in-out 0.2s infinite; }
        .ai-dot-3 { animation: ai-dots 1.4s ease-in-out 0.4s infinite; }
      ` }} />
      <div className="ai-spinner" style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: `linear-gradient(135deg, ${C.red}15, ${C.brass}15)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Sparkles size={32} color={C.red} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: "0 0 8px" }}>
          AI sedang menganalisa data Anda
          <span className="ai-dot-1" style={{ color: C.red }}>.</span>
          <span className="ai-dot-2" style={{ color: C.red }}>.</span>
          <span className="ai-dot-3" style={{ color: C.red }}>.</span>
        </p>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
          Memeriksa metrik pengunjung, membaca konten landing page,<br />
          mengidentifikasi pola, dan menyusun rekomendasi perbaikan konversi
        </p>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function AIAnalysisContent({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [pageScraped, setPageScraped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan saat menganalisa.");
        return;
      }

      setResult(data.analysis);
      setPageScraped(!!data.pageScraped);
    } catch (err) {
      setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }

  // -------- Initial State (no analysis yet) --------
  if (!loading && !result && !error) {
    return (
      <div style={{ paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Gauge size={22} color={C.red} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.ink }}>
            Diagnosa AI & Rekomendasi Konversi
          </h2>
        </div>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 36, lineHeight: 1.6 }}>
          Analisis otomatis berbasis AI untuk menemukan masalah dan memberikan saran perbaikan
          agar landing page Anda memiliki tingkat konversi yang lebih tinggi.
        </p>

        {/* CTA Card */}
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "48px 40px",
            borderRadius: 16,
            border: `1px solid ${C.line}`,
            background: "linear-gradient(135deg, #FFFFFF 0%, #FDFCF8 100%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${C.red}12, ${C.brass}12)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Sparkles size={28} color={C.red} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: C.ink }}>
            Analisa Konversi dengan AI
          </h3>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 28px", lineHeight: 1.6 }}>
            AI akan menganalisa seluruh data pengunjung, durasi sesi, funnel bagian,
            klik tombol, sumber traffic, <strong style={{ color: C.ink }}>serta konten actual landing page Anda</strong> (headline,
            CTA, struktur halaman) untuk memberikan saran perbaikan yang sangat spesifik.
          </p>
          <button
            onClick={runAnalysis}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              background: C.red,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 14.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "opacity 0.15s ease, transform 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.88";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Sparkles size={16} />
            Mulai Analisa AI
            <ArrowRight size={16} />
          </button>
          <p className="mono" style={{ fontSize: 11, color: C.faint, marginTop: 14 }}>
            Menggunakan GPT-4o-mini · Menganalisa data + konten halaman · 15-30 detik
          </p>
        </div>
      </div>
    );
  }

  // -------- Loading State --------
  if (loading) {
    return (
      <div style={{ paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Gauge size={22} color={C.red} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.ink }}>
            Diagnosa AI & Rekomendasi Konversi
          </h2>
        </div>
        <AnalysisLoading />
      </div>
    );
  }

  // -------- Error State --------
  if (error) {
    return (
      <div style={{ paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Gauge size={22} color={C.red} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.ink }}>
            Diagnosa AI & Rekomendasi Konversi
          </h2>
        </div>
        <div
          style={{
            maxWidth: 560,
            margin: "40px auto",
            padding: "32px",
            borderRadius: 12,
            border: `1px solid ${C.red}30`,
            background: `${C.red}06`,
            textAlign: "center",
          }}
        >
          <AlertTriangle size={36} color={C.red} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 8px" }}>
            Gagal Menganalisa
          </h3>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 20px", lineHeight: 1.6 }}>
            {error}
          </p>
          <button
            onClick={runAnalysis}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 22px",
              background: C.red,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // -------- Result State --------
  if (!result) return null;

  return (
    <div style={{ paddingTop: 10 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ai-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ai-section { animation: ai-fadein 0.5s ease-out backwards; }
        .ai-section:nth-child(2) { animation-delay: 0.1s; }
        .ai-section:nth-child(3) { animation-delay: 0.2s; }
        .ai-section:nth-child(4) { animation-delay: 0.3s; }
        .ai-section:nth-child(5) { animation-delay: 0.4s; }
      ` }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Gauge size={22} color={C.red} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.ink }}>
            Diagnosa AI & Rekomendasi Konversi
          </h2>
        </div>
        <button
          onClick={runAnalysis}
          className="link-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            background: "transparent",
            color: C.red,
            border: `1px solid ${C.red}40`,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <RefreshCw size={13} />
          Analisa Ulang
        </button>
      </div>

      {/* Score + Summary Section */}
      <div className="ai-section" style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 32,
        padding: "20px 28px",
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        background: "#FFFFFF",
        marginBottom: 24,
        marginTop: 20,
      }}>
        <ScoreGauge score={result.conversionScore} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", color: C.ink }}>
            Ringkasan Performa
          </h3>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            {result.summary}
          </p>
        </div>
      </div>

      {/* Insights Section */}
      <div className="ai-section" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <CircleAlert size={17} color={C.red} />
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.ink }}>
            Temuan & Insight
          </h3>
          <span className="mono" style={{ fontSize: 11.5, color: C.faint, marginLeft: 4 }}>
            {result.insights.length} temuan
          </span>
        </div>
        <div style={{ display: "grid", gap: 14, maxWidth: 900 }}>
          {result.insights.map((ins, i) => {
            const config = LEVEL_CONFIG[ins.level] || LEVEL_CONFIG.peringatan;
            const Icon = config.icon;
            return (
              <div
                key={i}
                style={{
                  padding: "18px 22px",
                  border: `1px solid ${C.line}`,
                  borderLeft: `3px solid ${config.color}`,
                  borderRadius: 10,
                  background: "#FFFFFF",
                  transition: "box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(34,31,25,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: config.color, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <Icon size={14} /> {config.label}
                  </span>
                  <span className="mono" style={{ fontSize: 11.5, color: C.faint }}>
                    {ins.confidence}% keyakinan
                  </span>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: C.ink, lineHeight: 1.4 }}>
                  {ins.title}
                </h4>
                <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.6 }}>
                  {ins.desc}
                </p>
                <div
                  style={{
                    fontSize: 12.5,
                    color: config.color,
                    fontWeight: 600,
                    background: config.bg,
                    display: "inline-block",
                    padding: "5px 12px",
                    borderRadius: 6,
                  }}
                >
                  Estimasi Dampak: {ins.impact}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="ai-section">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Sparkles size={17} color={C.brass} />
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.ink }}>
            Saran Perbaikan Konversi
          </h3>
          <span className="mono" style={{ fontSize: 11.5, color: C.faint, marginLeft: 4 }}>
            {result.recommendations.length} rekomendasi
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 16px", lineHeight: 1.6 }}>
          Klik setiap rekomendasi untuk melihat langkah-langkah perbaikan yang spesifik dan bisa langsung diterapkan.
        </p>
        <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
          {result.recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, padding: "16px 0", borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {pageScraped && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 20,
            background: `${C.moss}10`, border: `1px solid ${C.moss}25`,
            fontSize: 12, color: C.moss, fontWeight: 600,
          }}>
            <CheckCircle2 size={13} />
            Konten landing page berhasil dianalisa
          </div>
        )}
        <p className="mono" style={{ fontSize: 11, color: C.faint, textAlign: "center" }}>
          Analisis dilakukan oleh GPT-4o-mini{pageScraped ? ' · Data analitik + konten halaman' : ' · Data analitik'} · Hasil bersifat saran
        </p>
      </div>
    </div>
  );
}
