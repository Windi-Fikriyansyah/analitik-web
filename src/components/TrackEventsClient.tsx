"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  X,
  Layers,
  Users,
  Target,
  AlertCircle,
  Loader2,
  Settings,
  CheckSquare,
  Square,
  Activity,
  CheckCheck,
  Clock,
  FileSpreadsheet,
  Upload,
  Mail,
  FileText,
  Trash2
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

export type SelectedPixelInfo = {
  id: string;
  name: string;
  ownerAdAccountId?: string;
};

export type SelectedAudienceInfo = {
  id: string;
  platformAudienceId: string;
  name: string;
  type?: string;
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

function formatWibDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB";
  } catch {
    return String(dateStr);
  }
}

function getNowWibString() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) + " WIB";
}

export default function TrackEventsClient({
  siteId,
  siteName,
  initialEvents,
  tableMissing = false,
  initialAppUrl,
  selectedPixel = null,
  selectedAudiences = [],
  hasZernioKey = false,
}: {
  siteId: string;
  siteName: string;
  initialEvents: TrackEventItem[];
  tableMissing?: boolean;
  initialAppUrl?: string;
  selectedPixel?: SelectedPixelInfo | null;
  selectedAudiences?: SelectedAudienceInfo[];
  hasZernioKey?: boolean;
}) {
  const [events, setEvents] = useState<TrackEventItem[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [capiFilter, setCapiFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedPixelId, setCopiedPixelId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<TrackEventItem | null>(null);

  // Row selection for batch CAPI & Audience sync
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [targetAudienceId, setTargetAudienceId] = useState<string>(
    selectedAudiences[0]?.platformAudienceId || selectedAudiences[0]?.id || ""
  );

  // Loading states
  const [loadingCapiId, setLoadingCapiId] = useState<string | null>(null);
  const [loadingSyncId, setLoadingSyncId] = useState<string | null>(null);
  const [isBulkCapiLoading, setIsBulkCapiLoading] = useState(false);
  const [isBulkSyncLoading, setIsBulkSyncLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals for CAPI and Audience Sync
  const [capiModalTargets, setCapiModalTargets] = useState<TrackEventItem[] | null>(null);
  const [capiEventName, setCapiEventName] = useState("Lead");
  const [capiValue, setCapiValue] = useState("");
  const [syncModalTargets, setSyncModalTargets] = useState<TrackEventItem[] | null>(null);
  const [singleSyncAudienceId, setSingleSyncAudienceId] = useState<string>(
    selectedAudiences[0]?.platformAudienceId || selectedAudiences[0]?.id || ""
  );

  // Modal for viewing synced audience phone numbers & emails
  const [viewAudienceModal, setViewAudienceModal] = useState<{ id: string; name: string } | null>(null);
  const [copiedAudienceNumbers, setCopiedAudienceNumbers] = useState(false);
  const [copiedAudienceEmails, setCopiedAudienceEmails] = useState(false);

  // Excel Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<"whatsapp" | "email">("whatsapp");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    duplicateCount?: number;
    skippedCount: number;
    skippedRows: { row: number; reason: string }[];
  } | null>(null);

  // Global toast message
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

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
        (evt.message && evt.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (evt.metadata?.email && String(evt.metadata.email).toLowerCase().includes(searchQuery.toLowerCase()));

      // CAPI Filter
      let matchCapi = true;
      if (capiFilter === "sent") {
        matchCapi = !!evt.metadata?.capi_sent;
      } else if (capiFilter === "not_sent") {
        matchCapi = !evt.metadata?.capi_sent;
      } else if (capiFilter === "Purchase") {
        matchCapi = !!evt.metadata?.capi_sent && evt.metadata?.capi_event_name?.toLowerCase() === "purchase";
      } else if (capiFilter === "Lead") {
        matchCapi = !!evt.metadata?.capi_sent && (evt.metadata?.capi_event_name?.toLowerCase() === "lead" || !evt.metadata?.capi_event_name);
      }

      // Custom Audience Filter
      let matchAudience = true;
      const syncedAudiences = Array.isArray(evt.metadata?.synced_audiences) ? evt.metadata!.synced_audiences : [];
      if (audienceFilter === "synced") {
        matchAudience = !!evt.metadata?.audience_synced && syncedAudiences.length > 0;
      } else if (audienceFilter === "not_synced") {
        matchAudience = !evt.metadata?.audience_synced || syncedAudiences.length === 0;
      } else if (audienceFilter !== "all") {
        matchAudience = syncedAudiences.some((a: any) => {
          const aId = typeof a === "string" ? a : a?.id || a?.platformAudienceId;
          const aName = typeof a === "string" ? a : a?.name;
          return aId === audienceFilter || aName === audienceFilter;
        });
      }

      return matchSearch && matchCapi && matchAudience;
    });
  }, [events, searchQuery, capiFilter, audienceFilter]);

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
    const headers = ["Waktu", "Nomor WhatsApp", "Nama Pengirim", "Meta Pixel (CAPI)", "Custom Audience", "Device", "Status"];
    const rows = events.map((e) => [
      `"${formatWibDate(e.created_at)}"`,
      `"'${e.phone_number}"`, // formatted so Excel treats as string
      `"${(e.sender_name || "").replace(/"/g, '""')}"`,
      `"${e.metadata?.capi_sent ? `CAPI ${e.metadata?.capi_event_name || "Lead"} (${formatWibDate(e.metadata?.capi_sent_at || e.metadata?.capi_sent_at_wib)})` : "Belum Kirim"}"`,
      `"${Array.isArray(e.metadata?.synced_audiences) && e.metadata.synced_audiences.length > 0 ? e.metadata.synced_audiences.map((a: any) => `${typeof a === 'string' ? a : a?.name || a?.id} (${formatWibDate(typeof a === 'object' && a?.synced_at ? a.synced_at : e.metadata?.audience_synced_at)})`).join("; ") : "Belum Sync"}"`,
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
  };

  // Download Excel Template
  const handleDownloadTemplate = (type: "whatsapp" | "email") => {
    window.open(`/api/sites/${siteId}/events/template?type=${type}`, "_blank");
  };

  // Import Excel Handler
  const handleImportExcel = async () => {
    if (!importFile) {
      showToast("Pilih file Excel terlebih dahulu", "error");
      return;
    }
    setIsImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("importType", importType);

      const res = await fetch(`/api/sites/${siteId}/events/import`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.error || "Gagal mengimpor file Excel");
      }

      setImportResult({
        importedCount: data.importedCount,
        duplicateCount: data.duplicateCount || 0,
        skippedCount: data.skippedCount || 0,
        skippedRows: data.skippedRows || [],
      });

      showToast(data.message || `Berhasil mengimpor ${data.importedCount} data.`);
      setImportFile(null);
      await fetchEventsLive(true);
    } catch (err: any) {
      showToast(err.message || "Gagal mengimpor file", "error");
    } finally {
      setIsImporting(false);
    }
  };

  // Toggle row selection
  const toggleSelectAll = () => {
    if (filteredEvents.length === 0) return;
    if (selectedRowIds.size === filteredEvents.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredEvents.map((e) => e.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Delete selected events
  const handleDeleteSelected = async () => {
    const count = selectedRowIds.size;
    if (count === 0) return;

    const isAll = count === events.length && events.length > 0;
    const confirm = window.confirm(
      isAll
        ? `Apakah Anda yakin ingin menghapus SELURUH (${count}) data kontak/event? Data yang dihapus tidak dapat dikembalikan.`
        : `Apakah Anda yakin ingin menghapus ${count} data kontak/event yang dipilih? Data yang dihapus tidak dapat dikembalikan.`
    );
    if (!confirm) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/events`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isAll
            ? { deleteAll: true }
            : { eventIds: Array.from(selectedRowIds) }
        ),
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.error || "Gagal menghapus data");
      }

      if (isAll) {
        setEvents([]);
      } else {
        setEvents((prev) => prev.filter((e) => !selectedRowIds.has(e.id)));
      }
      setSelectedRowIds(new Set());
      showToast(data.message || `Berhasil menghapus ${count} data event.`);
      await fetchEventsLive();
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus data", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy Pixel ID
  const copyPixel = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedPixelId(true);
    setTimeout(() => setCopiedPixelId(false), 2000);
  };

  // Send single CAPI event
  const handleSendCapi = async (eventItem: TrackEventItem, customEventName = "Lead", value?: number) => {
    if (!selectedPixel?.id) {
      showToast("Pilih Pixel Meta Ads terlebih dahulu di menu Pengaturan.", "error");
      return;
    }
    setLoadingCapiId(eventItem.id);
    try {
      const isPurchase = customEventName.toLowerCase() === "purchase";
      const hasValue = typeof value === "number" && !isNaN(value);

      const eventDataPayload = isPurchase
        ? { value: hasValue ? value : 0, currency: "IDR" }
        : hasValue
        ? { value, currency: "IDR" }
        : undefined;

      const res = await fetch(`/api/sites/${siteId}/zernio/capi-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventItem.id,
          eventName: customEventName,
          phoneNumber: eventItem.phone_number,
          email: eventItem.metadata?.email || undefined,
          eventData: eventDataPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.error || "Gagal mengirim CAPI event");
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const nowWib = getNowWibString();

      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === eventItem.id) {
            return {
              ...e,
              metadata: {
                ...(e.metadata || {}),
                capi_sent: true,
                capi_sent_at: nowIso,
                capi_sent_at_wib: nowWib,
                capi_pixel_id: selectedPixel.id,
                capi_pixel_name: selectedPixel.name || selectedPixel.id,
                capi_event_name: customEventName,
                ...(eventDataPayload?.value !== undefined ? { capi_value: eventDataPayload.value } : {}),
              },
            };
          }
          return e;
        })
      );
      showToast(`Event "${customEventName}" berhasil dikirim ke Pixel ${selectedPixel.name || selectedPixel.id}!`);
      setCapiModalTargets(null);
    } catch (err: any) {
      showToast(err.message || "Gagal mengirim CAPI event", "error");
    } finally {
      setLoadingCapiId(null);
    }
  };

  // Send batch CAPI events (All at once in a single request)
  const handleBulkSendCapi = async (items: TrackEventItem[], eventName = "Lead", value?: number) => {
    if (!selectedPixel?.id) {
      showToast("Pilih Pixel Meta Ads terlebih dahulu di menu Pengaturan.", "error");
      return;
    }
    if (items.length === 0) return;

    setIsBulkCapiLoading(true);

    const isPurchase = eventName.toLowerCase() === "purchase";
    const hasValue = typeof value === "number" && !isNaN(value);
    const eventDataPayload = isPurchase
      ? { value: hasValue ? value : 0, currency: "IDR" }
      : hasValue
      ? { value, currency: "IDR" }
      : undefined;

    try {
      const payloadItems = items.map((item) => ({
        eventId: item.id,
        phoneNumber: item.phone_number,
        email: item.metadata?.email || undefined,
      }));

      const res = await fetch(`/api/sites/${siteId}/zernio/capi-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          eventName,
          eventData: eventDataPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.error || "Gagal mengirim batch CAPI");
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const nowWib = getNowWibString();

      setEvents((prev) =>
        prev.map((e) => {
          if (items.some((item) => item.id === e.id)) {
            return {
              ...e,
              metadata: {
                ...(e.metadata || {}),
                capi_sent: true,
                capi_sent_at: nowIso,
                capi_sent_at_wib: nowWib,
                capi_pixel_id: selectedPixel.id,
                capi_pixel_name: selectedPixel.name || selectedPixel.id,
                capi_event_name: eventName,
                ...(eventDataPayload?.value !== undefined ? { capi_value: eventDataPayload.value } : {}),
              },
            };
          }
          return e;
        })
      );

      showToast(
        data.message || `Berhasil mengirim ${items.length} event "${eventName}" sekaligus ke Pixel!`
      );
      setSelectedRowIds(new Set());
      setCapiModalTargets(null);
      await fetchEventsLive(false);
    } catch (err: any) {
      showToast(err.message || "Gagal mengirim CAPI massal", "error");
    } finally {
      setIsBulkCapiLoading(false);
    }
  };

  // Sync phone number(s) to Custom Audience
  const handleSyncAudience = async (eventItems: TrackEventItem[], audId: string) => {
    if (!audId) {
      showToast("Pilih target Custom Audience terlebih dahulu.", "error");
      return;
    }
    const chosenAud = selectedAudiences.find(
      (a) => a.platformAudienceId === audId || a.id === audId
    );
    const audName = chosenAud?.name || audId;

    if (eventItems.length === 1) {
      setLoadingSyncId(eventItems[0].id);
    } else {
      setIsBulkSyncLoading(true);
    }

    try {
      const res = await fetch(`/api/sites/${siteId}/zernio/audience-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceId: audId,
          audienceName: audName,
          phoneNumbers: eventItems.map((e) => e.phone_number),
          users: eventItems.map((e) => ({
            phone: e.phone_number,
            email: e.metadata?.email || undefined,
          })),
          eventIds: eventItems.map((e) => e.id),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.error || "Gagal sync nomor ke Custom Audience");
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const nowWib = getNowWibString();

      const targetRecord = {
        id: audId,
        name: audName,
        synced_at: nowIso,
        synced_at_wib: nowWib,
      };

      setEvents((prev) =>
        prev.map((e) => {
          if (eventItems.some((item) => item.id === e.id)) {
            const existing = Array.isArray(e.metadata?.synced_audiences) ? e.metadata!.synced_audiences : [];
            const filtered = existing.filter((a: any) => (typeof a === "string" ? a !== audId : a?.id !== audId));
            return {
              ...e,
              metadata: {
                ...(e.metadata || {}),
                audience_synced: true,
                audience_synced_at: nowIso,
                audience_synced_at_wib: nowWib,
                synced_audiences: [...filtered, targetRecord],
              },
            };
          }
          return e;
        })
      );

      showToast(`Berhasil menambahkan ${eventItems.length} kontak ke Custom Audience "${audName}"!`);
      setSyncModalTargets(null);
      if (eventItems.length > 1) {
        setSelectedRowIds(new Set());
      }
      await fetchEventsLive(false);
    } catch (err: any) {
      showToast(err.message || "Gagal sync ke Custom Audience", "error");
    } finally {
      if (eventItems.length === 1) {
        setLoadingSyncId(null);
      } else {
        setIsBulkSyncLoading(false);
      }
    }
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
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportResult(null);
              setImportFile(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#F0FDF4",
              color: "#166534",
              border: "1px solid rgba(22, 101, 52, 0.35)",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .15s ease",
            }}
          >
            <FileSpreadsheet size={15} color="#166534" />
            Import Excel
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

      {/* Meta Ads Assets Active Info Card */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 20,
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
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "#F5F3FF",
                color: "#7C3AED",
              }}
            >
              <Target size={14} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Konfigurasi Aset Meta Ads untuk Track Event
            </span>
          </div>

          <Link
            href={`/dashboard/${siteId}/settings`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: C.moss,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Settings size={13} />
            Ubah Pilihan Aset di Pengaturan
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
            paddingTop: 8,
            borderTop: `1px solid ${C.line}`,
          }}
        >
          {/* Pixel Box */}
          <div
            style={{
              background: C.paper,
              borderRadius: 6,
              padding: "12px 14px",
              border: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "#EDE9FE",
                color: "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Layers size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                Meta Pixel (CAPI Event)
              </div>
              {selectedPixel ? (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>
                    {selectedPixel.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: 11, color: C.muted }}>
                      ID: {selectedPixel.id}
                    </span>
                    <button
                      onClick={() => copyPixel(selectedPixel.id)}
                      title="Salin ID Pixel"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        color: copiedPixelId ? C.moss : C.faint,
                      }}
                    >
                      {copiedPixelId ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <span
                      style={{
                        fontSize: 10,
                        background: "#EAF3ED",
                        color: C.moss,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 3,
                      }}
                    >
                      Aktif CAPI
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                  <span>Belum ada Pixel yang dipilih. </span>
                  <Link href={`/dashboard/${siteId}/settings`} style={{ color: C.moss, textDecoration: "underline", fontWeight: 600 }}>
                    Pilih Pixel di Pengaturan
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Custom Audience Box */}
          <div
            style={{
              background: C.paper,
              borderRadius: 6,
              padding: "12px 14px",
              border: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "#DBEAFE",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Custom Audience Target ({selectedAudiences.length})
                </span>
                {selectedAudiences.length > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      background: "#EFF6FF",
                      color: "#2563EB",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 3,
                    }}
                  >
                    Siap Sync WA & Email
                  </span>
                )}
              </div>
              {selectedAudiences.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {selectedAudiences.map((aud) => {
                    const audIdentifier = aud.platformAudienceId || aud.id;
                    const syncedEvents = events.filter((e) =>
                      e.metadata?.synced_audiences?.some((a: any) => {
                        const aId = typeof a === "string" ? a : a?.id;
                        const aName = typeof a === "string" ? a : a?.name;
                        return aId === audIdentifier || aId === aud.id || aName === aud.name;
                      })
                    );
                    const syncedWaCount = syncedEvents.filter(
                      (e) => e.phone_number && e.phone_number !== "-" && e.phone_number.trim() !== ""
                    ).length;
                    const syncedEmailCount = syncedEvents.filter(
                      (e) => Boolean(e.metadata?.email && e.metadata.email.trim() !== "")
                    ).length;

                    return (
                      <button
                        key={audIdentifier}
                        type="button"
                        onClick={() => setViewAudienceModal({ id: audIdentifier, name: aud.name })}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11.5,
                          background: "#FFFFFF",
                          border: "1px solid rgba(37, 99, 235, 0.35)",
                          color: "#1D4ED8",
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 5,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                        title={`Klik untuk melihat ${syncedWaCount} nomor WA & ${syncedEmailCount} email di audiens "${aud.name}"`}
                      >
                        <Users size={12} color="#2563EB" />
                        <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {aud.name}
                        </span>
                        <span
                          style={{
                            background: syncedWaCount > 0 ? "#DBEAFE" : "#F3F4F6",
                            color: syncedWaCount > 0 ? "#1E40AF" : C.muted,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 10,
                          }}
                        >
                          {syncedWaCount} WA
                        </span>
                        <span
                          style={{
                            background: syncedEmailCount > 0 ? "#EDE9FE" : "#F3F4F6",
                            color: syncedEmailCount > 0 ? "#6D28D9" : C.muted,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 10,
                          }}
                        >
                          {syncedEmailCount} Email
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                  <span>Belum ada Custom Audience yang dipilih. </span>
                  <Link href={`/dashboard/${siteId}/settings`} style={{ color: "#2563EB", textDecoration: "underline", fontWeight: 600 }}>
                    Pilih Audience di Pengaturan
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Docked Bulk Action Toolbar (When rows are selected) */}
      {selectedRowIds.size > 0 && (
        <div
          style={{
            background: "#0F172A",
            color: "#FFFFFF",
            borderRadius: 8,
            padding: "12px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
            border: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckSquare size={18} color="#60A5FA" />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {selectedRowIds.size} event dipilih
                </span>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>
                  ({Array.from(new Set(events.filter((e) => selectedRowIds.has(e.id)).map((e) => e.phone_number))).length} nomor WA unik)
                </span>
                <span style={{ fontSize: 11.5, color: "#60A5FA", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} />
                  {getNowWibString()}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Audience selector & bulk sync */}
            {selectedAudiences.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  value={targetAudienceId}
                  onChange={(e) => {
                    setTargetAudienceId(e.target.value);
                    setSingleSyncAudienceId(e.target.value);
                  }}
                  style={{
                    background: "#1E293B",
                    color: "#FFFFFF",
                    border: "1px solid #475569",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 12.5,
                    outline: "none",
                    maxWidth: 190,
                    cursor: "pointer",
                  }}
                  title="Pilih Target Custom Audience"
                >
                  {selectedAudiences.map((aud) => (
                    <option key={aud.platformAudienceId || aud.id} value={aud.platformAudienceId || aud.id}>
                      {aud.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const items = events.filter((e) => selectedRowIds.has(e.id));
                    if (items.length === 0) return;
                    if (targetAudienceId) {
                      setSingleSyncAudienceId(targetAudienceId);
                    }
                    setSyncModalTargets(items);
                  }}
                  disabled={isBulkSyncLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#2563EB",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 6,
                    padding: "7px 13px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: isBulkSyncLoading ? "wait" : "pointer",
                  }}
                  title="Kirim semua kontak yang dipilih sekaligus ke Custom Audience"
                >
                  {isBulkSyncLoading ? <Loader2 size={13} className="spin" /> : <Users size={13} />}
                  Sync WA ke Audience ({selectedRowIds.size})
                </button>
              </div>
            )}

            {/* Bulk CAPI button */}
            {selectedPixel && (
              <button
                onClick={() => {
                  const selectedItems = events.filter((e) => selectedRowIds.has(e.id));
                  if (selectedItems.length === 0) return;
                  setCapiModalTargets(selectedItems);
                }}
                disabled={isBulkCapiLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.moss,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 13px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: isBulkCapiLoading ? "wait" : "pointer",
                }}
              >
                {isBulkCapiLoading ? <Loader2 size={13} className="spin" /> : <Activity size={13} />}
                Kirim CAPI ({selectedRowIds.size})
              </button>
            )}

            {/* Delete button when checked */}
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#DC2626",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 6,
                padding: "7px 13px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: isDeleting ? "wait" : "pointer",
                transition: "background .15s ease",
              }}
              title="Hapus semua kontak/event yang dipilih"
            >
              {isDeleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
              Hapus ({selectedRowIds.size})
            </button>

            <button
              onClick={() => setSelectedRowIds(new Set())}
              style={{
                background: "transparent",
                color: "#94A3B8",
                border: "1px solid #475569",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

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

          {/* Filter Meta Pixel (CAPI) */}
          <select
            value={capiFilter}
            onChange={(e) => setCapiFilter(e.target.value)}
            style={{
              background: "#FFFFFF",
              border: `1px solid ${capiFilter !== "all" ? "#7C3AED" : C.line}`,
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 13,
              color: capiFilter !== "all" ? "#7C3AED" : C.ink,
              fontWeight: capiFilter !== "all" ? 600 : 400,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Semua Meta Pixel (CAPI)</option>
            <option value="sent">✓ Sudah Kirim CAPI (Semua)</option>
            <option value="not_sent">Belum Kirim CAPI</option>
            <option value="Lead">CAPI: Lead</option>
            <option value="Purchase">CAPI: Purchase</option>
          </select>

          {/* Filter Custom Audience */}
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            style={{
              background: "#FFFFFF",
              border: `1px solid ${audienceFilter !== "all" ? "#2563EB" : C.line}`,
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 13,
              color: audienceFilter !== "all" ? "#2563EB" : C.ink,
              fontWeight: audienceFilter !== "all" ? 600 : 400,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Semua Custom Audience</option>
            <option value="synced">✓ Sudah Sync Audience (Semua)</option>
            <option value="not_synced">Belum Sync Audience</option>
            {selectedAudiences.length > 0 && (
              <optgroup label="Audiens Terpilih">
                {selectedAudiences.map((aud) => (
                  <option key={aud.platformAudienceId || aud.id} value={aud.name}>
                    Audiens: {aud.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {(capiFilter !== "all" || audienceFilter !== "all" || searchQuery !== "") && (
            <button
              type="button"
              onClick={() => {
                setCapiFilter("all");
                setAudienceFilter("all");
                setSearchQuery("");
              }}
              style={{
                background: "transparent",
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                color: C.muted,
                cursor: "pointer",
              }}
            >
              Reset Filter
            </button>
          )}
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
                <th style={{ width: 44, padding: "12px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={filteredEvents.length > 0 && selectedRowIds.size === filteredEvents.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: C.moss }}
                    title="Pilih Semua Event"
                  />
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Nomor WhatsApp
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>
                  Nama Kontak
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: "#7C3AED", fontWeight: 700, textTransform: "uppercase" }}>
                  Meta Pixel (CAPI)
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11.5, color: "#2563EB", fontWeight: 700, textTransform: "uppercase" }}>
                  Custom Audience
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
                  <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center", color: C.muted }}>
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
                    <tr
                      key={evt.id}
                      className="rowline"
                      style={{
                        borderBottom: `1px solid ${C.line}`,
                        background: selectedRowIds.has(evt.id) ? "rgba(59, 130, 246, 0.04)" : "transparent",
                      }}
                    >
                      {/* Checkbox selection */}
                      <td style={{ padding: "14px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(evt.id)}
                          onChange={() => toggleSelectRow(evt.id)}
                          style={{ cursor: "pointer", accentColor: C.moss }}
                        />
                      </td>

                      {/* Phone Number & Email */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span
                            className="mono"
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: evt.phone_number && evt.phone_number !== "-" ? C.ink : C.muted,
                            }}
                          >
                            {evt.phone_number && evt.phone_number !== "-"
                              ? formatPhoneDisplay(evt.phone_number)
                              : (evt.metadata?.email ? "Tanpa No WA" : "-")}
                          </span>
                          {evt.phone_number && evt.phone_number !== "-" && (
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
                          )}
                        </div>
                        {evt.metadata?.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 11, color: "#2563EB" }}>
                            <Mail size={11} color="#3B82F6" />
                            <span style={{ wordBreak: "break-all" }}>{evt.metadata.email}</span>
                          </div>
                        )}
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

                      {/* Meta Pixel (CAPI) Column */}
                      <td style={{ padding: "14px 16px" }}>
                        {evt.metadata?.capi_sent ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3.5, alignItems: "flex-start" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: "#EAF3ED",
                                border: "1px solid rgba(46, 125, 50, 0.25)",
                                color: C.moss,
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "3px 8px",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                              }}
                              title={`Terkirim ke Pixel: ${evt.metadata.capi_pixel_name || evt.metadata.capi_pixel_id || ""} (${formatWibDate(evt.metadata.capi_sent_at || evt.metadata.capi_sent_at_wib)})`}
                            >
                              <CheckCircle2 size={12} color={C.moss} />
                              CAPI {evt.metadata.capi_event_name || "Lead"}
                            </span>
                            {(evt.metadata?.capi_sent_at || evt.metadata?.capi_sent_at_wib) && (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  color: C.muted,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3.5,
                                  lineHeight: 1.2,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Clock size={10.5} color={C.faint} />
                                {formatWibDate(evt.metadata.capi_sent_at || evt.metadata.capi_sent_at_wib)}
                              </span>
                            )}
                            <button
                              onClick={() => setCapiModalTargets([evt])}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: C.faint,
                                fontSize: 10.5,
                                cursor: "pointer",
                                padding: 0,
                                textDecoration: "underline",
                              }}
                            >
                              Kirim Ulang
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (!selectedPixel) {
                                showToast("Pilih Pixel Meta Ads di Pengaturan terlebih dahulu", "error");
                                return;
                              }
                              setCapiModalTargets([evt]);
                            }}
                            disabled={loadingCapiId === evt.id}
                            title={selectedPixel ? `Kirim CAPI Event ke Pixel: ${selectedPixel.name}` : "Pilih Pixel di Pengaturan"}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: selectedPixel ? "#FFFFFF" : C.paper,
                              color: selectedPixel ? C.moss : C.faint,
                              border: `1px solid ${selectedPixel ? "rgba(46, 125, 50, 0.35)" : C.line}`,
                              borderRadius: 5,
                              padding: "4px 9px",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: selectedPixel ? "pointer" : "not-allowed",
                              opacity: loadingCapiId === evt.id ? 0.65 : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {loadingCapiId === evt.id ? (
                              <Loader2 size={11} className="spin" />
                            ) : (
                              <Activity size={11} />
                            )}
                            Kirim CAPI
                          </button>
                        )}
                      </td>

                      {/* Custom Audience Column */}
                      <td style={{ padding: "14px 16px" }}>
                        {evt.metadata?.audience_synced && Array.isArray(evt.metadata.synced_audiences) && evt.metadata.synced_audiences.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {evt.metadata.synced_audiences.map((aud: any, idx: number) => {
                                const name = typeof aud === "string" ? aud : aud?.name || aud?.id;
                                const audId = typeof aud === "string" ? aud : aud?.id || aud?.platformAudienceId || name;
                                const syncedTime = typeof aud === "object" && (aud?.synced_at || aud?.synced_at_wib)
                                  ? (aud.synced_at || aud.synced_at_wib)
                                  : (evt.metadata?.audience_synced_at || evt.metadata?.audience_synced_at_wib);
                                return (
                                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    <button
                                      type="button"
                                      onClick={() => setViewAudienceModal({ id: audId, name })}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        background: "#EFF6FF",
                                        border: "1px solid rgba(37, 99, 235, 0.25)",
                                        color: "#1D4ED8",
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        padding: "2px 7px",
                                        borderRadius: 4,
                                        maxWidth: 160,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        cursor: "pointer",
                                      }}
                                      title={`Tersinkron ke ${name}. Klik untuk lihat daftar nomor.`}
                                    >
                                      <Users size={10} />
                                      {name}
                                    </button>
                                    {syncedTime && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: C.muted,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                          lineHeight: 1.2,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <Clock size={9.5} color={C.faint} />
                                        {formatWibDate(syncedTime)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => {
                                if (selectedAudiences.length === 0) {
                                  showToast("Pilih Custom Audience di Pengaturan terlebih dahulu", "error");
                                  return;
                                }
                                setSyncModalTargets([evt]);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: C.faint,
                                fontSize: 10.5,
                                cursor: "pointer",
                                padding: 0,
                                textDecoration: "underline",
                              }}
                            >
                              + Sync Lagi
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (selectedAudiences.length === 0) {
                                showToast("Pilih Custom Audience di Pengaturan terlebih dahulu", "error");
                                return;
                              }
                              if (selectedAudiences.length === 1) {
                                handleSyncAudience([evt], selectedAudiences[0].platformAudienceId || selectedAudiences[0].id);
                              } else {
                                setSyncModalTargets([evt]);
                              }
                            }}
                            disabled={loadingSyncId === evt.id}
                            title={selectedAudiences.length > 0 ? "Masukkan nomor WA ke Custom Audience Meta" : "Pilih Audience di Pengaturan"}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: selectedAudiences.length > 0 ? "#FFFFFF" : C.paper,
                              color: selectedAudiences.length > 0 ? "#1D4ED8" : C.faint,
                              border: `1px solid ${selectedAudiences.length > 0 ? "rgba(37, 99, 235, 0.35)" : C.line}`,
                              borderRadius: 5,
                              padding: "4px 9px",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: selectedAudiences.length > 0 ? "pointer" : "not-allowed",
                              opacity: loadingSyncId === evt.id ? 0.65 : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {loadingSyncId === evt.id ? (
                              <Loader2 size={11} className="spin" />
                            ) : (
                              <Users size={11} />
                            )}
                            + Sync WA
                          </button>
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

      {/* Modal: CAPI Event Sender (Single & Bulk) */}
      {capiModalTargets && capiModalTargets.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(34,31,25,0.45)",
            zIndex: 65,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setCapiModalTargets(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
              border: `1px solid ${C.line}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7C3AED", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                  <Layers size={13} />
                  Meta Conversions API (CAPI)
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 0", color: C.ink }}>
                  {capiModalTargets.length === 1 ? "Kirim CAPI ke Meta Pixel" : `Kirim CAPI (${capiModalTargets.length} Kontak)`}
                </h3>
              </div>
              <button
                onClick={() => setCapiModalTargets(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X size={18} color={C.muted} />
              </button>
            </div>

            <div
              style={{
                background: C.paper,
                borderRadius: 6,
                padding: "10px 14px",
                border: `1px solid ${C.line}`,
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: C.muted }}>Target Pixel:</span>
                <strong style={{ color: C.ink }}>{selectedPixel?.name || "-"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: C.muted }}>Pixel ID:</span>
                <span className="mono" style={{ color: C.ink }}>{selectedPixel?.id || "-"}</span>
              </div>
              {capiModalTargets.length === 1 ? (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: C.muted }}>Kontak WhatsApp:</span>
                  <span className="mono" style={{ fontWeight: 600, color: C.ink }}>
                    {formatPhoneDisplay(capiModalTargets[0].phone_number)}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: C.muted }}>Jumlah Kontak:</span>
                  <span style={{ fontWeight: 600, color: C.ink }}>
                    {capiModalTargets.length} kontak terpilih ({Array.from(new Set(capiModalTargets.map((e) => e.phone_number))).length} nomor unik)
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>Waktu Kirim (Asia/Jakarta):</span>
                <span style={{ fontWeight: 600, color: "#7C3AED", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} />
                  Hari ini ({getNowWibString()})
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 5 }}>
                Tipe Event Meta (Standard Event)
              </label>
              <select
                value={capiEventName}
                onChange={(e) => setCapiEventName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: `1px solid ${C.line}`,
                  fontSize: 13,
                  outline: "none",
                  background: "#FFFFFF",
                  color: C.ink,
                }}
              >
                <option value="Lead">Lead (Rekomendasi untuk Chat WA)</option>
                <option value="Purchase">Purchase (Pembelian)</option>
                <option value="Contact">Contact (Kontak Masuk)</option>
                <option value="AddToCart">AddToCart (Tambah ke Keranjang)</option>
                <option value="InitiateCheckout">InitiateCheckout (Mulai Checkout)</option>
                <option value="ViewContent">ViewContent (Lihat Konten)</option>
              </select>
            </div>

            {capiEventName === "Purchase" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 5 }}>
                  Nilai Transaksi (IDR - Opsional)
                </label>
                <input
                  type="number"
                  placeholder="Kosongkan untuk Rp 0 (opsional)"
                  value={capiValue}
                  onChange={(e) => setCapiValue(e.target.value)}
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
                <span style={{ fontSize: 11.5, color: C.faint, display: "block", marginTop: 4 }}>
                  Jika dikosongkan, otomatis dikirim tanpa nominal (Rp 0) sesuai standar Meta Conversions API.
                </span>
              </div>
            )}

            <p style={{ fontSize: 12, color: C.faint, lineHeight: 1.5, marginBottom: 18 }}>
              {capiModalTargets.length === 1
                ? "Nomor WhatsApp akan otomatis di-hash (SHA256) secara aman sebelum dikirimkan ke Meta Conversions API melalui Zernio."
                : `Seluruh ${capiModalTargets.length} nomor WhatsApp akan otomatis di-hash (SHA256) secara aman sebelum dikirimkan ke Meta Conversions API melalui Zernio.`}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCapiModalTargets(null)}
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
                type="button"
                disabled={
                  isBulkCapiLoading ||
                  (capiModalTargets.length === 1 && loadingCapiId === capiModalTargets[0].id)
                }
                onClick={() => {
                  const trimmed = capiValue.trim();
                  const val = trimmed !== "" && !isNaN(Number(trimmed)) ? parseFloat(trimmed) : undefined;
                  if (capiModalTargets.length === 1) {
                    handleSendCapi(capiModalTargets[0], capiEventName, val);
                  } else {
                    handleBulkSendCapi(capiModalTargets, capiEventName, val);
                  }
                }}
                style={{
                  padding: "8px 18px",
                  background: C.moss,
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  cursor:
                    isBulkCapiLoading || (capiModalTargets.length === 1 && loadingCapiId === capiModalTargets[0].id)
                      ? "wait"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isBulkCapiLoading ||
                (capiModalTargets.length === 1 && loadingCapiId === capiModalTargets[0].id) ? (
                  <>
                    <Loader2 size={13} className="spin" /> Mengirim CAPI...
                  </>
                ) : (
                  <>
                    <Activity size={13} /> Kirim Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Audience Sync Selector (Single & Bulk) */}
      {syncModalTargets && syncModalTargets.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(34,31,25,0.45)",
            zIndex: 65,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setSyncModalTargets(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
              border: `1px solid ${C.line}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#2563EB", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                  <Users size={13} />
                  Meta Custom Audience
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 0", color: C.ink }}>
                  {syncModalTargets.length === 1 ? "Masukkan Nomor WA ke Custom Audience" : `Sync WA ke Custom Audience Sekaligus (${syncModalTargets.length} Kontak)`}
                </h3>
              </div>
              <button
                onClick={() => setSyncModalTargets(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X size={18} color={C.muted} />
              </button>
            </div>

            <div
              style={{
                background: C.paper,
                borderRadius: 6,
                padding: "10px 14px",
                border: `1px solid ${C.line}`,
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              {syncModalTargets.length === 1 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: C.muted }}>Kontak:</span>
                    <strong style={{ color: C.ink }}>{syncModalTargets[0].sender_name || "Tanpa Nama"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: C.muted }}>Nomor WhatsApp:</span>
                    <span className="mono" style={{ fontWeight: 600, color: C.ink }}>
                      {formatPhoneDisplay(syncModalTargets[0].phone_number)}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: C.muted }}>Jumlah Kontak (1 Batch):</span>
                  <span style={{ fontWeight: 600, color: C.ink }}>
                    {syncModalTargets.length} kontak ({Array.from(new Set(syncModalTargets.map((e) => e.phone_number))).length} nomor unik)
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>Waktu Sinkron (Asia/Jakarta):</span>
                <span style={{ fontWeight: 600, color: "#2563EB", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} />
                  Hari ini ({getNowWibString()})
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
                Pilih Target Custom Audience
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedAudiences.map((aud) => {
                  const val = aud.platformAudienceId || aud.id;
                  const isSelected = singleSyncAudienceId === val;
                  return (
                    <label
                      key={val}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: `1px solid ${isSelected ? "#2563EB" : C.line}`,
                        background: isSelected ? "#EFF6FF" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="singleSyncAud"
                        value={val}
                        checked={isSelected}
                        onChange={() => setSingleSyncAudienceId(val)}
                        style={{ accentColor: "#2563EB", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{aud.name}</div>
                        <div className="mono" style={{ fontSize: 11, color: C.faint }}>
                          ID: {aud.platformAudienceId || aud.id}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <p style={{ fontSize: 12, color: C.faint, lineHeight: 1.5, marginBottom: 18 }}>
              {syncModalTargets.length === 1
                ? "Nomor WhatsApp akan di-hash (SHA256) dan disinkronkan ke audience Meta untuk keperluan retargeting iklan Anda."
                : `Seluruh ${syncModalTargets.length} kontak akan dipaketkan dalam 1 request batch, di-hash (SHA256), dan disinkronkan sekaligus ke Meta Custom Audience.`}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setSyncModalTargets(null)}
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
                type="button"
                disabled={
                  isBulkSyncLoading ||
                  (syncModalTargets.length === 1 && loadingSyncId === syncModalTargets[0].id) ||
                  !singleSyncAudienceId
                }
                onClick={() => {
                  handleSyncAudience(syncModalTargets, singleSyncAudienceId);
                }}
                style={{
                  padding: "8px 18px",
                  background: "#2563EB",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  cursor:
                    isBulkSyncLoading || (syncModalTargets.length === 1 && loadingSyncId === syncModalTargets[0].id)
                      ? "wait"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isBulkSyncLoading ||
                (syncModalTargets.length === 1 && loadingSyncId === syncModalTargets[0].id) ? (
                  <>
                    <Loader2 size={13} className="spin" /> Sinkronisasi Sekaligus...
                  </>
                ) : (
                  <>
                    <Users size={13} /> Sinkronkan Sekaligus ({syncModalTargets.length} Kontak)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIHAT DAFTAR NOMOR & EMAIL DI CUSTOM AUDIENCE */}
      {viewAudienceModal && (() => {
        const matchingEvents = events.filter((e) =>
          e.metadata?.synced_audiences?.some((a: any) => {
            const aId = typeof a === "string" ? a : a?.id;
            const aName = typeof a === "string" ? a : a?.name;
            return aId === viewAudienceModal.id || aName === viewAudienceModal.name;
          })
        );
        const uniquePhonesList = Array.from(
          new Set(matchingEvents.map((e) => e.phone_number).filter((p) => Boolean(p && p !== "-" && p.trim() !== "")))
        );
        const uniqueEmailsList = Array.from(
          new Set(matchingEvents.map((e) => e.metadata?.email).filter((em) => Boolean(em && em.trim() !== "")))
        );

        const handleCopyAllNumbers = () => {
          if (uniquePhonesList.length === 0) return;
          navigator.clipboard.writeText(uniquePhonesList.join("\n"));
          setCopiedAudienceNumbers(true);
          setTimeout(() => setCopiedAudienceNumbers(false), 2000);
        };

        const handleCopyAllEmails = () => {
          if (uniqueEmailsList.length === 0) return;
          navigator.clipboard.writeText(uniqueEmailsList.join("\n"));
          setCopiedAudienceEmails(true);
          setTimeout(() => setCopiedAudienceEmails(false), 2000);
        };

        return (
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
                maxWidth: 560,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                overflow: "hidden",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
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
                  <Users size={18} color="#2563EB" />
                  <div>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: C.ink }}>
                      Daftar Kontak: {viewAudienceModal.name}
                    </h3>
                    <span style={{ fontSize: 11.5, color: C.muted }}>
                      {uniquePhonesList.length} nomor WA & {uniqueEmailsList.length} email tersinkron ke Custom Audience ini
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewAudienceModal(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
                {/* Meta Privacy Notice */}
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#1E40AF",
                    lineHeight: 1.5,
                    marginBottom: 14,
                  }}
                >
                  🔒 <strong>Info Meta Ads:</strong> Di dashboard Meta Ads Manager (Facebook), Meta menyembunyikan identitas asli demi privasi (GDPR) dan hanya menampilkan estimasi match rate. Di bawah ini adalah daftar nomor WhatsApp dan email asli yang telah masuk ke audiens ini dari sistem Anda.
                </div>

                {matchingEvents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 16px", color: C.muted, fontSize: 13 }}>
                    Belum ada kontak (nomor WhatsApp atau email) yang disinkronkan ke audiens ini.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {matchingEvents.map((evt, idx) => {
                      const syncRecord = evt.metadata?.synced_audiences?.find((a: any) => {
                        const aId = typeof a === "string" ? a : a?.id;
                        const aName = typeof a === "string" ? a : a?.name;
                        return aId === viewAudienceModal.id || aName === viewAudienceModal.name;
                      });
                      const syncedTime =
                        typeof syncRecord === "object" && (syncRecord?.synced_at || syncRecord?.synced_at_wib)
                          ? syncRecord.synced_at || syncRecord.synced_at_wib
                          : evt.metadata?.audience_synced_at || evt.metadata?.audience_synced_at_wib;

                      const hasPhone = Boolean(evt.phone_number && evt.phone_number !== "-" && evt.phone_number.trim() !== "");
                      const hasEmail = Boolean(evt.metadata?.email && evt.metadata.email.trim() !== "");

                      return (
                        <div
                          key={evt.id || idx}
                          style={{
                            padding: "9px 12px",
                            background: "#F9FAFB",
                            border: `1px solid ${C.line}`,
                            borderRadius: 6,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 12.5,
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              {hasPhone && (
                                <strong style={{ fontFamily: "monospace", color: C.ink }}>
                                  {formatPhoneDisplay(evt.phone_number)}
                                </strong>
                              )}
                              {hasEmail && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    background: "#EDE9FE",
                                    color: "#6D28D9",
                                    fontWeight: 600,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {evt.metadata?.email}
                                </span>
                              )}
                              {evt.sender_name && (
                                <span style={{ color: C.muted, fontSize: 12 }}>({evt.sender_name})</span>
                              )}
                            </div>
                            {syncedTime && (
                              <span style={{ fontSize: 11, color: C.faint, display: "inline-flex", alignItems: "center", gap: 3.5 }}>
                                <Clock size={11} color={C.faint} />
                                Disinkronkan: {formatWibDate(syncedTime)}
                              </span>
                            )}
                          </div>
                          {hasPhone && (
                            <button
                              type="button"
                              onClick={() => copyPhone(evt.phone_number)}
                              style={{
                                background: "none",
                                border: `1px solid ${C.line}`,
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: 11,
                                color: copiedPhone === evt.phone_number ? C.moss : C.muted,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              {copiedPhone === evt.phone_number ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copiedPhone === evt.phone_number ? "Tersalin" : "Salin"}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "12px 20px",
                  borderTop: `1px solid ${C.line}`,
                  background: "#FAFAFA",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    disabled={uniquePhonesList.length === 0}
                    onClick={handleCopyAllNumbers}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 12px",
                      background: "#FFFFFF",
                      border: `1px solid ${C.line}`,
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: copiedAudienceNumbers ? C.moss : C.ink,
                      cursor: uniquePhonesList.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {copiedAudienceNumbers ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedAudienceNumbers ? "Nomor Tersalin!" : `Salin WA (${uniquePhonesList.length})`}</span>
                  </button>

                  {uniqueEmailsList.length > 0 && (
                    <button
                      type="button"
                      disabled={uniqueEmailsList.length === 0}
                      onClick={handleCopyAllEmails}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 12px",
                        background: "#FFFFFF",
                        border: `1px solid ${C.line}`,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: copiedAudienceEmails ? "#6D28D9" : C.ink,
                        cursor: uniqueEmailsList.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      {copiedAudienceEmails ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedAudienceEmails ? "Email Tersalin!" : `Salin Email (${uniqueEmailsList.length})`}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setViewAudienceModal(null)}
                  style={{
                    padding: "7px 16px",
                    background: C.screen,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Import Excel Contacts */}
      {showImportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(34,31,25,0.5)",
            zIndex: 65,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => {
            if (!isImporting) setShowImportModal(false);
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 10,
              maxWidth: 540,
              width: "100%",
              boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
              border: `1px solid ${C.line}`,
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 22px",
                borderBottom: `1px solid ${C.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                background: "#F8FAFC",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#166534", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                  <FileSpreadsheet size={14} />
                  Import Data Excel
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 0", color: C.ink }}>
                  Import Kontak ke Track Event
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!isImporting) setShowImportModal(false);
                }}
                disabled={isImporting}
                style={{ background: "transparent", border: "none", cursor: isImporting ? "not-allowed" : "pointer", padding: 0 }}
              >
                <X size={18} color={C.muted} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 22px", maxHeight: "75vh", overflowY: "auto" }}>
              {/* Step 1: Radio Selection */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                  1. Pilih Kolom Kontak yang Wajib Diisi:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label
                    style={{
                      border: `1.5px solid ${importType === "whatsapp" ? "#166534" : C.line}`,
                      background: importType === "whatsapp" ? "#F0FDF4" : "#FFFFFF",
                      borderRadius: 8,
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      transition: "all .15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="radio"
                        name="importType"
                        checked={importType === "whatsapp"}
                        onChange={() => {
                          setImportType("whatsapp");
                          setImportResult(null);
                        }}
                        style={{ accentColor: "#166534", cursor: "pointer" }}
                      />
                      <strong style={{ fontSize: 13, color: importType === "whatsapp" ? "#166534" : C.ink }}>
                        Nomor WhatsApp
                      </strong>
                    </div>
                    <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.35, paddingLeft: 24 }}>
                      <strong style={{ color: "#166534" }}>Wajib:</strong> No WhatsApp. Kolom Email, Nama, Pesan dll boleh kosong.
                    </span>
                  </label>

                  <label
                    style={{
                      border: `1.5px solid ${importType === "email" ? "#2563EB" : C.line}`,
                      background: importType === "email" ? "#EFF6FF" : "#FFFFFF",
                      borderRadius: 8,
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      transition: "all .15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="radio"
                        name="importType"
                        checked={importType === "email"}
                        onChange={() => {
                          setImportType("email");
                          setImportResult(null);
                        }}
                        style={{ accentColor: "#2563EB", cursor: "pointer" }}
                      />
                      <strong style={{ fontSize: 13, color: importType === "email" ? "#1D4ED8" : C.ink }}>
                        Alamat Email
                      </strong>
                    </div>
                    <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.35, paddingLeft: 24 }}>
                      <strong style={{ color: "#1D4ED8" }}>Wajib:</strong> Email. Kolom No WhatsApp, Nama, Pesan dll boleh kosong.
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 2: Download Template */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: `1px solid ${C.line}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                    Format File Excel (Template Resmi)
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                    Gunakan template ini agar nama kolom dan urutan data terbaca akurat.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(importType)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#FFFFFF",
                    color: importType === "whatsapp" ? "#166534" : "#1D4ED8",
                    border: `1px solid ${importType === "whatsapp" ? "rgba(22,101,52,0.4)" : "rgba(37,99,235,0.4)"}`,
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <Download size={13} />
                  Unduh Format Excel ({importType === "whatsapp" ? "No WA" : "Email"})
                </button>
              </div>

              {/* Step 3: File Upload Area */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                  2. Unggah File Excel (.xlsx / .xls / .csv):
                </label>
                <div
                  style={{
                    border: `2px dashed ${importFile ? "#166534" : C.line}`,
                    borderRadius: 8,
                    padding: "24px 16px",
                    textAlign: "center",
                    background: importFile ? "#F0FDF4" : "#FAFAFA",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onClick={() => document.getElementById("excelFileInput")?.click()}
                >
                  <input
                    id="excelFileInput"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                        setImportResult(null);
                      }
                    }}
                  />
                  {importFile ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <FileSpreadsheet size={32} color="#166534" />
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#166534" }}>
                        {importFile.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>
                        {(importFile.size / 1024).toFixed(1)} KB — Klik untuk ganti file
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <Upload size={28} color={C.faint} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                        Klik untuk memilih file Excel (.xlsx / .xls / .csv)
                      </div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>
                        Atau drag & drop file ke area ini
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Deduplication Note */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 12,
                  color: C.muted,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Info size={15} color={C.faint} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Pencegahan Duplikat:</strong> Jika nomor WhatsApp atau email sudah terdaftar di sistem, data tersebut tidak akan disimpan ulang (hanya data baru yang tersimpan).
                </span>
              </div>

              {/* Import Results Banner if any */}
              {importResult && (
                <div
                  style={{
                    borderRadius: 8,
                    padding: "14px 16px",
                    background: importResult.importedCount > 0 ? "#F0FDF4" : "#FEF2F2",
                    border: `1px solid ${importResult.importedCount > 0 ? "#BBF7D0" : "#FECACA"}`,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <CheckCircle2 size={16} color={importResult.importedCount > 0 ? "#166534" : "#DC2626"} />
                    <strong style={{ fontSize: 13, color: importResult.importedCount > 0 ? "#166534" : "#991B1B" }}>
                      Hasil Import: {importResult.importedCount} data baru berhasil disimpan
                    </strong>
                  </div>

                  {(importResult.duplicateCount || 0) > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#92400E", display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <span>ℹ️</span>
                      <span>
                        <strong>{importResult.duplicateCount} data duplikat dilewati:</strong> Nomor WhatsApp atau email sudah pernah terdaftar sehingga tidak disimpan ulang.
                      </span>
                    </div>
                  )}

                  {importResult.skippedCount > (importResult.duplicateCount || 0) && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#B45309" }}>
                      ⚠️ {importResult.skippedCount - (importResult.duplicateCount || 0)} baris dilewati karena kolom wajib kosong atau format tidak sesuai.
                    </div>
                  )}

                  {importResult.skippedRows && importResult.skippedRows.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: "1px dashed rgba(0,0,0,0.1)", paddingTop: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>
                        Rincian Baris Dilewati:
                      </span>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 11.5, color: C.muted }}>
                        {importResult.skippedRows.slice(0, 5).map((sr, idx) => (
                          <li key={idx}>Baris {sr.row}: {sr.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 22px",
                background: "#F8FAFC",
                borderTop: `1px solid ${C.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => handleDownloadTemplate(importType)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.muted,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                <Download size={12} />
                Unduh Format Kosong
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  disabled={isImporting}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    fontSize: 13,
                    color: C.ink,
                    cursor: isImporting ? "not-allowed" : "pointer",
                  }}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleImportExcel}
                  disabled={!importFile || isImporting}
                  style={{
                    padding: "8px 18px",
                    background: !importFile || isImporting ? C.paper : (importType === "whatsapp" ? "#166534" : "#1D4ED8"),
                    color: !importFile || isImporting ? C.faint : "#FFFFFF",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !importFile || isImporting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Mengimpor Excel...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Mulai Import Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Action Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            background: toast.type === "error" ? "#7F1D1D" : C.screen,
            color: toast.type === "error" ? "#FEE2E2" : C.phosphor,
            border: `1px solid ${toast.type === "error" ? "#B91C1C" : C.moss}`,
            padding: "12px 18px",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            fontWeight: 500,
            maxWidth: 440,
          }}
        >
          {toast.type === "error" ? (
            <AlertCircle size={18} color="#F87171" style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={18} color={C.phosphor} style={{ flexShrink: 0 }} />
          )}
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

