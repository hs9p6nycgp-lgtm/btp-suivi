"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2, Wand2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/toast";
import { getLangue, traduireErreur } from "@/lib/i18n";
import {
  COLONNE_PARAMETRE,
  COLONNE_PARAMETRE_ALTERNATIVE,
  UNITES_CONTROLE,
  modelesPlanControle,
  nomParametre,
  parametresEquivalents,
  plansManquants,
  texteIntervalle,
  validerPlan,
  valeursPlanDepuisModele,
  type PlanControle,
  type TypeOuvrageControle,
} from "@/lib/qualite/plansControle";

const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

type ValeursPlan = {
  type_ouvrage: string;
  parametre: string;
  valeur_exigee: number;
  tolerance_pos: number;
  tolerance_neg: number;
  unite: string;
};

/**
 * Plan de controle d'un chantier (QUA-01) : liste des parametre controles avec
 * leur valeur exigee et leurs tolerances, et creation des plans manquants
 * (modele route / batiment ou saisie libre).
 */
export default function PlansControleQualite({
  chantierId,
  typeOuvrage,
  plans,
  onReload,
}: {
  chantierId: string;
  typeOuvrage: string;
  plans: PlanControle[];
  onReload: () => void;
}) {
  const langue = getLangue();
  const [type, setType] = useState<TypeOuvrageControle>(
    typeOuvrage === "batiment" ? "batiment" : "route",
  );
  const [parametre, setParametre] = useState("");
  const [unite, setUnite] = useState("");
  const [valeur, setValeur] = useState("");
  const [tolerancePos, setTolerancePos] = useState("");
  const [toleranceNeg, setToleranceNeg] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const modeles = modelesPlanControle(type);
  const nomsExistants = plans.map((p) => nomParametre(p));
  const manquants = plansManquants(modeles, nomsExistants);

  // Le type du chantier est chargé après le premier rendu : on aligne le
  // modèle proposé sur le type réel de l'ouvrage.
  useEffect(() => {
    setType(typeOuvrage === "batiment" ? "batiment" : "route");
  }, [typeOuvrage]);

  // La base stocke le parametre dans la colonne accentuee « paramètre ».
  // On tente cette colonne, puis l'ecriture sans accent en cas d'erreur.
  async function insererPlans(valeurs: ValeursPlan[]) {
    const supabase = createClient();
    const base = valeurs.map((v) => ({
      chantier_id: chantierId,
      type_ouvrage: v.type_ouvrage,
      valeur_exigee: v.valeur_exigee,
      tolerance_pos: v.tolerance_pos,
      tolerance_neg: v.tolerance_neg,
      unite: v.unite,
    }));
    const premier = await supabase
      .from("plans_controle")
      .insert(base.map((b, i) => ({ ...b, [COLONNE_PARAMETRE]: valeurs[i].parametre })))
      .select();
    if (!premier.error) return premier;
    if (!/param/i.test(premier.error.message)) return premier;
    return await supabase
      .from("plans_controle")
      .insert(base.map((b, i) => ({ ...b, [COLONNE_PARAMETRE_ALTERNATIVE]: valeurs[i].parametre })))
      .select();
  }

  async function ajouterPlan(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const controle = validerPlan({
      parametre,
      unite,
      valeur_exigee: valeur,
      tolerance_pos: tolerancePos,
      tolerance_neg: toleranceNeg,
    });
    if (!controle.ok) {
      setMessage(controle.erreurs.join(" "));
      return;
    }
    if (nomsExistants.some((nom) => parametresEquivalents(nom, parametre))) {
      setMessage(
        langue === "fr"
          ? "Ce paramètre figure déjà dans le plan de contrôle."
          : "This parameter is already in the control plan.",
      );
      return;
    }

    setSaving(true);
    const { error } = await insererPlans([
      {
        type_ouvrage: type,
        parametre: parametre.trim(),
        valeur_exigee: Number(valeur),
        tolerance_pos: Number(tolerancePos),
        tolerance_neg: Number(toleranceNeg),
        unite: unite.trim(),
      },
    ]);
    setSaving(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    toast(
      langue === "fr"
        ? "Paramètre ajouté au plan de contrôle."
        : "Parameter added to the control plan.",
    );
    setParametre("");
    setUnite("");
    setValeur("");
    setTolerancePos("");
    setToleranceNeg("");
    onReload();
  }

  async function appliquerModele() {
    if (manquants.length === 0) {
      setMessage(
        langue === "fr"
          ? "Le modèle est déjà entièrement appliqué à ce chantier."
          : "The template is already fully applied to this site.",
      );
      return;
    }
    setMessage(null);
    setSaving(true);
    const { error } = await insererPlans(
      manquants.map((modele) => valeursPlanDepuisModele(modele, type)),
    );
    setSaving(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    toast(
      langue === "fr"
        ? `${manquants.length} paramètre(s) ajouté(s) au plan de contrôle.`
        : `${manquants.length} parameter(s) added to the control plan.`,
    );
    onReload();
  }

  async function supprimerPlan(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("plans_controle").delete().eq("id", id);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    toast(
      langue === "fr"
        ? "Paramètre retiré du plan de contrôle."
        : "Parameter removed from the control plan.",
    );
    onReload();
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            {langue === "fr" ? "Plan de contrôle" : "Control plan"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {langue === "fr"
              ? "Chaque paramètre alimenté la saisie des essais : la conformité est vérifiée automatiquement et une fiche de non-conformité est créée si la mesure sort de la tolérance."
              : "Each parameter feeds the test entries: compliance is checked automatically and a non-conformity sheet is created when the measurement is out of tolerance."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={`${CLASSE_CHAMP} w-auto`}
            value={type}
            onChange={(e) => setType(e.target.value as TypeOuvrageControle)}
            aria-label={langue === "fr" ? "Type d'ouvrage" : "Structure type"}
          >
            <option value="route">{langue === "fr" ? "Route" : "Road"}</option>
            <option value="batiment">{langue === "fr" ? "Bâtiment" : "Building"}</option>
          </select>
          <Button
            type="button"
            variant="secondary"
            onClick={appliquerModele}
            disabled={saving}
          >
            <Wand2 className="h-4 w-4" />
            {langue === "fr" ? "Appliquer le modèle" : "Apply template"}
            {manquants.length > 0 ? ` (${manquants.length})` : ""}
          </Button>
        </div>
      </div>

      {message && (
        <div className="mb-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Liste des paramètres */}
      {plans.length > 0 ? (
        <div className="mb-5 overflow-x-auto rounded-2xl border border-border/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {langue === "fr" ? "Paramètre" : "Parameter"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {langue === "fr" ? "Type" : "Type"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {langue === "fr" ? "Exigé" : "Required"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {langue === "fr" ? "Intervalle accepté" : "Accepted range"}
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                  <td className="px-4 py-3 font-medium text-foreground">{nomParametre(plan)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={plan.type_ouvrage === "batiment" ? "info" : "primary"}>
                      {plan.type_ouvrage === "batiment"
                        ? langue === "fr"
                          ? "Bâtiment"
                          : "Building"
                        : langue === "fr"
                          ? "Route"
                          : "Road"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {plan.valeur_exigee} {plan.unite ?? ""}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {texteIntervalle(plan)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => plan.id && supprimerPlan(plan.id)}
                      className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                      aria-label={`${langue === "fr" ? "Supprimer" : "Delete"} ${nomParametre(plan)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-dashed border-border bg-surface-2/50 p-5 text-center">
          <ClipboardList className="mx-auto h-7 w-7 text-primary" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-foreground">
            {langue === "fr" ? "Aucun plan de contrôle" : "No control plan yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {langue === "fr"
              ? "Appliquez le modèle correspondant à l'ouvrage, ou saisissez un paramètre ci-dessous : sans plan, aucun essai ne peut être contrôlé."
              : "Apply the template for this structure, or enter a parameter below: without a plan, no test can be checked."}
          </p>
        </div>
      )}

      {/* Ajout d'un paramètre */}
      <form onSubmit={ajouterPlan} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          className={`${CLASSE_CHAMP} lg:col-span-2`}
          placeholder={langue === "fr" ? "Paramètre contrôlé (ex. : Épaisseur)" : "Controlled parameter"}
          list="plans-parametres"
          value={parametre}
          onChange={(e) => setParametre(e.target.value)}
          required
        />
        <input
          className={CLASSE_CHAMP}
          placeholder={langue === "fr" ? "Unité (ex. : cm)" : "Unit"}
          list="plans-unites"
          value={unite}
          onChange={(e) => setUnite(e.target.value)}
          required
        />
        <input
          className={CLASSE_CHAMP}
          type="number"
          step="0.01"
          min="0"
          placeholder={langue === "fr" ? "Valeur exigée" : "Required value"}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          required
        />
        <input
          className={CLASSE_CHAMP}
          type="number"
          step="0.01"
          min="0"
          placeholder={langue === "fr" ? "Tolérance +" : "Tolerance +"}
          value={tolerancePos}
          onChange={(e) => setTolerancePos(e.target.value)}
          required
        />
        <input
          className={CLASSE_CHAMP}
          type="number"
          step="0.01"
          min="0"
          placeholder={langue === "fr" ? "Tolérance −" : "Tolerance −"}
          value={toleranceNeg}
          onChange={(e) => setToleranceNeg(e.target.value)}
          required
        />
        <div className="sm:col-span-2 lg:col-span-6">
          <Button type="submit" disabled={saving}>
            <Plus className="h-4 w-4" />
            {langue === "fr" ? "Ajouter le paramètre" : "Add parameter"}
          </Button>
        </div>
        <datalist id="plans-parametres">
          {modeles.map((modele) => (
            <option key={modele.parametre} value={modele.parametre}>
              {modele.unite}
            </option>
          ))}
        </datalist>
        <datalist id="plans-unites">
          {UNITES_CONTROLE.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </form>
    </Card>
  );
}
