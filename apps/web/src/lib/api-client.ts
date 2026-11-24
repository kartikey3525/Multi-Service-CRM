export type ApiError = {
  code: string;
  message: string;
  requestId?: string;
};

const apiBaseUrl =
  typeof window === 'undefined' ? (process.env.API_INTERNAL_URL ?? '/api') : '/api';

export async function apiGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...init.headers },
    credentials: 'include',
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const token = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('csrf_token='))
    ?.slice('csrf_token='.length);
  return token ? decodeURIComponent(token) : '';
}

export async function requestCsrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/v1/auth/csrf`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Unable to prepare a secure sign-in request.');
  const body = (await response.json()) as { csrfToken: string };
  return body.csrfToken;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  csrfToken = readCsrfCookie(),
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(result?.message ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  csrfToken = readCsrfCookie(),
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(result?.message ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  csrfToken = readCsrfCookie(),
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(result?.message ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}
