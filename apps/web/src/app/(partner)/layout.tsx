import Link from 'next/link';

export default function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/partner">
          Partner workspace
        </Link>
        <nav className="nav">
          <Link href="/partner">Home</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
