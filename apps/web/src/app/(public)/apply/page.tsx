import { PartnerApplicationForm } from '../../../components/partner-application-form';
import messages from '../../../messages/en.json';

export default function ApplyPage() {
  return (
    <main className="portal">
      <section className="card">
        <p className="eyebrow">{messages.apply.eyebrow}</p>
        <h1>{messages.apply.title}</h1>
        <p className="muted">{messages.apply.description}</p>
        <PartnerApplicationForm />
      </section>
    </main>
  );
}
