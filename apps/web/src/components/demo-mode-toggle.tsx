'use client';

import { useEffect, useState } from 'react';
import { isDemoMode, toggleDemoMode } from '../lib/demo-mode';

export function DemoModeToggle() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(isDemoMode()), []);
  return (
    <button className="demo-toggle" type="button" onClick={() => setEnabled(toggleDemoMode())}>
      {enabled ? 'Demo data on · exit' : 'Preview demo data'}
    </button>
  );
}
