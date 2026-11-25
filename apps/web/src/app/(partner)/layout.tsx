import { PortalShell } from '../../components/app-shell';

export default function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PortalShell kind="partner">{children}</PortalShell>;
}
