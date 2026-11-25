import { ForgotPasswordForm } from '../../../components/password-recovery';
import { AuthShell } from '../../../components/app-shell';

export default function AdminForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm kind="admin" />
    </AuthShell>
  );
}
