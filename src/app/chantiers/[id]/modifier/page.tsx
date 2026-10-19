"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { estTypeDetailValide, groupesTypesDetailles, type TypeChantier } from "@/lib/chantiers/types";

// Formate un montant FCFA avec des séparateurs de milliers pendant la frappe
function formaterMontant(valeur: string): string {
  const chiffres = valeur.replace(/\D/g, "");
  return chiffres ? Number(chiffres).toLocaleString("fr-FR") : "";
}

// Les nombres utilisés dans la mise à jour restent des nombres simples
function nombreDepuisSaisie(valeur: string): number {
  const chiffres = valeur.replace(/\D/g, "");
  return chiffres ? Number(chiffres) : 0;
}

const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

export default function ModifierChantierPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [chargement, setChargement] = useState(true);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeChantier>("route");
  const [typeDetail, setTypeDetail] = useState("");
  const [maitreOuvrage, setMaitreOuvrage] = useState("");
  const [ville, setVille] = useState("");
  const [maitreOeuvre, setMaitreOeuvre] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [numeroMarche, setNumeroMarche] = useState("");
  const [colonnesOk, setColonnesOk] = useState<boolean | null>(null);
  const [montant, setMontant] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [seuil, setSeuil] = useState("10");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [gps, setGps] = useState<"repos" | "encours" | "erreur">("repos");

  // Charge le chantier existant et pré-remplit le formulaire
  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data } = await supabase
        .from("chantiers")
        .select("*")
        .eq("id", chantierId)
        .eq("proprietaire_id", user.id)
        .maybeSingle();
      if (!data) { router.replace("/chantiers"); return; }

      setNom(data.nom ?? "");
      setType((data.type as TypeChantier) ?? "route");
      setTypeDetail(data.type_detail ?? "");
      setMaitreOuvrage(data.maitre_ouvrage ?? "");
      setVille(data.ville ?? "");
      setMaitreOeuvre(data.maitre_oeuvre ?? "");
      setEntreprise(data.entreprise ?? "");
      setNumeroMarche(data.numero_marche ?? "");
      setMontant(data.montant_marche ? Number(data.montant_marche).toLocaleString("fr-FR") : "");
      setDateDebut(data.date_debut ?? "");
      setDateFin(data.date_fin_prevue ?? "");
      setLatitude(data.latitude !== null ? String(data.latitude) : "");
      setLongitude(data.longitude !== null ? String(data.longitude) : "");
      setLongueur(data.longueur !== null ? String(data.longueur) : "");
      setLargeur(data.largeur !== null ? String(data.largeur) : "");
      setHauteur(data.hauteur !== null ? String(data.hauteur) : "");
      setSeuil(data.seuil_ecart_pct !== null ? String(data.seuil_ecart_pct) : "10");
      setChargement(false);

      // La base sait-elle déjà stocker ville / maître d'œuvre / entreprise / n° marché ?
      const { error: errColonnes } = await supabase.from("chantiers").select("ville").limit(1);
      setColonnesOk(!errColonnes);
    }
    load();
  }, [chantierId, router]);

  // Position du téléphone : plus besoin de connaître ses coordonnées par cœur
  function prendrePosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps("erreur");
      return;
    }
    setGps("encours");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        setGps("repos");
      },
      () => setGps("erreur"),
      { timeout: 10000 },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (nombreDepuisSaisie(montant) <= 0) {
      setMessage(langue === "fr" ? "Indiquez le montant du marché (en FCFA)." : "Enter the contract amount (FCFA).");
      return;
    }
    if (!dateDebut) {
      setMessage(langue === "fr" ? "Indiquez la date de début des travaux." : "Enter the work start date.");
      return;
    }
    if (dateFin && dateFin < dateDebut) {
      setMessage(
        langue === "fr"
          ? "La date de fin prévue doit être après la date de début."
          : "The planned end date must be after the start date.",
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage(langue === "fr" ? "Vous devez être connecté pour modifier un chantier." : "You must be logged in to edit a site.");
      setLoading(false);
      return;
    }

    const base = {
      nom,
      type,
      type_detail: estTypeDetailValide(type, typeDetail) ? typeDetail || null : null,
      maitre_ouvrage: maitreOuvrage || null,
      montant_marche: nombreDepuisSaisie(montant),
      date_debut: dateDebut || null,
      date_fin_prevue: dateFin || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      longueur: longueur ? Number(longueur) : null,
      largeur: largeur ? Number(largeur) : null,
      hauteur: hauteur ? Number(hauteur) : null,
      seuil_ecart_pct: Number(seuil) || 10,
    };
    const complement = colonnesOk
      ? {
          ville: ville || null,
          maitre_oeuvre: maitreOeuvre || null,
          entreprise: entreprise || null,
          numero_marche: numeroMarche || null,
        }
      : {};

    let { error } = await supabase
      .from("chantiers")
      .update({ ...base, ...complement })
      .eq("id", chantierId)
      .eq("proprietaire_id", user.id);
    if (error && colonnesOk) {
      // Colonnes pas encore créées côté base : on enregistre au moins l'essentiel.
      const essai = await supabase
        .from("chantiers")
        .update(base)
        .eq("id", chantierId)
        .eq("proprietaire_id", user.id);
      error = essai.error;
      if (!error) setColonnesOk(false);
    }

    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    router.push(`/chantiers/${chantierId}`);
  }

  if (chargement) {
    return (
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <div className="anim-fade-up flex items-center gap-3">
            <Skeleton variant="rect" width="2.75rem" height="2.75rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="35%" />
              <Skeleton width="60%" />
            </div>
          </div>
          <div className="anim-fade-up anim-delay-1 space-y-3 rounded-2xl border border-border/70 bg-surface p-6 shadow-soft">
            <Skeleton width="25%" />
            <Skeleton variant="rect" height="2.75rem" />
            <Skeleton variant="rect" height="2.75rem" />
            <Skeleton variant="rect" height="2.75rem" />
            <Skeleton variant="rect" height="2.75rem" />
            <Skeleton variant="rect" height="3rem" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          eyebrow={langue === "fr" ? "Suivi de chantier" : "Site tracking"}
          title={langue === "fr" ? "Modifier le chantier" : "Edit site"}
          description={
            langue === "fr"
              ? "Corrigez les informations du chantier à tout moment : nom, montant, dates, seuil d'alerte."
              : "Fix the site information at any time: name, amount, dates, alert threshold."
          }
          icon={<Pencil className="h-5 w-5" />}
          actions={
            <Link
              href={`/chantiers/${chantierId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
            >
              <span>←</span>
              {langue === "fr" ? "Retour au chantier" : "Back to site"}
            </Link>
          }
        />

        <Card variant="elevated" padding="lg" className="anim-fade-up anim-delay-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {langue === "fr" ? "Nom du chantier *" : "Site name *"}
              </label>
              <input className={CLASSE_CHAMP} value={nom} onChange={(e) => setNom(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {langue === "fr" ? "Type *" : "Type *"}
                </label>
                <select
                  className={CLASSE_CHAMP}
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as TypeChantier);
                    setTypeDetail("");
                  }}
                >
                  <option value="route">{langue === "fr" ? "Route" : "Road"}</option>
                  <option value="batiment">{langue === "fr" ? "Bâtiment" : "Building"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {langue === "fr" ? "Sous-type (phase de travaux)" : "Sub-type (work phase)"}
                </label>
                <select
                  className={CLASSE_CHAMP}
                  value={typeDetail}
                  onChange={(e) => setTypeDetail(e.target.value)}
                >
                  <option value="">{langue === "fr" ? "— Non précisé —" : "— Not specified —"}</option>
                  {groupesTypesDetailles(type).map((groupe) => (
                    <optgroup key={groupe.categorie} label={groupe.categorie}>
                      {groupe.types.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">
                  {langue === "fr"
                    ? "La phase la plus avancée aujourd'hui. Modifiable à tout moment."
                    : "The most advanced phase today. Editable at any time."}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {langue === "fr" ? "Maître d'ouvrage" : "Project Owner"}
              </label>
              <input className={CLASSE_CHAMP} value={maitreOuvrage} onChange={(e) => setMaitreOuvrage(e.target.value)} />
            </div>

            {colonnesOk === false && (
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
                Les champs ville, maître d&apos;œuvre, entreprise et n° de marché s&apos;activeront après la mise à jour de
                la base (migration <code className="font-mono">0017_phase2_chantiers_suivi_complet.sql</code> à exécuter
                dans Supabase).
              </p>
            )}
            {colonnesOk && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ville / zone</label>
                  <input className={CLASSE_CHAMP} value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. : Abidjan, Yamoussoukro…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Maître d&apos;œuvre</label>
                  <input className={CLASSE_CHAMP} value={maitreOeuvre} onChange={(e) => setMaitreOeuvre(e.target.value)} placeholder="Ex. : bureau d'études, ingénieur conseil" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Entreprise / attributaire</label>
                  <input className={CLASSE_CHAMP} value={entreprise} onChange={(e) => setEntreprise(e.target.value)} placeholder="Ex. : entreprise de travaux" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">N° de marché</label>
                  <input className={CLASSE_CHAMP} value={numeroMarche} onChange={(e) => setNumeroMarche(e.target.value)} placeholder="Ex. : T-2026-014" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {langue === "fr" ? "Montant du marché (FCFA) *" : "Contract Amount (FCFA) *"}
              </label>
              <input
                className={CLASSE_CHAMP}
                type="text"
                inputMode="numeric"
                value={montant}
                onChange={(e) => setMontant(formaterMontant(e.target.value))}
                placeholder={langue === "fr" ? "Ex. : 25 000 000" : "E.g.: 25,000,000"}
                required
              />
              <p className="mt-1 text-xs text-muted">
                {langue === "fr"
                  ? "Les séparateurs s'ajoutent tout seuls pendant la frappe."
                  : "Separators are added automatically as you type."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {langue === "fr" ? "Date de début *" : "Start Date *"}
                </label>
                <input
                  className={CLASSE_CHAMP}
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {langue === "fr" ? "Date de fin prévue" : "Planned End Date"}
                </label>
                <input className={CLASSE_CHAMP} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
            </div>

            {/* Options avancées : repliées par défaut pour garder une page courte */}
            <details className="rounded-xl border border-border/80 bg-surface-2/50 p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                {langue === "fr" ? "Options avancées (facultatif)" : "Advanced options (optional)"}
                <span className="ml-2 text-xs font-normal text-muted">
                  {langue === "fr"
                    ? "position GPS, dimensions, seuil d'alerte"
                    : "GPS position, dimensions, alert threshold"}
                </span>
              </summary>

              <div className="mt-4 space-y-6">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <Button type="button" variant="secondary" onClick={prendrePosition} disabled={gps === "encours"}>
                      <MapPin className="h-4 w-4" />
                      {gps === "encours"
                        ? langue === "fr" ? "Localisation..." : "Locating..."
                        : langue === "fr" ? "Utiliser ma position" : "Use my position"}
                    </Button>
                    <p className="text-xs text-muted">
                      {gps === "erreur"
                        ? langue === "fr"
                          ? "Position indisponible : saisissez-la à la main ou réessayez dehors."
                          : "Position unavailable: enter it manually or try again outdoors."
                        : langue === "fr"
                          ? "Remplit latitude et longitude automatiquement avec la position du téléphone."
                          : "Fills latitude and longitude automatically from the phone position."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Latitude</label>
                      <input className={CLASSE_CHAMP} type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Longitude</label>
                      <input className={CLASSE_CHAMP} type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {langue === "fr" ? "Longueur (m)" : "Length (m)"}
                      </label>
                      <input className={CLASSE_CHAMP} type="number" step="0.01" value={longueur} onChange={(e) => setLongueur(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {langue === "fr" ? "Largeur (m)" : "Width (m)"}
                      </label>
                      <input className={CLASSE_CHAMP} type="number" step="0.01" value={largeur} onChange={(e) => setLargeur(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {langue === "fr" ? "Hauteur (m)" : "Height (m)"}
                      </label>
                      <input className={CLASSE_CHAMP} type="number" step="0.01" value={hauteur} onChange={(e) => setHauteur(e.target.value)} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {langue === "fr"
                      ? "Facultatif : laissez vide si vous ne les connaissez pas — utile seulement pour les estimations rapides."
                      : "Optional: leave empty if unknown — only used for quick estimates."}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {langue === "fr" ? "Seuil d'alerte écart de quantité (%)" : "Quantity variance alert threshold (%)"}
                  </label>
                  <input className={CLASSE_CHAMP} type="number" value={seuil} onChange={(e) => setSeuil(e.target.value)} />
                  <p className="mt-1 text-xs text-muted">
                    {langue === "fr"
                      ? "Une alerte est créée quand l'écart entre quantités prévues et réalisées dépasse ce pourcentage. Laissez 10 si vous ne savez pas."
                      : "An alert is created when the gap between planned and actual quantities exceeds this percentage. Leave 10 if unsure."}
                  </p>
                </div>
              </div>
            </details>

            {message && (
              <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">
                {message}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" size="lg" isLoading={loading} className="w-full sm:w-auto">
                {loading
                  ? langue === "fr" ? "Enregistrement..." : "Saving..."
                  : langue === "fr" ? "Enregistrer les modifications" : "Save changes"}
              </Button>
              <Link
                href={`/chantiers/${chantierId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-surface px-5 py-3 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
              >
                {langue === "fr" ? "Annuler" : "Cancel"}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
