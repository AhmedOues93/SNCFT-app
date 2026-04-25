'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase-browser';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('admin_users').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setUsers(data ?? []);
    });
  }, []);

  return (
    <div className="container">
      <h1>Utilisateurs admins</h1>
      <p>Réservé au rôle super_admin.</p>
      <div className="card">
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(users, null, 2)}</pre>
      </div>
    </div>
  );
}
