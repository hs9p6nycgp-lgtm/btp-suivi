"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Share2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast";
import {
  formaterDatePj,
  formaterNombrePj,
  libelleIncidentPj,
  resumerJournalPv,
  totalEffectifPv,
  totalHeuresPv,
  type JournalPv,
} from "@/lib/journal/pv";

// Procès-verbal de chantier imprimable (journal du jour).
// La coquille de l'application est masquée sur cette page (voir AppShell).

type Chantier = {
  id: string;
  nom: string;
  maitre_ouvrage: string | null;
  entreprise: string | null;
  numero_marche: string | null;
  ville: string | null;
};

type Journal = {
  id: string;
  date_journal: string;
  meteo: string | null;
  observations: string | null;
  statut: string;
  created_by?: string | null;
};

export default function JournalImprimablePage() {
  const params = useParams<{ id: string; journalId: string }>();
  const chantierId = String(params?.id ?? "");
  const journalId = String(params?.journalId ?? "");

  const [pv, setPv] = useState<JournalPv | null>(null);
  const [auteur, setAuteur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [chantierRes, journalRes, effectifsRes, enginsRes, incidentsRes, photosRes, quantitesRes] =
        await Promise.all([
          supabase
            .from("chantiers")
            .select("id, nom, maitre_ouvrage, entreprise, numero_marche, ville")
            .eq("id", chantierId)
            .eq("proprietaire_id", user.id)
            .maybeSingle(),
          supabase.from("journaux").select("*").eq("id", journalId).maybeSingle(),
          supabase.from("journal_effectifs").select("corps_metier, nombre").eq("journal_id", journalId),
          supabase
            .from("journal_engins")
            .select("type_engin, immatriculation, heures_marche, quantite_produite")
            .eq("journal_id", journalId),
          supabase.from("incidents_journal").select("type, description, duree_heures").eq("journal_id", journalId),
          supabase.from("photos_journal").select("legende").eq("journal_id", journalId),
          supabase.from("quantites_realisees").select("poste_dqe_id, quantite").eq("journal_id", journalId),
        ]);

      const chantier = chantierRes.data as Chantier | null;
      const journal = journalRes.data as Journal | null;
      if (!actif || !chantier || !journal) {
        if (actif) setChargement(false);
        return;
      }

      // Auteur du journal : celui qui l'a saisi (nom du profil).
      let nomAuteur: string | null = null;
      if (journal.created_by) {
        const { data: profil } = await supabase
          .from("profils")
          .select("nom")
          .eq("id", journal.created_by)
          .maybeSingle();
        nomAuteur = (profil as { nom?: string | null } | null)?.nom ?? null;
      }
      if (!actif) return;
      setAuteur(nomAuteur);

      // Désignations des postes du DQE pour nommer les quantités.
      const posteIds = (quantitesRes.data ?? []).map(
        (quantite) => (quantite as { poste_dqe_id: string }).poste_dqe_id,
      );
      const { data: postes } = posteIds.length
        ? await supabase.from("postes_dqe").select("id, designation, unite").in("id", posteIds)
        : { data: [] as { id: string; designation: string; unite: string | null }[] };
      const posteMap = new Map(
        (postes ?? []).map((poste) => [poste.id, { designation: poste.designation, unite: poste.unite }]),
      );

      const donnees: JournalPv = {
        chantierNom: chantier.nom,
        maitreOuvrage: chantier.maitre_ouvrage,
        entreprise: chantier.entreprise,
        numeroMarche: chantier.numero_marche,
        dateJournal: journal.date_journal,
        meteo: journal.meteo,
        observations: journal.observations,
        effectifs: (effectifsRes.data ?? []) as JournalPv["effectifs"],
        engins: (enginsRes.data ?? []) as JournalPv["engins"],
        incidents: (incidentsRes.data ?? []) as JournalPv["incidents"],
        photos: (photosRes.data ?? []) as JournalPv["photos"],
        quantites: (quantitesRes.data ?? []).map((quantite) => {
          const ligne = quantite as { poste_dqe_id: string; quantite: number };
          const poste = posteMap.get(ligne.poste_dqe_id);
          return {
            designation: poste?.designation ?? "Poste non précisé",
            unite: poste?.unite ?? null,
            quantite: Number(ligne.quantite) || 0,
          };
        }),
      };

      if (actif) {
        setPv(donnees);
        setChargement(false);
      }
    })();
    return () => {
      actif = false;
    };
  }, [chantierId, journalId]);

  async function partager() {
    if (!pv) return;
    const texte = resumerJournalPv(pv);
    try {
      await navigator.clipboard.writeText(texte);
      toast("Journal copié : collez-le dans votre messagerie.", "succes");
    } catch {
      toast("Copie impossible sur cet appareil.", "erreur");
    }
  }

  if (chargement) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-600">
        Chargement du journal…
      </div>
    );
  }

  if (!pv) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4 text-center">
        <div>
          <p className="font-semibold text-slate-800">Journal introuvable</p>
          <Link
            href={`/chantiers/${chantierId}/journaux`}
            className="mt-2 inline-block text-sm text-blue-700 underline"
          >
            Retour au journal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* Barre d'outils (absente à l'impression) */}
      <div className="mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href={`/chantiers/${chantierId}/journaux/${journalId}`}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au journal
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={partager}>
            <Share2 className="mr-1.5 h-4 w-4" /> Copier le texte
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Imprimer
          </Button>
        </div>
      </div>

      {/* Feuille A4 */}
      <div className="mx-auto w-full max-w-[210mm] bg-white px-10 py-10 text-slate-900 shadow-lg print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-3">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Procès-verbal de chantier
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight">{pv.chantierNom}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Journal du {formaterDatePj(pv.dateJournal)}
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p className="font-semibold text-slate-900">BTP Suivi Pro</p>
              <p>Édité le {formaterDatePj(new Date().toISOString())}</p>
              {auteur && <p>Établi par {auteur}</p>}
            </div>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <p>
            <span className="font-semibold">Maître d'ouvrage : </span>
            {pv.maitreOuvrage || "—"}
          </p>
          <p>
            <span className="font-semibold">Entreprise : </span>
            {pv.entreprise || "—"}
          </p>
          <p>
            <span className="font-semibold">N° de marché : </span>
            {pv.numeroMarche || "—"}
          </p>
          <p>
            <span className="font-semibold">Effectif présent : </span>
            {formaterNombrePj(totalEffectifPv(pv.effectifs))} personne(s)
          </p>
        </section>

        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Conditions et observations
          </h2>
          <p className="mt-2 text-sm">
            <span className="font-semibold">Météo : </span>
            {pv.meteo || "—"}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">Observations : </span>
            {pv.observations || "—"}
          </p>
        </section>

        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Effectifs
          </h2>
          {pv.effectifs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aucun effectif saisi.</p>
          ) : (
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-1 font-semibold">Corps métier</th>
                  <th className="py-1 text-right font-semibold">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {pv.effectifs.map((effectif, index) => (
                  <tr key={`${effectif.corps_metier}-${index}`} className="border-b border-slate-100">
                    <td className="py-1">{effectif.corps_metier}</td>
                    <td className="py-1 text-right">{formaterNombrePj(effectif.nombre)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Matériels
          </h2>
          {pv.engins.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aucun matériel saisi.</p>
          ) : (
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-1 font-semibold">Type</th>
                  <th className="py-1 font-semibold">Immatriculation</th>
                  <th className="py-1 text-right font-semibold">Heures</th>
                  <th className="py-1 text-right font-semibold">Production</th>
                </tr>
              </thead>
              <tbody>
                {pv.engins.map((engin, index) => (
                  <tr key={`${engin.type_engin}-${index}`} className="border-b border-slate-100">
                    <td className="py-1">{engin.type_engin}</td>
                    <td className="py-1">{engin.immatriculation || "—"}</td>
                    <td className="py-1 text-right">{formaterNombrePj(engin.heures_marche)}</td>
                    <td className="py-1 text-right">
                      {engin.quantite_produite === null || engin.quantite_produite === undefined
                        ? "—"
                        : formaterNombrePj(engin.quantite_produite)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-1 font-semibold" colSpan={2}>
                    Total heures de marche
                  </td>
                  <td className="py-1 text-right font-semibold">{formaterNombrePj(totalHeuresPv(pv.engins))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Quantités réalisées
          </h2>
          {pv.quantites.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aucune quantité saisie.</p>
          ) : (
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-1 font-semibold">Poste</th>
                  <th className="py-1 text-right font-semibold">Quantité</th>
                  <th className="py-1 font-semibold">Unité</th>
                </tr>
              </thead>
              <tbody>
                {pv.quantites.map((quantite, index) => (
                  <tr key={`${quantite.designation}-${index}`} className="border-b border-slate-100">
                    <td className="py-1">{quantite.designation}</td>
                    <td className="py-1 text-right">{formaterNombrePj(quantite.quantite)}</td>
                    <td className="py-1">{quantite.unite || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Incidents et arrêts
          </h2>
          {pv.incidents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aucun incident signalé.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {pv.incidents.map((incident, index) => (
                <li key={index}>
                  <span className="font-semibold">{libelleIncidentPj(incident.type)}</span>
                  {incident.description ? ` — ${incident.description}` : ""}
                  {incident.duree_heures ? ` (${formaterNombrePj(incident.duree_heures)} h)` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Photos jointes
          </h2>
          <p className="mt-2 text-sm">
            {pv.photos.length} photo(s) jointe(s) au journal du {formaterDatePj(pv.dateJournal)}.
          </p>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-10 text-sm">
          <div>
            <div className="h-16 border-b border-slate-400" />
            <p className="mt-1 font-semibold">Chef de chantier</p>
            <p className="text-xs text-slate-600">Date et signature</p>
          </div>
          <div>
            <div className="h-16 border-b border-slate-400" />
            <p className="mt-1 font-semibold">Maître d'œuvre / Maître d'ouvrage</p>
            <p className="text-xs text-slate-600">Date et signature</p>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-300 pt-2 text-[11px] text-slate-500">
          Procès-verbal généré par BTP Suivi Pro. Les quantités ci-dessus sont celles saisies
          par le chef de chantier à la date indiquée.
        </footer>
      </div>
    </div>
  );
}
