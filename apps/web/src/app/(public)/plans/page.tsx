import Link from 'next/link';
import { PageHeading } from '../../../components/app-shell';
import messages from '../../../messages/en.json';

export default function PlansPage() {
  const copy = messages.publicSite.plans;
  const tiers = [
    { number: '01', title: copy.retailerTitle, text: copy.retailerText, featured: false },
    { number: '02', title: copy.distributorTitle, text: copy.distributorText, featured: true },
    { number: '03', title: copy.masterTitle, text: copy.masterText, featured: false },
  ];
  return (
    <main className="portal public-page plans-page">
      <PageHeading
        breadcrumb={[messages.shell.home, copy.eyebrow]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <div className="plan-grid">
        {tiers.map((tier) => (
          <article
            className={`plan-card${tier.featured ? ' plan-card-featured' : ''}`}
            key={tier.number}
          >
            <span className="plan-number">{tier.number}</span>
            {tier.featured ? <span className="plan-tag">Network builder</span> : null}
            <h2>{tier.title}</h2>
            <p>{tier.text}</p>
            <div className="plan-divider" />
            <p className="plan-detail">
              <span className="check-mark" aria-hidden="true">
                ✓
              </span>
              {copy.detailLabel}
            </p>
            <Link
              className={tier.featured ? 'button' : 'button secondary'}
              href={`/apply?tier=${tier.number === '01' ? 'retailer' : tier.number === '02' ? 'distributor' : 'master_distributor'}`}
            >
              {copy.applyAction}
              <span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))}
      </div>
      <p className="plan-note">
        <span aria-hidden="true">ⓘ</span>
        {copy.note}
      </p>
    </main>
  );
}
