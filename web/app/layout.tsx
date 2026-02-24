import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'MyFinance (Supabase)',
  description: 'Multi-user MyFinance on Supabase',
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{props.children}</main>
      </body>
    </html>
  );
}

