'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase-browser';

export default function SchedulesPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('schedules').select('*').order('scheduled_time').limit(200).then(({ data }) => {
      setRows(data ?? []);
    });
  }, []);

  return (
    <div className="container">
      <h1>Gestion des horaires</h1>
      <div className="card">
        <p>Édition manuelle, contrôle des doublons, correction des directions et séquences.</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(rows.slice(0, 30), null, 2)}</pre>
      </div>
    </div>
  );
}
