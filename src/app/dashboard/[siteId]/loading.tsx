import { C } from '@/lib/colors';

export default function DashboardLoading() {
  return (
    <div style={{ paddingTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-load { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .skel { border-radius: 6px; animation: pulse-load 1.2s ease-in-out infinite; }
      `}} />
      <div style={{ width: '100%', maxWidth: 900 }}>
        {/* KPI skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ padding: 16 }}>
              <div className="skel" style={{ width: 80, height: 12, background: C.line, marginBottom: 10 }} />
              <div className="skel" style={{ width: 60, height: 28, background: C.line }} />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="skel" style={{ width: '100%', height: 200, background: C.line, marginBottom: 28 }} />
        {/* Table skeleton */}
        {[0,1,2].map(i => (
          <div key={i} className="skel" style={{ width: '100%', height: 44, background: C.line, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}
