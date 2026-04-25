'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onLogin = async () => {
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Identifiants invalides ou compte non autorisé.');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="container" style={{ maxWidth: 460, paddingTop: 80 }}>
      <div className="card">
        <h1 style={{ color: 'var(--sncft-blue)' }}>Connexion Admin SNCFT</h1>
        <p>Connexion uniquement. Pas d'inscription publique.</p>

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

        <label style={{ marginTop: 10, display: 'block' }}>Mot de passe</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

        {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

        <button className="btn btn-primary" onClick={onLogin} style={{ marginTop: 14 }}>
          Se connecter
        </button>
      </div>
    </div>
  );
}
