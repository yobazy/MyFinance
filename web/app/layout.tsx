import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import Providers from './providers';

export const metadata = {
  title: 'MyFinance (Supabase)',
  description: 'Multi-user MyFinance on Supabase',
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}

