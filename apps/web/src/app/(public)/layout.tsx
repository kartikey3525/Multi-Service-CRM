import Link from 'next/link';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Service Network
        </Link>
        <nav className="nav">
          <Link href="/plans">Plans</Link>
          <Link href="/services">Services</Link>
          <Link href="/login">Partner login</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
