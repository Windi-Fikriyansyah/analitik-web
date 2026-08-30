'use client';

import { useState } from 'react';

export default function TrackingSnippet({ siteId }: { siteId: string }) {
  const [copied, setCopied] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';

  const snippet = `<script
  src="${appUrl}/tracker.js"
  data-site-id="${siteId}"
  async>
</script>

<!-- Mark each section you want tracked -->
<div data-lp-section="hero">...</div>
<div data-lp-section="benefit">...</div>
<div data-lp-section="testimonial">...</div>
<div data-lp-section="pricing">...</div>
<div data-lp-section="cta">...</div>

<!-- Track button clicks -->
<button data-lp-button="buy-now">Buy Now</button>
<a href="..." data-lp-button="whatsapp-chat">Chat WA</a>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API may be unavailable - user can still select manually */
    }
  }

  return (
    <div>
      <div className="relative">
        <pre className="rounded-lg bg-slate-900 text-slate-100 p-4 text-xs overflow-x-auto whitespace-pre-wrap">
          {snippet}
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 rounded-md bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400 font-mono">site_id: {siteId}</p>
    </div>
  );
}
