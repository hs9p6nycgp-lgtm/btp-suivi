import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChantiersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chantiers, error } = await supabase
    .from("chantiers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chantiers</h1>
        <Link
          href="/chantiers/nouveau"
          className="rounded bg-orange-600 px-4 py-2 text-white"
        >
          Nouveau chantier
        </Link>
      </div>

      {error && <p className="text-red-600">{error.message}</p>}

      <ul className="space-y-3">
        {(chantiers ?? []).map((c: any) => (
          <li key={c.id} className="rounded bg-white p-4 shadow">
            <Link href={`/chantiers/${c.id}`} className="font-medium">
              {c.nom}
            </Link>
            <p className="text-sm text-zinc-600">
              {c.type === "route" ? "Route" : "Batiment"} -{" "}
              {c.maitre_ouvrage ?? "sans maitre d'ouvrage"} - Statut : {c.statut}
            </p>
          </li>
        ))}
        {(chantiers ?? []).length === 0 && (
          <li className="text-zinc-600">Aucun chantier pour le moment.</li>
        )}
      </ul>
    </main>
  );
}