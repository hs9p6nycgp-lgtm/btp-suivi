"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, type DemandeConfirmation } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { traduireErreur } from "@/lib/i18n";
import {
  analyserPK,
  avancementMoyenSections,
  detailSection,
  formaterMetres,
  formaterPK,
  longueurSection,
} from "@/lib/chantiers/complet";

export type SectionChantier = {
  id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage: string | null;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  avancement_pct?: number | null;
};

const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

const NIVEAUX = ["Sous-sol", "RDC", "R+1", "R+2", "R+3", "R+4", "R+5", "R+6", "R+7", "R+8", "R+9", "R+10"];
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

export default function ChantierSections({
  chantierId,
  typeChantier,
  sections,
  onReload,
  avancementDisponible = true,
}: {
  chantierId: string;
  typeChantier: string;
  sections: SectionChantier[];
  onReload: () => void;
  avancementDisponible?: boolean;
}) {
  const route = typeChantier === "route";

  const [nom, setNom] = useState("");
  const [pkDebut, setPkDebut] = useState("");
  const [pkFin, setPkFin] = useState("");
  const [niveau, setNiveau] = useState("");
  const [lot, setLot] = useState("");
  const [typeOuvrage, setTypeOuvrage] = useState("");
  const [longueur3D, setLongueur3D] = useState("");
  const [largeur3D, setLargeur3D] = useState("");
  const [hauteur3D, setHauteur3D] = useState("");
  const [avancements, setAvancements] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<DemandeConfirmation | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  // Correction d'une section existante (sans perdre son avancement)
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editPkDebut, setEditPkDebut] = useState("");
  const [editPkFin, setEditPkFin] = useState("");
  const [editNiveau, setEditNiveau] = useState("");
  const [editLot, setEditLot] = useState("");
  const [editTypeOuvrage, setEditTypeOuvrage] = useState("");
  const [editLongueur3D, setEditLongueur3D] = useState("");
  const [editLargeur3D, setEditLargeur3D] = useState("");
  const [editHauteur3D, setEditHauteur3D] = useState("");

  const debutNum = analyserPK(pkDebut);
  const finNum = analyserPK(pkFin);
  const longueurCalculee = longueurSection(debutNum, finNum);
  const avancementGlobal = avancementMoyenSections(sections);
  const lineaireTotal = route
    ? sections.reduce((total, s) => total + (longueurSection(s.pk_debut, s.pk_fin) ?? 0), 0)
    : null;

  async function ajouter() {
    setMessage(null);
    if (route) {
      if (!pkDebut && !pkFin && !nom.trim()) {
        setMessage("Renseignez au moins le nom, ou les PK de début et de fin.");
        return;
      }
      if (pkDebut && debutNum === null) {
        setMessage("PK de début illisible. Exemples acceptés : 0+000, 2+500, 2500.");
        return;
      }
      if (pkFin && finNum === null) {
        setMessage("PK de fin illisible. Exemples acceptés : 0+000, 2+500, 2500.");
        return;
      }
      if (debutNum !== null && finNum !== null && finNum <= debutNum) {
        setMessage("Le PK de fin doit être plus grand que le PK de début.");
        return;
      }
    }

    const supabase = createClient();
    const nomAuto = route
      ? debutNum !== null && finNum !== null
        ? `${formaterPK(debutNum)} → ${formaterPK(finNum)}`
        : `Section ${sections.length + 1}`
      : `Bâtiment ${sections.length + 1}`;

    const { error } = await supabase.from("sections_chantier").insert({
      chantier_id: chantierId,
      nom: nom.trim() || nomAuto,
      pk_debut: route ? debutNum : null,
      pk_fin: route ? finNum : null,
      niveau: route ? null : niveau.trim() || null,
      lot: route ? null : lot.trim() || null,
      type_ouvrage: route ? null : typeOuvrage.trim() || null,
      longueur: route ? longueurCalculee : longueur3D ? Number(longueur3D) : null,
      largeur: route ? null : largeur3D ? Number(largeur3D) : null,
      hauteur: route ? null : hauteur3D ? Number(hauteur3D) : null,
    });
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setNom("");
    setPkDebut("");
    setPkFin("");
    setNiveau("");
    setLot("");
    setTypeOuvrage("");
    setLongueur3D("");
    setLargeur3D("");
    setHauteur3D("");
    onReload();
  }

  async function enregistrerAvancement(id: string) {
    const valeur = avancements[id];
    if (valeur === undefined) return;
    setSaving(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("sections_chantier")
      .update({ avancement_pct: Math.min(100, Math.max(0, valeur)) })
      .eq("id", id);
    setSaving(null);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setAvancements((prev) => {
      const copie = { ...prev };
      delete copie[id];
      return copie;
    });
    onReload();
  }

  async function supprimer(section: SectionChantier) {
    const supabase = createClient();
    const { error } = await supabase.from("sections_chantier").delete().eq("id", section.id);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    toast("Section supprimée.");
    onReload();
  }

  // Passe la ligne en mode correction, en reprenant les valeurs actuelles
  function commencerEdition(section: SectionChantier) {
    setEditionId(section.id);
    setEditNom(section.nom);
    setEditPkDebut(section.pk_debut !== null && section.pk_debut !== undefined ? formaterPK(section.pk_debut) ?? "" : "");
    setEditPkFin(section.pk_fin !== null && section.pk_fin !== undefined ? formaterPK(section.pk_fin) ?? "" : "");
    setEditNiveau(section.niveau ?? "");
    setEditLot(section.lot ?? "");
    setEditTypeOuvrage(section.type_ouvrage ?? "");
    setEditLongueur3D(section.longueur !== null && section.longueur !== undefined ? String(section.longueur) : "");
    setEditLargeur3D(section.largeur !== null && section.largeur !== undefined ? String(section.largeur) : "");
    setEditHauteur3D(section.hauteur !== null && section.hauteur !== undefined ? String(section.hauteur) : "");
    setMessage(null);
  }

  function annulerEdition() {
    setEditionId(null);
  }

  async function enregistrerEdition(section: SectionChantier) {
    setMessage(null);
    const debut = route ? analyserPK(editPkDebut) : null;
    const fin = route ? analyserPK(editPkFin) : null;
    if (route) {
      if ((editPkDebut.trim() && debut === null) || (editPkFin.trim() && fin === null)) {
        setMessage("PK illisible. Exemples acceptés : 0+000, 2+500, 2500.");
        return;
      }
      if ((debut === null) !== (fin === null)) {
        setMessage("Indiquez le PK de début ET le PK de fin, ou laissez les deux vides.");
        return;
      }
      if (debut !== null && fin !== null && fin <= debut) {
        setMessage("Le PK de fin doit être plus grand que le PK de début.");
        return;
      }
    }
    setSaving(section.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("sections_chantier")
      .update({
        nom: editNom.trim() || section.nom,
        pk_debut: route ? debut : section.pk_debut,
        pk_fin: route ? fin : section.pk_fin,
        niveau: route ? section.niveau : editNiveau.trim() || null,
        lot: route ? section.lot : editLot.trim() || null,
        type_ouvrage: route ? section.type_ouvrage : editTypeOuvrage.trim() || null,
        longueur: route ? longueurSection(debut, fin) : editLongueur3D ? Number(editLongueur3D) : null,
        largeur: route ? section.largeur : editLargeur3D ? Number(editLargeur3D) : null,
        hauteur: route ? section.hauteur : editHauteur3D ? Number(editHauteur3D) : null,
      })
      .eq("id", section.id);
    setSaving(null);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setEditionId(null);
    onReload();
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            Découpage du chantier
          </h2>
          <p className="mt-1 text-sm text-muted">
            {route
              ? "Sections et PK : le linéaire est calculé automatiquement, l'avancement se règle section par section."
              : "Bâtiments, niveaux et lots : suivez l'avancement de chaque partie du chantier."}
          </p>
        </div>
        {avancementGlobal !== null && (
          <div className="min-w-40">
            <p className="text-right text-sm font-semibold text-foreground">
              Avancement global : {String(avancementGlobal).replace(".", ",")} %
            </p>
            <div className="mt-1.5 h-2 w-40 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-action to-action-strong transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, avancementGlobal))}%` }}
              />
            </div>
            {lineaireTotal !== null && lineaireTotal > 0 && (
              <p className="mt-1 text-right text-xs text-muted">Linéaire total : {formaterMetres(lineaireTotal)}</p>
            )}
          </div>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div className="rounded-2xl border border-border/80 bg-surface-2/50 p-4">
        {route ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className={CLASSE_CHAMP} placeholder="Nom (ex. : Section 1)" value={nom} onChange={(e) => setNom(e.target.value)} />
            <input className={CLASSE_CHAMP} placeholder="PK début (ex. : 0+000)" value={pkDebut} onChange={(e) => setPkDebut(e.target.value)} />
            <input className={CLASSE_CHAMP} placeholder="PK fin (ex. : 2+500)" value={pkFin} onChange={(e) => setPkFin(e.target.value)} />
            <Button type="button" onClick={ajouter}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className={CLASSE_CHAMP} placeholder="Nom (ex. : Bâtiment A)" value={nom} onChange={(e) => setNom(e.target.value)} />
            <input className={CLASSE_CHAMP} placeholder="Niveau (ex. : R+1)" list="sections-niveaux" value={niveau} onChange={(e) => setNiveau(e.target.value)} />
            <input className={CLASSE_CHAMP} placeholder="Lot (ex. : Gros œuvre)" list="sections-lots" value={lot} onChange={(e) => setLot(e.target.value)} />
            <Button type="button" onClick={ajouter}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-4 sm:grid-cols-4">
              <input className={CLASSE_CHAMP} placeholder="Type d'ouvrage (ex. : magasin)" value={typeOuvrage} onChange={(e) => setTypeOuvrage(e.target.value)} />
              <input className={CLASSE_CHAMP} placeholder="Longueur 3D (m)" type="number" step="0.01" value={longueur3D} onChange={(e) => setLongueur3D(e.target.value)} />
              <input className={CLASSE_CHAMP} placeholder="Largeur 3D (m)" type="number" step="0.01" value={largeur3D} onChange={(e) => setLargeur3D(e.target.value)} />
              <input className={CLASSE_CHAMP} placeholder="Hauteur 3D (m)" type="number" step="0.01" value={hauteur3D} onChange={(e) => setHauteur3D(e.target.value)} />
            </div>
          </div>
        )}
        {route && longueurCalculee !== null && (
          <p className="mt-2 text-xs font-medium text-success">
            Longueur calculée : {formaterMetres(longueurCalculee)}
          </p>
        )}
        {!route && (
          <p className="mt-2 text-xs text-muted">
            Les dimensions 3D sont facultatives : elles servent au modèle 3D du chantier.
          </p>
        )}
        <datalist id="sections-niveaux">
          {NIVEAUX.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <datalist id="sections-lots">
          {LOTS.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </div>

      {message && (
        <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">{message}</div>
      )}

      {/* Liste des sections */}
      {sections.length > 0 ? (
        <ul className="mt-4 divide-y divide-border/60">
          {sections.map((section) => {
            const valeur = avancements[section.id] ?? Number(section.avancement_pct ?? 0);
            return (
              <li key={section.id} className="py-3">
                {editionId === section.id ? (
                  <div className="rounded-xl border border-primary/30 bg-surface-2/60 p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <input
                        className={`${CLASSE_CHAMP} sm:col-span-4`}
                        placeholder="Nom"
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                      />
                      {route ? (
                        <>
                          <input
                            className={`${CLASSE_CHAMP} sm:col-span-3`}
                            placeholder="PK début (ex. : 0+000)"
                            value={editPkDebut}
                            onChange={(e) => setEditPkDebut(e.target.value)}
                          />
                          <input
                            className={`${CLASSE_CHAMP} sm:col-span-3`}
                            placeholder="PK fin (ex. : 2+500)"
                            value={editPkFin}
                            onChange={(e) => setEditPkFin(e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          <input
                            className={`${CLASSE_CHAMP} sm:col-span-2`}
                            placeholder="Niveau"
                            list="sections-niveaux"
                            value={editNiveau}
                            onChange={(e) => setEditNiveau(e.target.value)}
                          />
                          <input
                            className={`${CLASSE_CHAMP} sm:col-span-2`}
                            placeholder="Lot"
                            list="sections-lots"
                            value={editLot}
                            onChange={(e) => setEditLot(e.target.value)}
                          />
                          <input
                            className={`${CLASSE_CHAMP} sm:col-span-1`}
                            placeholder="Type"
                            value={editTypeOuvrage}
                            onChange={(e) => setEditTypeOuvrage(e.target.value)}
                          />
                        </>
                      )}
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => enregistrerEdition(section)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {saving === section.id ? "…" : "OK"}
                        </button>
                        <button
                          type="button"
                          onClick={annulerEdition}
                          className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-foreground"
                          aria-label="Annuler la modification"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {!route && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <input
                          className={CLASSE_CHAMP}
                          placeholder="Longueur 3D (m)"
                          type="number"
                          step="0.01"
                          value={editLongueur3D}
                          onChange={(e) => setEditLongueur3D(e.target.value)}
                        />
                        <input
                          className={CLASSE_CHAMP}
                          placeholder="Largeur 3D (m)"
                          type="number"
                          step="0.01"
                          value={editLargeur3D}
                          onChange={(e) => setEditLargeur3D(e.target.value)}
                        />
                        <input
                          className={CLASSE_CHAMP}
                          placeholder="Hauteur 3D (m)"
                          type="number"
                          step="0.01"
                          value={editHauteur3D}
                          onChange={(e) => setEditHauteur3D(e.target.value)}
                        />
                      </div>
                    )}
                    {route && longueurSection(analyserPK(editPkDebut), analyserPK(editPkFin)) !== null && (
                      <p className="mt-2 text-xs font-medium text-success">
                        Longueur calculée :{" "}
                        {formaterMetres(longueurSection(analyserPK(editPkDebut), analyserPK(editPkFin)))}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{section.nom}</p>
                      <p className="truncate text-xs text-muted">{detailSection(section)}</p>
                    </div>
                    {avancementDisponible ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={Math.min(100, Math.max(0, valeur))}
                          onChange={(e) => setAvancements((prev) => ({ ...prev, [section.id]: Number(e.target.value) }))}
                          onPointerUp={() => enregistrerAvancement(section.id)}
                          onKeyUp={(e) => {
                            if (["Enter", "ArrowLeft", "ArrowRight"].includes(e.key)) enregistrerAvancement(section.id);
                          }}
                          className="h-1.5 w-28 cursor-pointer accent-[var(--action)]"
                          aria-label={`Avancement de ${section.nom}`}
                        />
                        <span className="w-12 text-right text-sm font-semibold tabular-nums text-foreground">
                          {Math.min(100, Math.max(0, valeur))} %
                        </span>
                        {saving === section.id && <span className="text-xs text-muted">…</span>}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => commencerEdition(section)}
                      className="rounded-lg p-2 text-muted transition hover:bg-primary/10 hover:text-primary"
                      aria-label={`Modifier ${section.nom}`}
                      title="Corriger cette section"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmation({
                          titre: `Supprimer la section « ${section.nom} » ?`,
                          message: "Cette partie du découpage sera retirée, avec son avancement.",
                          confirmerLibelle: "Supprimer",
                          danger: true,
                          action: () => supprimer(section),
                        })
                      }
                      className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                      aria-label={`Supprimer ${section.nom}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-2/50 p-4 text-center text-sm text-muted">
          {route
            ? "Aucune section : ajoutez par exemple « 0+000 » à « 2+500 » pour suivre le linéaire."
            : "Aucune partie : ajoutez par exemple « Bâtiment A — R+1 — Gros œuvre »."}
        </p>
      )}

      {!avancementDisponible && sections.length > 0 && (
        <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
          L&apos;avancement par section sera activé après la mise à jour de la base (migration{" "}
          <code className="font-mono">0017_phase2_chantiers_suivi_complet.sql</code> à exécuter dans Supabase).
        </p>
      )}

      <ConfirmDialog demande={confirmation} onFermer={() => setConfirmation(null)} />
    </Card>
  );
}
