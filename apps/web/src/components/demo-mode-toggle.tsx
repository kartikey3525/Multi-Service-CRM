'use client';

import { useEffect, useState } from 'react';
import { isDemoMode, toggleDemoMode } from '../lib/demo-mode';
import { resetMockData } from '../lib/mock-adapter';
import messages from '../messages/en.json';

export function DemoModeToggle() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(isDemoMode()), []);
  return (
    <>
      <button className="demo-toggle" type="button" onClick={() => setEnabled(toggleDemoMode())}>
        {enabled ? messages.shell.useLiveApi : messages.shell.previewDemo}
      </button>
      {enabled ? (
        <button className="demo-toggle" type="button" onClick={resetMockData}>
          {messages.shell.resetDemo}
        </button>
      ) : null}
    </>
  );
}
