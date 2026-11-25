const storageKey = 'franchise-crm-demo-mode';

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return true;
  return typeof window !== 'undefined' && window.localStorage.getItem(storageKey) === 'on';
}

export function toggleDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const next = window.localStorage.getItem(storageKey) !== 'on';
  if (next) window.localStorage.setItem(storageKey, 'on');
  else window.localStorage.removeItem(storageKey);
  window.location.reload();
  return next;
}
