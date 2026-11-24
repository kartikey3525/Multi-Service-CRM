import messages from '../../../messages/en.json';
import { LoginForm } from '../../../components/login-form';

export default function AdminLoginPage() {
  return (
    <main className="portal">
      <section className="card">
        <p className="eyebrow">{messages.auth.adminLogin}</p>
        <h1>{messages.auth.signIn}</h1>
        <LoginForm kind="admin" />
      </section>
    </main>
  );
}
