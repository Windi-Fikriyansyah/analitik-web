"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FileStack,
  Gauge,
  Users,
  Settings,
  ChevronDown,
  Bell,
  Search,
  Activity,
  Menu,
  X,
  Plus,
  CreditCard,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import ResetDataButton from "@/components/ResetDataButton";
import { C } from "@/lib/colors";



export default function DashboardLayout({
  children,
  currentSite,
  sites,
  currentPlan,
}: {
  children: React.ReactNode;
  currentSite: { id: string; name: string };
  sites: { id: string; name: string }[];
  currentPlan?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const rangeQuery = searchParams.get("range") || "14";
  const [tenantOpen, setTenantOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep nav links preserving the range query
  const createUrl = (base: string) => `${base}?range=${rangeQuery}`;

  const navItems = [
    { id: "overview", label: "Ringkasan", icon: LayoutDashboard, href: createUrl(`/dashboard/${currentSite.id}`) },
    { id: "pages", label: "Halaman Arahan", icon: FileStack, href: createUrl(`/dashboard/${currentSite.id}/pages`) },
    { id: "audience", label: "Audiens", icon: Users, href: createUrl(`/dashboard/${currentSite.id}/visitors`) },
    { id: "heatmap", label: "Heatmap", icon: FileStack, href: createUrl(`/dashboard/${currentSite.id}/heatmap`) },
    { id: "ai", label: "Diagnosa AI", icon: Gauge, href: createUrl(`/dashboard/${currentSite.id}/ai`) },
    { id: "settings", label: "Pengaturan", icon: Settings, href: createUrl(`/dashboard/${currentSite.id}/settings`) },
    { id: "billing", label: "Langganan", icon: CreditCard, href: createUrl(`/dashboard/${currentSite.id}/billing`) },
  ];

  return (
    <div className="shell" style={{ background: C.paper, color: C.ink, fontFamily: "'Work Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .mono { font-family: 'Space Mono', monospace; }
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.2 } }
        .rec-dot { animation: blink 1.6s step-start infinite; }
        .navrow { border-left: 2px solid transparent; transition: color .15s ease, border-color .15s ease; }
        .navrow:hover { color: ${C.ink}; }
        .rowline:hover { background: rgba(34,31,25,0.03); }
        .link-btn { transition: opacity .15s ease; }
        .link-btn:hover { opacity: 0.65; }
        input, select { font-family: 'Work Sans', sans-serif; }
        ::-webkit-scrollbar { width: 7px; height: 7px; }
        ::-webkit-scrollbar-thumb { background: ${C.line}; }

        /* ---------- Layout dasar ---------- */
        .shell { min-height: 100vh; display: flex; }
        .sidebar {
          position: fixed; top: 0; left: 0; height: 100vh; overflow-y: auto;
          width: 216px; flex-shrink: 0; border-right: 1px solid ${C.line};
          padding: 26px 22px; display: flex; flex-direction: column; gap: 34px;
          background: ${C.paper};
        }
        .menu-btn { display: none; background: transparent; border: none; cursor: pointer; padding: 0; }
        .sidebar-close { display: none; }
        .backdrop { display: none; }
        .main { flex: 1; min-width: 0; padding: 26px 40px 48px; margin-left: 216px; }

        .header-row { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px; padding-bottom: 20px; border-bottom: 1px solid ${C.line}; }
        .header-controls { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }

        .scope-strip { background: ${C.screen}; margin: 22px 0; border-radius: 6px; padding: 16px 26px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }

        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 22px 0; border-bottom: 1px solid ${C.line}; gap: 20px 0; }
        .kpi-item { padding-left: 28px; border-left: 1px solid ${C.line}; }
        .kpi-item:first-child { padding-left: 0; border-left: none; }

        .content-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 40px; padding: 26px 0; border-bottom: 1px solid ${C.line}; }
        .ai-col { border-left: 1px solid ${C.line}; padding-left: 40px; }

        .table-scroll { overflow-x: auto; }
        .pages-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 560px; }

        /* ---------- Tablet ---------- */
        @media (max-width: 960px) {
          .main { padding: 22px 28px 40px; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .kpi-item:nth-child(2n+1) { padding-left: 0; border-left: none; }
          .kpi-item:nth-child(n+3) { border-left: none; border-top: 1px solid ${C.line}; padding-top: 16px; padding-left: 0; }
          .content-grid { grid-template-columns: 1fr; gap: 8px; }
          .ai-col { border-left: none; padding-left: 0; border-top: 1px solid ${C.line}; padding-top: 26px; margin-top: 26px; }
        }

        /* ---------- Mobile ---------- */
        @media (max-width: 720px) {
          .menu-btn { display: inline-flex; }
          .sidebar {
            position: fixed; top: 0; left: 0; height: 100vh; z-index: 50; width: 250px;
            transform: translateX(-100%); transition: transform .25s ease;
            box-shadow: 8px 0 24px rgba(34,31,25,0.12);
          }
          .sidebar.open { transform: translateX(0); }
          .sidebar-close { display: inline-flex; margin-left: auto; }
          .backdrop.open { display: block; position: fixed; inset: 0; background: rgba(34,31,25,0.35); z-index: 40; }
          .main { padding: 18px 16px 32px; margin-left: 0; }
          .header-row { padding-bottom: 16px; }
          .header-controls { gap: 12px; }
          .header-controls .search-box input { width: 90px; }
          .kpi-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
          .kpi-item { padding-left: 0 !important; border-left: none !important; }
          .kpi-item:nth-child(n+3) { border-top: 1px solid ${C.line}; padding-top: 14px !important; }
          .kpi-value { font-size: 22px !important; }
          .scope-strip { padding: 14px 16px; justify-content: flex-start; }
          .scope-wave { display: none; }
          .page-title { font-size: 21px !important; }
        }
        @media (max-width: 420px) {
          .header-controls .search-box { display: none; }
        }
      ` }} />

      {/* Backdrop mobile */}
      <div className={`backdrop ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Activity size={19} color={C.red} strokeWidth={2.25} />
          <span className="mono" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.01em" }}>Booknesia</span>
          <button className="sidebar-close link-btn" onClick={() => setSidebarOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={18} color={C.muted} />
          </button>
        </div>

        {/* Tenant switcher */}
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Penyewa aktif
          </div>
          <button
            onClick={() => setTenantOpen(!tenantOpen)}
            className="link-btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
              background: "transparent", border: "none", borderBottom: `1px solid ${C.line}`,
              padding: "0 0 8px", color: C.ink, cursor: "pointer", fontSize: 14.5, fontWeight: 600,
            }}
          >
            {currentSite.name}
            <ChevronDown size={14} color={C.muted} />
          </button>
          {tenantOpen && (
            <div style={{ position: "relative", background: C.paper, zIndex: 10, paddingTop: 4 }}>
              {sites.map((t) => (
                <Link key={t.id} href={`/dashboard/${t.id}`} onClick={() => { setTenantOpen(false); }} className="rowline block"
                  style={{
                    width: "100%", textAlign: "left", padding: "7px 0", border: "none",
                    background: "transparent", color: C.ink, fontSize: 13.5, cursor: "pointer", textDecoration: "none"
                  }}>
                  {t.name}
                </Link>
              ))}
              <Link href={`/dashboard?new=1`} onClick={() => { setTenantOpen(false); }} className="rowline block"
                style={{
                  width: "100%", textAlign: "left", padding: "7px 0", border: "none",
                  background: "transparent", color: C.red, fontSize: 13.5, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, marginTop: 4, borderTop: `1px solid ${C.line}`
                }}>
                <Plus size={14} /> Tambah Project Baru
              </Link>
            </div>
          )}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            // Active if the pathname matches the base URL of the item
            const active = pathname === item.href.split('?')[0];
            return (
              <Link key={item.id} href={item.href} onClick={() => setSidebarOpen(false)} className="navrow"
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "8px 0 8px 12px",
                  background: "transparent", cursor: "pointer", fontSize: 14,
                  borderLeftColor: active ? C.red : "transparent",
                  color: active ? C.ink : C.muted, fontWeight: active ? 600 : 500, textAlign: "left",
                  textDecoration: "none"
                }}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.faint, fontWeight: 500 }}>Paket Saat Ini</span>
            <span style={{ padding: "4px 10px", background: `${C.moss}15`, color: C.moss, fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              {currentPlan || 'FREE'}
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Header */}
        <div className="header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
              <Menu size={22} color={C.ink} />
            </button>
            <div>
              <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                Panel pemantauan
              </div>
              <h1 className="page-title" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{currentSite.name}</h1>
            </div>
          </div>
          <div className="header-controls">
            <div className="search-box" style={{ display: "flex", alignItems: "center", gap: 7, borderBottom: `1px solid ${C.line}`, paddingBottom: 6 }}>
              <Search size={14} color={C.faint} />
              <input placeholder="Cari halaman"
                style={{ background: "transparent", border: "none", outline: "none", color: C.ink, fontSize: 13.5, width: 120 }} />
            </div>

            {currentSite.id !== 'new' && (
              <ResetDataButton siteId={currentSite.id} />
            )}

            <select
              value={rangeQuery}
              onChange={(e) => {
                const newRange = e.target.value;
                router.push(`${pathname}?range=${newRange}`);
              }}
              style={{
                background: "transparent", border: "none", borderBottom: `1px solid ${C.line}`, paddingBottom: 6,
                color: C.ink, fontSize: 13.5, cursor: "pointer"
              }}
            >
              <option value="7">7 hari</option>
              <option value="14">14 hari</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
              <option value="180">180 hari</option>
              <option value="365">1 tahun</option>
            </select>
            <button className="link-btn" style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative", padding: 0 }}>
              <Bell size={17} color={C.muted} />
              <span style={{ position: "absolute", top: -1, right: -2, width: 6, height: 6, borderRadius: "50%", background: C.red }} />
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </main>
    </div>
  );
}
