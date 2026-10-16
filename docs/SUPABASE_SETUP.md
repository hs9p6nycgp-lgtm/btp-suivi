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
10. Repeter l'operation avec `supabase/migrations/0007_phase3_multitenant_isolation.sql`.
    Le chantier dispose d'un proprietaire et chaque compte n'accede qu'aux
    chantiers qui lui sont accessibles.
11. Repeter l'operation avec `supabase/migrations/0008_phase3_planning_couts.sql`.
12. Repeter l'operation avec `supabase/migrations/0009_phase3_qualite_non_conformite.sql`.
13. Repeter l'operation avec `supabase/migrations/0010_phase1_3d_elements.sql`.
    Ajoute les colonnes dimensions (longueur, largeur, hauteur, couleur) sur
    sections_chantier pour la modelisation 3D.
14. Repeter l'operation avec `supabase/migrations/0011_phase3bis_referentiel_prix.sql`.
    Cree le referentiel centralise des prix (REF-01) et l'historique des prix (REF-03).
15. Repeter l'operation avec `supabase/migrations/0012_phase4_fournisseurs.sql`.
    Cree la table fournisseurs (FOU-01) avec isolation par proprietaire.
16. Repeter l'operation avec `supabase/migrations/0013_phase4_fournisseurs_conditions.sql`.
    Ajoute les conditions commerciales (FOU-02), les devis fournisseurs (FOU-04)
    et les evaluations (FOU-06), avec RLS et isolation par proprietaire.
17. Repeter l'operation avec `supabase/migrations/0014_phase2_livraisons_suivi.sql`.
    Ajoute les colonnes quantite_commandee et quantite_mise_en_oeuvre sur
    livraisons (APP-02).
18. Lancer l'application en local : `npm run dev`, puis ouvrir http://localhost:3000.
19. Creer un premier compte depuis la page de connexion (bouton "Creer un compte").

Note : la regle d'un seul compte administrateur suffisait a la phase V0 ; depuis
la phase 0007, chaque chantier a son propre acces.
