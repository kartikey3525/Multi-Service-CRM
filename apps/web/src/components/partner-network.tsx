'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api-client';

type Network = {
  total: number;
  countsByTier: Record<string, number>;
  items: {
    id: string;
    code: string;
    depth: number;
    tier: string;
    status: string;
    businessName: string;
    city: string;
    state: string;
  }[];
};

export function PartnerNetwork() {
  const [network, setNetwork] = useState<Network>();
  const [error, setError] = useState('');
  useEffect(() => {
    apiGet<Network>('/v1/partner/network')
      .then(setNetwork)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Could not load your network.'),
      );
  }, []);
  return (
    <main className="portal admin-page">
      <section className="card">
        <h1>Partner network</h1>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {network ? (
          <>
            <p>
              {network.total} partners in your downline ·{' '}
              {network.countsByTier.master_distributor ?? 0} master distributors ·{' '}
              {network.countsByTier.distributor ?? 0} distributors ·{' '}
              {network.countsByTier.retailer ?? 0} retailers
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Code</th>
                    <th>Tier</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {network.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ paddingLeft: `${item.depth * 20 + 12}px` }}>
                        {item.businessName}
                      </td>
                      <td>{item.code}</td>
                      <td>{item.tier.replaceAll('_', ' ')}</td>
                      <td>
                        {item.city}, {item.state}
                      </td>
                      <td>{item.status.replaceAll('_', ' ')}</td>
                    </tr>
                  ))}
                  {!network.items.length ? (
                    <tr>
                      <td colSpan={5}>No partners in your network yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
