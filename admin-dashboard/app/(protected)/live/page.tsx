'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase-browser';

export default function LiveTrackingPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('live_train_status').select('*').order('updated_at', { ascending: false }),
      supabase.from('train_positions').select('train_id,speed,recorded_at').order('recorded_at', { ascending: false }).limit(200),
    ]).then(([statusResp, positionResp]) => {
      const latestPosByTrain = new Map<string, { speed: number | null; recorded_at: string }>();
      (positionResp.data ?? []).forEach((pos: any) => {
        if (!latestPosByTrain.has(pos.train_id)) {
          latestPosByTrain.set(pos.train_id, { speed: pos.speed, recorded_at: pos.recorded_at });
        }
      });

      const merged = (statusResp.data ?? []).map((item: any) => ({
        ...item,
        last_speed: latestPosByTrain.get(item.train_id)?.speed ?? item.last_speed ?? null,
        last_position_at: latestPosByTrain.get(item.train_id)?.recorded_at ?? null,
      }));

      setRows(merged);
    });
  }, []);

  return (
    <div className="container">
      <h1>Suivi live</h1>
      <p>Prototype uniquement. Données non officielles SNCFT.</p>
      <div className="card">
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(rows, null, 2)}</pre>
      </div>
    </div>
  );
}
