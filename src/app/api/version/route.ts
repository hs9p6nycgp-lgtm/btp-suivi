// Version courante du déploiement.
// Sert à proposer « Nouvelle version disponible — Recharger » quand une mise
// à jour est déployée pendant qu'un poste reste ouvert sur l'ancienne version.
// La vérification est forcée à chaque appel (jamais servie depuis un cache).
export const dynamic = "force-dynamic";

export function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    "dev";
  return Response.json({ version });
}
