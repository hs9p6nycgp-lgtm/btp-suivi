import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">BTP Suivi Pro</h1>
          <p className="text-sm text-zinc-600">
            Connecte en tant que {user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-2 text-lg font-medium">Phase 0 - Socle technique</h2>
        <p className="text-zinc-600">
          Le socle est en place : connexion, session, base de donnees Supabase.
          Les modules metier (chantiers, import DQE, quantites, ecarts) arrivent
          apres.
        </p>
      </div>
    </main>
  );
}