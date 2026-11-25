import { ResetPasswordForm } from '../../../components/password-recovery';
import { AuthShell } from '../../../components/app-shell';

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
