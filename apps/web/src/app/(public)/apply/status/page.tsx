import { Suspense } from 'react';
import { PublicApplicationStatus } from '../../../../components/public-status';
import messages from '../../../../messages/en.json';

export default function ApplicationStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="portal">
          <section className="card">
            <h1>{messages.auth.applicationStatusTitle}</h1>
          </section>
        </main>
      }
    >
      <PublicApplicationStatus />
    </Suspense>
  );
}
