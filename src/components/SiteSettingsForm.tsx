"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colors";
import { 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles,
  RefreshCw,
  Unlink,
  ExternalLink,
  Copy,
  Check,
  ArrowRight
} from "lucide-react";

type ConnectedAccount = {
  id?: string;
  name?: string;
  username?: string | null;
  platform?: string;
  status?: string;
  avatarUrl?: string | null;
  profileId?: any;
  profileName?: string | null;
  last_checked?: string;
};

const getProfileIdString = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return val._id || val.id || "";
  return String(val);
};

const getProfileNameString = (val: any): string => {
  if (!val) return "";
  if (typeof val === "object") return val.name || "";
  return "";
};

type SiteSettingsFormProps = {
  site: {
    id: string;
    name: string;
    domain: string | null;
    zernio_api_key?: string | null;
    meta_connected_account?: ConnectedAccount | null;
  };
  migrationPending?: boolean;
};

export default function SiteSettingsForm({ site, migrationPending = false }: SiteSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain || "");
  const [zernioApiKey, setZernioApiKey] = useState(site.zernio_api_key || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(
    site.meta_connected_account || null
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zernio actions state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);

  // Zernio profiles state
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; isDefault: boolean }>>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    getProfileIdString(site.meta_connected_account?.profileId)
  );
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Fetch Zernio profiles when API key is available
  useEffect(() => {
    const key = zernioApiKey.trim();
    if (!key) {
      setProfiles([]);
      setSelectedProfileId("");
      return;
    }

    let isMounted = true;
    async function fetchProfiles() {
      setLoadingProfiles(true);
      try {
        const res = await fetch(`/api/sites/${site.id}/zernio/profiles?api_key=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (isMounted && data.status && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
          const savedProfileId = getProfileIdString(site.meta_connected_account?.profileId);
          const matchSaved = savedProfileId && data.profiles.find((p: any) => p.id === savedProfileId);
          if (matchSaved) {
            setSelectedProfileId(matchSaved.id);
          } else if (!selectedProfileId) {
            const def = data.profiles.find((p: any) => p.isDefault) || data.profiles[0];
            if (def) setSelectedProfileId(def.id);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat profile Zernio:", err);
      } finally {
        if (isMounted) setLoadingProfiles(false);
      }
    }

    const timer = setTimeout(fetchProfiles, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [zernioApiKey, site.id]);

  // Check if returning from Zernio OAuth redirect (callback)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("zernio_callback") === "true") {
        // Clean URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        setStatusNotice({
          type: "info",
          text: "Otorisasi Meta selesai. Sedang memverifikasi status akun terhubung...",
        });

        // Automatically fetch live status from Zernio
        checkStatus(true);
      }
    }
  }, []);

  async function checkStatus(isFromCallback = false) {
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/sites/${site.id}/zernio/status?api_key=${encodeURIComponent(zernioApiKey)}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (res.ok && data.status) {
        if (data.connected && data.account) {
          setConnectedAccount(data.account);
          setStatusNotice({
            type: "success",
            text: isFromCallback
              ? `Berhasil terhubung ke akun Meta Ads: "${data.account.name}"!`
              : `Status terbaru: Akun "${data.account.name}" aktif terhubung.`,
          });
        } else {
          setConnectedAccount(null);
          setStatusNotice({
            type: "info",
            text: data.message || "Belum ada akun Meta Ads yang terhubung. Klik tombol 'Connect ke Meta Ads'.",
          });
        }
      } else {
        setStatusNotice({
          type: "error",
          text: data.error || "Gagal memeriksa status koneksi Zernio.",
        });
      }
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: `Kendala jaringan: ${err.message}`,
      });
    } finally {
      setIsCheckingStatus(false);
      router.refresh();
    }
  }

  async function handleConnectMeta() {
    if (!zernioApiKey.trim()) {
      setStatusNotice({
        type: "error",
        text: "Silakan masukkan Zernio API Key terlebih dahulu sebelum menghubungkan ke Meta Ads.",
      });
      return;
    }

    setIsConnecting(true);
    setStatusNotice(null);

    try {
      const res = await fetch(`/api/sites/${site.id}/zernio/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zernio_api_key: zernioApiKey.trim(),
          profile_id: selectedProfileId || undefined,
          redirect_url: window.location.origin,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status && data.authUrl) {
        setStatusNotice({
          type: "info",
          text: "Mengarahkan ke halaman login & izin Meta Ads...",
        });
        // Redirect user to Meta OAuth flow hosted by Zernio
        window.location.href = data.authUrl;
      } else {
        setStatusNotice({
          type: "error",
          text: data.error || "Gagal menginisiasi koneksi OAuth Zernio.",
        });
        setIsConnecting(false);
      }
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: `Error: ${err.message}`,
      });
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Apakah Anda yakin ingin memutuskan koneksi akun Meta Ads ini?")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch(`/api/sites/${site.id}/zernio/disconnect`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.status) {
        setConnectedAccount(null);
        setStatusNotice({
          type: "info",
          text: "Koneksi akun Meta Ads telah diputuskan.",
        });
        router.refresh();
      } else {
        setStatusNotice({
          type: "error",
          text: data.error || "Gagal memutuskan koneksi.",
        });
      }
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: `Error: ${err.message}`,
      });
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          domain,
          zernio_api_key: zernioApiKey.trim() || null,
          profile_id: selectedProfileId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pengaturan");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const migrationQuery = "ALTER TABLE sites ADD COLUMN IF NOT EXISTS zernio_api_key text, ADD COLUMN IF NOT EXISTS meta_connected_account jsonb;";

  const copySql = () => {
    navigator.clipboard.writeText(migrationQuery);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", borderRadius: 6, fontSize: 13.5 }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D", borderRadius: 6, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} />
          Pengaturan berhasil disimpan
        </div>
      )}

      {/* Detail Domain Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>Nama Penyewa</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              padding: "10px 14px",
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.ink)}
            onBlur={(e) => (e.target.style.borderColor = C.line)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>Domain Landing Page</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            placeholder="contoh: www.domain-anda.com"
            style={{
              padding: "10px 14px",
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.ink)}
            onBlur={(e) => (e.target.style.borderColor = C.line)}
          />
          <span style={{ fontSize: 12, color: C.muted }}>
            Digunakan oleh AI untuk menganalisa konten secara langsung. Format: nama-domain.com
          </span>
        </div>
      </div>

      {/* Zernio Meta Ads Integration Section */}
      <div style={{ paddingTop: 20, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <Sparkles size={16} color={C.moss} />
            <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: C.ink }}>
              Integrasi Meta Ads via Zernio (OAuth)
            </h4>
          </div>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            Hubungkan akun Meta Ads secara langsung menggunakan Zernio OAuth untuk pengiriman data Event Pixel (Conversions API) dan sinkronisasi Custom Audience.
          </p>
        </div>

        {/* Database Migration Reminder if table columns don't exist yet */}
        {migrationPending && (
          <div
            style={{
              padding: "12px 14px",
              background: "#FFF9E6",
              border: `1px solid ${C.brass}`,
              borderRadius: 6,
              fontSize: 12.5,
              color: "#744210",
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <strong>Perhatian: Kolom Database Belum Tersedia di Supabase</strong>
              <button
                type="button"
                onClick={copySql}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#FFFFFF",
                  border: `1px solid ${C.line}`,
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 11.5,
                  cursor: "pointer",
                  color: C.ink,
                }}
              >
                {copiedSql ? <Check size={12} color={C.moss} /> : <Copy size={12} />}
                {copiedSql ? "Tersalin!" : "Salin SQL"}
              </button>
            </div>
            <p style={{ margin: "0 0 6px" }}>
              Jalankan query SQL berikut di Supabase SQL Editor agar konfigurasi Zernio dapat disimpan:
            </p>
            <pre
              style={{
                margin: 0,
                padding: "8px 10px",
                background: "#F6F3EA",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 11.5,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {migrationQuery}
            </pre>
          </div>
        )}

        {/* Zernio API Key Field */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>
              Zernio API Key
            </label>
            <a
              href="https://zernio.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: C.moss,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 500,
              }}
            >
              Dapatkan API Key di Zernio
              <ExternalLink size={12} />
            </a>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type={showApiKey ? "text" : "password"}
              value={zernioApiKey}
              onChange={(e) => setZernioApiKey(e.target.value)}
              placeholder="sk_..."
              style={{
                width: "100%",
                padding: "10px 42px 10px 14px",
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                fontSize: 13.5,
                fontFamily: showApiKey ? "inherit" : "monospace",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.ink)}
              onBlur={(e) => (e.target.style.borderColor = C.line)}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              title={showApiKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
              style={{
                position: "absolute",
                right: 10,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.muted,
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <span style={{ fontSize: 12, color: C.muted }}>
            API Key akun Zernio Anda untuk mengontrol integrasi Meta Ads secara terpadu.
          </span>
        </div>

        {/* Zernio Profile Selector if user has profiles */}
        {profiles.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>
                Pilih Profile Zernio
              </label>
              <span style={{ fontSize: 11.5, color: C.muted }}>
                {profiles.length} profil tersedia
              </span>
            </div>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                fontSize: 13.5,
                background: "#FFFFFF",
                outline: "none",
                color: C.ink,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.ink)}
              onBlur={(e) => (e.target.style.borderColor = C.line)}
            >
              {profiles.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name} {prof.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: C.muted }}>
              Pilih profil Zernio tempat akun Meta Ads akan dihubungkan.
            </span>
          </div>
        )}

        {/* Status Notice if present */}
        {statusNotice && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 13,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              border: `1px solid ${
                statusNotice.type === "success"
                  ? "#86EFAC"
                  : statusNotice.type === "error"
                  ? "#FCA5A5"
                  : "#93C5FD"
              }`,
              background:
                statusNotice.type === "success"
                  ? "#F0FDF4"
                  : statusNotice.type === "error"
                  ? "#FEF2F2"
                  : "#EFF6FF",
              color:
                statusNotice.type === "success"
                  ? "#15803D"
                  : statusNotice.type === "error"
                  ? "#B91C1C"
                  : "#1D4ED8",
            }}
          >
            {statusNotice.type === "success" ? (
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            ) : statusNotice.type === "error" ? (
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            ) : (
              <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0, marginTop: 1 }} />
            )}
            <span>{statusNotice.text}</span>
          </div>
        )}

        {/* Connection Status Card */}
        <div
          style={{
            border: `1px solid ${connectedAccount ? "rgba(22, 163, 74, 0.3)" : C.line}`,
            background: connectedAccount ? "#F9FCF9" : "#FAFAFA",
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: connectedAccount ? "#EAF3ED" : "#F0EFEA",
                  color: connectedAccount ? C.moss : C.muted,
                  border: `1px solid ${connectedAccount ? "rgba(46, 125, 50, 0.3)" : C.line}`,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: connectedAccount ? "#16A34A" : C.muted,
                  }}
                />
                {connectedAccount ? "Terhubung ke Meta Ads" : "Belum Terhubung"}
              </span>

              {connectedAccount && (
                <span style={{ fontSize: 12, color: C.muted }}>
                  via Zernio OAuth
                </span>
              )}
            </div>

            {/* Action buttons inside status card */}
            <div style={{ display: "flex", gap: 8 }}>
              {connectedAccount && (
                <button
                  type="button"
                  onClick={() => checkStatus(false)}
                  disabled={isCheckingStatus}
                  title="Periksa status live dari Zernio"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#FFFFFF",
                    border: `1px solid ${C.line}`,
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: isCheckingStatus ? "wait" : "pointer",
                    color: C.ink,
                  }}
                >
                  <RefreshCw size={12} className={isCheckingStatus ? "animate-spin" : ""} />
                  {isCheckingStatus ? "Memeriksa..." : "Periksa Status"}
                </button>
              )}

              {connectedAccount && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  title="Putuskan koneksi akun"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "transparent",
                    border: "1px solid #FCA5A5",
                    color: "#B91C1C",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: isDisconnecting ? "wait" : "pointer",
                  }}
                >
                  <Unlink size={12} />
                  {isDisconnecting ? "Memutus..." : "Putuskan"}
                </button>
              )}
            </div>
          </div>

          {/* Details if Connected */}
          {connectedAccount ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(22, 163, 74, 0.2)",
                borderRadius: 6,
                padding: "12px 14px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                fontSize: 12.5,
              }}
            >
              <div>
                <span style={{ color: C.muted, display: "block", fontSize: 11, marginBottom: 2 }}>Nama Akun / Page</span>
                <strong style={{ color: C.ink, fontSize: 13 }}>{connectedAccount.name || "Meta Account"}</strong>
                {connectedAccount.username && (
                  <span style={{ color: C.muted, display: "block", fontSize: 11 }}>@{connectedAccount.username}</span>
                )}
              </div>
              <div>
                <span style={{ color: C.muted, display: "block", fontSize: 11, marginBottom: 2 }}>Account ID</span>
                <strong className="mono" style={{ fontSize: 12 }}>{connectedAccount.id || "-"}</strong>
              </div>
              <div>
                <span style={{ color: C.muted, display: "block", fontSize: 11, marginBottom: 2 }}>Platform</span>
                <span style={{ fontWeight: 600, color: C.ink, textTransform: "capitalize" }}>
                  {connectedAccount.platform || "Meta"}
                </span>
              </div>
              <div>
                <span style={{ color: C.muted, display: "block", fontSize: 11, marginBottom: 2 }}>Status Koneksi</span>
                <span style={{ color: "#16A34A", fontWeight: 600, textTransform: "capitalize" }}>
                  {connectedAccount.status || "Active"}
                </span>
              </div>
              {connectedAccount.profileId && (
                <div>
                  <span style={{ color: C.muted, display: "block", fontSize: 11, marginBottom: 2 }}>Zernio Profile ID</span>
                  <strong className="mono" style={{ fontSize: 12 }}>
                    {getProfileIdString(connectedAccount.profileId)}
                    {(connectedAccount.profileName || getProfileNameString(connectedAccount.profileId))
                      ? ` (${connectedAccount.profileName || getProfileNameString(connectedAccount.profileId)})`
                      : ""}
                  </strong>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                Masukkan Zernio API Key Anda di atas, lalu klik tombol di bawah untuk login dan memberikan izin Meta Ads secara otomatis melalui OAuth Zernio.
              </p>
              <div>
                <button
                  type="button"
                  onClick={handleConnectMeta}
                  disabled={isConnecting || !zernioApiKey.trim()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: !zernioApiKey.trim() ? "#E5E5E0" : C.moss,
                    color: !zernioApiKey.trim() ? C.faint : "#FFFFFF",
                    border: "none",
                    padding: "9px 18px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: (!zernioApiKey.trim() || isConnecting) ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                    boxShadow: !zernioApiKey.trim() ? "none" : "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  {isConnecting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ArrowRight size={15} />
                  )}
                  {isConnecting ? "Menghubungkan ke Zernio OAuth..." : "Connect ke Meta Ads"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button
          type="submit"
          disabled={loading || !name.trim() || !domain.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: C.ink,
            color: "#FFF",
            border: "none",
            padding: "10px 20px",
            borderRadius: 6,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Perubahan
        </button>
      </div>
    </form>
  );
}
