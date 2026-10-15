# Mise en place de Supabase (phase 0 et suivantes)

1. Creer un projet sur https://supabase.com (region europe de preference).
2. Dans le projet : **Project Settings > API**, copier :
   - Project URL
   - anon public key
3. A la racine du projet, copier `.env.local.example` en `.env.local` et coller les valeurs.
4. Dans Supabase : **SQL Editor > New query**, coller le contenu de
   `supabase/migrations/0001_v0_schema.sql` puis cliquer **Run**.
5. Repeter l'operation avec `supabase/migrations/0002_phase1_auth_roles.sql`.
   Activer ensuite dans Authentication > Providers : Email (obligatoire)
   et Phone (optionnel, necessite un fournisseur SMS). Configurer aussi
   le SMTP pour la reinitialisation de mot de passe.
6. Repeter l'operation avec `supabase/migrations/0003_phase1_chantiers_details.sql`.
   Creer le bucket `chantiers-documents` si la requete SQL automatique echoue.
7. Repeter l'operation avec `supabase/migrations/0004_phase1_metre_bpu.sql`.
8. Repeter l'operation avec `supabase/migrations/0005_phase2_journal.sql`.
9. Repeter l'operation avec `supabase/migrations/0006_phase2_livraisons.sql`.
10. Lancer l'application en local : `npm run dev`, puis ouvrir http://localhost:3000.
11. Creer un premier compte depuis la page de connexion (bouton "Creer un compte").

Note : en V0, un seul compte administrateur est suffisant pour la demo.