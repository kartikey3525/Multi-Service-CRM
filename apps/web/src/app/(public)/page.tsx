import Link from 'next/link';
import messages from '../../messages/en.json';

export default function HomePage() {
  const home = messages.publicSite.home;
  return (
    <main className="landing-main">
      <section className="hero reveal">
        <div className="hero-content">
          <p className="eyebrow">{home.eyebrow}</p>
          <h1>{home.title}</h1>
          <p className="lede">{home.description}</p>
          <div className="actions">
            <Link className="button" href="/apply">
              {home.primaryAction}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button secondary" href="/services">
              {home.secondaryAction}
            </Link>
          </div>
          <div className="hero-proof">
            <span>{home.proofOne}</span>
            <span>{home.proofTwo}</span>
            <span>{home.proofThree}</span>
          </div>
        </div>
        <div className="hero-art" aria-label={home.panelLabel}>
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="preview-card">
            <div className="preview-header">
              <span className="preview-brand">SN</span>
              <span>{home.panelBadge}</span>
              <span className="preview-dot" />
            </div>
            <div className="preview-intro">
              <p>{home.panelLabel}</p>
              <strong>{home.panelTitle}</strong>
              <span>{home.panelDescription}</span>
            </div>
            <div className="preview-item">
              <span className="preview-icon icon-leaf" aria-hidden="true">
                ↗
              </span>
              <span>
                <small>{home.requestLabel}</small>
                <strong>{home.requestName}</strong>
              </span>
              <em className="status-badge active">{home.requestStatus}</em>
            </div>
            <div className="preview-item">
              <span className="preview-icon icon-sand" aria-hidden="true">
                ◎
              </span>
              <span>
                <small>{home.reviewLabel}</small>
                <strong>{home.reviewName}</strong>
              </span>
              <em className="status-badge pending">{home.reviewStatus}</em>
            </div>
            <div className="preview-network">
              <span className="avatar-stack">
                <i>R</i>
                <i>A</i>
                <i>K</i>
              </span>
              <span>{home.networkText}</span>
            </div>
          </div>
          <div className="floating-note">
            <span className="floating-check">✓</span>
            <span>
              <strong>{home.featureOneTitle}</strong>
              <small>{home.featureOneText}</small>
            </span>
          </div>
        </div>
      </section>
      <section className="home-features">
        <header className="section-intro">
          <p className="eyebrow">{home.eyebrow}</p>
          <h2>{home.featureIntroTitle}</h2>
        </header>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-icon">01</span>
            <h3>{home.featureOneTitle}</h3>
            <p>{home.featureOneText}</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">02</span>
            <h3>{home.featureTwoTitle}</h3>
            <p>{home.featureTwoText}</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">03</span>
            <h3>{home.featureThreeTitle}</h3>
            <p>{home.featureThreeText}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
