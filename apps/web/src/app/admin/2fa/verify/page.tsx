import { AuthShell } from '../../../../components/app-shell';
import { TwoFactorForm } from '../../../../components/two-factor-form';

export default function AdminTwoFactorVerifyPage() {
  return (
    <AuthShell>
      <main className="portal auth-page">
        <TwoFactorForm kind="admin" />
      </main>
    </AuthShell>
  );
}
