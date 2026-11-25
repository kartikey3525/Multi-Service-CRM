import { Suspense } from 'react';
import { AuthShell } from '../../components/app-shell';
import { ForcedPasswordChange } from '../../components/forced-password-change';
import messages from '../../messages/en.json';

export default function ChangePasswordPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <main className="portal">
            <section className="card">
              <h1>{messages.auth.changePasswordTitle}</h1>
            </section>
          </main>
        }
      >
        <ForcedPasswordChange />
      </Suspense>
    </AuthShell>
  );
}
