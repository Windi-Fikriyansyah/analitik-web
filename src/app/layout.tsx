import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import NavigationLoader from '@/components/NavigationLoader';

export const metadata: Metadata = {
  title: 'Visitor Tracker - Landing Page Analytics',
  description: 'Track visitors, devices, and section-by-section engagement on any landing page.',
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
