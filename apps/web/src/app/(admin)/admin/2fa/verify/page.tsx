import { TwoFactorForm } from '../../../../../components/two-factor-form';

export default function AdminTwoFactorVerifyPage() {
  return (
    <main className="portal">
      <TwoFactorForm kind="admin" />
    </main>
  );
}
