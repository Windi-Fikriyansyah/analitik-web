"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sparkles,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  X
} from "lucide-react";
import { C } from "@/lib/colors";

export type TrackEventItem = {
  id: string;
  site_id: string;
  phone_number: string;
  sender_name: string | null;
  event_name: string;
  message: string | null;
  device_number: string | null;
  status: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

function formatPhoneDisplay(phone: string) {
  if (!phone) return "-";
  // Remove non-digits
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("62")) {
    const rest = clean.slice(2);
    if (rest.length >= 7) {
      return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
    }
    return `+62 ${rest}`;
  }
  return phone;
}

function timeAgoIndo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}h lalu`;
  return date.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function formatWibDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  } catch {
    return dateStr;
  }
}

export default function TrackEventsClient({
  siteId,
  siteName,
  initialEvents,
  tableMissing = false,
  initialAppUrl,
}: {
  siteId: string;
  siteName: string;
  initialEvents: TrackEventItem[];
  tableMissing?: boolean;
  initialAppUrl?: string;
}) {
  const [events, setEvents] = useState<TrackEventItem[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<TrackEventItem | null>(null);

  // Simulator Form State (Fonnte API Send via .env)
  const [simPhone, setSimPhone] = useState("");
  const [simMessage, setSimMessage] = useState("Halo! Ini adalah pesan uji coba dari sistem pelacakan WhatsApp. Balas pesan ini untuk menguji webhook masuk!");
  const [simLoading, setSimLoading] = useState(false);
  const [simSuccessToast, setSimSuccessToast] = useState(false);
  const [simToastText, setSimToastText] = useState("");

  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("fonnte_test_phone");
      if (savedPhone) setSimPhone(savedPhone);
    } catch {}
  }, []);

  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const fetchEventsLive = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/events?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status && Array.isArray(data.events)) {
          setEvents(data.events);
          setLastSyncedAt(new Date());
        }
      }
    } catch (e) {
      console.error("Gagal sinkron data event:", e);
    } finally {
      if (showSpinner) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  // Keep events in sync when initialEvents updates from server
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Initial fetch on mount & live auto-polling every 8 seconds when active tab
  useEffect(() => {
    fetchEventsLive(false);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchEventsLive(false);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [siteId]);

  // App Origin for Webhook URL - initialized with initialAppUrl to guarantee exact SSR & client hydration match
  const [origin, setOrigin] = useState<string>(
    initialAppUrl || process.env.NEXT_PUBLIC_APP_URL || "https://domain-anda.com"
  );

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const webhookUrl = `${origin}/api/webhook/fonnte?site_id=${siteId}`;

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchSearch =
        searchQuery === "" ||
        evt.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.sender_name && evt.sender_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (evt.message && evt.message.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = selectedEventType === "all" || evt.event_name === selectedEventType;

      return matchSearch && matchType;
    });
  }, [events, searchQuery, selectedEventType]);

  // Unique phone numbers
  const uniquePhones = useMemo(() => {
    return new Set(events.map((e) => e.phone_number)).size;
  }, [events]);

  // 24-hour count
  const last24HoursCount = useMemo(() => {
    const threshold = Date.now() - 24 * 60 * 60 * 1000;
    return events.filter((e) => new Date(e.created_at).getTime() >= threshold).length;
  }, [events]);

  // Copy webhook URL
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2200);
  };

  // Copy Phone Number
  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (events.length === 0) return;
    const headers = ["Waktu", "Nomor WhatsApp", "Nama Pengirim", "Event", "Isi Pesan", "Device", "Status"];
    const rows = events.map((e) => [
      `"${formatWibDate(e.created_at)}"`,
      `"'${e.phone_number}"`, // formatted so Excel treats as string
      `"${(e.sender_name || "").replace(/"/g, '""')}"`,
      `"${e.event_name}"`,
      `"${(e.message || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      `"${e.device_number || ""}"`,
      `"${e.status || "received"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `track_events_wa_${siteId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Real WhatsApp Message via Fonnte Send API (using server FONNTE_TOKEN from .env)
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simPhone.trim()) {
      alert("Silakan masukkan nomor WhatsApp tujuan.");
      return;
    }
    if (!simMessage.trim()) {
      alert("Silakan masukkan isi pesan uji coba.");
      return;
    }

    setSimLoading(true);

    try {
      // Remember phone in localStorage for convenience
      try {
        localStorage.setItem("fonnte_test_phone", simPhone.trim());
      } catch {}

      const res = await fetch(`/api/webhook/fonnte/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          target: simPhone.trim(),
          message: simMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.status) {
        setShowSimModal(false);
        setSimToastText(`Pesan WhatsApp berhasil dikirim ke ${simPhone}! Cek WhatsApp dan balas pesan untuk menguji webhook masuk.`);
        setSimSuccessToast(true);
        setTimeout(() => setSimSuccessToast(false), 8000);
        router.refresh();
        fetchEventsLive(false);
        setTimeout(() => fetchEventsLive(false), 2000);
        setTimeout(() => fetchEventsLive(false), 5000);
      } else {
        alert("Gagal mengirim pesan via Fonnte:\n" + (data.error || "Pastikan FONNTE_TOKEN telah diatur di .env.local dan device WhatsApp di Fonnte berstatus CONNECT."));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const migrationSql = `-- Run this in Supabase SQL Editor:
create table if not exists track_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  phone_number text not null,
  sender_name text,
  event_name text not null default 'whatsapp_chat',
  message text,
  device_number text,
  status text default 'received',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_track_events_site on track_events(site_id);
create index if not exists idx_track_events_phone on track_events(site_id, phone_number);
alter table track_events enable row level security;
create policy "owners read own track_events" on track_events for select using (exists (select 1 from sites s where s.id = track_events.site_id and s.owner_id = auth.uid()));
create policy "owners delete own track_events" on track_events for delete using (exists (select 1 from sites s where s.id = track_events.site_id and s.owner_id = auth.uid()));`;

  const copyMigrationSql = () => {
    navigator.clipboard.writeText(migrationSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div style={{ paddingTop: 10 }}>
      {/* Missing Table Setup Alert Banner */}
      {tableMissing && (
        <div
          style={{
            background: "#FFF9E6",
            border: `1px solid ${C.brass}`,
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <Info size={20} color={C.brass} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              Setup Database Supabase Diperlukan
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
              Tabel database <code>track_events</code> belum dibuat di Supabase project Anda. Salin query migrasi SQL berikut dan jalankan satu kali di Supabase SQL Editor.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={copyMigrationSql}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: copiedSql ? C.moss : C.screen,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                {copiedSql ? "Query SQL Berhasil Disalin!" : "Salin Query SQL Migrasi"}
              </button>
              <span style={{ fontSize: 12, color: C.faint }}>
                (Tersedia juga di file <code>supabase/track_events_migration.sql</code>)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {simSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            background: C.screen,
            color: C.phosphor,
            border: `1px solid ${C.moss}`,
            padding: "12px 18px",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            fontWeight: 500,
            maxWidth: 420,
          }}
        >
          <CheckCircle2 size={18} color={C.phosphor} style={{ flexShrink: 0 }} />
          <span>{simToastText || "Pesan WhatsApp berhasil dikirim via Fonnte!"}</span>
        </div>
      )}

      {/* Header Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: C.ink }}>
              Track Event (WhatsApp Webhook)
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: C.moss,
                background: "#EAF3ED",
                border: "1px solid rgba(46, 125, 50, 0.2)",
                padding: "2px 8px",
                borderRadius: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: C.moss,
                  display: "inline-block",
                }}
              />
              Live Sync
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>
            Pantau dan rekam nomor WhatsApp prospek secara otomatis dari obrolan yang masuk melalui Webhook Fonnte.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowSimModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: C.moss,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Send size={14} />
            Uji Coba Webhook
          </button>
          <button
            onClick={() => {
              fetchEventsLive(true);
              router.refresh();
            }}
            disabled={isRefreshing}
            title="Segarkan data dari database"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              color: C.ink,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 500,
              cursor: isRefreshing ? "wait" : "pointer",
            }}
          >
            <RefreshCw size={13} className={isRefreshing ? "rec-dot" : ""} />
            {isRefreshing ? "Memuat..." : "Segarkan"}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={events.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "transparent",
              color: events.length === 0 ? C.faint : C.ink,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              cursor: events.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Fonnte Webhook Integration Card */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          padding: 18,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.moss,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              URL Webhook Fonnte untuk Penyewa Ini
            </span>
          </div>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            style={{
              background: "transparent",
              border: "none",
              color: C.muted,
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
            }}
          >
            <Info size={14} />
            {showInstructions ? "Sembunyikan Panduan" : "Cara Pasang di Fonnte"}
            {showInstructions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            className="mono"
            suppressHydrationWarning
            style={{
              flex: 1,
              minWidth: 260,
              background: C.paper,
              padding: "9px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              border: `1px solid ${C.line}`,
              wordBreak: "break-all",
              color: C.ink,
              fontWeight: 600,
            }}
          >
            {webhookUrl}
          </div>
          <button
            onClick={copyWebhookUrl}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: copiedUrl ? C.moss : C.screen,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              padding: "9px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background .15s ease",
            }}
          >
            {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
            {copiedUrl ? "Tersalin!" : "Salin URL"}
          </button>
        </div>

        {/* Collapsible Instructions */}
        {showInstructions && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid ${C.line}`,
              fontSize: 13,
              color: C.muted,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, color: C.ink, marginBottom: 6 }}>
              Langkah Menghubungkan Webhook ke Dashboard Fonnte:
            </div>
            <ol style={{ margin: "0 0 10px 18px", padding: 0 }}>
              <li>
                Buka akun Fonnte Anda di <a href="https://fonnte.com" target="_blank" rel="noreferrer" style={{ color: C.moss, textDecoration: "underline" }}>fonnte.com</a>.
              </li>
              <li>Masuk ke menu <strong>Device</strong> lalu klik <strong>Edit</strong> / <strong>Webhook</strong> pada device WhatsApp yang aktif.</li>
              <li>Salin URL Webhook di atas dan tempelkan ke kolom <strong>Webhook URL</strong> di Fonnte.</li>
              <li>Pastikan centang/aktifkan opsi <strong>Incoming Message</strong>.</li>
              <li>Klik <strong>Save</strong>. Kini setiap pesan WhatsApp yang dikirim pelanggan akan otomatis terekam di menu ini!</li>
            </ol>
            <div style={{ fontSize: 12, color: C.faint, fontStyle: "italic" }}>
              * Tip: Anda juga dapat menggunakan tombol &quot;Uji Coba Webhook&quot; di atas untuk menguji alur secara instan tanpa perlu menunggu chat dari WhatsApp asli.
            </div>
          </div>
        )}
      </div>

      {/* 4 KPI Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
          marginBottom: 26,
        }}
      >
        <div style={{ background: "#FFFFFF", border: `1px solid ${C.line}`, borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ fontSize: 11.5, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Total Event Tercatat
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>
            {events.length.toLocaleString("id-ID")}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Semua chat & event masuk
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: `1px solid ${C.line}`, borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ fontSize: 11.5, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Nomor WhatsApp Unik
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: C.moss }}>
            {uniquePhones.toLocaleString("id-ID")}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Kontak prospek unik (leads)
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: `1px solid ${C.line}`, borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ fontSize: 11.5, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Event 24 Jam Terakhir
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: C.brass }}>
            {last24HoursCount.toLocaleString("id-ID")}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Aktivitas chat hari ini
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: `1px solid ${C.line}`, borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ fontSize: 11.5, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Chat Terakhir
          </div>
          <div className="mono" suppressHydrationWarning style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginTop: 4 }}>
            {events.length > 0 ? timeAgoIndo(events[0].created_at) : "Belum ada"}
          </div>
          <div suppressHydrationWarning style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {events.length > 0 ? formatWibDate(events[0].created_at) : "Menunggu pesan"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#FFFFFF",
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              padding: "7px 12px",
              width: "100%",
              maxWidth: 360,
            }}
          >
            <Search size={14} color={C.faint} />
            <input
              type="text"
              placeholder="Cari nomor WA, nama, atau isi pesan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: 13,
                width: "100%",
                background: "transparent",
                color: C.ink,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X size={14} color={C.faint} />
              </button>
            )}
          </div>

          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{
              background: "#FFFFFF",
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 13,
              color: C.ink,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Semua Tipe Event</option>
            <option value="whatsapp_chat">whatsapp_chat</option>
            <option value="whatsapp_order_intent">whatsapp_order_intent</option>
            <option value="whatsapp_lead_inquiry">whatsapp_lead_inquiry</option>
          </select>
        </div>

        <div style={{ fontSize: 12.5, color: C.muted }}>
          Menampilkan <strong style={{ color: C.ink }}>{filteredEvents.length}</strong> dari {events.length} event
        </div>
      </div>

      {/* Events Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div className="table-scroll">
          <table className="pages-table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.paper }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Nomor WhatsApp
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Nama Kontak
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Event
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Pesan Chat
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Waktu
                </th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 24px", textAlign: "center", color: C.muted }}>
                    <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: C.paper, marginBottom: 12 }}>
                      <MessageSquare size={28} color={C.faint} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                      Belum Ada Event Obrolan WhatsApp
                    </div>
                    <p style={{ fontSize: 13, color: C.muted, maxWidth: 440, margin: "0 auto 16px" }}>
                      Hubungkan webhook Fonnte ke URL di atas, atau coba kirim pesan simulasi sekarang untuk melihat bagaimana fitur ini bekerja.
                    </p>
                    <button
                      onClick={() => setShowSimModal(true)}
                      style={{
                        background: C.moss,
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Kirim Pesan Simulasi
                    </button>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const cleanDigits = evt.phone_number.replace(/[^0-9]/g, "");
                  const waLink = `https://wa.me/${cleanDigits}`;

                  return (
                    <tr key={evt.id} className="rowline" style={{ borderBottom: `1px solid ${C.line}` }}>
                      {/* Phone Number */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span className="mono" style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                            {formatPhoneDisplay(evt.phone_number)}
                          </span>
                          <button
                            onClick={() => copyPhone(evt.phone_number)}
                            title="Salin Nomor"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                              color: copiedPhone === evt.phone_number ? C.moss : C.faint,
                            }}
                          >
                            {copiedPhone === evt.phone_number ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                        {evt.device_number && (
                          <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                            Device: {evt.device_number}
                          </div>
                        )}
                      </td>

                      {/* Sender Name */}
                      <td style={{ padding: "14px 16px", fontSize: 13.5 }}>
                        {evt.sender_name ? (
                          <span style={{ fontWeight: 600, color: C.ink }}>{evt.sender_name}</span>
                        ) : (
                          <span style={{ color: C.faint, fontStyle: "italic", fontSize: 12 }}>Tanpa Nama</span>
                        )}
                      </td>

                      {/* Event Badge */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          className="mono"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              evt.event_name === "whatsapp_order_intent"
                                ? `${C.brass}18`
                                : evt.event_name === "whatsapp_lead_inquiry"
                                ? `${C.red}12`
                                : `${C.moss}15`,
                            color:
                              evt.event_name === "whatsapp_order_intent"
                                ? C.brass
                                : evt.event_name === "whatsapp_lead_inquiry"
                                ? C.red
                                : C.moss,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "currentColor",
                            }}
                          />
                          {evt.event_name}
                        </span>
                      </td>

                      {/* Message Snippet */}
                      <td style={{ padding: "14px 16px", maxWidth: 300 }}>
                        {evt.message ? (
                          <div
                            onClick={() => setSelectedMessage(evt)}
                            title="Klik untuk membaca pesan penuh"
                            style={{
                              fontSize: 13,
                              color: C.ink,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                              textDecoration: "underline",
                              textDecorationColor: C.line,
                            }}
                          >
                            &quot;{evt.message}&quot;
                          </div>
                        ) : (
                          <span style={{ color: C.faint, fontSize: 12, fontStyle: "italic" }}>
                            [Tidak ada teks / media]
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div suppressHydrationWarning style={{ fontSize: 12.5, color: C.ink, fontWeight: 500 }}>
                          {timeAgoIndo(evt.created_at)}
                        </div>
                        <div className="mono" suppressHydrationWarning style={{ fontSize: 11, color: C.faint }}>
                          {formatWibDate(evt.created_at)}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: `${C.moss}15`,
                            color: C.moss,
                            border: `1px solid ${C.moss}35`,
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: "none",
                            transition: "background .15s ease",
                          }}
                        >
                          <PhoneCall size={12} />
                          Chat WA
                          <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Full Message Viewer */}
      {selectedMessage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(34,31,25,0.45)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setSelectedMessage(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
              border: `1px solid ${C.line}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Detail Chat Masuk
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 0", color: C.ink }}>
                  {selectedMessage.sender_name || "Tanpa Nama"} ({formatPhoneDisplay(selectedMessage.phone_number)})
                </h3>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X size={18} color={C.muted} />
              </button>
            </div>

            <div
              style={{
                background: C.paper,
                borderRadius: 6,
                padding: 16,
                fontSize: 14,
                color: C.ink,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                maxHeight: 280,
                overflowY: "auto",
                border: `1px solid ${C.line}`,
                marginBottom: 18,
              }}
            >
              {selectedMessage.message || "Tidak ada pesan teks."}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: C.muted }}>
              <span>Waktu: {formatWibDate(selectedMessage.created_at)}</span>
              <a
                href={`https://wa.me/${selectedMessage.phone_number.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: C.moss,
                  color: "#FFFFFF",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Balas di WhatsApp <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Real WhatsApp Sender via Fonnte API */}
      {showSimModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(34,31,25,0.45)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowSimModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              maxWidth: 500,
              width: "100%",
              padding: 24,
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
              border: `1px solid ${C.line}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.moss, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                  <Send size={13} />
                  Fonnte WhatsApp API (via Token .env)
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 0", color: C.ink }}>
                  Kirim Uji Coba Pesan WhatsApp
                </h3>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X size={18} color={C.muted} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>
              Pesan ini akan dikirimkan ke nomor WhatsApp tujuan menggunakan <strong>Token Fonnte</strong> yang tersimpan di environment server (<code>.env.local</code>). Setelah pesan diterima, balas pesan tersebut untuk menguji perekaman webhook Fonnte secara langsung!
            </p>

            <form onSubmit={handleSimulateWebhook}>
              {/* Target Phone Number */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 5 }}>
                  Nomor WhatsApp Tujuan (Penerima)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 089678386070 atau 6289678386070"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    fontSize: 13.5,
                    fontFamily: "'Space Mono', monospace",
                    color: C.ink,
                    outline: "none",
                  }}
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 5 }}>
                  Isi Pesan Uji Coba
                </label>
                <textarea
                  rows={3}
                  required
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    fontSize: 13,
                    color: C.ink,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    fontSize: 13,
                    color: C.muted,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={simLoading}
                  style={{
                    padding: "8px 18px",
                    background: C.moss,
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    cursor: simLoading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {simLoading ? (
                    <>
                      <RefreshCw size={14} className="rec-dot" /> Mengirim ke WhatsApp...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Kirim ke WhatsApp Sekarang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

