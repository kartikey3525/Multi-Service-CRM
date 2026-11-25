'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api-client';

type PortalKind = 'admin' | 'partner';
type UserAccess = { permissions: string[] };

const links = {
  admin: [
    { href: '/admin', label: 'Home', permission: 'identity.me' },
    { href: '/admin/applications', label: 'Applications', permission: 'applications.read' },
    { href: '/admin/partners', label: 'Partners', permission: 'partners.read' },
    { href: '/admin/orders', label: 'Orders', permission: 'orders.read' },
    { href: '/admin/services', label: 'Services', permission: 'services.read' },
    { href: '/admin/commissions', label: 'Commissions', permission: 'commissions.read' },
    { href: '/admin/wallet/topups', label: 'Wallet', permission: 'wallet.read' },
    { href: '/admin/ledger', label: 'Ledger', permission: 'wallet.read' },
    { href: '/admin/payouts', label: 'Payouts', permission: 'payouts.read' },
    { href: '/admin/tickets', label: 'Tickets', permission: 'tickets.read' },
    { href: '/admin/reports', label: 'Reports', permission: 'reports.read' },
    { href: '/admin/content', label: 'Content', permission: 'content.read' },
    { href: '/admin/users', label: 'Users', permission: 'admin_users.read' },
    { href: '/admin/roles', label: 'Roles', permission: 'roles.read' },
    { href: '/admin/audit', label: 'Audit log', permission: 'audit.read' },
    { href: '/admin/settings', label: 'Settings', permission: 'settings.read' },
  ],
  partner: [
    { href: '/partner', label: 'Home', permission: 'identity.me' },
    { href: '/partner/services', label: 'Services', permission: 'services.read' },
    { href: '/partner/orders', label: 'Orders', permission: 'orders.read' },
    { href: '/partner/wallet', label: 'Wallet', permission: 'wallet.read' },
    { href: '/partner/commissions', label: 'Commissions', permission: 'commissions.read' },
    { href: '/partner/payouts', label: 'Payouts', permission: 'payouts.read' },
    { href: '/partner/customers', label: 'Customers', permission: 'customers.read' },
    { href: '/partner/tickets', label: 'Support', permission: 'tickets.read' },
    { href: '/partner/notices', label: 'Notices', permission: 'content.read' },
    { href: '/partner/team', label: 'Team', permission: 'team.read' },
    { href: '/partner/profile', label: 'Profile and KYC', permission: 'identity.me' },
    { href: '/partner/network', label: 'Partner network', permission: 'team.read' },
  ],
} satisfies Record<PortalKind, { href: string; label: string; permission: string }[]>;

export function PortalNavigation({ kind }: { kind: PortalKind }) {
  const [permissions, setPermissions] = useState<string[] | null>(null);
  useEffect(() => {
    apiGet<{ user: UserAccess }>('/v1/auth/me')
      .then(({ user }) => setPermissions(user.permissions ?? []))
      .catch(() => setPermissions([]));
  }, []);
  if (permissions === null) return <nav className="nav" aria-label="Main navigation" />;
  return (
    <nav className="nav" aria-label="Main navigation">
      {links[kind]
        .filter((item) => permissions.includes(item.permission))
        .map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
    </nav>
  );
}
