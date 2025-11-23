'use client';

import { useEffect, useState } from 'react';
import { getCurrentVersion } from '@/app/actions/feedback';

export function VersionDisplay() {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    async function fetchVersion() {
      const result = await getCurrentVersion();
      if (!result.error && result.version) {
        setVersion(result.version);
      }
    }
    fetchVersion();
  }, []);

  if (!version) return null;

  return (
    <div className="text-xs text-slate-500">
      v{version}
    </div>
  );
}
