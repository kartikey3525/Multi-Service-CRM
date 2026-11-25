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
    { href: '/admin/users', label: 'Users', permission: 'admin_users.read' },
    { href: '/admin/audit', label: 'Audit log', permission: 'audit.read' },
  ],
  partner: [
    { href: '/partner', label: 'Home', permission: 'identity.me' },
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
