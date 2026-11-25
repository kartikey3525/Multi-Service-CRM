const storageKey = 'franchise-crm-api-mode';

export function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem(storageKey);
    if (override) return override === 'mock' || override === 'on';
    const legacy = window.localStorage.getItem('franchise-crm-demo-mode');
    if (legacy) return legacy === 'on';
  }
  return process.env.VITE_API_MODE !== 'http';
}

export function toggleDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const next = !isDemoMode();
  window.localStorage.setItem(storageKey, next ? 'mock' : 'http');
  window.location.reload();
  return next;
}
