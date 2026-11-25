import { Suspense } from 'react';
import { PublicOrderStatus } from '../../../components/public-status';
import messages from '../../../messages/en.json';

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="portal">
          <section className="card">
            <h1>{messages.auth.orderStatusTitle}</h1>
          </section>
        </main>
      }
    >
      <PublicOrderStatus />
    </Suspense>
  );
}
