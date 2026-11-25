import { Suspense } from 'react';
import { VerifyApplicationEmail } from '../../../../components/verify-application-email';
import messages from '../../../../messages/en.json';

export default function VerifyApplicationEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="portal">
          <section className="card">
            <h1>{messages.apply.verifying}</h1>
          </section>
        </main>
      }
    >
      <VerifyApplicationEmail />
    </Suspense>
  );
}
