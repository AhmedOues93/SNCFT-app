'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase-browser';

export default function DashboardPage() {
  const [stats, setStats] = useState({ lines: 0, stations: 0, schedules: 0, fares: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('lines').select('id', { count: 'exact', head: true }),
      supabase.from('stations').select('id', { count: 'exact', head: true }),
      supabase.from('schedules').select('id', { count: 'exact', head: true }),
      supabase.from('fares').select('id', { count: 'exact', head: true }),
    ]).then(([lines, stations, schedules, fares]) => {
      setStats({
        lines: lines.count ?? 0,
        stations: stations.count ?? 0,
        schedules: schedules.count ?? 0,
        fares: fares.count ?? 0,
      });
    });
  }, []);

  return (
    <div className="container">
      <h1>Tableau de bord SNCFT</h1>
      <p>Plateforme de gestion des horaires et tarifs.</p>
      <div className="grid grid-2">
        <div className="card"><h3>Lignes</h3><p>{stats.lines}</p></div>
        <div className="card"><h3>Stations</h3><p>{stats.stations}</p></div>
        <div className="card"><h3>Arrêts horaires</h3><p>{stats.schedules}</p></div>
        <div className="card"><h3>Tarifs</h3><p>{stats.fares}</p></div>
      </div>
    </div>
  );
}
