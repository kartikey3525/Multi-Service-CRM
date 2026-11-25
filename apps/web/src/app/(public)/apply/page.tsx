import { PartnerApplicationForm } from '../../../components/partner-application-form';
import { PageHeading } from '../../../components/app-shell';
import messages from '../../../messages/en.json';

export default function ApplyPage() {
  const copy = messages.publicSite.apply;
  return (
    <main className="portal public-page application-page">
      <PageHeading
        breadcrumb={[messages.shell.home, messages.shell.publicApply]}
        eyebrow={copy.stepLabel}
        title={messages.apply.title}
        description={messages.apply.description}
      />
      <div className="application-layout">
        <section className="card application-form-card">
          <div className="section-heading">
            <div>
              <h2>{copy.formHeading}</h2>
              <p>{copy.stepLabel}</p>
            </div>
            <span className="form-step-indicator">
              01 <i /> 02 <i /> 03
            </span>
          </div>
          <PartnerApplicationForm />
        </section>
        <aside className="application-aside">
          <section className="card next-steps-card">
            <span className="aside-kicker">{copy.sideTitle}</span>
            <h2>{copy.sideTitle}</h2>
            <ol className="steps-list">
              <li>
                <span>1</span>
                <p>{copy.stepOne}</p>
              </li>
              <li>
                <span>2</span>
                <p>{copy.stepTwo}</p>
              </li>
              <li>
                <span>3</span>
                <p>{copy.stepThree}</p>
              </li>
            </ol>
          </section>
          <section className="privacy-card">
            <span className="privacy-icon" aria-hidden="true">
              ⌑
            </span>
            <div>
              <h3>{copy.privacyTitle}</h3>
              <p>{copy.privacyText}</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
