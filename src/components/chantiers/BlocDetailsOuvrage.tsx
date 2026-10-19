"use client";

import type { TypeChantier } from "@/lib/chantiers/types";
import {
  NB_VOIES_MAX,
  REVETEMENTS_ROUTE,
  STRUCTURES_BATIMENT,
  TOITURES_BATIMENT,
  hauteurTotaleBatiment,
  nbNiveauxBatiment,
  type DetailsOuvrage,
} from "@/lib/chantiers/detailsOuvrage";

const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

function Champ({
  label,
  aide,
  children,
}: {
  label: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {aide && <p className="mt-1 text-xs text-muted">{aide}</p>}
    </div>
  );
}

/** Champs de description de l'ouvrage : dimensions, niveaux, structure, voirie. */
export default function BlocDetailsOuvrage({
  type,
  valeur,
  onChange,
}: {
  type: TypeChantier;
  valeur: DetailsOuvrage;
  onChange: (champ: keyof DetailsOuvrage, valeur: string) => void;
}) {
  if (type === "route") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Champ label="Longueur du tracé (m)">
            <input
              className={CLASSE_CHAMP}
              type="number"
              min="0"
              step="0.01"
              value={valeur.longueur}
              onChange={(e) => onChange("longueur", e.target.value)}
              placeholder="Ex. : 2500"
            />
          </Champ>
          <Champ label="Largeur de chaussée (m)">
            <input
              className={CLASSE_CHAMP}
              type="number"
              min="0"
              step="0.01"
              value={valeur.largeur}
              onChange={(e) => onChange("largeur", e.target.value)}
              placeholder="Ex. : 7"
            />
          </Champ>
          <Champ label="Nombre de voies">
            <select
              className={CLASSE_CHAMP}
              value={valeur.nbVoies}
              onChange={(e) => onChange("nbVoies", e.target.value)}
            >
              {Array.from({ length: NB_VOIES_MAX }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n} voie{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Champ label="Largeur des accotements (m)" aide="Laisser vide : 20 % de la chaussée.">
            <input
              className={CLASSE_CHAMP}
              type="number"
              min="0"
              step="0.01"
              value={valeur.largeurAccotement}
              onChange={(e) => onChange("largeurAccotement", e.target.value)}
              placeholder="Auto"
            />
          </Champ>
          <Champ label="Type de revêtement">
            <select
              className={CLASSE_CHAMP}
              value={valeur.typeRevetement}
              onChange={(e) => onChange("typeRevetement", e.target.value)}
            >
              {REVETEMENTS_ROUTE.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Champ>
          {valeur.largeur && valeur.nbVoies && (
            <div className="flex items-end pb-2">
              <p className="text-xs text-muted">
                Largeur d&apos;une voie :{" "}
                <span className="font-semibold text-foreground">
                  {(Number(valeur.largeur) / Math.max(1, Number(valeur.nbVoies))).toLocaleString("fr-FR", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  m
                </span>
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted">
          Le modèle 3D dessine la chaussée à l&apos;échelle, les accotements et une ligne par séparation de voies.
        </p>
      </div>
    );
  }

  const sousSols = Math.min(10, Math.max(0, Math.round(Number(valeur.nbSousSols) || 0)));
  const etages = Math.min(50, Math.max(0, Math.round(Number(valeur.nbEtages) || 0)));
  const hauteur = hauteurTotaleBatiment(valeur);
  const niveauxAuSol = nbNiveauxBatiment(valeur);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Champ label="Longueur du bâtiment (m)">
          <input
            className={CLASSE_CHAMP}
            type="number"
            min="0"
            step="0.01"
            value={valeur.longueur}
            onChange={(e) => onChange("longueur", e.target.value)}
            placeholder="Ex. : 24"
          />
        </Champ>
        <Champ label="Largeur du bâtiment (m)">
          <input
            className={CLASSE_CHAMP}
            type="number"
            min="0"
            step="0.01"
            value={valeur.largeur}
            onChange={(e) => onChange("largeur", e.target.value)}
            placeholder="Ex. : 12"
          />
        </Champ>
        <Champ label="Hauteur par niveau (m)" aide="Épaisseur d'un étage, dalle comprise.">
          <input
            className={CLASSE_CHAMP}
            type="number"
            min="2"
            max="10"
            step="0.01"
            value={valeur.hauteurNiveau}
            onChange={(e) => onChange("hauteurNiveau", e.target.value)}
            placeholder="3"
          />
        </Champ>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Champ label="Nombre de sous-sols">
          <input
            className={CLASSE_CHAMP}
            type="number"
            min="0"
            max="10"
            step="1"
            value={valeur.nbSousSols}
            onChange={(e) => onChange("nbSousSols", e.target.value)}
          />
        </Champ>
        <Champ label="Étages au-dessus du RDC" aide="Ex. : 3 = RDC + R+1 + R+2 + R+3.">
          <input
            className={CLASSE_CHAMP}
            type="number"
            min="0"
            max="50"
            step="1"
            value={valeur.nbEtages}
            onChange={(e) => onChange("nbEtages", e.target.value)}
          />
        </Champ>
        <Champ label="Toiture">
          <select
            className={CLASSE_CHAMP}
            value={valeur.typeToiture}
            onChange={(e) => onChange("typeToiture", e.target.value)}
          >
            {TOITURES_BATIMENT.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Champ>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Champ label="Travées — sens longueur" aide="Laisser vide : environ tous les 6 m.">
          <input
            className={CLASSE_CHAMP}
            type="number"
            min="1"
            max="30"
            step="1"
            value={valeur.nbTraveesLongueur}
            onChange={(e) => onChange("nbTraveesLongueur", e.target.value)}
            placeholder="Auto"
          />
        </Champ>
        <Champ label="Travées — sens largeur" aide="Sert à placer la trame des poteaux.">
          <input
            className={CLASSE_CHAMP}
            type="number"
            min="1"
            max="30"
            step="1"
            value={valeur.nbTraveesLargeur}
            onChange={(e) => onChange("nbTraveesLargeur", e.target.value)}
            placeholder="Auto"
          />
        </Champ>
        <Champ label="Structure">
          <select
            className={CLASSE_CHAMP}
            value={valeur.typeStructure}
            onChange={(e) => onChange("typeStructure", e.target.value)}
          >
            {STRUCTURES_BATIMENT.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Champ>
      </div>

      <p className="rounded-xl border border-border/70 bg-surface-2/60 px-3 py-2 text-xs text-muted">
        <span className="font-semibold text-foreground">
          {etages > 0 ? `RDC + ${etages} étage${etages > 1 ? "s" : ""}` : "RDC seul"}
        </span>
        {sousSols > 0 && ` · ${sousSols} sous-sol${sousSols > 1 ? "s" : ""}`}
        {` · ${niveauxAuSol} niveau${niveauxAuSol > 1 ? "x" : ""} au-dessus du sol`}
        {hauteur !== null && ` · hauteur totale ${hauteur.toLocaleString("fr-FR")} m`}
      </p>
    </div>
  );
}
