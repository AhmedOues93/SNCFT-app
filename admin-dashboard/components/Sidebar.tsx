'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  ['Dashboard', '/dashboard'],
  ['Imports', '/imports'],
  ['Horaires', '/schedules'],
  ['Tarifs', '/fares'],
  ['Publication', '/publish'],
  ['Suivi live', '/live'],
  ['Audit', '/audit'],
  ['Utilisateurs', '/users'],
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="nav">
      <h2 style={{ color: 'var(--sncft-blue)' }}>SNCFT Admin</h2>
      {navItems.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="nav-item"
          style={{ background: pathname === href ? '#e0eeff' : undefined, fontWeight: pathname === href ? 700 : 500 }}
        >
          {label}
        </Link>
      ))}
    </aside>
  );
};
