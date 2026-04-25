'use client';

import { useState } from 'react';

import { parseSchedulesCsv, parseSchedulesXml } from '@/lib/parsers';

export default function ImportsPage() {
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);

  const onFile = async (file: File) => {
    const content = await file.text();
    const isXml = file.name.toLowerCase().endsWith('.xml');
    const parsed = isXml ? await parseSchedulesXml(content) : parseSchedulesCsv(content);
    setPreview(parsed.drafts.slice(0, 50));
    setErrors(parsed.errors);
  };

  return (
    <div className="container">
      <h1>Imports</h1>
      <p>Importer CSV/XML horaires et CSV tarifs avec prévisualisation avant publication.</p>
      <p><strong>Import repo complet:</strong> utilisez la commande <code>npm run import:repo-csv</code> à la racine.</p>
      <div className="card">
        <input type="file" accept=".csv,.xml" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Prévisualisation ({preview.length})</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre>
        </div>
        <div className="card">
          <h3>Erreurs de validation</h3>
          {errors.length === 0 ? <p>Aucune erreur.</p> : errors.map((err, i) => <p key={`${err.row}-${i}`}>Ligne {err.row}: {err.message}</p>)}
        </div>
      </div>
    </div>
  );
}
