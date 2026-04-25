'use client';

import { useState } from 'react';

import { supabase } from '@/lib/supabase-browser';

export default function PublishPage() {
  const [message, setMessage] = useState('');

  const publishSchedules = async (isPublished: boolean) => {
    const { error } = await supabase.from('schedules').update({ is_published: isPublished }).eq('is_published', !isPublished);
    setMessage(error ? `Erreur: ${error.message}` : `Horaires ${isPublished ? 'publiés' : 'dépubliés'} avec succès.`);
  };

  const publishFares = async (isPublished: boolean) => {
    const { error } = await supabase.from('fares').update({ is_published: isPublished }).eq('is_published', !isPublished);
    setMessage(error ? `Erreur: ${error.message}` : `Tarifs ${isPublished ? 'publiés' : 'dépubliés'} avec succès.`);
  };

  return (
    <div className="container">
      <h1>Publication</h1>
      <div className="card" style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-green" onClick={() => publishSchedules(true)}>Publier horaires</button>
        <button className="btn btn-outline" onClick={() => publishSchedules(false)}>Dépublier horaires</button>
        <button className="btn btn-green" onClick={() => publishFares(true)}>Publier tarifs</button>
        <button className="btn btn-outline" onClick={() => publishFares(false)}>Dépublier tarifs</button>
      </div>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
