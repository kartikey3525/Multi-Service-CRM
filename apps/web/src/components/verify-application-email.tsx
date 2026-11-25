'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import messages from '../messages/en.json';
import { apiGet } from '../lib/api-client';

export function VerifyApplicationEmail() {
  const query = useSearchParams();
  const [status, setStatus] = useState(messages.apply.verifying);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = query.get('token');
    if (!token) {
      setStatus(messages.apply.invalidVerification);
      return;
    }
    apiGet<{ verified: boolean }>(
      `/v1/public/applications/verify-email?token=${encodeURIComponent(token)}`,
    )
      .then(() => {
        setVerified(true);
        setStatus(messages.apply.verified);
      })
      .catch(() => setStatus(messages.apply.invalidVerification));
  }, [query]);

  return (
    <main className="portal">
      <section className="card">
        <p className="eyebrow">{messages.apply.eyebrow}</p>
        <h1>{status}</h1>
        {verified ? <p className="muted">{messages.apply.reviewNext}</p> : null}
        <Link className="text-button" href="/">
          {messages.apply.backHome}
        </Link>
      </section>
    </main>
  );
}
