"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { avancementMoyenSections, etatEcheance, formaterMetres, formaterPK, joursRestants, libelleTypeDocument, longueurSection } from "@/lib/chantiers/complet";
import { resumerProgression, type PointAvancement } from "@/lib/chantiers/avancement";
import { descriptionOuvrage, surfacesOuvrage } from "@/lib/chantiers/detailsOuvrage";

// Feuille A4 imprimable : fiche de suivi complete d'un chantier.
// La coquille de l'application est masquee sur cette page (voir AppShell).

type Chantier = {
  id: string;
  nom: string;
  type: string;
  statut: string;
  ville: string | null;
  maitre_ouvrage: string | null;
  maitre_oeuvre?: string | null;
  entreprise?: string | null;
  numero_marche?: string | null;
  montant_marche: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  latitude: number | null;
  longitude: number | null;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  nb_sous_sols?: number | null;
  nb_etages?: number | null;
  hauteur_niveau?: number | null;
  nb_travees_longueur?: number | null;
  nb_travees_largeur?: number | null;
  type_structure?: string | null;
  type_toiture?: string | null;
  nb_voies?: number | null;
  largeur_accotement?: number | null;
  type_revetement?: string | null;
  seuil_ecart_pct: number;
};

type Section = {
  id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage?: string | null;
  avancement_pct?: number | null;
};

type Intervenant = {
  id: string;
  nom: string;
  fonction: string | null;
  telephone: string | null;
  email: string | null;
};

type Document = {
  id: string;
  nom: string;
  type: string;
  created_at: string | null;
};

const STATUTS: Record<string, string> = {
  en_preparation: "En préparation",
  en_cours: "En cours",
  suspendu: "Suspendu",
  receptionne_provisoirement: "Réceptionné provisoirement",
  cloture: "Clôturé",
};

function formaterDate(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const d = new Date(valeur.length <= 10 ? `${valeur}T00:00:00` : valeur);
  if (Number.isNaN(d.getTime())) return valeur;
  return d.toLocaleDateString("fr-FR");
}

function formaterMontant(valeur: number | null | undefined): string {
  return `${Number(valeur ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-200 py-1.5 text-[12px]">
      <span className="text-slate-500">{libelle}</span>
      <span className="text-right font-medium text-slate-900">{valeur}</span>
    </div>
  );
}

export default function FicheImprimablePage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [points, setPoints] = useState<PointAvancement[]>([]);
  const [pointsDisponibles, setPointsDisponibles] = useState(false);
  const [compteurs, setCompteurs] = useState({ alertes: 0, nonConformites: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const [cRes, sRes, iRes, dRes, aRes, nRes, pRes] = await Promise.all([
        supabase.from("chantiers").select("*").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle(),
        supabase.from("sections_chantier").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("intervenants_chantier").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("documents_chantier").select("id, nom, type, created_at").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("alertes").select("id", { count: "exact", head: true }).eq("chantier_id", chantierId).eq("statut", "ouverte"),
        supabase.from("non_conformites").select("id", { count: "exact", head: true }).eq("chantier_id", chantierId).in("statut", ["ouverte", "en_cours"]),
        supabase.from("avancements_chantier").select("id, date_point, avancement_pct, commentaire, created_at").eq("chantier_id", chantierId).order("date_point", { ascending: true }),
      ]);

      if (!cRes.data) { router.replace("/chantiers"); return; }
      setChantier(cRes.data as Chantier);
      setSections((sRes.data ?? []) as Section[]);
      setIntervenants((iRes.data ?? []) as Intervenant[]);
      setDocuments((dRes.data ?? []) as Document[]);
      setCompteurs({ alertes: aRes.count ?? 0, nonConformites: nRes.count ?? 0 });
      setPointsDisponibles(!pRes.error);
      setPoints((pRes.data ?? []) as PointAvancement[]);
      setLoading(false);
    }
    load();
  }, [chantierId, router]);

  if (loading || !chantier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  const avancement = avancementMoyenSections(sections);
  const jours = joursRestants(chantier.date_fin_prevue);
  const echeance = etatEcheance(chantier.date_fin_prevue, chantier.statut);
  const lineaire = sections.reduce((total, s) => total + (longueurSection(s.pk_debut, s.pk_fin) ?? 0), 0);
  const progression = resumerProgression(points);
  const typeDetail = chantier.type === "route" ? "Route" : "Bâtiment";
  const description = [...descriptionOuvrage(chantier), ...surfacesOuvrage(chantier)];

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href={`/chantiers/${chantier.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la fiche
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
      </div>

      {/* Feuille A4 */}
      <div className="mx-auto w-full max-w-[210mm] bg-white px-10 py-10 text-slate-900 shadow-lg print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Fiche de suivi de chantier</p>
            <h1 className="mt-1 text-2xl font-bold">{chantier.nom}</h1>
            <p className="mt-1 text-[12px] text-slate-600">
              {typeDetail}
              {chantier.ville ? ` — ${chantier.ville}` : ""}
              {chantier.numero_marche ? ` — Marché n° ${chantier.numero_marche}` : ""}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p className="inline-block rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700">
              {STATUTS[chantier.statut] ?? chantier.statut}
            </p>
            <p className="mt-2">Éditée le {new Date().toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        {/* Indicateurs clés */}
        <div className="mt-5 grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-300 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Avancement</p>
            <p className="mt-0.5 text-xl font-bold">{avancement === null ? "—" : `${avancement} %`}</p>
          </div>
          <div className="rounded-lg border border-slate-300 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Fin prévue</p>
            <p className="mt-0.5 text-sm font-bold">{formaterDate(chantier.date_fin_prevue)}</p>
            <p className="text-[10px] text-slate-500">
              {echeance === "cloture"
                ? "Chantier clôturé"
                : jours === null
                  ? "—"
                  : jours < 0
                    ? `Dépassé de ${Math.abs(jours)} j`
                    : `${jours} jours restants`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-300 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Alertes ouvertes</p>
            <p className="mt-0.5 text-xl font-bold">{compteurs.alertes}</p>
          </div>
          <div className="rounded-lg border border-slate-300 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Non-conformités</p>
            <p className="mt-0.5 text-xl font-bold">{compteurs.nonConformites}</p>
          </div>
        </div>

        {/* Identité et marché */}
        <div className="mt-6 grid grid-cols-2 gap-x-8">
          <div>
            <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-slate-700">Marché</h2>
            <Ligne libelle="Maître d'ouvrage" valeur={chantier.maitre_ouvrage ?? "—"} />
            <Ligne libelle="Maître d'œuvre" valeur={chantier.maitre_oeuvre ?? "—"} />
            <Ligne libelle="Entreprise" valeur={chantier.entreprise ?? "—"} />
            <Ligne libelle="Montant du marché" valeur={formaterMontant(chantier.montant_marche)} />
          </div>
          <div>
            <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-slate-700">Exécution</h2>
            <Ligne libelle="Début" valeur={formaterDate(chantier.date_debut)} />
            <Ligne libelle="Fin prévue" valeur={formaterDate(chantier.date_fin_prevue)} />
            <Ligne
              libelle={chantier.type === "route" ? "Linéaire" : "Dimensions"}
              valeur={
                chantier.type === "route"
                  ? lineaire > 0
                    ? formaterMetres(lineaire) ?? "—"
                    : formaterMetres(chantier.longueur) ?? "—"
                  : `${chantier.longueur ?? "—"} × ${chantier.largeur ?? "—"} × ${chantier.hauteur ?? "—"} m`
              }
            />
            <Ligne
              libelle="Localisation GPS"
              valeur={chantier.latitude !== null && chantier.longitude !== null ? `${chantier.latitude}, ${chantier.longitude}` : "—"}
            />
          </div>
        </div>

        {/* Description de l'ouvrage (niveaux, structure, voirie) */}
        {description.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Description de l&apos;ouvrage
            </h2>
            <div className="grid grid-cols-2 gap-x-8">
              {description.map((ligne) => (
                <Ligne key={ligne.libelle} libelle={ligne.libelle} valeur={ligne.valeur} />
              ))}
            </div>
          </div>
        )}

        {/* Découpage */}
        <h2 className="mt-6 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">
          Découpage et avancement par partie
        </h2>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b-2 border-slate-400 text-left text-slate-500">
              <th className="py-1.5 pr-2 font-semibold">Partie</th>
              <th className="py-1.5 pr-2 font-semibold">Repère</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Longueur</th>
              <th className="w-[32%] py-1.5 font-semibold">Avancement</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const pct = Math.round(Number(s.avancement_pct ?? 0));
              const reperes = [
                s.pk_debut !== null && s.pk_fin !== null ? `${formaterPK(s.pk_debut)} → ${formaterPK(s.pk_fin)}` : null,
                [s.niveau, s.lot].filter(Boolean).join(" · ") || null,
              ].filter(Boolean);
              const longueur = longueurSection(s.pk_debut, s.pk_fin);
              return (
                <tr key={s.id} className="border-b border-slate-200">
                  <td className="py-1.5 pr-2 font-medium">{s.nom}</td>
                  <td className="py-1.5 pr-2 text-slate-500">{reperes.join(" — ") || "—"}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{longueur === null ? "—" : formaterMetres(longueur)}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-600" : pct > 0 ? "bg-amber-500" : "bg-slate-400"}`}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums">{pct} %</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sections.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-center text-slate-500">
                  Aucune partie découpée pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Points d'avancement */}
        {pointsDisponibles && progression.nbPoints > 0 && (
          <>
            <h2 className="mt-6 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Points d&apos;avancement
            </h2>
            <p className="mb-2 text-[11px] text-slate-600">
              {progression.dernier && (
                <>
                  Dernier point : <span className="font-semibold">{progression.dernier.avancement_pct} % au {formaterDate(progression.dernier.date_point)}</span>
                </>
              )}
              {progression.cadenceHebdo !== null && (
                <>
                  {" "}· Cadence constatée : <span className="font-semibold">{progression.cadenceHebdo > 0 ? "+" : ""}{progression.cadenceHebdo} %/semaine</span>
                </>
              )}
              {progression.dateFinEstimee && (
                <>
                  {" "}· Fin estimée au rythme actuel : <span className="font-semibold">{formaterDate(progression.dateFinEstimee)}</span>
                </>
              )}
            </p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-400 text-left text-slate-500">
                  <th className="w-24 py-1.5 pr-2 font-semibold">Date</th>
                  <th className="w-20 py-1.5 pr-2 text-right font-semibold">Avancement</th>
                  <th className="py-1.5 font-semibold">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {[...points]
                  .reverse()
                  .slice(0, 8)
                  .map((p) => (
                    <tr key={p.id} className="border-b border-slate-200">
                      <td className="py-1.5 pr-2 tabular-nums">{formaterDate(p.date_point)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums font-medium">{p.avancement_pct} %</td>
                      <td className="py-1.5 text-slate-600">{p.commentaire ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}

        {/* Intervenants + documents */}
        <div className="mt-6 grid grid-cols-2 gap-x-8">
          <div>
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">Intervenants</h2>
            {intervenants.length === 0 ? (
              <p className="text-[12px] text-slate-500">Aucun intervenant enregistré.</p>
            ) : (
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  {intervenants.map((i) => (
                    <tr key={i.id} className="border-b border-slate-200">
                      <td className="py-1.5 pr-2">
                        <span className="font-medium">{i.nom}</span>
                        {i.fonction ? <span className="text-slate-500"> — {i.fonction}</span> : null}
                      </td>
                      <td className="py-1.5 text-right text-slate-600">{i.telephone ?? i.email ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">Documents joints</h2>
            {documents.length === 0 ? (
              <p className="text-[12px] text-slate-500">Aucun document joint.</p>
            ) : (
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b border-slate-200">
                      <td className="py-1.5 pr-2 font-medium">{d.nom}</td>
                      <td className="py-1.5 pr-2 text-slate-500">{libelleTypeDocument(d.type)}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-500">{formaterDate(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-3 gap-6">
          {["Le chef de chantier", "Le conducteur de travaux", "Le maître d'ouvrage ou son représentant"].map((role) => (
            <div key={role}>
              <p className="text-[11px] font-semibold text-slate-700">{role}</p>
              <div className="mt-10 border-t border-slate-400" />
              <p className="mt-1 text-[10px] text-slate-400">Nom, date et signature</p>
            </div>
          ))}
        </div>

        <p className="mt-8 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          Édité par BTP Suivi Pro — {chantier.nom} — {new Date().toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
