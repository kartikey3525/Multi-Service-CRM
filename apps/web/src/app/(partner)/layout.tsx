import Link from 'next/link';
import { PortalNavigation } from '../../components/portal-navigation';

export default function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/partner">
          Partner workspace
        </Link>
        <PortalNavigation kind="partner" />
      </header>
      {children}
    </div>
  );
}
