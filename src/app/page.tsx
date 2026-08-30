import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg">Visitor Tracker</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-brand-500 px-4 py-2 text-white hover:bg-brand-600"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Know exactly where your landing page visitors go.
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Drop one script tag into Scalev, Mayar, WordPress, or plain HTML.
          Get device breakdowns, session duration, and a section-by-section
          visitor journey — no cookies banners, no PII, no fuss.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-block rounded-md bg-brand-500 px-6 py-3 text-white font-medium hover:bg-brand-600"
          >
            Create your first site
          </Link>
        </div>

        <div className="mt-20 text-left bg-slate-900 text-slate-100 rounded-lg p-6 text-sm overflow-x-auto">
          <pre>{`<script
  src="https://your-domain.com/tracker.js"
  data-site-id="YOUR_SITE_ID"
  async>
</script>

<div data-lp-section="hero">...</div>
<div data-lp-section="pricing">...</div>`}</pre>
        </div>
      </section>
    </main>
  );
}
