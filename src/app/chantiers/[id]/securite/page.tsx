"use client";

// Hygiene, securite, environnement du chantier (HSE-01, HSE-03).
//
// Declaration des incidents et accidents (avec photos) et indicateurs de
// securite : jours sans accident, taux de frequence, accidents avec arret.

import { useEffect, useState } from "react";
import { AlertTriangle, Camera, ShieldCheck, ShieldAlert, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { compresserImage } from "@/lib/photos/compression";
import { BUCKET_PHOTOS, urlsSignees } from "@/lib/photos/urls";
import {
  actionRequise,
  calculIndicateursHse,
  classerGravite,
  heuresTravailleesDepuisJournaux,
  LIBELLES_INCIDENT,
  TYPES_INCIDENT,
  type IncidentHse,
  type TypeIncident,
} from "@/lib/hse/declarations";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useParams, useRouter } from "next/navigation";

const CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

type IncidentAvecPhotos = IncidentHse & { urls: (string | null)[] };

export default function SecuriteChantierPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [incidents, setIncidents] = useState<IncidentAvecPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [heuresManuelles, setHeuresManuelles] = useState<string>("");

  // Formulaire de declaration
  const [type, setType] = useState<TypeIncident>("incident");
  const [dateOccurrence, setDateOccurrence] = useState(new Date().toISOString().slice(0, 10));
  const [lieu, setLieu] = useState("");
  const [description, setDescription] = useState("");
  const [personnes, setPersonnes] = useState("0");
  const [avecArret, setAvecArret] = useState(false);
  const [dureeArret, setDureeArret] = useState("");
  const [action, setAction] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase
      .from("chantiers")
      .select("id")
      .eq("id", chantierId)
      .eq("proprietaire_id", user.id)
      .maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }

    const [hseRes, journauxRes] = await Promise.all([
      supabase.from("hse_incidents").select("*").eq("chantier_id", chantierId).order("date_occurrence", { ascending: false }),
      supabase.from("journaux").select("id").eq("chantier_id", chantierId),
    ]);

    const lignes = (hseRes.data ?? []) as IncidentHse[];
    const tousChemins = lignes.flatMap((l) => l.photos ?? []);
    const urls = await urlsSignees(tousChemins);
    setIncidents(
      lignes.map((l) => ({
        ...l,
        photos: l.photos ?? [],
        urls: (l.photos ?? []).map((p) => urls.get(p) ?? null),
      })),
    );

    // Heures travaillees : somme des effectifs des journaux (8 h par personne et par jour)
    const ids = (journauxRes.data ?? []).map((j: { id: string }) => j.id);
    if (ids.length > 0) {
      const { data: effectifs } = await supabase
        .from("journal_effectifs")
        .select("nombre")
        .in("journal_id", ids);
      const heures = heuresTravailleesDepuisJournaux((effectifs ?? []) as { nombre: number }[]);
      setHeuresManuelles(String(heures));
    }
    setLoading(false);
  }

  async function declarer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    const supabase = createClient();

    // Photos : compression puis televersement dans le bucket du chantier
    const chemins: string[] = [];
    for (const fichier of fichiers) {
      const compresse = await compresserImage(fichier);
      const chemin = `hse/${chantierId}/${Date.now()}-${compresse.name}`;
      const { error } = await supabase.storage.from(BUCKET_PHOTOS).upload(chemin, compresse);
      if (!error) chemins.push(chemin);
    }

    const { error } = await supabase.from("hse_incidents").insert({
      chantier_id: chantierId,
      type,
      date_occurrence: dateOccurrence || null,
      lieu: lieu.trim() || null,
      description: description.trim(),
      personnes_concernees: Number(personnes) || 0,
      accident_avec_arret: avecArret,
      duree_arret_heures: avecArret && dureeArret ? Number(dureeArret) : null,
      action_immediate: action.trim() || null,
      responsable: responsable.trim() || null,
      photos: chemins,
    });
    setEnvoi(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setType("incident");
    setLieu("");
    setDescription("");
    setPersonnes("0");
    setAvecArret(false);
    setDureeArret("");
    setAction("");
    setResponsable("");
    setFichiers([]);
    setMessage(
      langue === "fr" ? "Déclaration enregistrée." : "Declaration saved.",
    );
    load();
  }

  const heuresTravaillees = Number(heuresManuelles) || 0;
  const indicateurs = calculIndicateursHse(incidents, heuresTravaillees);
  const fr = langue === "fr" ? "fr-FR" : "en-US";

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Chantier" : "Site"}
        title={langue === "fr" ? "Sécurité (HSE)" : "Safety (HSE)"}
        description={
          langue === "fr"
            ? "Déclaration des incidents et accidents, et indicateurs de sécurité du chantier."
            : "Incident and accident declarations, and site safety indicators."
        }
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      {message && (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">{message}</p>
      )}

      {/* HSE-03 : indicateurs de securite */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title={langue === "fr" ? "Jours sans accident" : "Days without accident"}
          value={indicateurs.accidents > 0 ? indicateurs.joursSansAccident : "—"}
          icon={<ShieldCheck className="h-5 w-5" />}
          color="emerald"
          subtitle={
            indicateurs.accidents > 0
              ? langue === "fr" ? "depuis le dernier accident" : "since the last accident"
              : langue === "fr" ? "aucun accident declare" : "no accident declared"
          }
        />
        <StatCard
          title={langue === "fr" ? "Taux de fréquence" : "Frequency rate"}
          value={indicateurs.tauxFrequence.toLocaleString(fr, { maximumFractionDigits: 2 })}
          icon={<TrendingUp className="h-5 w-5" />}
          color={indicateurs.tauxEleve ? "rose" : "blue"}
          subtitle={langue === "fr" ? "pour 1 000 000 h travaillées" : "per 1,000,000 hours worked"}
        />
        <StatCard
          title={langue === "fr" ? "Accidents avec arrêt" : "Accidents with stoppage"}
          value={indicateurs.accidentsAvecArret}
          icon={<ShieldAlert className="h-5 w-5" />}
          color={indicateurs.accidentsAvecArret > 0 ? "rose" : "emerald"}
        />
        <StatCard
          title={langue === "fr" ? "Presqu'accidents" : "Near misses"}
          value={indicateurs.presquAccidents}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="amber"
          subtitle={langue === "fr" ? "des accidents évités" : "accidents avoided"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Formulaire de declaration (HSE-01) */}
        <Card padding="lg" className="lg:col-span-2">
          <h2 className="mb-1 text-lg font-bold text-foreground">
            {langue === "fr" ? "Déclarer un incident" : "Declare an incident"}
          </h2>
          <p className="mb-4 text-xs text-muted">
            {langue === "fr"
              ? "À faire dès que possible : les photos et l'action immédiate sont importantes."
              : "As soon as possible: photos and immediate action are the priority."}
          </p>
          <form onSubmit={declarer} className="space-y-3">
            <select className={CHAMP} value={type} onChange={(e) => setType(e.target.value as TypeIncident)}>
              {TYPES_INCIDENT.map((t) => (
                <option key={t} value={t}>
                  {langue === "fr" ? LIBELLES_INCIDENT[t].fr : LIBELLES_INCIDENT[t].en}
                </option>
              ))}
            </select>
            <input className={CHAMP} type="date" value={dateOccurrence} onChange={(e) => setDateOccurrence(e.target.value)} required />
            <input className={CHAMP} placeholder={langue === "fr" ? "Lieu (chantier, atelier, route…)" : "Place (site, workshop, road…)"} value={lieu} onChange={(e) => setLieu(e.target.value)} />
            <textarea
              className={`${CHAMP} min-h-24`}
              placeholder={langue === "fr" ? "Description des faits *" : "Description of what happened *"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input className={CHAMP} type="number" min="0" placeholder={langue === "fr" ? "Personnes concernées" : "People involved"} value={personnes} onChange={(e) => setPersonnes(e.target.value)} />
              <input className={CHAMP} type="number" step="0.5" placeholder={langue === "fr" ? "Durée d'arrêt (h)" : "Stoppage (h)"} value={dureeArret} onChange={(e) => setDureeArret(e.target.value)} disabled={!avecArret} />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={avecArret} onChange={(e) => setAvecArret(e.target.checked)} />
              {langue === "fr" ? "Accident avec arrêt de travail" : "Accident with work stoppage"}
            </label>
            <textarea
              className={`${CHAMP} min-h-16`}
              placeholder={langue === "fr" ? "Action immédiate engagée" : "Immediate action taken"}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <input className={CHAMP} placeholder={langue === "fr" ? "Responsable" : "Responsible"} value={responsable} onChange={(e) => setResponsable(e.target.value)} />
            <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-muted">
              <Camera className="h-4 w-4" />
              <span className="flex-1">
                {fichiers.length > 0
                  ? `${fichiers.length} photo(s) sélectionnée(s)`
                  : langue === "fr" ? "Ajouter des photos" : "Add photos"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFichiers(Array.from(e.target.files ?? []))}
              />
            </label>
            <Button type="submit" disabled={envoi} className="w-full">
              {envoi
                ? langue === "fr" ? "Enregistrement..." : "Saving..."
                : langue === "fr" ? "Enregistrer la déclaration" : "Save declaration"}
            </Button>
          </form>
        </Card>

        {/* Liste des declarations */}
        <div className="lg:col-span-3">
          <Card padding="lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-foreground">
                {langue === "fr" ? "Déclarations" : "Declarations"} ({incidents.length})
              </h2>
              <label className="flex items-center gap-2 text-xs text-muted">
                {langue === "fr" ? "Heures travaillées" : "Hours worked"}
                <input
                  className="w-28 rounded-lg border border-border/80 bg-surface px-2 py-1 text-right text-sm tabular-nums text-foreground"
                  type="number"
                  value={heuresManuelles}
                  onChange={(e) => setHeuresManuelles(e.target.value)}
                />
                h
              </label>
            </div>

            {incidents.length === 0 ? (
              <p className="text-sm text-muted">
                {loading
                  ? langue === "fr" ? "Chargement…" : "Loading…"
                  : langue === "fr"
                    ? "Aucune déclaration : à ce jour, aucun incident ni accident n'a été déclaré sur ce chantier."
                    : "No declaration: no incident or accident has been reported on this site."}
              </p>
            ) : (
              <ul className="space-y-3">
                {incidents.map((incident) => {
                  const gravite = classerGravite(incident);
                  return (
                    <li key={incident.id} className="rounded-xl border border-border/70 bg-surface-2/60 p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {langue === "fr" ? LIBELLES_INCIDENT[incident.type].fr : LIBELLES_INCIDENT[incident.type].en}
                        </span>
                        <Badge variant={gravite === "critique" ? "danger" : gravite === "moyen" ? "warning" : "info"}>
                          {gravite === "critique"
                            ? langue === "fr" ? "Critique" : "Critical"
                            : gravite === "moyen"
                              ? langue === "fr" ? "Moyen" : "Medium"
                              : langue === "fr" ? "Faible" : "Low"}
                        </Badge>
                        {actionRequise(incident) && (
                          <Badge variant="warning">
                            {langue === "fr" ? "Action à faire" : "Action required"}
                          </Badge>
                        )}
                        <span className="ml-auto text-xs text-muted">
                          {incident.date_occurrence}
                          {incident.lieu ? ` · ${incident.lieu}` : ""}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{incident.description}</p>
                      <p className="mt-1 text-xs text-muted">
                        {langue === "fr" ? "Personnes concernées" : "People involved"} : {incident.personnes_concernees}
                        {incident.accident_avec_arret
                          ? ` · ${langue === "fr" ? "arrêt" : "stoppage"} ${incident.duree_arret_heures ?? 0} h`
                          : ""}
                        {incident.responsable ? ` · ${incident.responsable}` : ""}
                      </p>
                      {incident.action_immediate && (
                        <p className="mt-1 text-xs text-muted">
                          {langue === "fr" ? "Action immédiate" : "Immediate action"} : {incident.action_immediate}
                        </p>
                      )}
                      {incident.urls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {incident.urls.map((url, i) =>
                            url ? (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={langue === "fr" ? "Photo de la déclaration" : "Declaration photo"}
                                  className="h-16 w-20 rounded-lg border border-border/70 object-cover"
                                />
                              </a>
                            ) : (
                              <span
                                key={i}
                                className="flex h-16 w-20 items-center justify-center rounded-lg border border-border/70 text-xs text-muted"
                              >
                                {langue === "fr" ? "Photo indisponible" : "Photo unavailable"}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
