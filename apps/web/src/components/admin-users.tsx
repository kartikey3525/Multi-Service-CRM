'use client';

import { useCallback, useEffect, useState } from 'react';
import messages from '../messages/en.json';
import { apiGet, apiPatch, apiPost, apiPut } from '../lib/api-client';

type Role = { _id: string; key: string; name: string; kind: 'admin' | 'partner' };
type User = {
  _id: string;
  email: string;
  name: string;
  kind: 'admin' | 'partner';
  status: 'active' | 'disabled';
  roleIds: string[];
};
type UserList = { items: User[]; total: number };

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [kind, setKind] = useState<'admin' | 'partner'>('admin');
  const [roleId, setRoleId] = useState('');
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        ...(search ? { q: search } : {}),
      });
      const result = await apiGet<UserList>(`/v1/admin/users?${params}`);
      setUsers(result.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    }
  }, [search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    apiGet<Role[]>(`/v1/admin/roles?kind=${kind}`)
      .then((data) => {
        setRoles(data);
        setRoleId(data[0]?._id ?? '');
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : messages.auth.error),
      );
  }, [kind]);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiPost('/v1/admin/users', { email, name, password, kind, roleIds: [roleId] });
      setEmail('');
      setName('');
      setPassword('');
      setNotice(messages.admin.userCreated);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    }
  }

  async function toggleStatus(user: User) {
    setError('');
    try {
      await apiPatch(`/v1/admin/users/${user._id}`, {
        status: user.status === 'active' ? 'disabled' : 'active',
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    }
  }

  async function saveRole(user: User, nextRoleId: string) {
    setError('');
    try {
      await apiPut(`/v1/admin/users/${user._id}/roles`, { roleIds: [nextRoleId] });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    }
  }

  const availableRoles = roles.filter((role) => role.kind === kind);
  return (
    <main className="portal admin-page">
      <section className="card">
        <h1>{messages.admin.users}</h1>
        <form className="form inline-form" onSubmit={createUser}>
          <label className="field">
            <span>{messages.admin.accountType}</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as 'admin' | 'partner')}
            >
              <option value="admin">{messages.admin.administrator}</option>
              <option value="partner">{messages.admin.partner}</option>
            </select>
          </label>
          <label className="field">
            <span>{messages.admin.fullName}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
            />
          </label>
          <label className="field">
            <span>{messages.auth.email}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
            />
          </label>
          <label className="field">
            <span>{messages.auth.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <label className="field">
            <span>{messages.admin.role}</span>
            <select value={roleId} onChange={(event) => setRoleId(event.target.value)} required>
              {availableRoles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button" disabled={!roleId}>
            {messages.admin.createUser}
          </button>
        </form>
        {notice ? <p role="status">{notice}</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <section className="card">
        <label className="field search-field">
          <span>{messages.admin.search}</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{messages.admin.fullName}</th>
                <th>{messages.auth.email}</th>
                <th>{messages.admin.accountType}</th>
                <th>{messages.admin.role}</th>
                <th>{messages.admin.status}</th>
                <th>{messages.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user._id} user={user} onToggle={toggleStatus} onSaveRole={saveRole} />
              ))}
              {!users.length ? (
                <tr>
                  <td colSpan={6}>{messages.admin.noUsers}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function UserRow({
  user,
  onToggle,
  onSaveRole,
}: {
  user: User;
  onToggle: (user: User) => void;
  onSaveRole: (user: User, roleId: string) => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState(user.roleIds[0] ?? '');
  useEffect(() => {
    apiGet<Role[]>(`/v1/admin/roles?kind=${user.kind}`)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [user.kind]);
  return (
    <tr>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.kind}</td>
      <td>
        <select
          aria-label={`${messages.admin.role} ${user.email}`}
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
        >
          {roles.map((role) => (
            <option key={role._id} value={role._id}>
              {role.name}
            </option>
          ))}
        </select>
        <button className="text-button" onClick={() => onSaveRole(user, roleId)} disabled={!roleId}>
          {messages.admin.save}
        </button>
      </td>
      <td>{user.status}</td>
      <td>
        <button className="text-button" onClick={() => onToggle(user)}>
          {user.status === 'active' ? messages.admin.disable : messages.admin.activate}
        </button>
      </td>
    </tr>
  );
}
