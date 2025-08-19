import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Cyber Directory',
  description: 'Curated cybersecurity resources you can trust.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <SiteHeader />
        <main className="container py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}