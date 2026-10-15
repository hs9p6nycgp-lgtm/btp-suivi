import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import DqeImport from "@/components/DqeImport";
import ChantierEquipe from "@/components/ChantierEquipe";
import ChantierStatut from "@/components/ChantierStatut";
import ChantierIntervenants from "@/components/ChantierIntervenants";
import ChantierSections from "@/components/ChantierSections";
import ChantierDocuments from "@/components/ChantierDocuments";
import ChantierParametresMetre from "@/components/ChantierParametresMetre";
import ChantierAvancement from "@/components/ChantierAvancement";

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

  const { data: membres } = await supabase
    .from("chantier_utilisateurs")
    .select("*, profil:profils(id,nom,email)")
    .eq("chantier_id", id);

  const { data: intervenants } = await supabase
    .from("intervenants_chantier")
    .select("*")
    .eq("chantier_id", id)
    .order("created_at", { ascending: true });

  const { data: sections } = await supabase
    .from("sections_chantier")
    .select("*")
    .eq("chantier_id", id)
    .order("created_at", { ascending: true });

  const { data: documents } = await supabase
    .from("documents_chantier")
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
        {chantier.latitude !== null && chantier.longitude !== null
          ? ` - GPS : ${chantier.latitude}, ${chantier.longitude}`
          : ""}
      </p>

      <ChantierStatut chantierId={chantier.id} statutInitial={chantier.statut} />

      <ChantierAvancement chantierId={chantier.id} />

      <div className="mb-8 flex gap-3">
        <a href={`/chantiers/${chantier.id}/metre`} className="inline-block rounded bg-orange-600 px-4 py-2 text-white">
          Calculateurs de metre
        </a>
        <a href={`/chantiers/${chantier.id}/journaux`} className="inline-block rounded border px-4 py-2">
          Journal de chantier
        </a>
        <a href={`/chantiers/${chantier.id}/livraisons`} className="inline-block rounded border px-4 py-2">
          Livraisons
        </a>
      </div>

      <ChantierParametresMetre chantierId={chantier.id} />

      <ChantierIntervenants
        chantierId={chantier.id}
        initialItems={(intervenants ?? []) as unknown as Parameters<typeof ChantierIntervenants>[0]["initialItems"]}
      />
      <ChantierSections
        chantierId={chantier.id}
        initialItems={(sections ?? []) as unknown as Parameters<typeof ChantierSections>[0]["initialItems"]}
      />
      <ChantierDocuments
        chantierId={chantier.id}
        initialItems={(documents ?? []) as unknown as Parameters<typeof ChantierDocuments>[0]["initialItems"]}
      />

      <section className="mb-8 card p-4">
        <h2 className="mb-3 text-lg font-medium">Import du DQE (Excel)</h2>
        <DqeImport chantierId={chantier.id} />
      </section>

      <ChantierEquipe
        chantierId={chantier.id}
        initialMembers={
          (membres ?? []) as unknown as Parameters<
            typeof ChantierEquipe
          >[0]["initialMembers"]
        }
      />

      <section className="card p-4">
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
              {(postes ?? []).map((p) => (
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