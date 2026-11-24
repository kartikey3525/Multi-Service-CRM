import Link from 'next/link';
import { PortalNavigation } from '../../components/portal-navigation';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/admin">
          Operations
        </Link>
        <PortalNavigation kind="admin" />
      </header>
      {children}
    </div>
  );
}
