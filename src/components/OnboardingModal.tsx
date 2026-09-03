"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Plus, Check, Copy, ArrowRight } from "lucide-react";
import { C } from "@/lib/colors";

export default function OnboardingModal() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSiteId, setCreatedSiteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(json.error || "Gagal membuat proyek baru");
        return;
      }

      setCreatedSiteId(json.site.id);
      router.refresh(); // Invalidate Next.js router cache
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan jaringan.");
    }
  }

  const snippet = createdSiteId ? `<script
  src="${appUrl}/tracker.js"
  data-site-id="${createdSiteId}"
  async>
</script>

<!-- Tandai setiap bagian yang ingin dilacak -->
<div data-lp-section="hero">...</div>
<div data-lp-section="benefit">...</div>
<div data-lp-section="pricing">...</div>` : "";

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(21, 31, 23, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: C.paper,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: "36px 32px",
          boxShadow: "0 20px 50px rgba(34,31,25,0.25)",
          color: C.ink,
          fontFamily: "'Work Sans', sans-serif",
        }}
      >
        {!createdSiteId ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: C.screen, color: C.phosphor }}>
                <Activity size={20} color={C.red} strokeWidth={2.25} />
              </div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Selamat Datang di Sinyal
              </span>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: C.ink, letterSpacing: "-0.01em" }}>
              Buat Proyek Pertama Anda
            </h2>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
              Belum ada proyek atau situs yang terdaftar. Masukkan nama situs web/landing page Anda untuk memulai pemantauan.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.ink }}>
                  Nama Proyek / Landing Page <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Landing Page Produk Utama"
                  style={{
                    width: "100%",
                    borderRadius: 6,
                    border: `1px solid ${C.line}`,
                    padding: "11px 14px",
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: C.ink,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.ink }}>
                  Domain Situs <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Contoh: produkutama.com"
                  style={{
                    width: "100%",
                    borderRadius: 6,
                    border: `1px solid ${C.line}`,
                    padding: "11px 14px",
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: C.ink,
                    outline: "none",
                  }}
                />
              </div>

              {error && <p style={{ fontSize: 13, color: C.red, margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="link-btn mono"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: C.screen,
                  color: C.phosphor,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  marginTop: 6,
                }}
              >
                {loading ? "Memproses…" : (
                  <>
                    <Plus size={16} /> Buat Proyek & Dapatkan Skrip
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: C.moss, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                ✓ Proyek Berhasil Dibuat
              </span>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: C.ink }}>
              Pasang Skrip Pelacak Anda 🎉
            </h2>
            <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
              Salin cuplikan kode di bawah ini lalu tempelkan sebelum tag <code>&lt;/body&gt;</code> di HTML situs web Anda.
            </p>

            <div style={{ position: "relative", marginBottom: 24 }}>
              <pre
                className="mono"
                style={{
                  background: C.screen,
                  color: C.phosphor,
                  padding: 16,
                  borderRadius: 8,
                  fontSize: 12,
                  overflowX: "auto",
                  margin: 0,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {snippet}
              </pre>
              <button
                onClick={copySnippet}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: C.paper,
                  borderRadius: 4,
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Tersalin!" : "Salin"}
              </button>
            </div>

            <button
              onClick={() => router.push(`/dashboard/${createdSiteId}`)}
              className="link-btn mono"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: C.moss,
                color: C.paper,
                border: "none",
                borderRadius: 6,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Buka Dashboard Proyek <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
