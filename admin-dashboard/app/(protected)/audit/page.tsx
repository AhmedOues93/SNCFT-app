'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase-browser';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200).then(({ data }) => {
      setLogs(data ?? []);
    });
  }, []);

  return (
    <div className="container">
      <h1>Audit logs</h1>
      <div className="card">
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(logs, null, 2)}</pre>
      </div>
    </div>
  );
}
