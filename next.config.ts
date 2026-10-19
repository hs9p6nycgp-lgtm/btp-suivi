import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
  partialPrefetching: false,
  // Numéro du commit déployé, figé au moment du build : permet à l'application
  // de signaler « Nouvelle version disponible » même si la variable d'environnement
  // Vercel n'est pas exposée à l'exécution.
  env: {
    VERSION_COMMIT:
      process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "dev",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
