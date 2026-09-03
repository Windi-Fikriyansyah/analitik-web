'use client';

import { useState, useEffect, useRef } from 'react';
import { C } from '@/lib/colors';

type HeatmapViewerProps = {
  siteId: string;
  domain: string;
  range: string;
};

type ClickData = {
  x_position: number;
  y_position: number;
  screen_width: number;
};

export default function HeatmapViewer({ siteId, domain, range }: HeatmapViewerProps) {
  const [clicks, setClicks] = useState<ClickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [path, setPath] = useState('/');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize URL
  const iframeUrl = domain.startsWith('http') ? domain : `https://${domain}`;

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/sites/${siteId}/heatmap-data?path=${encodeURIComponent(path)}&range=${range}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Failed to fetch heatmap data');
        } else {
          setClicks(data.clicks || []);
        }
      } catch (err) {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [siteId, path]);

  // Draw Heatmap
  useEffect(() => {
    if (loading || error || clicks.length === 0) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We assume the iframe takes full width of the container.
    // The canvas is placed exactly over the iframe.
    const width = container.clientWidth;
    // Set a fixed tall height for MVP, or match iframe height if we could (cross-origin prevents reading iframe height easily).
    // Let's set the canvas to a very tall height and allow scrolling.
    const height = 4000; 

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // To make it premium but lightweight, we draw radial gradients with low opacity.
    // Overlapping gradients will naturally create hotter colors.
    
    // Draw all points
    clicks.forEach((c) => {
      // Normalize X based on recorded screen width vs current viewer width
      // This is a simple approximation. If they clicked at 50% width, we render at 50% width.
      const ratio = c.screen_width > 0 ? width / c.screen_width : 1;
      const x = c.x_position * ratio;
      const y = c.y_position; // Y is absolute from top of document

      const radius = 25;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      // Center is red, fading out to transparent
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [clicks, loading, error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', backgroundColor: '#fff', padding: '12px 16px', borderRadius: 8, border: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: 400, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, color: C.faint, fontSize: 14 }}>🔍</span>
          <input 
            type="text" 
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Ketik path halaman (contoh: /about)"
            className="input-text"
            style={{ width: '100%', paddingLeft: 36, margin: 0, height: 38 }}
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6,
          padding: '6px 12px', 
          backgroundColor: loading ? '#f3f4f6' : (clicks.length > 0 ? '#ecfdf5' : '#fef2f2'),
          color: loading ? C.faint : (clicks.length > 0 ? '#059669' : '#dc2626'),
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600
        }}>
          {loading ? (
            '⏳ Memuat data...'
          ) : (
            <>
              {clicks.length > 0 ? '🔥' : '🧊'} {clicks.length} klik ditemukan
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div style={{ padding: 12, backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: 6, fontSize: 14 }}>
          {error}
        </div>
      )}

      {!error && (
        <div 
          ref={containerRef}
          style={{ 
            position: 'relative', 
            width: '100%', 
            height: 800, // Fixed viewing window
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            overflow: 'auto', // Scrollable
            backgroundColor: '#f9f9f9'
          }}
        >
          {/* Iframe for the customer website */}
          <iframe 
            src={`${iframeUrl}${path}`}
            style={{ 
              position: 'absolute', 
              top: 0, left: 0, 
              width: '100%', 
              height: 4000, 
              border: 'none',
              pointerEvents: 'none' // Prevent interactions to keep canvas overlay working
            }} 
          />
          
          {/* Canvas Overlay for Heatmap */}
          <canvas 
            ref={canvasRef}
            style={{ 
              position: 'absolute', 
              top: 0, left: 0,
              pointerEvents: 'none',
              zIndex: 10
            }} 
          />
        </div>
      )}
    </div>
  );
}
