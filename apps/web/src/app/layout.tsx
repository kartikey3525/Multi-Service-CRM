import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Franchise Services Portal',
  description: 'A service network for business support and partner operations.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
