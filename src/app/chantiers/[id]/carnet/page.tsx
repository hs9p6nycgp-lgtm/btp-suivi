"use client";

// Carnet de chantier imprimable : le journal quotidien compilé jour par jour
// (météo, effectifs, engins, incidents, quantités, photos, observations),
// prêt à être signé et remis au client ou au bureau.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { urlsSignees } from "@/lib/photos/urls";
import {
  cumulEffectifs,
  cumulEngins,
  cumulIncidents,
  formaterJour,
  formaterJourComplet,
  nombreJoursPeriode,
} from "@/lib/journal/carnet";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  entreprise: string | null;
  numero_marche: string | null;
  date_debut: string | null;
  date_fin_prevue: string | null;
};

type Journal = {
  id: string;
  date_journal: string;
  meteo: string | null;
  observations: string | null;
  statut: string | null;
};

type Effectif = { journal_id: string; corps_metier: string; nombre: number };
type Engin = {
  journal_id: string;
  type_engin: string;
  immatriculation: string | null;
  heures_marche: number;
  quantite_produite: number | null;
};
type Incident = { journal_id: string; type: string; description: string | null; duree_heures: number };
type Photo = {
  journal_id: string;
  chemin: string;
  legende: string | null;
  latitude: number | null;
  longitude: number | null;
  url?: string | null;
};
type Quantite = { journal_id: string; poste_dqe_id: string; quantite: number; date_saisie: string | null };
type Poste = { id: string; designation: string; unite: string };

function debutDuMois(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CarnetChantierPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [effectifs, setEffectifs] = useState<Effectif[]>([]);
  const [engins, setEngins] = useState<Engin[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [quantites, setQuantites] = useState<Quantite[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [debut, setDebut] = useState(debutDuMois());
  const [fin, setFin] = useState(aujourdhui());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!chantierId || !debut || !fin) return;
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: entete } = await supabase
        .from("chantiers")
        .select("id,nom,type,maitre_ouvrage,entreprise,numero_marche,date_debut,date_fin_prevue")
        .eq("id", chantierId)
        .eq("proprietaire_id", user.id)
        .maybeSingle();
      if (!entete) {
        router.replace("/chantiers");
        return;
      }
      setChantier(entete as Chantier);

      const { data: jrn } = await supabase
        .from("journaux")
        .select("id,date_journal,meteo,observations,statut")
        .eq("chantier_id", chantierId)
        .gte("date_journal", debut)
        .lte("date_journal", fin)
        .order("date_journal", { ascending: true });
      const liste = (jrn ?? []) as Journal[];
      setJournaux(liste);
      const ids = liste.map((j) => j.id);

      const [efRes, enRes, inRes, phRes, qtRes, poRes] = await Promise.all([
        ids.length
          ? supabase.from("journal_effectifs").select("*").in("journal_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("journal_engins").select("*").in("journal_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("incidents_journal").select("*").in("journal_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("photos_journal").select("*").in("journal_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("quantites_realisees").select("*").in("journal_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("postes_dqe").select("id,designation,unite").eq("chantier_id", chantierId),
      ]);

      setEffectifs((efRes.data ?? []) as Effectif[]);
      setEngins((enRes.data ?? []) as Engin[]);
      setIncidents((inRes.data ?? []) as Incident[]);
      setQuantites((qtRes.data ?? []) as Quantite[]);
      setPostes((poRes.data ?? []) as Poste[]);

      const listePhotos = (phRes.data ?? []) as Photo[];
      const urls = await urlsSignees(listePhotos.map((p) => p.chemin));
      setPhotos(
        listePhotos.map((p) => ({ ...p, url: urls.get(p.chemin) ?? null })),
      );
      setLoading(false);
    }
    load();
  }, [chantierId, debut, fin, router]);

  const nomPoste = useMemo(() => new Map(postes.map((p) => [p.id, p])), [postes]);

  const resume = useMemo(() => {
    const eff = cumulEffectifs(effectifs);
    const eng = cumulEngins(engins);
    const inc = cumulIncidents(incidents);
    return {
      jours: journaux.length,
      personnesJours: eff.total,
      heuresMarche: eng.heuresMarche,
      incidents: inc.nombre,
      heuresArret: inc.heuresArret,
      photos: photos.length,
      quantites: quantites.length,
    };
  }, [journaux, effectifs, engins, incidents, photos, quantites]);

  if (loading && !chantier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 text-slate-700">
        <p className="text-sm">{message ?? "Chantier introuvable."}</p>
        <Link href="/chantiers" className="text-sm font-semibold text-primary hover:underline">
          Retour aux chantiers
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href={`/chantiers/${chantier.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au chantier
        </Link>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-600">
            Du
            <input
              type="date"
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
              className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-slate-600">
            au
            <input
              type="date"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            />
          </label>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* Feuille A4 */}
      <div className="mx-auto w-full max-w-[210mm] bg-white px-10 py-10 text-slate-900 shadow-lg print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              BTP Suivi Pro — Carnet de chantier
            </p>
            <h1 className="mt-1 text-2xl font-bold">{chantier.nom}</h1>
            <p className="mt-1 text-[12px] text-slate-600">
              {chantier.maitre_ouvrage ? `MO : ${chantier.maitre_ouvrage}` : ""}
              {chantier.entreprise ? ` — Entreprise : ${chantier.entreprise}` : ""}
              {chantier.numero_marche ? ` — Marché n° ${chantier.numero_marche}` : ""}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>
              Période : {formaterJour(debut)} → {formaterJour(fin)}
            </p>
            <p className="mt-1">{nombreJoursPeriode(debut, fin)} jour(s) couverte(s)</p>
            <p className="mt-1">Édité le {new Date().toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        {/* Synthèse */}
        <div className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-6">
          {[
            { libelle: "Journaux", valeur: String(resume.jours) },
            { libelle: "Personnes·jours", valeur: String(resume.personnesJours) },
            { libelle: "Heures de marche", valeur: String(resume.heuresMarche) },
            { libelle: "Incidents", valeur: String(resume.incidents) },
            { libelle: "Photos", valeur: String(resume.photos) },
            { libelle: "Quantités", valeur: String(resume.quantites) },
          ].map((item) => (
            <div key={item.libelle} className="rounded-lg border border-slate-300 p-2 text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-500">{item.libelle}</p>
              <p className="mt-0.5 text-base font-bold">{item.valeur}</p>
            </div>
          ))}
        </div>

        {/* Journaux jour par jour */}
        {journaux.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Aucun journal sur la période choisie.
          </p>
        ) : (
          journaux.map((journal) => {
            const eff = cumulEffectifs(effectifs.filter((e) => e.journal_id === journal.id));
            const eng = cumulEngins(engins.filter((e) => e.journal_id === journal.id));
            const inc = cumulIncidents(incidents.filter((i) => i.journal_id === journal.id));
            const qts = quantites.filter((q) => q.journal_id === journal.id);
            const pho = photos.filter((p) => p.journal_id === journal.id);
            return (
              <section key={journal.id} className="mt-5 break-inside-avoid border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[13px] font-bold">{formaterJourComplet(journal.date_journal)}</h2>
                  <p className="text-[11px] text-slate-500">
                    {journal.meteo ? `Météo : ${journal.meteo}` : "Météo non renseignée"}
                    {" · "}
                    {journal.statut === "valide" ? "Journal validé" : "Brouillon"}
                  </p>
                </div>

                {(eff.total > 0 || eng.heuresMarche > 0) && (
                  <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Effectifs
                      </p>
                      {eff.parCorpsMetier.length > 0 ? (
                        <ul className="mt-1 text-[11px]">
                          {eff.parCorpsMetier.map((c) => (
                            <li key={c.corpsMetier} className="flex justify-between border-b border-slate-100 py-0.5">
                              <span>{c.corpsMetier}</span>
                              <span className="font-medium">{c.nombre}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Engins et matériel
                      </p>
                      {eng.parType.length > 0 ? (
                        <ul className="mt-1 text-[11px]">
                          {eng.parType.map((t) => (
                            <li key={t.typeEngin} className="flex justify-between border-b border-slate-100 py-0.5">
                              <span>
                                {t.typeEngin}
                                {t.nombre > 1 ? ` × ${t.nombre}` : ""}
                              </span>
                              <span className="font-medium">{t.heures} h</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">—</p>
                      )}
                    </div>
                  </div>
                )}

                {inc.nombre > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Incidents et arrêts
                    </p>
                    <ul className="mt-1 text-[11px]">
                      {incidents
                        .filter((i) => i.journal_id === journal.id)
                        .map((i) => (
                          <li key={`${i.journal_id}-${i.type}-${i.description}`} className="border-b border-slate-100 py-0.5">
                            {i.type} — {i.description ?? "sans description"} ({i.duree_heures} h)
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {qts.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Quantités réalisées
                    </p>
                    <ul className="mt-1 text-[11px]">
                      {qts.map((q) => {
                        const poste = nomPoste.get(q.poste_dqe_id);
                        return (
                          <li
                            key={`${q.journal_id}-${q.poste_dqe_id}-${q.date_saisie}`}
                            className="flex justify-between border-b border-slate-100 py-0.5"
                          >
                            <span>{poste?.designation ?? "Poste"}</span>
                            <span className="font-medium">
                              {q.quantite} {poste?.unite ?? ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {pho.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Photos</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {pho.map((p) => (
                        <figure key={p.chemin} className="w-24">
                          {p.url ? (
                            <img src={p.url} alt={p.legende ?? "Photo du chantier"} className="h-20 w-24 rounded border border-slate-200 object-cover" />
                          ) : (
                            <div className="flex h-20 w-24 items-center justify-center rounded border border-slate-200 text-[9px] text-slate-400">
                              Photo
                            </div>
                          )}
                          <figcaption className="mt-0.5 text-[9px] leading-tight text-slate-500">
                            {p.legende ?? ""}
                            {p.latitude !== null && p.longitude !== null
                              ? ` (${Number(p.latitude).toFixed(5)}, ${Number(p.longitude).toFixed(5)})`
                              : ""}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

                {journal.observations && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Observations
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug">{journal.observations}</p>
                  </div>
                )}
              </section>
            );
          })
        )}

        {/* Signatures */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          {["Le chef de chantier", "Le conducteur de travaux"].map((role) => (
            <div key={role}>
              <p className="text-[11px] font-semibold text-slate-700">{role}</p>
              <div className="mt-10 border-t border-slate-400" />
              <p className="mt-1 text-[10px] text-slate-400">Nom, date et signature</p>
            </div>
          ))}
        </div>

        <p className="mt-6 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          Carnet de chantier — {chantier.nom} — {formaterJour(debut)} → {formaterJour(fin)}
        </p>
      </div>
    </div>
  );
}
