/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // tracker.js must be embeddable & fetchable from ANY third-party
        // landing page (Scalev, Mayar, WordPress, static HTML, etc.)
        source: '/tracker.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        // Ingestion API is also called cross-origin from the tenant's site
        source: '/api/track',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
