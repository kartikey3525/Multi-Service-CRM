import Link from 'next/link';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/admin">
          Operations
        </Link>
        <nav className="nav">
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/audit">Audit</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
