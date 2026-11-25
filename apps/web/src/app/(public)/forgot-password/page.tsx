import { ForgotPasswordForm } from '../../../components/password-recovery';
import { AuthShell } from '../../../components/app-shell';

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm kind="partner" />
    </AuthShell>
  );
}
