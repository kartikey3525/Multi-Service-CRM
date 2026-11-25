'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '../lib/api-client';

export function AdminAccountMenu() {
  const router = useRouter();
  const [name, setName] = useState('Admin account');
  useEffect(() => {
    apiGet<{ user: { name: string } }>('/v1/auth/me')
      .then(({ user }) => setName(user.name))
      .catch(() => setName('Sign in'));
  }, []);
  async function signOut() {
    await apiPost('/v1/auth/logout', {});
    router.replace('/admin/login');
  }
  return (
    <div className="admin-account-menu">
      <span>{name}</span>
      <button className="text-button" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}
