import { AuthShell } from '../../../../components/app-shell';
import { TwoFactorForm } from '../../../../components/two-factor-form';

export default function AdminTwoFactorSetupPage() {
  return (
    <AuthShell>
      <main className="portal auth-page">
        <TwoFactorForm kind="admin" setup />
      </main>
    </AuthShell>
  );
}
