"use client";

// Parametres de l'entreprise (REP-05) et destinataires des rapports (REP-04).
//
// Coordonnees et logo chiffres en tete des rapports, des fiches de chantier
// et des proces-verbaux ; destinataires par defaut des rapports envoyes
// par e-mail.

import { useEffect, useState } from "react";
import { Building2, Image as ImageIcon, Mail, Save } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { parseDestinataires, erreurDestinataires } from "@/lib/entreprise/parametres";
import { useEntreprise, viderCacheEntreprise } from "@/lib/entreprise/useEntreprise";
import { BUCKET_PHOTOS } from "@/lib/photos/urls";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

export default function ParametresEntreprisePage() {
  const langue = getLangue();
  const { entreprise, chargement, rafraichir } = useEntreprise();

  const [nom, setNom] = useState("");
  const [sigle, setSigle] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [nif, setNif] = useState("");
  const [rccm, setRccm] = useState("");
  const [destinataires, setDestinataires] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [fichierLogo, setFichierLogo] = useState<File | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (chargement) return;
    setNom(entreprise.nom ?? "");
    setSigle(entreprise.sigle ?? "");
    setAdresse(entreprise.adresse ?? "");
    setVille(entreprise.ville ?? "");
    setTelephone(entreprise.telephone ?? "");
    setEmail(entreprise.email ?? "");
    setNif(entreprise.nif ?? "");
    setRccm(entreprise.rccm ?? "");
    setDestinataires((entreprise.destinataires ?? []).join(", "));
    setLogo(entreprise.logo);
  }, [entreprise, chargement]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setEnregistrement(false);
      setMessage(langue === "fr" ? "Session expirée." : "Session expired.");
      return;
    }

    // Logo : televersement dans le bucket, puis on ne garde que le chemin
    let cheminLogo = logo;
    if (fichierLogo) {
      const chemin = `entreprise/logo-${Date.now()}-${fichierLogo.name}`;
      const { error } = await supabase.storage.from(BUCKET_PHOTOS).upload(chemin, fichierLogo);
      if (error) {
        setEnregistrement(false);
        setMessage(traduireErreur(error));
        return;
      }
      cheminLogo = chemin;
    }

    const donnees = {
      proprietaire_id: user.id,
      nom: nom.trim(),
      sigle: sigle.trim() || null,
      adresse: adresse.trim() || null,
      ville: ville.trim() || null,
      telephone: telephone.trim() || null,
      email: email.trim() || null,
      nif: nif.trim() || null,
      rccm: rccm.trim() || null,
      logo: cheminLogo,
      destinataires: parseDestinataires(destinataires),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("parametres_entreprise")
      .upsert(donnees, { onConflict: "proprietaire_id" });
    setEnregistrement(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    viderCacheEntreprise();
    await rafraichir();
    setMessage(
      langue === "fr"
        ? "Paramètres enregistrés : ils apparaissent en tête des rapports et documents imprimés."
        : "Settings saved: they appear on reports and printed documents.",
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Réglages" : "Settings"}
        title={langue === "fr" ? "Mon entreprise" : "My company"}
        description={
          langue === "fr"
            ? "Coordonnées et logo repris en tête des rapports, des fiches de chantier et des PV, et destinataires par défaut des rapports."
            : "Details and logo shown on reports, site sheets and daily logs, and default report recipients."
        }
        icon={<Building2 className="h-5 w-5" />}
      />

      {message && (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">{message}</p>
      )}

      <Card padding="lg" className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {langue === "fr" ? "Identité de l'entreprise" : "Company details"}
        </h2>
        <form onSubmit={enregistrer} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              {langue === "fr" ? "Nom de l'entreprise" : "Company name"}
              <input className={`${CHAMP} mt-1`} value={nom} onChange={(e) => setNom(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {langue === "fr" ? "Sigle" : "Short name"}
              <input className={`${CHAMP} mt-1`} value={sigle} onChange={(e) => setSigle(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {langue === "fr" ? "Adresse" : "Address"}
              <input className={`${CHAMP} mt-1`} value={adresse} onChange={(e) => setAdresse(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {langue === "fr" ? "Ville" : "City"}
              <input className={`${CHAMP} mt-1`} value={ville} onChange={(e) => setVille(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {langue === "fr" ? "Téléphone" : "Phone"}
              <input className={`${CHAMP} mt-1`} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-foreground">
              E-mail
              <input className={`${CHAMP} mt-1`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-foreground">
              NIF
              <input className={`${CHAMP} mt-1`} value={nif} onChange={(e) => setNif(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-foreground">
              RCCM
              <input className={`${CHAMP} mt-1`} value={rccm} onChange={(e) => setRccm(e.target.value)} />
            </label>
          </div>

          {/* Logo */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-surface-2/50 p-3">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-surface">
              {logo ? (
                <img src={logo} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted" />
              )}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {langue === "fr" ? "Logo de l'entreprise" : "Company logo"}
              </p>
              <p className="text-xs text-muted">
                {langue === "fr"
                  ? "Affiché en tête des rapports, des fiches de chantier et des PV."
                  : "Shown on reports, site sheets and daily logs."}
              </p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                {langue === "fr" ? "Choisir un logo" : "Choose a logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFichierLogo(e.target.files?.[0] ?? null)}
                />
              </label>
              {fichierLogo && <p className="mt-1 text-xs text-primary">{fichierLogo.name}</p>}
            </div>
          </div>

          {/* Destinataires (REP-04) */}
          <label className="block text-sm font-medium text-foreground">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {langue === "fr" ? "Destinataires par défaut des rapports" : "Default report recipients"}
            </span>
            <input
              className={`${CHAMP} mt-1`}
              placeholder="responsable@entreprise.ci, direction@entreprise.ci"
              value={destinataires}
              onChange={(e) => setDestinataires(e.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              {langue === "fr"
                ? "Séparés par des virgules. Le rapport pourra être envoyé à ces destinataires en un clic."
                : "Comma separated. The report can be sent to them in one click."}
            </span>
          </label>

          <Button type="submit" disabled={enregistrement}>
            <Save className="h-4 w-4" />
            {enregistrement
              ? langue === "fr" ? "Enregistrement..." : "Saving..."
              : langue === "fr" ? "Enregistrer" : "Save"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
