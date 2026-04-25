'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase-browser';

export default function FaresPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('fares').select('*').order('updated_at', { ascending: false }).limit(100).then(({ data }) => {
      setRows(data ?? []);
    });
  }, []);

  return (
    <div className="container">
      <h1>Gestion des tarifs</h1>
      <div className="card">
        <p>Prix par tronçon, validité et publication.</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(rows.slice(0, 30), null, 2)}</pre>
      </div>
    </div>
  );
}
