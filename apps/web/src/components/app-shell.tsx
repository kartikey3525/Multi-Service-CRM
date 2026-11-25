import Link from 'next/link';
import type { ReactNode } from 'react';
import { PortalNavigation } from './portal-navigation';
import { DemoModeToggle } from './demo-mode-toggle';
import { AdminAccountMenu } from './admin-account-menu';
import { PortalTools } from './portal-tools';
import { brand } from '../lib/brand';
import messages from '../messages/en.json';

function Brand({ href }: { href: string }) {
  return (
    <Link className="brand-lockup" href={href} aria-label={`${brand.name} home`}>
      <span className="brand-mark" aria-hidden="true">
        {brand.shortName}
      </span>
      <span className="brand-copy">
        <strong>{brand.name}</strong>
        <small>{messages.shell.descriptor}</small>
      </span>
    </Link>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell public-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Brand href="/" />
          <nav className="public-nav" aria-label="Main navigation">
            <Link href="/services">{messages.shell.publicServices}</Link>
            <Link href="/plans">{messages.shell.publicPlans}</Link>
            <Link href="/apply">{messages.shell.publicApply}</Link>
            <Link href="/order-status">{messages.shell.trackOrder}</Link>
          </nav>
          <div className="header-actions">
            <Link className="header-login" href="/login">
              {messages.shell.signIn}
            </Link>
            <DemoModeToggle />
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <Brand href="/" />
          <p>{messages.shell.footerLine}</p>
          <a href={`mailto:${brand.supportEmail}`}>{messages.shell.support}</a>
        </div>
      </footer>
    </div>
  );
}

export function PortalShell({
  kind,
  children,
}: {
  kind: 'admin' | 'partner';
  children: ReactNode;
}) {
  const home = kind === 'admin' ? '/admin' : '/partner';
  const label = kind === 'admin' ? messages.shell.operations : messages.shell.partnerWorkspace;
  return (
    <div className={`app-shell portal-shell portal-shell-${kind}`}>
      <header className="site-header portal-header">
        <div className="site-header-inner">
          <Brand href={home} />
          <div className="portal-header-content">
            <p className="workspace-label">{label}</p>
            <PortalNavigation kind={kind} />
          </div>
          <div className="header-actions">
            <Link className="header-login" href="/">
              {messages.shell.publicSite}
            </Link>
            <PortalTools />
            <DemoModeToggle />
            {kind === 'admin' ? <AdminAccountMenu /> : null}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell auth-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Brand href="/" />
          <div className="header-actions">
            <Link className="header-login" href="/">
              {messages.shell.backHome}
            </Link>
            <DemoModeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  breadcrumb,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumb?: string[];
}) {
  return (
    <header className="page-heading">
      {breadcrumb?.length ? (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumb.map((part, index) => (
            <span
              key={`${part}-${index}`}
              aria-current={index === breadcrumb.length - 1 ? 'page' : undefined}
            >
              {part}
              {index < breadcrumb.length - 1 ? (
                <span className="breadcrumb-separator">/</span>
              ) : null}
            </span>
          ))}
        </nav>
      ) : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p className="page-description">{description}</p> : null}
    </header>
  );
}
