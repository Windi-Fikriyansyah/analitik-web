"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { C } from "@/lib/colors";
import { resetSiteData } from "@/app/actions";

export default function ResetDataButton({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!confirm("Apakah Anda yakin ingin menghapus SEMUA data pelacakan untuk penyewa ini?")) return;
    setLoading(true);
    try {
      await resetSiteData(siteId);
      alert("Semua data pelacakan berhasil dihapus.");
    } catch (e) {
      alert("Gagal menghapus data.");
    }
    setLoading(false);
  }

  return (
    <button 
      onClick={handleReset} 
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6, 
        padding: "4px 8px", cursor: loading ? "wait" : "pointer",
        color: C.red, fontSize: 13, fontWeight: 500
      }}
      title="Hapus Semua Data Track"
    >
      <Trash2 size={14} />
      {loading ? "Menghapus..." : "Reset All"}
    </button>
  );
}
