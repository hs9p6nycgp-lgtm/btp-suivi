import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import DqeImport from "@/components/DqeImport";

export const dynamic = "force-dynamic";

export default async function ChantierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chantier } = await supabase
    .from("chantiers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!chantier) notFound();

  const { data: postes } = await supabase
    .from("postes_dqe")
    .select("*")
    .eq("chantier_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-4">
        <Link href="/chantiers" className="text-sm text-orange-600">
          &lt; Retour
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-semibold">{chantier.nom}</h1>
      <p className="mb-6 text-sm text-zinc-600">
        {chantier.type === "route" ? "Route" : "Batiment"} -{" "}
        {chantier.maitre_ouvrage ?? "sans maitre d'ouvrage"} - montant :{" "}
        {Number(chantier.montant_marche).toLocaleString("fr-FR")} FCFA
      </p>

      <section className="mb-8 rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-medium">Import du DQE (Excel)</h2>
        <DqeImport chantierId={chantier.id} />
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-medium">Postes du DQE</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Code</th>
                <th className="p-2">Designation</th>
                <th className="p-2">Unite</th>
                <th className="p-2">Qte marche</th>
                <th className="p-2">Prix unit. (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {(postes ?? []).map((p: any) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">{p.code ?? "-"}</td>
                  <td className="p-2">{p.designation}</td>
                  <td className="p-2">{p.unite}</td>
                  <td className="p-2">{Number(p.quantite_marche).toFixed(2)}</td>
                  <td className="p-2">
                    {Number(p.prix_unitaire).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
              {(postes ?? []).length === 0 && (
                <tr>
                  <td className="p-2 text-zinc-600" colSpan={5}>
                    Aucun poste importe pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}