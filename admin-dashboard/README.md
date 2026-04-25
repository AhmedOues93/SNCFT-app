# SNCFT Admin Dashboard

Dashboard web professionnel pour gérer:
- imports CSV/XML
- horaires
- tarifs
- publication/dépublication
- audit logs
- utilisateurs admin
- suivi live (prototype GPS)

## Variables d'environnement

Créer `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> Pas de signup public. Les comptes admins sont créés manuellement dans Supabase Auth + `admin_users`.

## Rôles

- `super_admin`: gestion des utilisateurs
- `editor`: import et édition
- `reviewer`: validation/publication
- `viewer`: lecture seule

## Lancement

```bash
npm install
npm run dev
```

## SQL backend

Appliquer le fichier `../supabase/schema.sql` dans l'éditeur SQL Supabase.
