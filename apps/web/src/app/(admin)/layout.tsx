import { PortalShell } from '../../components/app-shell';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PortalShell kind="admin">{children}</PortalShell>;
}
