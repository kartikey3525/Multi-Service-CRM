import type { Metadata } from 'next';
import './globals.css';
import { brand } from '../lib/brand';

export const metadata: Metadata = {
  title: `${brand.name} | ${brand.descriptor}`,
  description: 'A service network for local business support and partner operations.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
