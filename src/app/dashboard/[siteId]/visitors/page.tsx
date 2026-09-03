import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { C } from '@/lib/colors';

export const revalidate = 30;

function formatSeconds(seconds: number) {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function deviceIcon(type: string) {
  switch (type) {
    case 'mobile':
      return '📱';
    case 'tablet':
      return '📲';
    case 'desktop':
      return '🖥️';
    default:
      return '❓';
  }
}

type VisitorRow = {
  id: string;
  device_type: string;
  os: string | null;
  browser: string | null;
  screen_width: number | null;
  screen_height: number | null;
  first_seen: string;
  last_seen: string;
};

type SessionRow = {
  visitor_id: string;
  duration_seconds: number | null;
};

export default async function VisitorsListPage({ 
  params,
  searchParams 
}: { 
  params: { siteId: string },
  searchParams: { range?: string }
}) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', params.siteId)
    .maybeSingle();

  if (!site) notFound();

  const rangeDays = parseInt(searchParams.range || '14', 10);
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - rangeDays);
  const thresholdIso = dateThreshold.toISOString();

  const [{ data: visitors }, { data: sessions }] = await Promise.all([
    supabase
      .from('visitors')
      .select('id, device_type, os, browser, screen_width, screen_height, first_seen, last_seen')
      .eq('site_id', site.id)
      .gte('last_seen', thresholdIso)
      .order('last_seen', { ascending: false }),
    supabase
      .from('sessions')
      .select('visitor_id, duration_seconds')
      .eq('site_id', site.id)
      .gte('started_at', thresholdIso),
  ]);

  // Aggregate sessions per visitor
  const sessionMap = new Map<string, { count: number; totalDuration: number }>();
  (sessions as SessionRow[] ?? []).forEach((s) => {
    const entry = sessionMap.get(s.visitor_id) ?? { count: 0, totalDuration: 0 };
    entry.count += 1;
    if (typeof s.duration_seconds === 'number' && s.duration_seconds >= 0) {
      entry.totalDuration += s.duration_seconds;
    }
    sessionMap.set(s.visitor_id, entry);
  });

  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Semua Audiens</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: C.faint }}>{(visitors ?? []).length} pengunjung dilacak</span>
          <a href={`/api/sites/${params.siteId}/export`} className="cta-ghost" style={{ fontSize: 12, padding: "4px 10px", borderRadius: 4, textDecoration: "none", color: C.ink, display: "inline-block", border: `1px solid ${C.line}` }}>
            📥 Unduh Excel
          </a>
        </div>
      </div>

      {(!visitors || visitors.length === 0) && (
        <p style={{ fontSize: 14, color: C.faint }}>
          Belum ada pengunjung. Pasang skrip pelacakan Anda.
        </p>
      )}

      {visitors && visitors.length > 0 && (
        <div className="table-scroll">
          <table className="pages-table">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                {["Pengunjung", "Perangkat", "Browser / OS", "Sesi", "Durasi Total", "Terakhir Aktif"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0 0 10px", fontSize: 11.5, color: C.faint, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(visitors as VisitorRow[]).map((v) => {
                const stats = sessionMap.get(v.id) ?? { count: 0, totalDuration: 0 };
                return (
                  <tr key={v.id} className="rowline" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: "13px 20px 13px 0" }}>
                      <Link
                        href={`/dashboard/${site.id}/visitors/${v.id}`}
                        className="mono link-btn"
                        style={{ color: C.red, textDecoration: 'none', fontWeight: 600 }}
                      >
                        {v.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td style={{ padding: "13px 20px 13px 0", whiteSpace: "nowrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{deviceIcon(v.device_type)}</span>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{v.device_type}</span>
                      </span>
                    </td>
                    <td style={{ padding: "13px 20px 13px 0", color: C.muted }}>
                      {v.browser ?? '—'} <span style={{ color: C.faint }}>·</span> {v.os ?? '—'}
                    </td>
                    <td className="mono" style={{ padding: "13px 20px 13px 0", whiteSpace: "nowrap" }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: C.line, fontSize: 12, fontWeight: 700 }}>
                        {stats.count}
                      </span>
                    </td>
                    <td className="mono" style={{ padding: "13px 20px 13px 0", whiteSpace: "nowrap", fontWeight: 600 }}>
                      {formatSeconds(stats.totalDuration)}
                    </td>
                    <td style={{ padding: "13px 0", whiteSpace: "nowrap", fontSize: 12.5, color: C.faint }}>
                      {timeAgo(v.last_seen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
