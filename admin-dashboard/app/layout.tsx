import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SNCFT Admin Dashboard',
  description: 'Gestion des horaires et tarifs SNCFT',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
