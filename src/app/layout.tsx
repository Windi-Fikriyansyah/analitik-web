import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import NavigationLoader from '@/components/NavigationLoader';

export const metadata: Metadata = {
  title: 'Booknesia — Tahu Persis Kenapa Pengunjung Pergi Tanpa Konversi',
  description: 'Analisa perilaku pengunjung landing page per bagian, lacak klik tombol, dan dapatkan saran perbaikan dari AI untuk meningkatkan konversi. Setup 30 detik, tanpa cookie.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
