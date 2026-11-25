'use client';

import { useEffect, useState } from 'react';
import { isDemoMode, toggleDemoMode } from '../lib/demo-mode';
import messages from '../messages/en.json';

export function DemoModeToggle() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(isDemoMode()), []);
  return (
    <button className="demo-toggle" type="button" onClick={() => setEnabled(toggleDemoMode())}>
      {enabled ? messages.shell.demoOn : messages.shell.previewDemo}
    </button>
  );
}
