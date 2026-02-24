import './globals.css';
import type { ReactNode } from 'react';
import { Roboto } from 'next/font/google';
import Providers from './providers';

export const metadata = {
  title: 'MyFinance (Supabase)',
  description: 'Multi-user MyFinance on Supabase',
};

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}

