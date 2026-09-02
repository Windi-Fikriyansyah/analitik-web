"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colors";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

type SiteSettingsFormProps = {
  site: {
    id: string;
    name: string;
    domain: string | null;
  };
};

export default function SiteSettingsForm({ site }: SiteSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan pengaturan");
      }

      setSuccess(true);
      router.refresh(); // Refresh to update server components
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="submit"
          disabled={loading || (!name.trim())}
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
