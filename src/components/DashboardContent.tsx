"use client";

import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ArrowUp, ArrowDown, Gauge,
  CircleAlert, TriangleAlert, Lightbulb,
  Smartphone, Tablet, Monitor,
} from "lucide-react";
import { C } from "@/lib/colors";

export type TrafficRow = { d: string; visits: number; conv: number };
export type InsightRow = {
  level: "kritis" | "peringatan" | "peluang";
  title: string;
  desc: string;
  confidence: number;
  impact: string;
};

const LEVEL = {
  kritis: { color: C.red, icon: CircleAlert, label: "Kritis" },
  peringatan: { color: C.brass, icon: TriangleAlert, label: "Peringatan" },
  peluang: { color: C.moss, icon: Lightbulb, label: "Peluang" },
};

function ScopeWave() {
  return (
    <svg viewBox="0 0 400 60" width="100%" height="34" preserveAspectRatio="none" style={{ maxWidth: 200 }}>
      <polyline
        points="0,30 40,30 48,10 56,50 64,30 120,30 128,14 136,44 144,30 400,30"
        fill="none" stroke={C.phosphor} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
      >
        <animate attributeName="points" dur="2.8s" repeatCount="indefinite"
          values="
            0,30 40,30 48,10 56,50 64,30 120,30 128,14 136,44 144,30 400,30;
            0,30 40,30 48,18 56,42 64,30 120,30 128,22 136,38 144,30 400,30;
            0,30 40,30 48,10 56,50 64,30 120,30 128,14 136,44 144,30 400,30" />
      </polyline>
    </svg>
  );
}

type KpiItem = { label: string; value: string; delta: string; up: boolean };
type SectionRow = { section_id: string; visitor_count: number; avg_duration: string; pct: number };
type ButtonRow = { button_id: string; click_count: number; unique_visitors: number; pct: number };
type DeviceBreakdown = { mobile: number; tablet: number; desktop: number };

export default function DashboardContent({
  siteId,
  totalVisitsFormatted,
  kpis,
  deviceBreakdown,
  sectionRows,
  buttonRows,
  trafficData,
  insightsData,
}: {
  siteId: string;
  totalVisitsFormatted: string;
  kpis: KpiItem[];
  deviceBreakdown: DeviceBreakdown;
  sectionRows: SectionRow[];
  buttonRows: ButtonRow[];
  trafficData: TrafficRow[];
  insightsData: InsightRow[];
}) {



  return (
    <>
      {/* Strip sinyal langsung */}
      <div className="scope-strip">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="rec-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: C.red }} />
          <span className="mono" style={{ fontSize: 12.5, color: C.phosphor, letterSpacing: "0.02em" }}>
            Semua pelacak aktif
          </span>
        </div>
        <div className="scope-wave"><ScopeWave /></div>
        <span className="mono" style={{ fontSize: 15, color: C.phosphor, fontWeight: 700 }}>
          {totalVisitsFormatted} hit
        </span>
      </div>

      {/* Strip KPI */}
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi-item">
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>{k.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
              <span className="mono kpi-value" style={{ fontSize: 27, fontWeight: 700 }}>{k.value}</span>
              {k.delta && (
                <span style={{ display: "flex", alignItems: "center", fontSize: 12.5, color: k.up ? C.moss : C.red }}>
                  {k.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{k.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Grafik + Diagnosa AI */}
      <div className="content-grid">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Kunjungan vs konversi</h3>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: C.muted, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 2, background: C.red, display: "inline-block" }} /> Kunjungan
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 2, background: C.moss, display: "inline-block" }} /> Konversi
            </span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={trafficData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="d" stroke={C.faint} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={C.faint} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12 }} />
              <Line type="linear" dataKey="visits" stroke={C.red} strokeWidth={2} dot={false} />
              <Line type="linear" dataKey="conv" stroke={C.moss} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="ai-col">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Gauge size={17} color={C.red} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Diagnosa AI</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 300, overflowY: "auto", paddingRight: 6 }}>
            {insightsData.map((ins, i) => {
              const s = LEVEL[ins.level];
              const Icon = s.icon;
              return (
                <div key={i} style={{ padding: "13px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: s.color, fontSize: 12, fontWeight: 600 }}>
                      <Icon size={13} /> {s.label}
                    </span>
                    <span className="mono" style={{ fontSize: 11.5, color: C.faint }}>{ins.confidence}% yakin</span>
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 4px", lineHeight: 1.4 }}>{ins.title}</p>
                  <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 6px", lineHeight: 1.55 }}>{ins.desc}</p>
                  <p style={{ fontSize: 12, color: s.color, margin: 0, fontWeight: 500 }}>{ins.impact}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      {(() => {
        const totalDevices = deviceBreakdown.mobile + deviceBreakdown.tablet + deviceBreakdown.desktop;
        const maxDevice = Math.max(1, deviceBreakdown.mobile, deviceBreakdown.tablet, deviceBreakdown.desktop);
        const devices = [
          { label: "Mobile", count: deviceBreakdown.mobile, icon: Smartphone, color: C.red },
          { label: "Tablet", count: deviceBreakdown.tablet, icon: Tablet, color: C.brass },
          { label: "Desktop", count: deviceBreakdown.desktop, icon: Monitor, color: C.moss },
        ];
        return (
          <div style={{ paddingTop: 26 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Perangkat Pengunjung</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {devices.map((d) => {
                const Icon = d.icon;
                const pct = totalDevices > 0 ? ((d.count / totalDevices) * 100).toFixed(1) : "0";
                return (
                  <div key={d.label} style={{
                    padding: "16px 18px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    background: "#FDFCF8",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Icon size={18} color={d.color} />
                      <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{d.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{d.count.toLocaleString("id-ID")}</span>
                      <span className="mono" style={{ fontSize: 12.5, color: C.faint }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: C.line, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${maxDevice > 0 ? (d.count / maxDevice) * 100 : 0}%`, height: "100%", background: d.color, borderRadius: 3, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Tabel halaman */}
      <div style={{ paddingTop: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Halaman arahan (Bagian)</h3>
          <span style={{ fontSize: 12.5, color: C.faint }}>{sectionRows.length} bagian dilacak</span>
        </div>
        <div className="table-scroll">
          <table className="pages-table">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                {["Bagian", "Kunjungan", "Rata-rata Waktu"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0 0 10px", fontSize: 11.5, color: C.faint, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectionRows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px 0', color: C.faint, fontSize: 13, textAlign: 'center' }}>
                    Belum ada data bagian. Pasang tag data-lp-section pada halaman Anda.
                  </td>
                </tr>
              ) : (
                sectionRows.map((s) => (
                  <tr key={s.section_id} className="rowline" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: "13px 20px 13px 0", fontWeight: 600 }}>
                      {s.section_id}
                    </td>
                    <td style={{ padding: "13px 20px 13px 0", minWidth: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="mono" style={{ whiteSpace: "nowrap", width: 45 }}>{s.visitor_count.toLocaleString("id-ID")}</span>
                        <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: C.moss, borderRadius: 3 }} />
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ padding: "13px 0", whiteSpace: "nowrap", color: C.muted }}>
                      {s.avg_duration}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Tombol */}
      <div style={{ paddingTop: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Klik Tombol</h3>
          <span style={{ fontSize: 12.5, color: C.faint }}>{buttonRows.length} tombol dilacak</span>
        </div>
        <div className="table-scroll">
          <table className="pages-table">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                {["Tombol (ID)", "Total Klik", "Pengunjung Unik"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0 0 10px", fontSize: 11.5, color: C.faint, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buttonRows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px 0', color: C.faint, fontSize: 13, textAlign: 'center' }}>
                    Belum ada data klik. Pasang atribut data-lp-button pada tombol Anda.
                  </td>
                </tr>
              ) : (
                buttonRows.map((b) => (
                  <tr key={b.button_id} className="rowline" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: "13px 20px 13px 0", fontWeight: 600 }}>
                      {b.button_id}
                    </td>
                    <td style={{ padding: "13px 20px 13px 0", minWidth: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="mono" style={{ whiteSpace: "nowrap", width: 45 }}>{b.click_count.toLocaleString("id-ID")}</span>
                        <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${b.pct}%`, height: '100%', background: C.moss, borderRadius: 3 }} />
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ padding: "13px 0", whiteSpace: "nowrap", color: C.muted }}>
                      {b.unique_visitors.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Link ke audiens */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, paddingBottom: 8 }}>
        <Link
          href={`/dashboard/${siteId}/visitors`}
          className="link-btn"
          style={{ fontSize: 14, color: C.red, fontWeight: 600, textDecoration: 'none' }}
        >
          Lihat semua audiens →
        </Link>
      </div>
    </>
  );
}
