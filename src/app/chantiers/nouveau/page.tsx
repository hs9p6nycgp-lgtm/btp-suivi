"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Coins, Layers, MapPin, Plus, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { estTypeDetailValide, groupesTypesDetailles, type TypeChantier } from "@/lib/chantiers/types";
import BlocDetailsOuvrage from "@/components/chantiers/BlocDetailsOuvrage";
import {
  colonnesDetailsOuvrage,
  detailsOuvrageDepuisChantier,
  detailsOuvrageVides,
  type DetailsOuvrage,
} from "@/lib/chantiers/detailsOuvrage";
import {
  analyserPK,
  estNomChantierSimilaire,
  formaterMetres,
  formaterPK,
  longueurSection,
} from "@/lib/chantiers/complet";

// Formate un montant FCFA avec des séparateurs de milliers pendant la frappe
// (« 25000000 » devient « 25 000 000 »), pour ne plus compter les zéros.
function formaterMontant(valeur: string): string {
  const chiffres = valeur.replace(/\D/g, "");
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

type LigneSection = {
  cle: string;
  nom: string;
  pkDebut: string;
  pkFin: string;
  niveau: string;
  lot: string;
};

type LigneIntervenant = {
  cle: string;
  nom: string;
  fonction: string;
  telephone: string;
  email: string;
};

function nouvelleSection(): LigneSection {
  return { cle: Math.random().toString(36).slice(2), nom: "", pkDebut: "", pkFin: "", niveau: "", lot: "" };
}

function nouvelIntervenant(): LigneIntervenant {
  return { cle: Math.random().toString(36).slice(2), nom: "", fonction: "", telephone: "", email: "" };
}

const NIVEAUX = ["Sous-sol", "RDC", "R+1", "R+2", "R+3", "R+4", "R+5", "R+6"];
const LOTS = [
  "Fondations",
  "Structure / Gros œuvre",
  "Maçonnerie",
  "Charpente",
  "Couverture",
  "Étanchéité",
  "Menuiserie",
  "Électricité",
  "Plomberie",
  "Peinture / Finitions",
  "VRD",
];
const FONCTIONS = [
  "Maître d'ouvrage",
  "Maître d'œuvre",
  "Chef de chantier",
  "Conducteur des travaux",
  "Topographe",
  "Géomètre",
  "Laborantin",
  "Responsable qualité",
  "Responsable HSE",
  "Magasinier",
  "Chef d'équipe",
  "Fournisseur",
];

export default function NouveauChantierPage() {
  const router = useRouter();
  const langue = getLangue();
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeChantier>("route");
  const [typeDetail, setTypeDetail] = useState("");
  const [ville, setVille] = useState("");
  const [maitreOuvrage, setMaitreOuvrage] = useState("");
  const [maitreOeuvre, setMaitreOeuvre] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [numeroMarche, setNumeroMarche] = useState("");
  const [montant, setMontant] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [details, setDetails] = useState<DetailsOuvrage>(detailsOuvrageVides);
  const [detailsOk, setDetailsOk] = useState<boolean | null>(null);
  const [seuil, setSeuil] = useState("10");
  const [sections, setSections] = useState<LigneSection[]>([nouvelleSection()]);
  const [intervenants, setIntervenants] = useState<LigneIntervenant[]>([]);
  const [colonnesOk, setColonnesOk] = useState<boolean | null>(null);
  const [modeleNom, setModeleNom] = useState<string | null>(null);
  const [doublon, setDoublon] = useState<{ id: string; nom: string } | null>(null);
  const [chantierCree, setChantierCree] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [gps, setGps] = useState<"repos" | "encours" | "erreur">("repos");

  // La base sait-elle déjà stocker ville / maître d'œuvre / entreprise / n° marché ?
  useEffect(() => {
    async function verifier() {
      const supabase = createClient();
      const { error } = await supabase.from("chantiers").select("ville").limit(1);
      setColonnesOk(!error);
      const { error: erreurDetails } = await supabase.from("chantiers").select("nb_etages").limit(1);
      setDetailsOk(!erreurDetails);
    }
    verifier();
  }, []);

  // Duplication : /chantiers/nouveau?modele=<id> reprend l'identité du chantier
  // et la structure de son découpage (les avancements et les intervenants ne
  // sont pas recopiés : ce sont des données de terrain du chantier d'origine).
  useEffect(() => {
    const modele = new URLSearchParams(window.location.search).get("modele");
    if (!modele) return;
    const pkTexte = (valeur: number | null | undefined) =>
      valeur === null || valeur === undefined ? "" : (formaterPK(valeur) ?? "").replace("PK ", "");
    async function chargerModele() {
      const supabase = createClient();
      const { data } = await supabase.from("chantiers").select("*").eq("id", modele).maybeSingle();
      if (!data) return;
      setModeleNom(data.nom ?? null);
      setNom(`${data.nom ?? "Chantier"} (copie)`);
      setType((data.type as TypeChantier) ?? "route");
      setTypeDetail(data.type_detail ?? "");
      setMaitreOuvrage(data.maitre_ouvrage ?? "");
      setVille(data.ville ?? "");
      setMaitreOeuvre(data.maitre_oeuvre ?? "");
      setEntreprise(data.entreprise ?? "");
      setNumeroMarche(data.numero_marche ?? "");
      setLatitude(data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : "");
      setLongitude(data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : "");
      setDetails(detailsOuvrageDepuisChantier((data.type as TypeChantier) ?? "route", data));
      setSeuil(
        data.seuil_ecart_pct !== null && data.seuil_ecart_pct !== undefined
          ? String(data.seuil_ecart_pct)
          : "10",
      );
      const { data: sectionsModele } = await supabase
        .from("sections_chantier")
        .select("nom,pk_debut,pk_fin,niveau,lot")
        .eq("chantier_id", modele)
        .order("created_at", { ascending: true });
      if (sectionsModele && sectionsModele.length > 0) {
        setSections(
          sectionsModele.map((s) => ({
            cle: Math.random().toString(36).slice(2),
            nom: (s.nom as string) ?? "",
            pkDebut: pkTexte(s.pk_debut as number | null),
            pkFin: pkTexte(s.pk_fin as number | null),
            niveau: (s.niveau as string | null) ?? "",
            lot: (s.lot as string | null) ?? "",
          })),
        );
      }
    }
    chargerModele();
  }, []);

  // Deux chantiers qui portent le même nom sont une source de confusion :
  // on prévient sans bloquer.
  async function verifierDoublon() {
    if (!nom.trim()) {
      setDoublon(null);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("chantiers")
      .select("id,nom")
      .eq("proprietaire_id", user?.id ?? "");
    const proche = (data ?? []).find((c) => estNomChantierSimilaire(String(c.nom), nom));
    setDoublon(proche ? { id: String(proche.id), nom: String(proche.nom) } : null);
  }

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

  function majSection(cle: string, champ: keyof LigneSection, valeur: string) {
    setSections((prev) => prev.map((s) => (s.cle === cle ? { ...s, [champ]: valeur } : s)));
  }

  function majIntervenant(cle: string, champ: keyof LigneIntervenant, valeur: string) {
    setIntervenants((prev) => prev.map((iv) => (iv.cle === cle ? { ...iv, [champ]: valeur } : iv)));
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

    // Vérifications du découpage avant écriture
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const remplie = s.nom.trim() || s.pkDebut.trim() || s.pkFin.trim() || s.niveau.trim() || s.lot.trim();
      if (!remplie) continue;
      if (type === "route") {
        const d = analyserPK(s.pkDebut);
        const f = analyserPK(s.pkFin);
        if (s.pkDebut.trim() && d === null) {
          setMessage(`Section ${i + 1} : PK de début illisible. Exemples : 0+000, 2+500, 2500.`);
          return;
        }
        if (s.pkFin.trim() && f === null) {
          setMessage(`Section ${i + 1} : PK de fin illisible. Exemples : 0+000, 2+500, 2500.`);
          return;
        }
        if (d !== null && f !== null && f <= d) {
          setMessage(`Section ${i + 1} : le PK de fin doit être plus grand que le PK de début.`);
          return;
        }
      }
    }
    for (let i = 0; i < intervenants.length; i++) {
      const iv = intervenants[i];
      if (!iv.nom.trim() && (iv.fonction.trim() || iv.telephone.trim() || iv.email.trim())) {
        setMessage(`Intervenant ${i + 1} : indiquez le nom.`);
        return;
      }
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage(langue === "fr" ? "Vous devez être connecté pour créer un chantier." : "You must be logged in to create a site.");
      setLoading(false);
      return;
    }

    const {
      longueur: longueurBase,
      largeur: largeurBase,
      hauteur: hauteurBase,
      ...detailsColonnes
    } = colonnesDetailsOuvrage(type, details);

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
      longueur: longueurBase,
      largeur: largeurBase,
      hauteur: hauteurBase,
      seuil_ecart_pct: Number(seuil) || 10,
      statut: "en_preparation",
      proprietaire_id: user.id,
    };
    const complement = {
      ...(colonnesOk
        ? {
            ville: ville || null,
            maitre_oeuvre: maitreOeuvre || null,
            entreprise: entreprise || null,
            numero_marche: numeroMarche || null,
          }
        : {}),
      ...(detailsOk === true ? detailsColonnes : {}),
    };

    let { data, error } = await supabase
      .from("chantiers")
      .insert({ ...base, ...complement })
      .select()
      .single();
    if (error && (colonnesOk || detailsOk === true)) {
      // Colonnes pas encore créées côté base : on enregistre au moins l'essentiel.
      const essai = await supabase.from("chantiers").insert(base).select().single();
      data = essai.data;
      error = essai.error;
      if (!error) {
        setColonnesOk(false);
        setDetailsOk(false);
      }
    }
    if (error || !data) {
      setLoading(false);
      setMessage(
        error
          ? traduireErreur(error)
          : langue === "fr"
            ? "Réponse vide de la base : vérifiez la liste des chantiers."
            : "Empty response: check the sites list.",
      );
      return;
    }

    const sectionsAInserer = sections
      .filter((s) => s.nom.trim() || s.pkDebut.trim() || s.pkFin.trim() || s.niveau.trim() || s.lot.trim())
      .map((s, i) => {
        const d = type === "route" ? analyserPK(s.pkDebut) : null;
        const f = type === "route" ? analyserPK(s.pkFin) : null;
        const nomAuto =
          type === "route"
            ? d !== null && f !== null
              ? `${formaterPK(d)} → ${formaterPK(f)}`
              : `Section ${i + 1}`
            : `Bâtiment ${i + 1}`;
        return {
          chantier_id: data.id,
          nom: s.nom.trim() || nomAuto,
          pk_debut: d,
          pk_fin: f,
          niveau: type === "route" ? null : s.niveau.trim() || null,
          lot: type === "route" ? null : s.lot.trim() || null,
          longueur: type === "route" ? longueurSection(d, f) : null,
        };
      });

    const intervenantsAInserer = intervenants
      .filter((iv) => iv.nom.trim())
      .map((iv) => ({
        chantier_id: data.id,
        nom: iv.nom.trim(),
        fonction: iv.fonction.trim() || null,
        telephone: iv.telephone.trim() || null,
        email: iv.email.trim() || null,
      }));

    let avertissement: string | null = null;
    if (sectionsAInserer.length > 0) {
      const { error: errSections } = await supabase.from("sections_chantier").insert(sectionsAInserer);
      if (errSections) avertissement = `Sections non enregistrées : ${traduireErreur(errSections)}`;
    }
    if (!avertissement && intervenantsAInserer.length > 0) {
      const { error: errIntervenants } = await supabase.from("intervenants_chantier").insert(intervenantsAInserer);
      if (errIntervenants) avertissement = `Intervenants non enregistrés : ${traduireErreur(errIntervenants)}`;
    }

    setLoading(false);
    if (avertissement) {
      setChantierCree(data.id);
      setMessage(`${avertissement} Le chantier a bien été créé : ouvrez-le pour compléter depuis sa fiche.`);
      return;
    }
    router.push(`/chantiers/${data.id}`);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          eyebrow={langue === "fr" ? "Création" : "Creation"}
          title={langue === "fr" ? "Nouveau chantier" : "New Site"}
          description={
            langue === "fr"
              ? "Identité, marché, description de l'ouvrage, découpage (sections ou bâtiments) et intervenants : tout est prêt pour le suivi. Vous pouvez aussi créer d'abord et compléter ensuite."
              : "Identity, contract, breakdown (sections or buildings) and people: everything is ready for tracking."
          }
          icon={<Building2 className="h-5 w-5" />}
          actions={<LinkBack />}
        />

        {chantierCree ? (
          <Card variant="elevated" padding="lg" className="anim-fade-up anim-delay-1">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-foreground">Chantier créé</h2>
                {message && <p className="mt-1 text-sm text-muted">{message}</p>}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/chantiers/${chantierCree}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                  >
                    Ouvrir le chantier
                  </Link>
                  <Link
                    href="/chantiers"
                    className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-4 py-2.5 text-sm font-semibold text-muted shadow-sm transition hover:text-foreground"
                  >
                    Retour à la liste
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card variant="elevated" padding="lg" className="anim-fade-up anim-delay-1">
            <form onSubmit={handleSubmit} className="space-y-8">
              {modeleNom && (
                <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                  Création à partir de « {modeleNom} » : vérifiez le nom, les dates, le montant et le découpage avant
                  d&apos;enregistrer.
                </p>
              )}
              {/* 1. Identité */}
              <section className="space-y-4">
                <TitreBloc numero={1} titre="Identité du chantier" icone={<Building2 className="h-4 w-4" />} />
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Nom du chantier *</label>
                  <input
                    className={CLASSE_CHAMP}
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    onBlur={verifierDoublon}
                    placeholder="Ex. : Route Bingerville — PK 5 à PK 12"
                    required
                  />
                  {doublon && (
                    <p className="mt-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-foreground">
                      Un chantier s&apos;appelle déjà « {doublon.nom} ».{" "}
                      <Link href={`/chantiers/${doublon.id}`} className="font-semibold text-primary hover:underline">
                        Le consulter
                      </Link>{" "}
                      — vérifiez que ce n&apos;est pas un doublon.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Type *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["route", "batiment"] as TypeChantier[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setType(t);
                            setTypeDetail("");
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            type === t
                              ? "border-action bg-action/10 text-foreground"
                              : "border-border/80 bg-surface text-muted hover:text-foreground"
                          }`}
                        >
                          {t === "route" ? "🛣️ Route" : "🏢 Bâtiment"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Sous-type (phase de travaux)</label>
                    <select className={CLASSE_CHAMP} value={typeDetail} onChange={(e) => setTypeDetail(e.target.value)}>
                      <option value="">— Non précisé —</option>
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
                  </div>
                </div>

                {colonnesOk === false && (
                  <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
                    Les champs ville, maître d&apos;œuvre, entreprise et n° de marché s&apos;activeront après la mise à
                    jour de la base (migration{" "}
                    <code className="font-mono">0017_phase2_chantiers_suivi_complet.sql</code> à exécuter dans Supabase).
                  </p>
                )}
                {colonnesOk && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Ville / zone</label>
                      <input className={CLASSE_CHAMP} value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. : Abidjan, Yamoussoukro…" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Maître d&apos;ouvrage</label>
                      <input className={CLASSE_CHAMP} value={maitreOuvrage} onChange={(e) => setMaitreOuvrage(e.target.value)} placeholder="Ex. : AGEROUTE" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Maître d&apos;œuvre</label>
                      <input className={CLASSE_CHAMP} value={maitreOeuvre} onChange={(e) => setMaitreOeuvre(e.target.value)} placeholder="Ex. : bureau d'études, ingénieur conseil" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Entreprise / attributaire</label>
                      <input className={CLASSE_CHAMP} value={entreprise} onChange={(e) => setEntreprise(e.target.value)} placeholder="Ex. : entreprise de travaux" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-foreground">N° de marché</label>
                      <input className={CLASSE_CHAMP} value={numeroMarche} onChange={(e) => setNumeroMarche(e.target.value)} placeholder="Ex. : T-2026-014" />
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Marché & délais */}
              <section className="space-y-4">
                <TitreBloc numero={2} titre="Marché & délais" icone={<Coins className="h-4 w-4" />} />
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Montant du marché (FCFA) *</label>
                  <input
                    className={CLASSE_CHAMP}
                    type="text"
                    inputMode="numeric"
                    value={montant}
                    onChange={(e) => setMontant(formaterMontant(e.target.value))}
                    placeholder="Ex. : 25 000 000"
                    required
                  />
                  <p className="mt-1 text-xs text-muted">
                    {langue === "fr"
                      ? "Les séparateurs s'ajoutent tout seuls pendant la frappe."
                      : "Separators are added automatically as you type."}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Date de début *</label>
                    <input className={CLASSE_CHAMP} type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Date de fin prévue</label>
                    <input className={CLASSE_CHAMP} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* 3. Description de l'ouvrage (modele 3D) */}
              <section className="space-y-4">
                <TitreBloc
                  numero={3}
                  titre="Description de l'ouvrage"
                  icone={<Layers className="h-4 w-4" />}
                />
                <p className="text-sm text-muted">
                  {type === "route"
                    ? "Ces informations servent au calcul des quantités et au modèle 3D : chaussée, voies et accotements à l'échelle."
                    : "Ces informations rendent le modèle 3D réaliste : niveaux réels, trame de poteaux, voiles et toiture."}
                </p>
                {detailsOk === false && (
                  <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
                    Ces détails s&apos;enregistreront après la mise à jour de la base (migration{" "}
                    <code className="font-mono">0019_details_ouvrage_3d.sql</code> à exécuter dans Supabase). Le chantier
                    et son découpage se créent déjà normalement.
                  </p>
                )}
                <BlocDetailsOuvrage
                  type={type}
                  valeur={details}
                  onChange={(champ, valeur) => setDetails((prev) => ({ ...prev, [champ]: valeur }))}
                />
              </section>

              {/* 4. Découpage (CHA-02) */}
              <section className="space-y-4">
                <TitreBloc
                  numero={4}
                  titre={type === "route" ? "Découpage — sections et PK" : "Découpage — bâtiments, niveaux et lots"}
                  icone={<Layers className="h-4 w-4" />}
                />
                <p className="text-sm text-muted">
                  {type === "route"
                    ? "Découpez la route en sections (ex. : PK 0+000 → PK 2+500). Le linéaire se calcule tout seul et servira au suivi et à la 3D."
                    : "Facultatif : ajoutez les bâtiments ou lots à suivre (gros œuvre, finitions…). Les niveaux saisis dans la description de l'ouvrage suffisent déjà pour la 3D."}
                </p>
                <div className="space-y-3">
                  {sections.map((s, i) =>
                    type === "route" ? (
                      <div key={s.cle} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-4`}
                          placeholder={`Nom (ex. : Section ${i + 1})`}
                          value={s.nom}
                          onChange={(e) => majSection(s.cle, "nom", e.target.value)}
                        />
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-3`}
                          placeholder="PK début (ex. : 0+000)"
                          value={s.pkDebut}
                          onChange={(e) => majSection(s.cle, "pkDebut", e.target.value)}
                        />
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-3`}
                          placeholder="PK fin (ex. : 2+500)"
                          value={s.pkFin}
                          onChange={(e) => majSection(s.cle, "pkFin", e.target.value)}
                        />
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <span className="flex-1 text-xs font-semibold text-success">
                            {formaterMetres(longueurSection(analyserPK(s.pkDebut), analyserPK(s.pkFin))) ?? ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSections((prev) => (prev.length > 1 ? prev.filter((x) => x.cle !== s.cle) : prev))}
                            className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                            aria-label={`Retirer la section ${i + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={s.cle} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-5`}
                          placeholder={`Nom (ex. : Bâtiment ${i + 1})`}
                          value={s.nom}
                          onChange={(e) => majSection(s.cle, "nom", e.target.value)}
                        />
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-3`}
                          placeholder="Niveau (ex. : R+1)"
                          list="creation-niveaux"
                          value={s.niveau}
                          onChange={(e) => majSection(s.cle, "niveau", e.target.value)}
                        />
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-3`}
                          placeholder="Lot (ex. : Gros œuvre)"
                          list="creation-lots"
                          value={s.lot}
                          onChange={(e) => majSection(s.cle, "lot", e.target.value)}
                        />
                        <div className="flex items-center sm:col-span-1">
                          <button
                            type="button"
                            onClick={() => setSections((prev) => (prev.length > 1 ? prev.filter((x) => x.cle !== s.cle) : prev))}
                            className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                            aria-label={`Retirer la section ${i + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <Button type="button" variant="secondary" onClick={() => setSections((prev) => [...prev, nouvelleSection()])}>
                  <Plus className="h-4 w-4" />
                  Ajouter une {type === "route" ? "section" : "partie"}
                </Button>
                <datalist id="creation-niveaux">
                  {NIVEAUX.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                <datalist id="creation-lots">
                  {LOTS.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </section>

              {/* 5. Intervenants (CHA-01) */}
              <section className="space-y-4">
                <TitreBloc numero={5} titre="Intervenants" icone={<Users className="h-4 w-4" />} />
                <p className="text-sm text-muted">
                  Les personnes à joindre pour ce chantier : maître d&apos;ouvrage, maître d&apos;œuvre, équipe terrain.
                </p>
                {intervenants.length > 0 && (
                  <div className="space-y-3">
                    {intervenants.map((iv, i) => (
                      <div key={iv.cle} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-3`}
                          placeholder="Nom *"
                          value={iv.nom}
                          onChange={(e) => majIntervenant(iv.cle, "nom", e.target.value)}
                        />
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-3`}
                          placeholder="Fonction"
                          list="creation-fonctions"
                          value={iv.fonction}
                          onChange={(e) => majIntervenant(iv.cle, "fonction", e.target.value)}
                        />
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-3`}
                          placeholder="Téléphone"
                          type="tel"
                          value={iv.telephone}
                          onChange={(e) => majIntervenant(iv.cle, "telephone", e.target.value)}
                        />
                        <input
                          className={`${CLASSE_CHAMP} sm:col-span-2`}
                          placeholder="Email"
                          type="email"
                          value={iv.email}
                          onChange={(e) => majIntervenant(iv.cle, "email", e.target.value)}
                        />
                        <div className="flex items-center sm:col-span-1">
                          <button
                            type="button"
                            onClick={() => setIntervenants((prev) => prev.filter((x) => x.cle !== iv.cle))}
                            className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                            aria-label={`Retirer l'intervenant ${i + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="secondary" onClick={() => setIntervenants((prev) => [...prev, nouvelIntervenant()])}>
                  <Plus className="h-4 w-4" />
                  Ajouter un intervenant
                </Button>
                <datalist id="creation-fonctions">
                  {FONCTIONS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </section>

              {/* 6. Options avancées */}
              <details className="rounded-xl border border-border/80 bg-surface-2/50 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                  Options avancées (facultatif)
                  <span className="ml-2 text-xs font-normal text-muted">position GPS, seuil d&apos;alerte</span>
                </summary>

                <div className="mt-4 space-y-6">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <Button type="button" variant="secondary" onClick={prendrePosition} disabled={gps === "encours"}>
                        <MapPin className="h-4 w-4" />
                        {gps === "encours" ? "Localisation..." : "Utiliser ma position"}
                      </Button>
                      <p className="text-xs text-muted">
                        {gps === "erreur"
                          ? "Position indisponible : saisissez-la à la main ou réessayez dehors."
                          : "Remplit latitude et longitude automatiquement avec la position du téléphone."}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Latitude</label>
                        <input className={CLASSE_CHAMP} type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Longitude</label>
                        <input className={CLASSE_CHAMP} type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Seuil d&apos;alerte écart de quantité (%)</label>
                    <input className={CLASSE_CHAMP} type="number" value={seuil} onChange={(e) => setSeuil(e.target.value)} />
                    <p className="mt-1 text-xs text-muted">
                      Une alerte est créée quand l&apos;écart entre quantités prévues et réalisées dépasse ce pourcentage. Laissez 10 si
                      vous ne savez pas.
                    </p>
                  </div>
                </div>
              </details>

              {message && (
                <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">{message}</div>
              )}

              <Button type="submit" size="lg" isLoading={loading} className="w-full">
                {loading ? "Création..." : "Créer le chantier"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </main>
  );
}

function TitreBloc({ numero, titre, icone }: { numero: number; titre: string; icone: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-bold text-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action/15 text-xs font-bold text-action">
        {numero}
      </span>
      {icone}
      {titre}
    </h2>
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
