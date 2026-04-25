'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabase-browser';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user && pathname !== '/login') {
        router.push('/login');
      }
      setLoading(false);
    });
  }, [pathname, router]);

  if (loading) {
    return <div className="container">Chargement…</div>;
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
