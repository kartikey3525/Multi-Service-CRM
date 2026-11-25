'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../lib/api-client';

type Result = { type: string; title: string; detail: string; href: string };
type Notice = {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export function PortalTools() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!noticeOpen) return;
    apiGet<{ items: Notice[] }>('/v1/notifications')
      .then((result) => setNotices(result.items))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Could not load notifications.'),
      );
  }, [noticeOpen]);
  async function search(value: string) {
    setQuery(value);
    setError('');
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const result = await apiGet<{ items: Result[] }>(
        `/v1/search?q=${encodeURIComponent(value.trim())}`,
      );
      setResults(result.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Search is unavailable.');
    }
  }
  async function markRead(id: string) {
    try {
      await apiPost('/v1/notifications/read', { id });
      setNotices((current) =>
        current.map((item) =>
          item._id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update notification.');
    }
  }
  async function markAllRead() {
    try {
      await apiPost('/v1/notifications/read', { id: 'all' });
      setNotices((items) =>
        items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update notifications.');
    }
  }
  return (
    <div className="portal-tools">
      <button
        className="tool-button"
        aria-expanded={searchOpen}
        onClick={() => {
          setSearchOpen((value) => !value);
          setNoticeOpen(false);
        }}
      >
        Search
      </button>
      <button
        className="tool-button"
        aria-expanded={noticeOpen}
        onClick={() => {
          setNoticeOpen((value) => !value);
          setSearchOpen(false);
        }}
      >
        Notifications
        {notices.some((item) => !item.readAt) ? (
          <span className="notification-dot" aria-label="Unread notifications" />
        ) : null}
      </button>
      {searchOpen ? (
        <div className="tool-popover" role="dialog" aria-label="Global search">
          <label className="field">
            <span>Search partners, orders, and services</span>
            <input
              autoFocus
              value={query}
              onChange={(event) => void search(event.target.value)}
              placeholder="Type at least two characters"
            />
          </label>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <ul className="tool-result-list">
            {results.map((item, index) => (
              <li key={`${item.href}-${index}`}>
                <Link href={item.href} onClick={() => setSearchOpen(false)}>
                  <small>{item.type}</small>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </Link>
              </li>
            ))}
            {query.length >= 2 && !results.length && !error ? <li>No matches found.</li> : null}
          </ul>
        </div>
      ) : null}
      {noticeOpen ? (
        <div className="tool-popover notification-popover" role="dialog" aria-label="Notifications">
          <div className="section-heading">
            <h2>Notifications</h2>
            <button className="text-button" onClick={() => void markAllRead()}>
              Mark all read
            </button>
          </div>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <ul className="tool-result-list">
            {notices.map((item) => (
              <li key={item._id} className={item.readAt ? '' : 'unread'}>
                <button onClick={() => void markRead(item._id)}>
                  <small>{new Date(item.createdAt).toLocaleDateString('en-IN')}</small>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </button>
              </li>
            ))}
            {!notices.length ? <li>No notifications yet.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
