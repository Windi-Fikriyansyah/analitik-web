import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { C } from '@/lib/colors';
import { ChevronRight, Smartphone, Monitor, Tablet, CircleAlert, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatSeconds(seconds: number) {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'baru saja';
  if (diffMin < 60) return `${diffMin}m yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}h yang lalu`;
  return date.toLocaleDateString('id-ID');
}

function DeviceIcon({ type, size = 20 }: { type: string, size?: number }) {
  switch (type) {
    case 'mobile':
      return <Smartphone size={size} />;
    case 'tablet':
      return <Tablet size={size} />;
    case 'desktop':
      return <Monitor size={size} />;
    default:
      return <CircleAlert size={size} />;
  }
}

function statusBadge(session: SessionRow) {
  if (session.ended_at) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, background: 'rgba(34,31,25,0.06)', padding: '2px 8px', borderRadius: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.faint }} />
        Selesai
      </span>
    );
  }
  const lastActive = new Date(session.last_active_at).getTime();
  const isActive = Date.now() - lastActive < 2 * 60 * 1000;
  if (isActive) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: C.moss, background: 'rgba(76,100,68,0.1)', padding: '2px 8px', borderRadius: 12 }}>
        <span className="rec-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: C.moss }} />
        Aktif
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: C.brass, background: 'rgba(168,124,44,0.1)', padding: '2px 8px', borderRadius: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.brass }} />
      Idle
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type SessionRow = {
  id: string;
  page_url: string | null;
  referrer: string | null;
  started_at: string;
  last_active_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
};

type SectionViewRow = {
  session_id: string;
  section_id: string;
  entered_at: string;
  left_at: string | null;
  duration_seconds: number | null;
};

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

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function VisitorDetailPage({
  params,
}: {
  params: { siteId: string; visitorId: string };
}) {
  const supabase = getSupabaseServer();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', params.siteId)
    .maybeSingle();
  if (!site) notFound();

  const { data: visitor } = await supabase
    .from('visitors')
    .select('id, device_type, os, browser, screen_width, screen_height, first_seen, last_seen')
    .eq('id', params.visitorId)
    .eq('site_id', site.id)
    .maybeSingle();
  if (!visitor) notFound();
  const v = visitor as VisitorRow;

  const { data: rawSessions } = await supabase
    .from('sessions')
    .select('id, page_url, referrer, started_at, last_active_at, ended_at, duration_seconds')
    .eq('visitor_id', v.id)
    .eq('site_id', site.id)
    .order('started_at', { ascending: false });
  const sessions = (rawSessions ?? []) as SessionRow[];

  const { data: rawSectionViews } = await supabase
    .from('section_views')
    .select('session_id, section_id, entered_at, left_at, duration_seconds')
    .eq('visitor_id', v.id)
    .eq('site_id', site.id)
    .order('entered_at', { ascending: true });
  const sectionViews = (rawSectionViews ?? []) as SectionViewRow[];

  const sectionsBySession = new Map<string, SectionViewRow[]>();
  sectionViews.forEach((sv) => {
    const arr = sectionsBySession.get(sv.session_id) ?? [];
    arr.push(sv);
    sectionsBySession.set(sv.session_id, arr);
  });

  const sectionAggregates = new Map<string, { totalDuration: number; viewCount: number }>();
  sectionViews.forEach((sv) => {
    const agg = sectionAggregates.get(sv.section_id) ?? { totalDuration: 0, viewCount: 0 };
    agg.viewCount += 1;
    if (typeof sv.duration_seconds === 'number' && sv.duration_seconds >= 0) {
      agg.totalDuration += sv.duration_seconds;
    }
    sectionAggregates.set(sv.section_id, agg);
  });
  const sectionList = Array.from(sectionAggregates.entries())
    .map(([id, agg]) => ({
      section_id: id,
      view_count: agg.viewCount,
      avg_duration: agg.viewCount > 0 ? agg.totalDuration / agg.viewCount : 0,
      total_duration: agg.totalDuration,
    }))
    .sort((a, b) => b.total_duration - a.total_duration);

  const maxSectionDuration = Math.max(1, ...sectionList.map((s) => s.total_duration));

  const totalEngagement = sessions.reduce((sum, s) => {
    if (typeof s.duration_seconds === 'number' && s.duration_seconds >= 0) {
      return sum + s.duration_seconds;
    }
    return sum;
  }, 0);

  const KPIS = [
    { label: "Sesi Aktif", value: sessions.length.toLocaleString() },
    { label: "Durasi Total", value: formatSeconds(totalEngagement) },
    { label: "Bagian Dilihat", value: sectionViews.length.toLocaleString() },
  ];

  return (
    <div style={{ paddingTop: 10 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 12.5, color: C.faint, fontWeight: 500 }}>
        <Link href={`/dashboard/${site.id}/visitors`} className="link-btn" style={{ color: C.faint, textDecoration: 'none' }}>
          Semua Audiens
        </Link>
        <ChevronRight size={14} />
        <span className="mono" style={{ color: C.ink }}>{v.id.slice(0, 8)}…</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: "50%", background: C.screen, color: C.phosphor }}>
          <DeviceIcon type={v.device_type} size={22} />
        </div>
        <div>
          <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: C.ink }}>{v.id}</h1>
          <div style={{ fontSize: 13, color: C.faint }}>
            Terlihat {timeAgo(v.last_seen)}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {KPIS.map((k, idx) => (
          <div key={idx} className="kpi-item">
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>{k.label}</div>
            <div className="mono kpi-value" style={{ fontSize: 27, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: "1fr 1.6fr" }}>
        {/* LEFT: Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {/* Device Info */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Informasi Perangkat</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <span style={{ color: C.muted }}>Tipe</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{v.device_type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <span style={{ color: C.muted }}>OS</span>
                <span style={{ fontWeight: 600 }}>{v.os ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <span style={{ color: C.muted }}>Browser</span>
                <span style={{ fontWeight: 600 }}>{v.browser ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <span style={{ color: C.muted }}>Layar</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {v.screen_width && v.screen_height ? `${v.screen_width}x${v.screen_height}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <span style={{ color: C.muted }}>Awal Terlihat</span>
                <span style={{ fontWeight: 600 }}>{formatDate(v.first_seen)}</span>
              </div>
            </div>
          </div>

          {/* Section Summary */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Keterlibatan Bagian</h3>
            {sectionList.length === 0 ? (
              <p style={{ fontSize: 13, color: C.faint }}>Tidak ada data bagian.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sectionList.map((s) => {
                  const pct = (s.total_duration / maxSectionDuration) * 100;
                  return (
                    <div key={s.section_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{s.section_id}</span>
                        <span style={{ color: C.muted }}>{s.view_count}× · rata-rata {formatSeconds(s.avg_duration)}</span>
                      </div>
                      <div style={{ height: 4, background: C.line, borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: C.moss, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Timeline */}
        <div className="ai-col" style={{ paddingLeft: 40 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Linimasa Sesi</h3>
          
          {sessions.length === 0 ? (
            <p style={{ fontSize: 13, color: C.faint }}>Belum ada sesi tercatat.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {sessions.map((session, idx) => {
                const sViews = sectionsBySession.get(session.id) ?? [];
                return (
                  <div key={session.id} style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 20, background: '#FFFFFF' }}>
                    
                    {/* Header Sesi */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div className="mono" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'rgba(34,31,25,0.05)', fontSize: 12, fontWeight: 700, color: C.muted }}>
                          #{sessions.length - idx}
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{formatDate(session.started_at)}</div>
                          {session.page_url && (
                            <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{session.page_url}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {statusBadge(session)}
                        <span className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>
                          {typeof session.duration_seconds === 'number' ? formatSeconds(session.duration_seconds) : '—'}
                        </span>
                      </div>
                    </div>

                    {session.referrer && (
                      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14 }}>
                        <span style={{ fontWeight: 600 }}>Referrer:</span> {session.referrer}
                      </div>
                    )}

                    {/* Section Journey */}
                    {sViews.length > 0 && (
                      <div style={{ borderLeft: `2px solid ${C.line}`, paddingLeft: 16, marginLeft: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.faint, fontWeight: 700 }}>
                          Perjalanan Bagian
                        </div>
                        {sViews.map((sv, svIdx) => (
                          <div key={svIdx} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ position: 'absolute', left: -21, top: 5, width: 8, height: 8, borderRadius: '50%', background: C.paper, border: `2px solid ${C.moss}` }} />
                            <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{sv.section_id}</span>
                            <span className="mono" style={{ fontSize: 11.5, color: C.muted }}>
                              {typeof sv.duration_seconds === 'number' ? formatSeconds(sv.duration_seconds) : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
