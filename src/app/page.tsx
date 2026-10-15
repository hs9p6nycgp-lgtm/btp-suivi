import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
        <h2 className="mb-2 text-lg font-medium">Phase 1 - Chantiers et DQE</h2>
        <p className="mb-4 text-zinc-600">
          Créer des chantiers et importer le DQE depuis Excel.
        </p>
        <Link
          href="/chantiers"
          className="inline-block rounded bg-orange-600 px-4 py-2 text-white"
        >
          Voir les chantiers
        </Link>
      </div>
    </main>
  );
}