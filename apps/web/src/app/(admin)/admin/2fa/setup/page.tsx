import { TwoFactorForm } from '../../../../../components/two-factor-form';

export default function AdminTwoFactorSetupPage() {
  return (
    <main className="portal">
      <TwoFactorForm kind="admin" setup />
    </main>
  );
}
