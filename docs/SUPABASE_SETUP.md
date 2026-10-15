# Mise en place de Supabase (phase 0)

1. Creer un projet sur https://supabase.com (region europe de preference).
2. Dans le projet : **Project Settings > API**, copier :
   - Project URL
   - anon public key
3. A la racine du projet, copier `.env.local.example` en `.env.local` et coller les valeurs.
4. Dans Supabase : **SQL Editor > New query**, coller le contenu de
   `supabase/migrations/0001_v0_schema.sql` puis cliquer **Run**.
5. Lancer l'application en local : `npm run dev`, puis ouvrir http://localhost:3000.
6. Creer un premier compte depuis la page de connexion (bouton "Creer un compte").

Note : en V0, un seul compte administrateur est suffisant pour la demo.