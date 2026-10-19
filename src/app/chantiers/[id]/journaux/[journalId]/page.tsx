"use client";

import { createClient } from "@/lib/supabase/client";
import { offlineInsert, offlineUpdate, offlineDelete } from "@/lib/offline/mutations";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Printer, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog, type DemandeConfirmation } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { compresserImage } from "@/lib/photos/compression";
import { enregistrerPhotoEnAttente } from "@/lib/photos/attente";
import { cheminPhoto, doitMettreEnFile } from "@/lib/photos/regles";
import { BUCKET_PHOTOS, urlSignee, urlsSignees } from "@/lib/photos/urls";
import { rendementEngin, tauxDisponiteEngin } from "@/lib/calculs/metre";
import Dictation from "@/components/Dictation";
import { etatPoste, messageEtatPoste } from "@/lib/journal/quantites";

// JJ/MM/AAAA sans risque de décalage de fuseau (chaîne « AAAA-MM-JJ »)
function formaterDate(dateIso: string | null | undefined): string {
  if (!dateIso) return "-";
  const [a, m, j] = String(dateIso).split("-");
  return a && m && j ? `${j}/${m}/${a}` : String(dateIso);
}

// Style unique des champs de la page
const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

// Météo en un seul appui (mêmes choix que sur la page de création du journal)
const METEO_CHOIX = ["Soleil", "Nuageux", "Pluie", "Harmattan"];

export default function JournalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const journalId = String(params?.journalId ?? "");
  const langue = getLangue();

  const [journal, setJournal] = useState<any>(null);
  const [meteo, setMeteo] = useState("");
  const [observations, setObservations] = useState("");

  const [effMetier, setEffMetier] = useState("");
  const [effNombre, setEffNombre] = useState("");

  const [engType, setEngType] = useState("");
  const [engImmat, setEngImmat] = useState("");
  const [engHeures, setEngHeures] = useState("");
  const [engQte, setEngQte] = useState("");
  const [engHeuresPrevues, setEngHeuresPrevues] = useState("");
  // La colonne « heures_prevues » (indicateur 5.7) est ajoutée par la migration
  // 0020. Tant qu'elle n'est pas en base, la saisie d'un engin doit rester possible.
  const [colonneHeuresPrevues, setColonneHeuresPrevues] = useState<boolean | null>(null);

  const [incType, setIncType] = useState("autre");
  const [incDesc, setIncDesc] = useState("");
  const [incDuree, setIncDuree] = useState("");

  const [qtePoste, setQtePoste] = useState("");
  const [qteSection, setQteSection] = useState("");
  const [qteValeur, setQteValeur] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoLegende, setPhotoLegende] = useState("");
  const [apercuPhoto, setApercuPhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<DemandeConfirmation | null>(null);

  // Message d'enregistrement : rassure l'utilisateur hors connexion
  // (la saisie part dans la file locale et sera synchronisée automatiquement).
  function toastEnregistre(fr: string, en: string) {
    const base = langue === "fr" ? fr : en;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast(
        langue === "fr"
          ? `${base} Hors connexion : la saisie sera synchronisée automatiquement.`
          : `${base} Offline: the entry will sync automatically.`,
      );
      return;
    }
    toast(base);
  }

  const [postes, setPostes] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [effectifs, setEffectifs] = useState<any[]>([]);
  const [engins, setEngins] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [quantites, setQuantites] = useState<any[]>([]);
  // Cumul des quantités déjà saisies (tous journaux) et seuil d'écart du chantier
  const [qteCumulParPoste, setQteCumulParPoste] = useState<Record<string, number>>({});
  const [seuilEcart, setSeuilEcart] = useState(10);

  useEffect(() => {
    if (journalId) loadAll();
  }, [journalId]);

  // Aperçu local de la photo choisie avant l'envoi : sur chantier, le réseau
  // peut être lent, on voit tout de suite que la bonne photo est sélectionnée.
  useEffect(() => {
    if (!photoFile) {
      setApercuPhoto(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setApercuPhoto(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  async function loadAll() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id,seuil_ecart_pct").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
    setSeuilEcart(Number((chantier as { seuil_ecart_pct?: number }).seuil_ecart_pct ?? 10));
    const [j, p, s, ef, en, inc, ph, qt, qtAll] = await Promise.all([
      supabase.from("journaux").select("*").eq("id", journalId).maybeSingle(),
      supabase.from("postes_dqe").select("id,code,designation,unite,quantite_marche").eq("chantier_id", chantierId).order("created_at"),
      supabase.from("sections_chantier").select("id,nom").eq("chantier_id", chantierId).order("created_at"),
      supabase.from("journal_effectifs").select("*").eq("journal_id", journalId),
      supabase.from("journal_engins").select("*").eq("journal_id", journalId),
      supabase.from("incidents_journal").select("*").eq("journal_id", journalId),
      supabase.from("photos_journal").select("*").eq("journal_id", journalId),
      supabase.from("quantites_realisees").select("*").eq("journal_id", journalId),
      // Cumul de toutes les saisies du chantier : sert au « restant » affiché
      // pendant la saisie.
      supabase.from("quantites_realisees").select("poste_dqe_id,quantite").eq("chantier_id", chantierId),
    ]);
    if (j.data) {
      setJournal(j.data);
      setMeteo(j.data.meteo ?? "");
      setObservations(j.data.observations ?? "");
    }
    if (p.data) setPostes(p.data);
    if (s.data) setSections(s.data);
    if (ef.data) setEffectifs(ef.data);
    if (en.data) setEngins(en.data);
    if (inc.data) setIncidents(inc.data);
    if (qt.data) setQuantites(qt.data);
    if (qtAll.data) {
      const cumul: Record<string, number> = {};
      for (const q of qtAll.data as Array<{ poste_dqe_id: string; quantite: number }>) {
        cumul[q.poste_dqe_id] = (cumul[q.poste_dqe_id] ?? 0) + (Number(q.quantite) || 0);
      }
      setQteCumulParPoste(cumul);
    }
    // Colonne « heures_prevues » disponible en base ? (migration 0020)
    const testColonne = await supabase.from("journal_engins").select("heures_prevues").limit(1);
    setColonneHeuresPrevues(!testColonne.error);
    if (ph.data) {
      const listePhotos = ph.data as Array<{ id: string; chemin: string; legende: string | null; latitude: number | null; longitude: number | null }>;
      setPhotos(listePhotos);
      if (listePhotos.length > 0) {
        // Le bucket est privé : URLs signées (1 h) pour afficher les vignettes
        const urlParChemin = await urlsSignees(listePhotos.map((x) => x.chemin));
        setPhotos(listePhotos.map((x) => ({ ...x, url: urlParChemin.get(x.chemin) ?? null })));
      }
    }
  }

  const editable = journal?.statut !== "valide";

  // Suivi du poste sélectionné pendant la saisie : cumul, restant, écart
  const posteSelectionne = postes.find((p) => p.id === qtePoste);
  const etatQuantite = etatPoste(
    posteSelectionne?.quantite_marche,
    qteCumulParPoste[qtePoste] ?? 0,
    Number(qteValeur) || 0,
    seuilEcart,
  );

  async function saveEntete(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    setLoading(true);
    setMessage(null);
    const { error } = await offlineUpdate("journaux", journalId, { meteo: meteo || null, observations: observations || null });
    setLoading(false);
    if (error) { setMessage(traduireErreur(error)); return; }
    toastEnregistre("En-tête enregistré.", "Header saved.");
    loadAll();
  }

  // Ajouts optimistes : l'élément apparaît tout de suite, sans recharger la page
  // (sur un réseau faible, 25 ouvriers ne doivent pas faire 25 attentes).
  async function addEffectif(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const { error } = await offlineInsert("journal_effectifs", { journal_id: journalId, corps_metier: effMetier, nombre: Number(effNombre) || 0 });
    if (error) { setMessage(traduireErreur(error)); return; }
    setEffectifs((l) => [...l, { id: `local-${Date.now()}`, corps_metier: effMetier, nombre: Number(effNombre) || 0 }]);
    setEffMetier(""); setEffNombre("");
  }

  async function addEngin(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const heuresPrevues = engHeuresPrevues ? Number(engHeuresPrevues) : null;
    const donnees: Record<string, unknown> = {
      journal_id: journalId, type_engin: engType, immatriculation: engImmat || null,
      heures_marche: Number(engHeures) || 0, quantite_produite: engQte ? Number(engQte) : null,
    };
    if (colonneHeuresPrevues) donnees.heures_prevues = heuresPrevues;
    const { error } = await offlineInsert("journal_engins", donnees);
    if (error) { setMessage(traduireErreur(error)); return; }
    setEngins((l) => [...l, {
      id: `local-${Date.now()}`,
      type_engin: engType,
      heures_marche: Number(engHeures) || 0,
      quantite_produite: engQte ? Number(engQte) : null,
      heures_prevues: colonneHeuresPrevues ? heuresPrevues : null,
    }]);
    setEngType(""); setEngImmat(""); setEngHeures(""); setEngQte(""); setEngHeuresPrevues("");
  }

  async function addIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const { error } = await offlineInsert("incidents_journal", {
      journal_id: journalId, type: incType, description: incDesc || null, duree_heures: Number(incDuree) || 0,
    });
    if (error) { setMessage(traduireErreur(error)); return; }
    setIncidents((l) => [...l, { id: `local-${Date.now()}`, type: incType, description: incDesc || null, duree_heures: Number(incDuree) || 0 }]);
    setIncDesc(""); setIncDuree("");
  }

  async function addQuantite(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const { error } = await offlineInsert("quantites_realisees", {
      chantier_id: chantierId, poste_dqe_id: qtePoste, quantite: Number(qteValeur) || 0,
      journal_id: journalId, section_id: qteSection || null,
      date_saisie: journal?.date_journal,
    });
    if (error) { setMessage(traduireErreur(error)); return; }
    setQuantites((l) => [...l, { id: `local-${Date.now()}`, poste_dqe_id: qtePoste, quantite: Number(qteValeur) || 0 }]);
    setQteValeur("");
  }

  async function removeItem(table: string, id: string) {
    if (!editable) return;
    const { error } = await offlineDelete(table, id);
    if (error) { setMessage(traduireErreur(error)); return; }
    // Retrait immédiat à l'écran, sans recharger la page
    if (table === "journal_effectifs") setEffectifs((l) => l.filter((x) => x.id !== id));
    if (table === "journal_engins") setEngins((l) => l.filter((x) => x.id !== id));
    if (table === "incidents_journal") setIncidents((l) => l.filter((x) => x.id !== id));
    if (table === "quantites_realisees") setQuantites((l) => l.filter((x) => x.id !== id));
  }

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!editable || !photoFile) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    // Photo compressée avant l'envoi (max 1600 px) : indispensable sur réseau faible
    const fichierEnvoye = await compresserImage(photoFile);
    const path = cheminPhoto(`journaux/${journalId}`, fichierEnvoye.name, Date.now());

    // Position GPS relevée avant l'envoi : une photo prise hors connexion garde
    // ainsi ses coordonnées.
    let lat: number | null = null, lon: number | null = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
        );
        lat = pos.coords.latitude; lon = pos.coords.longitude;
      } catch {}
    }

    const { error: upErr } = await supabase.storage.from(BUCKET_PHOTOS).upload(path, fichierEnvoye);
    // Hors connexion : la photo est conservée sur l'appareil et partira au retour
    // du réseau (file d'attente des fichiers).
    const enAttente = upErr ? doitMettreEnFile(upErr, navigator.onLine) : false;
    if (upErr && !enAttente) { setLoading(false); setMessage(traduireErreur(upErr)); return; }
    if (enAttente) { await enregistrerPhotoEnAttente(path, fichierEnvoye); }

    const { error } = await offlineInsert("photos_journal", {
      journal_id: journalId, chemin: path, legende: photoLegende || null, latitude: lat, longitude: lon,
    });
    if (error) { setLoading(false); setMessage(traduireErreur(error)); return; }

    // La photo apparaît tout de suite en vignette (URL signée en ligne, aperçu
    // local quand elle attend l'envoi), sans recharger la page
    const legende = photoLegende || null;
    const url = enAttente ? URL.createObjectURL(fichierEnvoye) : await urlSignee(path);
    setLoading(false);
    setPhotos((l) => [
      ...l,
      { id: `local-${Date.now()}`, chemin: path, legende, latitude: lat, longitude: lon, url, enAttente },
    ]);
    setPhotoFile(null); setPhotoLegende("");
    toastEnregistre(
      enAttente ? "Photo hors connexion : elle sera envoyée automatiquement." : "Photo ajoutée.",
      enAttente ? "Photo saved offline: it will be sent automatically." : "Photo added.",
    );
  }

  async function validateJournal() {
    if (!editable) return;
    setLoading(true);
    const supabase = createClient();

    // NOT-01 : générer des alertes si l'écart de quantité dépasse le seuil du chantier
    try {
      const { data: chantier } = await supabase.from("chantiers").select("seuil_ecart_pct").eq("id", chantierId).maybeSingle();
      const seuil = Number(chantier?.seuil_ecart_pct ?? 10);
      const { data: postes } = await supabase.from("postes_dqe").select("id,quantite_marche").eq("chantier_id", chantierId);
      const posteMap = new Map<string, number>();
      for (const p of postes ?? []) posteMap.set(p.id, Number(p.quantite_marche) || 0);
      const { data: qtes } = await supabase.from("quantites_realisees").select("poste_dqe_id,quantite").eq("journal_id", journalId);
      const realMap = new Map<string, number>();
      for (const q of qtes ?? []) realMap.set(q.poste_dqe_id, (realMap.get(q.poste_dqe_id) ?? 0) + Number(q.quantite));
      for (const [posteId, qteRealisee] of realMap) {
        const qtePrevue = posteMap.get(posteId) ?? 0;
        if (qtePrevue <= 0) continue;
        const ecart = ((qteRealisee - qtePrevue) / qtePrevue) * 100;
        if (Math.abs(ecart) > seuil) {
          await supabase.from("alertes").insert({
            chantier_id: chantierId,
            type: "quantite",
            valeur: Math.round(ecart * 100) / 100,
            seuil,
            statut: "ouverte",
          });
        }
      }
    } catch (e) {
      // Ne pas bloquer la validation si la génération d'alertes échoue
      console.error("Erreur génération alertes:", e);
    }

    const { error } = await offlineUpdate("journaux", journalId, { statut: "valide", validated_at: new Date().toISOString() });
    setLoading(false);
    if (error) { setMessage(traduireErreur(error)); return; }
    toastEnregistre("Journal validé.", "Journal validated.");
    loadAll();
  }

  // Rouvrir un journal validé pour corriger une erreur : il repasse en brouillon.
  async function reopenJournal() {
    if (editable) return;
    setLoading(true);
    const { error } = await offlineUpdate("journaux", journalId, { statut: "brouillon", validated_at: null });
    setLoading(false);
    if (error) { setMessage(traduireErreur(error)); return; }
    toastEnregistre("Journal rouvert : la saisie est de nouveau modifiable.", "Log reopened: entries can be edited again.");
    loadAll();
  }

  if (!journal) {
    return (
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="anim-fade-up flex items-center gap-3">
            <Skeleton variant="rect" width="2.75rem" height="2.75rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="45%" />
              <Skeleton width="70%" />
            </div>
          </div>
          <Skeleton variant="rect" height="11rem" />
          <Skeleton variant="rect" height="15rem" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow={langue === "fr" ? "Suivi de chantier" : "Site tracking"}
        title={`${langue === "fr" ? "Journal du" : "Log for"} ${formaterDate(journal.date_journal)}`}
        description={
          editable
            ? langue === "fr"
              ? "Météo, effectifs, engins, quantités et photos du jour. Validez en fin de journée pour verrouiller."
              : "Weather, crew, machines, quantities and photos of the day. Validate at the end of the day to lock."
            : langue === "fr"
              ? "Journal validé et verrouillé. Si vous devez corriger une erreur, rouvrez la saisie."
              : "Log validated and locked. If you need to fix a mistake, reopen the entry."
        }
        icon={<CalendarDays className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={editable ? "warning" : "success"}>
              {editable
                ? (langue === "fr" ? "Brouillon" : "Draft")
                : (langue === "fr" ? "Validé" : "Validated")}
            </Badge>
            {!editable && (
              <Button
                variant="secondary"
                onClick={() =>
                  setConfirmation({
                    titre: langue === "fr" ? "Rouvrir ce journal ?" : "Reopen this log?",
                    message:
                      langue === "fr"
                        ? "Il repassera en brouillon pour être corrigé."
                        : "It will go back to draft for editing.",
                    confirmerLibelle: langue === "fr" ? "Rouvrir" : "Reopen",
                    action: reopenJournal,
                  })
                }
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4" />
                {langue === "fr" ? "Rouvrir la saisie" : "Reopen entry"}
              </Button>
            )}
            <Link
              href={`/chantiers/${chantierId}/journaux/${journalId}/imprimer`}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
            >
              <Printer className="h-4 w-4" />
              {langue === "fr" ? "Imprimer le PV" : "Print report"}
            </Link>
            <Link
              href={`/chantiers/${chantierId}/journaux`}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
            >
              <span>←</span>
              {langue === "fr" ? "Retour aux journaux" : "Back to logs"}
            </Link>
          </div>
        }
      />

      {message && (
        <div className="anim-fade-up mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {editable && (
        <CardVariant padding="lg" className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">En-tête (météo, observations)</h2>
          <form onSubmit={saveEntete} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Météo</label>
              <div className="flex flex-wrap gap-2">
                {METEO_CHOIX.map((choix) => (
                  <button
                    key={choix}
                    type="button"
                    onClick={() => setMeteo(meteo === choix ? "" : choix)}
                    className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                      meteo === choix
                        ? "border-action bg-action/10 text-foreground"
                        : "border-border/80 bg-surface text-muted shadow-sm hover:border-primary-light/50 hover:text-foreground"
                    }`}
                  >
                    {choix}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-foreground">
                  Observations
                </label>
                {/* JOU-06 : dictée vocale des observations */}
                <Dictation valeur={observations} onChange={setObservations} />
              </div>
              <textarea className={CLASSE_CHAMP} rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="md:col-span-2">
              {loading ? "Enregistrement..." : "Enregistrer l'en-tête"}
            </Button>
          </form>
        </CardVariant>
      )}

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CardVariant padding="lg">
          <h2 className="mb-3 text-lg font-bold text-foreground">Effectifs</h2>
          {editable && (
            <form onSubmit={addEffectif} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Corps de métier" value={effMetier} onChange={(e) => setEffMetier(e.target.value)} required />
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" placeholder="Nombre" value={effNombre} onChange={(e) => setEffNombre(e.target.value)} required />
              <button type="submit" className="rounded-lg bg-gradient-to-br from-action to-action-strong px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]">Ajouter</button>
            </form>
          )}
          <ul className="space-y-2">
            {effectifs.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/60 p-2.5 text-sm">
                <span>{e.corps_metier} : {e.nombre}</span>
                {editable && <button onClick={() => removeItem("journal_effectifs", e.id)} className="text-danger text-xs font-medium hover:underline">Supprimer</button>}
              </li>
            ))}
            {effectifs.length === 0 && <li className="text-sm text-muted">Aucun effectif.</li>}
          </ul>
        </CardVariant>

        <CardVariant padding="lg" className="mt-6 lg:mt-0">
          <h2 className="mb-3 text-lg font-bold text-foreground">Engins</h2>
          {editable && (
            <form onSubmit={addEngin} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Type d'engin" value={engType} onChange={(e) => setEngType(e.target.value)} required />
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Immatriculation" value={engImmat} onChange={(e) => setEngImmat(e.target.value)} />
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" placeholder="Heures de marche" value={engHeures} onChange={(e) => setEngHeures(e.target.value)} />
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" placeholder="Quantité produite" value={engQte} onChange={(e) => setEngQte(e.target.value)} />
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" placeholder="Heures prévues" value={engHeuresPrevues} onChange={(e) => setEngHeuresPrevues(e.target.value)} />
              <button type="submit" className="rounded-lg bg-gradient-to-br from-action to-action-strong px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]">Ajouter</button>
            </form>
          )}
          <ul className="space-y-2">
            {engins.map((en) => (
              <li key={en.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/60 p-2.5 text-sm">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-foreground">{en.type_engin} — {en.heures_marche} h</span>
                  {/* Indicateur 5.6 — rendement de l'engin (quantité produite / heures de marche) */}
                  {en.quantite_produite !== null && en.quantite_produite !== undefined && Number(en.heures_marche) > 0 && (
                    <span className="text-xs text-muted">
                      Rendement : {rendementEngin(Number(en.quantite_produite), Number(en.heures_marche)).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} unité/h
                    </span>
                  )}
                  {/* Indicateur 5.7 — taux de disponibilité (heures marchées / heures prévues) */}
                  {en.heures_prevues !== null && en.heures_prevues !== undefined && Number(en.heures_prevues) > 0 && (
                    <span className="text-xs text-muted">
                      Disponibilité : {tauxDisponiteEngin(Number(en.heures_marche), Number(en.heures_prevues)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                    </span>
                  )}
                </span>
                {editable && <button onClick={() => removeItem("journal_engins", en.id)} className="text-danger text-xs font-medium hover:underline">Supprimer</button>}
              </li>
            ))}
            {engins.length === 0 && <li className="text-sm text-muted">Aucun engin.</li>}
          </ul>
        </CardVariant>

        <CardVariant padding="lg" className="mt-6 lg:mt-0">
          <h2 className="mb-3 text-lg font-bold text-foreground">Incidents</h2>
          {editable && (
            <form onSubmit={addIncident} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" value={incType} onChange={(e) => setIncType(e.target.value)}>
                <option value="panne">Panne</option>
                <option value="intemperie">Intempérie</option>
                <option value="accident">Accident</option>
                <option value="arret">Arrêt</option>
                <option value="autre">Autre</option>
              </select>
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Description" value={incDesc} onChange={(e) => setIncDesc(e.target.value)} />
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" placeholder="Durée (h)" value={incDuree} onChange={(e) => setIncDuree(e.target.value)} />
              <button type="submit" className="rounded-lg bg-gradient-to-br from-action to-action-strong px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]">Ajouter</button>
            </form>
          )}
          <ul className="space-y-2">
            {incidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/60 p-2.5 text-sm">
                <span>{inc.type} - {inc.description ?? "sans description"} ({inc.duree_heures} h)</span>
                {editable && <button onClick={() => removeItem("incidents_journal", inc.id)} className="text-danger text-xs font-medium hover:underline">Supprimer</button>}
              </li>
            ))}
            {incidents.length === 0 && <li className="text-sm text-muted">Aucun incident.</li>}
          </ul>
        </CardVariant>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Quantités réalisées</h2>
        <CardVariant padding="lg">
          {editable && (
            <form onSubmit={addQuantite} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" value={qtePoste} onChange={(e) => setQtePoste(e.target.value)} required>
                <option value="">Poste DQE</option>
                {postes.map((p) => <option key={p.id} value={p.id}>{p.code ?? "-"} - {p.designation}</option>)}
              </select>
              <select className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" value={qteSection} onChange={(e) => setQteSection(e.target.value)}>
                <option value="">Section (optionnel)</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
              <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" placeholder="Quantité" value={qteValeur} onChange={(e) => setQteValeur(e.target.value)} required />
              <button type="submit" className="rounded-lg bg-gradient-to-br from-action to-action-strong px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]">Ajouter</button>
              {posteSelectionne && (
                <p
                  className={`md:col-span-4 rounded-xl border p-3 text-xs ${
                    etatQuantite.depasseSeuil
                      ? "border-danger/40 bg-danger/10 text-foreground"
                      : "border-border/70 bg-surface-2/60 text-muted"
                  }`}
                >
                  {messageEtatPoste(etatQuantite, posteSelectionne.unite, seuilEcart)}
                </p>
              )}
            </form>
          )}
          <ul className="space-y-2">
            {quantites.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/60 p-2.5 text-sm">
                <span>{postes.find((p) => p.id === q.poste_dqe_id)?.designation ?? q.poste_dqe_id} : {Number(q.quantite).toFixed(2)}</span>
                {editable && <button onClick={() => removeItem("quantites_realisees", q.id)} className="text-danger text-xs font-medium hover:underline">Supprimer</button>}
              </li>
            ))}
            {quantites.length === 0 && <li className="text-sm text-muted">Aucune quantité.</li>}
          </ul>
        </CardVariant>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          Photos
        </h2>
        <CardVariant padding="lg">
          {editable && (
            <form onSubmit={addPhoto} className="mb-4 space-y-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className={CLASSE_CHAMP}
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
                <input className={CLASSE_CHAMP} placeholder="Légende (facultatif)" value={photoLegende} onChange={(e) => setPhotoLegende(e.target.value)} />
              </div>
              {apercuPhoto && (
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-2/60 p-3">
                  {/* Aperçu local : on vérifie que la bonne photo est choisie avant l'envoi (réseau lent sur chantier) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apercuPhoto} alt="Aperçu de la photo choisie" className="h-20 w-20 rounded-lg border border-border/70 object-cover" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{photoFile?.name}</p>
                    <p className="text-xs text-muted">
                      {langue === "fr" ? "C'est bien cette photo ? Touchez « Envoyer la photo »." : "Is this the right photo? Tap “Send photo”."}
                    </p>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={loading || !photoFile}>
                {loading ? (langue === "fr" ? "Envoi en cours..." : "Uploading...") : (langue === "fr" ? "Envoyer la photo" : "Send photo")}
              </Button>
            </form>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((ph) => (
              <div key={ph.id} className="overflow-hidden rounded-xl border border-border/70">
                {ph.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ph.url} alt={ph.legende ?? "Photo du journal"} loading="lazy" className="h-32 w-full object-cover" />
                ) : (
                  <div className="grid h-32 w-full place-items-center bg-surface-2 text-center text-xs text-muted">
                    {langue === "fr" ? "Photo indisponible" : "Photo unavailable"}
                  </div>
                )}
                <div className="p-2.5">
                  {ph.legende && <p className="truncate text-sm text-foreground">{ph.legende}</p>}
                  {ph.latitude !== null && ph.longitude !== null && (
                    <p className="text-xs text-muted">
                      GPS : {Number(ph.latitude).toFixed(5)}, {Number(ph.longitude).toFixed(5)}
                    </p>
                  )}
                  {ph.enAttente && (
                    <p className="mt-1 inline-block rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                      {langue === "fr" ? "En attente d'envoi" : "Waiting to upload"}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {photos.length === 0 && <p className="text-sm text-muted">Aucune photo.</p>}
          </div>
        </CardVariant>
      </section>

      {editable ? (
        <div className="mt-8 rounded-2xl border border-action/30 bg-action/5 p-4">
          <Button
            onClick={() =>
              setConfirmation({
                titre: langue === "fr" ? "Valider ce journal ?" : "Validate this log?",
                message:
                  langue === "fr"
                    ? "Il sera verrouillé ; vous pourrez le rouvrir si une erreur est trouvée."
                    : "It will be locked; you can reopen it if a mistake is found.",
                confirmerLibelle: langue === "fr" ? "Valider" : "Validate",
                action: validateJournal,
              })
            }
            size="lg"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (langue === "fr" ? "Validation..." : "Validating...") : (langue === "fr" ? "Valider le journal (verrouille la saisie)" : "Validate the log (locks entry)")}
          </Button>
          <p className="mt-2 text-xs text-muted">
            {langue === "fr"
              ? "La validation génère les alertes d'écart de quantité. Le journal pourra être rouvert si besoin."
              : "Validation generates quantity-gap alerts. The log can be reopened if needed."}
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-4 text-sm text-foreground">
          {langue === "fr"
            ? "Journal validé. Une erreur repérée ? Utilisez « Rouvrir la saisie » en haut de page."
            : "Log validated. Spotted a mistake? Use “Reopen entry” at the top of the page."}
        </div>
      )}
      </div>

      <ConfirmDialog demande={confirmation} onFermer={() => setConfirmation(null)} />
    </main>
  );
}

function CardVariant({ children, padding = "lg", className = "" }: { children: React.ReactNode; padding?: string; className?: string }) {
  const paddingMap = { none: "p-0", sm: "p-3", md: "p-5", lg: "p-6" };
  return (
    <div className={`rounded-xl border border-border/80 bg-surface p-4 shadow-soft ${paddingMap[padding as keyof typeof paddingMap] || "p-6"} ${className}`}>
      {children}
    </div>
  );
}