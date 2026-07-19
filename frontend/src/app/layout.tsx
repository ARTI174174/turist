import type { Metadata, Viewport } from 'next';
import { Bitter, Manrope, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const bitter = Bitter({ subsets: ['latin', 'cyrillic'], variable: '--font-display', weight: ['600', '700'] });
const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'ТУРИСТ — Челябинская область',
  description: 'Открывай реальные места Челябинской области. Геолокационная игра по туризму.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ТУРИСТ',
  },
};

export const viewport: Viewport = {
  themeColor: '#1F4235',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${bitter.variable} ${manrope.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
