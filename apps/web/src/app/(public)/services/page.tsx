import Link from 'next/link';
import { PageHeading } from '../../../components/app-shell';
import messages from '../../../messages/en.json';

const serviceIcons = ['₹', '↗', '▤', '◎'];

export default function ServicesPage() {
  const copy = messages.publicSite.services;
  const services = [
    { icon: serviceIcons[0], title: copy.taxTitle, text: copy.taxText },
    { icon: serviceIcons[1], title: copy.businessTitle, text: copy.businessText },
    { icon: serviceIcons[2], title: copy.accountsTitle, text: copy.accountsText },
    { icon: serviceIcons[3], title: copy.digitalTitle, text: copy.digitalText },
  ];
  return (
    <main className="portal public-page">
      <PageHeading
        breadcrumb={[messages.shell.home, copy.eyebrow]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <div className="service-grid">
        {services.map((service, index) => (
          <article className="service-card" key={service.title}>
            <span className={`service-icon service-icon-${index}`} aria-hidden="true">
              {service.icon}
            </span>
            <p className="service-overline">
              {copy.eyebrow} · 0{index + 1}
            </p>
            <h2>{service.title}</h2>
            <p>{service.text}</p>
            <span className="service-link">
              {copy.serviceLink} <span aria-hidden="true">↗</span>
            </span>
          </article>
        ))}
      </div>
      <section className="public-cta">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaText}</p>
        </div>
        <Link className="button" href="/apply">
          {copy.ctaAction}
          <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
