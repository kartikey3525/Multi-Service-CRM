import { AuthShell } from '../../../components/app-shell';
import { TwoFactorForm } from '../../../components/two-factor-form';

export default function PartnerTwoFactorVerifyPage() {
  return (
    <AuthShell>
      <main className="portal auth-page">
        <TwoFactorForm kind="partner" />
      </main>
    </AuthShell>
  );
}
