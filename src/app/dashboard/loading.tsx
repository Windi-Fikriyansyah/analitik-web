export default function DashboardRootLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Work Sans', sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin-loader { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, border: '3px solid #e5e2da', borderTopColor: '#C7372F',
          borderRadius: '50%', animation: 'spin-loader 0.7s linear infinite', margin: '0 auto 14px',
        }} />
        <p style={{ fontSize: 14, color: '#8a8478' }}>Memuat dashboard…</p>
      </div>
    </div>
  );
}
