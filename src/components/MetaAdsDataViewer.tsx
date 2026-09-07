"use client";

import { useState, useEffect, useCallback } from "react";
import { C } from "@/lib/colors";
import {
  Layers,
  Users,
  Copy,
  Check,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Activity,
  AlertCircle,
  BarChart2,
  ChevronDown,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";

type MetaPixel = {
  id: string;
  name: string;
  platform?: string;
  kind?: string;
  status?: string;
  ownerAdAccountId?: string;
};

type CustomAudience = {
  id?: string | null;
  platformAudienceId?: string;
  name: string;
  description?: string;
  type?: string;
  platform?: string;
  size?: number;
  status?: string;
  deliveryStatus?: {
    code?: number;
    description?: string;
  };
  createdAt?: number;
};

type AdAccount = {
  id: string;
  name: string;
  currency?: string;
  accountStatus?: number;
  selectable?: boolean;
  businessName?: string;
  timezoneName?: string;
  unusableReason?: string | null;
};

type SelectedPixelData = {
  id: string;
  name: string;
  ownerAdAccountId?: string;
};

type SelectedAudienceData = {
  id: string;
  platformAudienceId: string;
  name: string;
  type?: string;
};

interface MetaAdsDataViewerProps {
  siteId: string;
  isConnected: boolean;
  initialSelectedPixel?: SelectedPixelData | null;
  initialSelectedAudiences?: SelectedAudienceData[];
}

export default function MetaAdsDataViewer({
  siteId,
  isConnected,
  initialSelectedPixel,
  initialSelectedAudiences,
}: MetaAdsDataViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>("");
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [audiences, setAudiences] = useState<CustomAudience[]>([]);

  // Selection state
  const [selectedPixelId, setSelectedPixelId] = useState<string>(initialSelectedPixel?.id || "");
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<Set<string>>(
    new Set((initialSelectedAudiences || []).map((a) => a.platformAudienceId || a.id))
  );

  useEffect(() => {
    if (initialSelectedPixel?.id) {
      setSelectedPixelId(initialSelectedPixel.id);
    }
  }, [initialSelectedPixel?.id]);

  useEffect(() => {
    if (initialSelectedAudiences) {
      setSelectedAudienceIds(new Set(initialSelectedAudiences.map((a) => a.platformAudienceId || a.id)));
    }
  }, [initialSelectedAudiences]);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Search filters
  const [pixelSearch, setPixelSearch] = useState("");
  const [audienceSearch, setAudienceSearch] = useState("");

  // Create Custom Audience modal state
  const [isCreateAudienceOpen, setIsCreateAudienceOpen] = useState(false);
  const [newAudienceName, setNewAudienceName] = useState("");
  const [newAudienceDesc, setNewAudienceDesc] = useState("");
  const [isCreatingAudience, setIsCreatingAudience] = useState(false);
  const [createAudienceError, setCreateAudienceError] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudienceName.trim()) {
      setCreateAudienceError("Nama Custom Audience wajib diisi");
      return;
    }
    setIsCreatingAudience(true);
    setCreateAudienceError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/zernio/audience-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAudienceName.trim(),
          description: newAudienceDesc.trim() || undefined,
          adAccountId: selectedAdAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.error || "Gagal membuat Custom Audience");
      }

      const created = data.audience;
      setAudiences((prev) => [created, ...prev]);
      setSelectedAudienceIds((prev) => new Set([...prev, created.platformAudienceId || created.id]));
      setIsCreateAudienceOpen(false);
      setNewAudienceName("");
      setNewAudienceDesc("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setCreateAudienceError(err.message || "Gagal membuat Custom Audience");
    } finally {
      setIsCreatingAudience(false);
    }
  };

  const fetchData = useCallback(
    async (targetAdAccountId?: string) => {
      if (!isConnected) return;
      setLoading(true);
      setError(null);

      try {
        let url = `/api/sites/${siteId}/zernio/meta-data`;
        if (targetAdAccountId) {
          url += `?adAccountId=${encodeURIComponent(targetAdAccountId)}`;
        }

        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        if (res.ok && data.status) {
          setAdAccounts(data.adAccounts || []);
          setPixels(data.pixels || []);
          setAudiences(data.audiences || []);
          if (data.selectedAdAccountId) {
            setSelectedAdAccountId(data.selectedAdAccountId);
          }
        } else {
          setError(data.error || "Gagal memuat data dari Meta Ads");
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kendala jaringan saat memuat data");
      } finally {
        setLoading(false);
      }
    },
    [siteId, isConnected]
  );

  useEffect(() => {
    if (isConnected) {
      fetchData();
    }
  }, [isConnected, fetchData]);

  const handleAdAccountChange = (newAdAccountId: string) => {
    setSelectedAdAccountId(newAdAccountId);
    fetchData(newAdAccountId);
  };

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle audience selection
  const toggleAudience = (audId: string) => {
    setSelectedAudienceIds((prev) => {
      const next = new Set(prev);
      if (next.has(audId)) {
        next.delete(audId);
      } else {
        next.add(audId);
      }
      return next;
    });
  };

  // Save selections to database
  const handleSaveSelection = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const chosenPixel = pixels.find((p) => p.id === selectedPixelId);
    const chosenAudiences = audiences
      .filter((a) => selectedAudienceIds.has(a.platformAudienceId || a.id || ""))
      .map((a) => ({
        id: a.id || "",
        platformAudienceId: a.platformAudienceId || "",
        name: a.name,
        type: a.type || "",
      }));

    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_pixel: chosenPixel
            ? { id: chosenPixel.id, name: chosenPixel.name, ownerAdAccountId: chosenPixel.ownerAdAccountId }
            : null,
          selected_audiences: chosenAudiences.length > 0 ? chosenAudiences : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pilihan");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  // Check if selection changed from initial
  const hasSelectionChanged =
    selectedPixelId !== (initialSelectedPixel?.id || "") ||
    (() => {
      const initialIds = new Set((initialSelectedAudiences || []).map((a) => a.platformAudienceId || a.id));
      if (initialIds.size !== selectedAudienceIds.size) return true;
      for (const id of selectedAudienceIds) {
        if (!initialIds.has(id)) return true;
      }
      return false;
    })();

  // Filtered lists
  const filteredPixels = pixels.filter((p) => {
    const q = pixelSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q)) ||
      (p.ownerAdAccountId && p.ownerAdAccountId.toLowerCase().includes(q))
    );
  });

  const filteredAudiences = audiences.filter((a) => {
    const q = audienceSearch.toLowerCase();
    return (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.platformAudienceId && a.platformAudienceId.toLowerCase().includes(q)) ||
      (a.type && a.type.toLowerCase().includes(q))
    );
  });

  const formatSize = (size?: number) => {
    if (size === undefined || size === null || size < 0) return "< 1.000";
    return size.toLocaleString("id-ID");
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getAudienceTypeBadge = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("lookalike")) {
      return { label: "Lookalike", bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" };
    }
    if (t.includes("website") || t.includes("pixel")) {
      return { label: "Website Pixel", bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" };
    }
    if (t.includes("customer")) {
      return { label: "Customer List", bg: "#FAF5FF", color: "#6B21A8", border: "#E9D5FF" };
    }
    return { label: type || "Custom", bg: "#F4F4F5", color: "#3F3F46", border: "#E4E4E7" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header Card: Ad Account Selector & Refresh */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "#EAF3ED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.moss,
              }}
            >
              <Activity size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: C.ink }}>
                Aset Meta Ads (Zernio)
              </h3>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                Pilih 1 Pixel dan beberapa Custom Audience untuk digunakan di halaman Track Event.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => fetchData(selectedAdAccountId)}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#FFFFFF",
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: loading ? "wait" : "pointer",
                color: C.ink,
                transition: "all 0.15s",
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {loading ? "Menyinkronkan..." : "Segarkan Data"}
            </button>
          </div>
        </div>

        {/* Ad Account Selection Dropdown */}
        {adAccounts.length > 0 && (
          <div
            style={{
              paddingTop: 12,
              borderTop: `1px solid ${C.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                Pilih Akun Iklan Meta (Ad Account):
              </label>
              <span style={{ fontSize: 11.5, color: C.muted }}>
                {adAccounts.length} akun iklan tersedia
              </span>
            </div>

            <div style={{ position: "relative" }}>
              <select
                value={selectedAdAccountId}
                onChange={(e) => handleAdAccountChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 32px 8px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  background: "#FAFAFA",
                  color: C.ink,
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                }}
              >
                {adAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.id}) {acc.currency ? `• ${acc.currency}` : ""}
                    {acc.accountStatus === 1 ? " • Aktif" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                color={C.muted}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 6,
              color: "#B91C1C",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 1. KARTU DATA PIXEL META ADS - with radio selection */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${selectedPixelId ? C.moss : C.line}`,
          borderRadius: 8,
          overflow: "hidden",
          transition: "border-color 0.2s",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${C.line}`,
            background: selectedPixelId ? "#F0FDF4" : "#FAFAFA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            transition: "background 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color={C.moss} />
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.ink }}>
              Pilih Pixel Meta Ads
            </h4>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: selectedPixelId ? "#DCFCE7" : "#EAF3ED",
                color: C.moss,
                padding: "2px 8px",
                borderRadius: 12,
                border: "1px solid rgba(46, 125, 50, 0.2)",
              }}
            >
              {selectedPixelId ? "1 Dipilih" : `${pixels.length} Pixel`}
            </span>
          </div>

          {/* Quick Search */}
          <div style={{ position: "relative", minWidth: 160 }}>
            <input
              type="text"
              placeholder="Cari pixel..."
              value={pixelSearch}
              onChange={(e) => setPixelSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "4px 8px 4px 26px",
                fontSize: 12,
                border: `1px solid ${C.line}`,
                borderRadius: 4,
                outline: "none",
                background: "#FFFFFF",
              }}
            />
            <Search
              size={12}
              color={C.muted}
              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}
            />
          </div>
        </div>

        {/* Pixel Items List */}
        <div style={{ padding: "8px 16px", maxHeight: 320, overflowY: "auto" }}>
          {pixels.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 16px", color: C.muted, fontSize: 13 }}>
              Belum ada Meta Pixel yang terhubung di akun ini.
            </div>
          ) : filteredPixels.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 16px", color: C.muted, fontSize: 12.5 }}>
              Tidak ada pixel yang cocok dengan pencarian &quot;{pixelSearch}&quot;.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
              {filteredPixels.map((pix) => {
                const isSelected = selectedPixelId === pix.id;
                const isCopied = copiedId === `pix-${pix.id}`;
                return (
                  <div
                    key={pix.id}
                    onClick={() => setSelectedPixelId(isSelected ? "" : pix.id)}
                    style={{
                      padding: "10px 12px",
                      border: `1.5px solid ${isSelected ? C.moss : C.line}`,
                      borderRadius: 6,
                      background: isSelected ? "#F0FDF4" : "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {/* Radio indicator */}
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: `2px solid ${isSelected ? C.moss : C.faint}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        {isSelected && (
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: C.moss,
                            }}
                          />
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              color: C.ink,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {pix.name || "Meta Pixel"}
                          </span>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: "#16A34A",
                              background: "#F0FDF4",
                              border: "1px solid #BBF7D0",
                              borderRadius: 10,
                              padding: "1px 6px",
                            }}
                          >
                            Active
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, color: C.muted, fontFamily: "monospace" }}>
                            ID: {pix.id}
                          </span>
                          {pix.ownerAdAccountId && (
                            <span style={{ fontSize: 11, color: C.faint }}>
                              Akun: {pix.ownerAdAccountId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(pix.id, `pix-${pix.id}`);
                      }}
                      title="Salin Pixel ID"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 9px",
                        fontSize: 11.5,
                        background: isCopied ? "#EAF3ED" : "#FAFAFA",
                        border: `1px solid ${isCopied ? C.moss : C.line}`,
                        borderRadius: 4,
                        color: isCopied ? C.moss : C.ink,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? "Tersalin" : "Salin ID"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. KARTU DATA CUSTOM AUDIENCE - with checkbox selection */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${selectedAudienceIds.size > 0 ? C.moss : C.line}`,
          borderRadius: 8,
          overflow: "hidden",
          transition: "border-color 0.2s",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${C.line}`,
            background: selectedAudienceIds.size > 0 ? "#F0FDF4" : "#FAFAFA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            transition: "background 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} color={C.moss} />
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.ink }}>
              Pilih Custom Audience
            </h4>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: selectedAudienceIds.size > 0 ? "#DCFCE7" : "#EAF3ED",
                color: C.moss,
                padding: "2px 8px",
                borderRadius: 12,
                border: "1px solid rgba(46, 125, 50, 0.2)",
              }}
            >
              {selectedAudienceIds.size > 0
                ? `${selectedAudienceIds.size} Dipilih`
                : `${audiences.length} Audiens`}
            </span>
          </div>

          {/* Action & Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setIsCreateAudienceOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 11px",
                background: C.moss,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
            >
              <Plus size={13} />
              <span>Buat Custom Audience</span>
            </button>

            {/* Quick Search */}
            <div style={{ position: "relative", minWidth: 150 }}>
              <input
                type="text"
                placeholder="Cari audiens..."
                value={audienceSearch}
                onChange={(e) => setAudienceSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px 8px 4px 26px",
                  fontSize: 12,
                  border: `1px solid ${C.line}`,
                  borderRadius: 4,
                  outline: "none",
                  background: "#FFFFFF",
                }}
              />
              <Search
                size={12}
                color={C.muted}
                style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>
        </div>

        {/* Custom Audience Items List */}
        <div style={{ padding: "8px 16px", maxHeight: 380, overflowY: "auto" }}>
          {audiences.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 16px", color: C.muted, fontSize: 13 }}>
              {selectedAdAccountId
                ? "Belum ada Custom Audience di akun iklan ini."
                : "Pilih akun iklan di atas untuk melihat Custom Audience."}
            </div>
          ) : filteredAudiences.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 16px", color: C.muted, fontSize: 12.5 }}>
              Tidak ada audiens yang cocok dengan pencarian &quot;{audienceSearch}&quot;.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
              {filteredAudiences.map((aud, idx) => {
                const audId = aud.platformAudienceId || aud.id || `aud-${idx}`;
                const isSelected = selectedAudienceIds.has(audId);
                const isCopied = copiedId === `aud-${audId}`;
                const typeBadge = getAudienceTypeBadge(aud.type);

                return (
                  <div
                    key={audId}
                    onClick={() => toggleAudience(audId)}
                    style={{
                      padding: "12px 14px",
                      border: `1.5px solid ${isSelected ? C.moss : C.line}`,
                      borderRadius: 6,
                      background: isSelected ? "#F0FDF4" : "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                      {/* Checkbox indicator */}
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: `2px solid ${isSelected ? C.moss : C.faint}`,
                          background: isSelected ? C.moss : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 1,
                          transition: "all 0.15s",
                        }}
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              color: C.ink,
                            }}
                          >
                            {aud.name || "Custom Audience"}
                          </span>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              backgroundColor: typeBadge.bg,
                              color: typeBadge.color,
                              border: `1px solid ${typeBadge.border}`,
                              borderRadius: 10,
                              padding: "1px 6px",
                              textTransform: "capitalize",
                            }}
                          >
                            {typeBadge.label}
                          </span>
                          {aud.id && /^[0-9a-fA-F]{24}$/.test(aud.id) ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                background: "#DCFCE7",
                                color: "#15803D",
                                border: "1px solid #BBF7D0",
                                borderRadius: 10,
                                padding: "1px 6px",
                              }}
                              title="Terintegrasi dengan Zernio. Siap menerima sinkronisasi nomor WhatsApp."
                            >
                              ✓ Siap Sync WA
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                background: "#F3F4F6",
                                color: "#6B7280",
                                border: "1px solid #E5E7EB",
                                borderRadius: 10,
                                padding: "1px 6px",
                              }}
                              title="Dibuat langsung di Meta Ads Manager. Tidak mendukung upload via API."
                            >
                              Meta Langsung (Target Iklan Saja)
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 11.5 }}>
                          <span style={{ color: C.muted, fontFamily: "monospace" }}>
                            ID: {aud.platformAudienceId || aud.id || "-"}
                          </span>
                          <span style={{ color: C.faint }}>•</span>
                          <span style={{ color: C.muted }}>
                            Ukuran: <strong>{formatSize(aud.size)}</strong>
                          </span>
                          {aud.createdAt && (
                            <>
                              <span style={{ color: C.faint }}>•</span>
                              <span style={{ color: C.muted }}>
                                Dibuat: {formatDate(aud.createdAt)}
                              </span>
                            </>
                          )}
                        </div>

                        {aud.deliveryStatus?.description && (
                          <span style={{ fontSize: 11, color: "#16A34A" }}>
                            ✓ {aud.deliveryStatus.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(aud.platformAudienceId || aud.id || "", `aud-${audId}`);
                      }}
                      title="Salin Audience ID"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 9px",
                        fontSize: 11.5,
                        background: isCopied ? "#EAF3ED" : "#FAFAFA",
                        border: `1px solid ${isCopied ? C.moss : C.line}`,
                        borderRadius: 4,
                        color: isCopied ? C.moss : C.ink,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? "Tersalin" : "Salin ID"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. SAVE SELECTION BUTTON */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 12.5, color: C.muted }}>
          {selectedPixelId ? (
            <span>
              Pixel: <strong style={{ color: C.ink }}>{pixels.find((p) => p.id === selectedPixelId)?.name || selectedPixelId}</strong>
            </span>
          ) : (
            <span>Belum ada pixel yang dipilih</span>
          )}
          {" · "}
          {selectedAudienceIds.size > 0 ? (
            <span>
              <strong style={{ color: C.ink }}>{selectedAudienceIds.size}</strong> audience dipilih
            </span>
          ) : (
            <span>Belum ada audience dipilih</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveSuccess && (
            <span style={{ fontSize: 12, color: C.moss, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={14} /> Tersimpan!
            </span>
          )}
          {saveError && (
            <span style={{ fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={14} /> {saveError}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveSelection}
            disabled={isSaving || (!selectedPixelId && selectedAudienceIds.size === 0)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: hasSelectionChanged ? C.moss : "#E5E7EB",
              color: hasSelectionChanged ? "#FFFFFF" : C.muted,
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: isSaving || (!selectedPixelId && selectedAudienceIds.size === 0) ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? "Menyimpan..." : "Simpan Pilihan"}
          </button>
        </div>
      </div>
      {/* MODAL BUAT CUSTOM AUDIENCE */}
      {isCreateAudienceOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 10,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${C.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={18} color={C.moss} />
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: C.ink }}>
                  Buat Custom Audience di Meta Ads
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAudienceOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAudience} style={{ padding: "18px 20px" }}>
              <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 0, marginBottom: 16 }}>
                Custom Audience bertipe <strong>Customer List</strong> akan dibuat di akun iklan Meta Ads Anda dan otomatis terdaftar di Zernio sehingga siap menerima sinkronisasi nomor WhatsApp secara otomatis.
              </p>

              {createAudienceError && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    borderRadius: 6,
                    color: "#991B1B",
                    fontSize: 12.5,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{createAudienceError}</span>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
                  Nama Custom Audience <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Leads WhatsApp Website"
                  value={newAudienceName}
                  onChange={(e) => setNewAudienceName(e.target.value)}
                  disabled={isCreatingAudience}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${C.line}`,
                    fontSize: 13,
                    outline: "none",
                    color: C.ink,
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
                  Deskripsi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Daftar kontak WhatsApp pengunjung website"
                  value={newAudienceDesc}
                  onChange={(e) => setNewAudienceDesc(e.target.value)}
                  disabled={isCreatingAudience}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${C.line}`,
                    fontSize: 13,
                    outline: "none",
                    color: C.ink,
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateAudienceOpen(false)}
                  disabled={isCreatingAudience}
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
                  disabled={isCreatingAudience || !newAudienceName.trim()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    background: C.moss,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isCreatingAudience || !newAudienceName.trim() ? "not-allowed" : "pointer",
                    opacity: isCreatingAudience || !newAudienceName.trim() ? 0.7 : 1,
                  }}
                >
                  {isCreatingAudience ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>{isCreatingAudience ? "Membuat di Meta Ads..." : "Buat & Hubungkan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
