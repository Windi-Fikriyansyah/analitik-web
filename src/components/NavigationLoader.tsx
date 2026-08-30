'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Shows a top loading bar during Next.js page transitions.
 * This gives users immediate visual feedback that navigation is happening.
 */
export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset whenever the route changes (navigation complete)
  useEffect(() => {
    setLoading(false);
    setProgress(0);
  }, [pathname, searchParams]);

  // Listen for link clicks to start the loader
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;
      // Don't trigger for same-page links
      if (href === pathname) return;
      setLoading(true);
      setProgress(15);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  // Animate progress while loading
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return 90;
        return p + (90 - p) * 0.1;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [loading]);

  if (!loading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #C7372F, #E8564E)',
          transition: 'width 200ms ease',
          borderRadius: '0 2px 2px 0',
          boxShadow: '0 0 8px rgba(199,55,47,0.4)',
        }}
      />
    </div>
  );
}
