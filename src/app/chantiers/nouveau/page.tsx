"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { estTypeDetailValide, typesDetaillesPour, type TypeChantier } from "@/lib/chantiers/types";

// Formate un montant FCFA avec des séparateurs de milliers pendant la frappe
// (« 25000000 » devient « 25 000 000 »), pour ne plus compter les zéros.
function formaterMontant(valeur: string): string {
  const chiffres = valeur.replace(/\D/g, "");
  // On ne garde que la partie entiere pour respect de la regle FCFA sans decimale
  const montant = chiffres ? Math.round(Number(chiffres)) : 0;
  return montant.toLocaleString("fr-FR");
}

// Les nombres utilisés dans l'insertion restent des nombres simples
function nombreDepuisSaisie(valeur: string): number {
  const chiffres = valeur.replace(/\D/g, "");
  return chiffres ? Number(chiffres) : 0;
}

const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

export default function NouveauChantierPage() {
  const router = useRouter();
  const langue = getLangue();
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeChantier>("route");
  const [typeDetail, setTypeDetail] = useState("");
  const [maitreOuvrage, setMaitreOuvrage] = useState("");
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

    // Vérifications simples avant d'envoyer : le chef de chantier doit être prévenu
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
      setMessage(langue === "fr" ? "Vous devez être connecté pour créer un chantier." : "You must be logged in to create a site.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("chantiers")
      .insert({
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
        statut: "en_preparation",
        proprietaire_id: user.id,
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    router.push(`/chantiers/${data.id}`);
  }

  const typeLabel = (t: TypeChantier) => {
    return langue === "fr" ? (t === "route" ? "Route" : "Bâtiment") : (t === "route" ? "Road" : "Building");
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          eyebrow={langue === "fr" ? "Création" : "Creation"}
          title={langue === "fr" ? "Nouveau chantier" : "New Site"}
          description={
            langue === "fr"
              ? "Seul l'essentiel est demandé : nom, type, montant et dates. Le reste est facultatif et modifiable plus tard."
              : "Only the essentials are asked: name, type, amount and dates. The rest is optional."
          }
          icon={<Building2 className="h-5 w-5" />}
          actions={<LinkBack />}
        />

        <Card variant="elevated" padding="lg" className="anim-fade-up anim-delay-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {langue === "fr" ? "Nom du chantier *" : "Site name *"}
              </label>
              <input
                className={CLASSE_CHAMP}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={langue === "fr" ? "Ex. : Route Bingerville — PK 5 à PK 12" : "E.g.: Bingerville road — km 5 to km 12"}
                required
              />
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
                  <option value="route">{typeLabel("route")}</option>
                  <option value="batiment">{typeLabel("batiment")}</option>
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
                  {typesDetaillesPour(type).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">
                  {langue === "fr"
                    ? "La phase la plus avancée aujourd'hui. Ce n'est pas définitif : elle pourra être modifiée."
                    : "The most advanced phase today. Not final: it can be changed later."}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {langue === "fr" ? "Maître d'ouvrage" : "Project Owner"}
              </label>
              <input className={CLASSE_CHAMP} value={maitreOuvrage} onChange={(e) => setMaitreOuvrage(e.target.value)} />
            </div>

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
                <input
                  className={CLASSE_CHAMP}
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                />
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
                        ? (langue === "fr" ? "Localisation..." : "Locating...")
                        : (langue === "fr" ? "Utiliser ma position" : "Use my position")}
                    </Button>
                    <p className="text-xs text-muted">
                      {gps === "erreur"
                        ? (langue === "fr"
                            ? "Position indisponible : saisissez-la à la main ou réessayez dehors."
                            : "Position unavailable: enter it manually or try again outdoors.")
                        : (langue === "fr"
                            ? "Remplit latitude et longitude automatiquement avec la position du téléphone."
                            : "Fills latitude and longitude automatically from the phone position.")}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {langue === "fr" ? "Latitude" : "Latitude"}
                      </label>
                      <input className={CLASSE_CHAMP} type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {langue === "fr" ? "Longitude" : "Longitude"}
                      </label>
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

            <Button type="submit" size="lg" isLoading={loading} className="w-full">
              {loading ? (langue === "fr" ? "Création..." : "Creating...") : (langue === "fr" ? "Créer le chantier" : "Create Site")}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

function LinkBack() {
  const langue = getLangue();
  return (
    <Link
      href="/chantiers"
      className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
    >
      <span>←</span>
      {langue === "fr" ? "Retour aux chantiers" : "Back to sites"}
    </Link>
  );
}
