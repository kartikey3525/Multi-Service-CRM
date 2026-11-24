import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="hero">
      <p className="eyebrow">Business services, made manageable</p>
      <h1>Build your local service business with confidence.</h1>
      <p className="lede">
        A single place for partners to manage customer requests across tax, registrations,
        accounting, and business support.
      </p>
      <div className="actions">
        <Link className="button" href="/apply">
          Explore partnership
        </Link>
        <Link className="button secondary" href="/services">
          View services
        </Link>
      </div>
    </main>
  );
}
