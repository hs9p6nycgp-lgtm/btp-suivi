"use client";

// Fiche detaillee d'un fournisseur :
//   FOU-05 : historique des livraisons (lien avec APP-01)
//   FOU-06 : evaluation (respect des delais, conformite, ecarts de prix)
//   FOU-07 : documents administratifs avec date d'echeance et alerte 30 jours

import { useCallback, useEffect, useState } from "react";
import { FileCheck2, Star, Truck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getLangue, traduireErreur } from "@/lib/i18n";
import {
  alertesDocuments,
  classerFournisseur,
  historiqueLivraisons,
  LIBELLES_DOCUMENT,
  LIBELLES_NIVEAU,
  noteGlobale,
  noteMoyenneFournisseur,
  type DocumentFournisseur,
  type EvaluationFournisseur,
} from "@/lib/fournisseurs/evaluation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = {
  fournisseurId: string;
  fournisseurNom: string;
  onMessage?: (message: string) => void;
};

const CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

export default function FournisseurFiche({ fournisseurId, fournisseurNom, onMessage }: Props) {
  const langue = getLangue();
  const [evaluations, setEvaluations] = useState<EvaluationFournisseur[]>([]);
  const [documents, setDocuments] = useState<DocumentFournisseur[]>([]);
  const [livraisons, setLivraisons] = useState<
    Array<{ fournisseur: string | null; quantite: number | null; date_livraison: string | null }>
  >([]);
  const [chargement, setChargement] = useState(true);

  // Formulaire d'evaluation
  const [respectDelais, setRespectDelais] = useState("4");
  const [conformite, setConformite] = useState("4");
  const [ecartsPrix, setEcartsPrix] = useState("4");
  const [commentaire, setCommentaire] = useState("");

  // Formulaire de document
  const [typeDocument, setTypeDocument] = useState<DocumentFournisseur["type"]>("assurance");
  const [libelleDocument, setLibelleDocument] = useState("");
  const [echeance, setEcheance] = useState("");

  const charger = useCallback(async () => {
    const supabase = createClient();
    const [evalRes, docRes, livRes] = await Promise.all([
      supabase.from("evaluations_fournisseurs").select("*").eq("fournisseur_id", fournisseurId).order("date_evaluation", { ascending: false }),
      supabase.from("documents_fournisseur").select("*").eq("fournisseur_id", fournisseurId).order("date_echeance", { ascending: true }),
      supabase.from("livraisons").select("fournisseur,quantite,date_livraison"),
    ]);
    if (evalRes.data) setEvaluations(evalRes.data as EvaluationFournisseur[]);
    if (docRes.data) setDocuments(docRes.data as DocumentFournisseur[]);
    if (livRes.data) setLivraisons(livRes.data as typeof livRes.data);
    setChargement(false);
  }, [fournisseurId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function ajouterEvaluation(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const note = noteGlobale({
      respect_delais: Number(respectDelais) || null,
      conformite_livraisons: Number(conformite) || null,
      ecarts_prix: Number(ecartsPrix) || null,
    });
    const { error } = await supabase.from("evaluations_fournisseurs").insert({
      fournisseur_id: fournisseurId,
      respect_delais: Number(respectDelais) || null,
      conformite_livraisons: Number(conformite) || null,
      ecarts_prix: Number(ecartsPrix) || null,
      note_globale: note,
      commentaire: commentaire.trim() || null,
      date_evaluation: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      onMessage?.(traduireErreur(error));
      return;
    }
    setCommentaire("");
    onMessage?.(langue === "fr" ? "Évaluation enregistrée." : "Evaluation saved.");
    charger();
  }

  async function ajouterDocument(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("documents_fournisseur").insert({
      fournisseur_id: fournisseurId,
      type: typeDocument,
      libelle: libelleDocument.trim(),
      date_echeance: echeance || null,
    });
    if (error) {
      onMessage?.(traduireErreur(error));
      return;
    }
    setLibelleDocument("");
    setEcheance("");
    onMessage?.(langue === "fr" ? "Document enregistré." : "Document saved.");
    charger();
  }

  async function supprimerDocument(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("documents_fournisseur").delete().eq("id", id);
    if (error) {
      onMessage?.(traduireErreur(error));
      return;
    }
    charger();
  }

  const note = noteMoyenneFournisseur(evaluations);
  const niveau = classerFournisseur(note);
  const alertes = alertesDocuments(documents);
  const historique = historiqueLivraisons(livraisons).find((h) => h.fournisseur === fournisseurNom);
  const fr = langue === "fr" ? "fr-FR" : "en-US";

  return (
    <Card padding="lg" className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">
          {langue === "fr" ? "Fiche fournisseur" : "Supplier sheet"} — {fournisseurNom}
        </h2>
        {niveau && (
          <Badge variant={niveau === "a_surveiller" ? "danger" : niveau === "moyen" ? "warning" : "success"}>
            <Star className="h-3 w-3" />
            {langue === "fr" ? LIBELLES_NIVEAU[niveau].fr : LIBELLES_NIVEAU[niveau].en}
            {note !== null ? ` — ${note.toLocaleString(fr, { maximumFractionDigits: 2 })}/5` : ""}
          </Badge>
        )}
      </div>

      {alertes.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-foreground">
          <p className="mb-1 font-medium">
            {langue === "fr"
              ? `${alertes.length} document(s) administratif(s) à renouveler.`
              : `${alertes.length} administrative document(s) to renew.`}
          </p>
          <ul className="space-y-1 text-xs">
            {alertes.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.libelle}</span> — {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* FOU-06 : evaluation */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <Star className="h-4 w-4 text-primary" />
            {langue === "fr" ? "Évaluation (sur 5)" : "Evaluation (out of 5)"}
          </h3>
          <form onSubmit={ajouterEvaluation} className="space-y-2">
            {[
              { label: langue === "fr" ? "Respect des délais" : "Delivery punctuality", value: respectDelais, set: setRespectDelais },
              { label: langue === "fr" ? "Conformité des livraisons" : "Delivery compliance", value: conformite, set: setConformite },
              { label: langue === "fr" ? "Écarts de prix" : "Price accuracy", value: ecartsPrix, set: setEcartsPrix },
            ].map((critere) => (
              <label key={critere.label} className="block text-xs text-muted">
                {critere.label}
                <select className={CHAMP} value={critere.value} onChange={(e) => critere.set(e.target.value)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            ))}
            <input className={CHAMP} placeholder={langue === "fr" ? "Commentaire" : "Comment"} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
            <Button type="submit" className="w-full">
              {langue === "fr" ? "Enregistrer l'évaluation" : "Save evaluation"}
            </Button>
          </form>
          {evaluations.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {evaluations.slice(0, 4).map((e) => (
                <li key={e.id}>
                  {e.date_evaluation} —{" "}
                  {e.note_globale !== null && e.note_globale !== undefined
                    ? `${Number(e.note_globale).toLocaleString(fr, { maximumFractionDigits: 2 })}/5`
                    : "—"}
                  {e.commentaire ? ` — ${e.commentaire}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FOU-07 : documents administratifs */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileCheck2 className="h-4 w-4 text-primary" />
            {langue === "fr" ? "Documents administratifs" : "Administrative documents"}
          </h3>
          <form onSubmit={ajouterDocument} className="space-y-2">
            <select className={CHAMP} value={typeDocument} onChange={(e) => setTypeDocument(e.target.value as DocumentFournisseur["type"])}>
              {(Object.keys(LIBELLES_DOCUMENT) as DocumentFournisseur["type"][]).map((t) => (
                <option key={t} value={t}>
                  {langue === "fr" ? LIBELLES_DOCUMENT[t].fr : LIBELLES_DOCUMENT[t].en}
                </option>
              ))}
            </select>
            <input className={CHAMP} placeholder={langue === "fr" ? "Libellé *" : "Label *"} value={libelleDocument} onChange={(e) => setLibelleDocument(e.target.value)} required />
            <input className={CHAMP} type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            <Button type="submit" className="w-full">
              {langue === "fr" ? "Ajouter le document" : "Add document"}
            </Button>
          </form>
          {documents.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-foreground">{d.libelle}</span> —{" "}
                    {langue === "fr" ? LIBELLES_DOCUMENT[d.type].fr : LIBELLES_DOCUMENT[d.type].en}
                    {d.date_echeance ? ` (${d.date_echeance})` : ""}
                  </span>
                  <button onClick={() => supprimerDocument(d.id)} className="text-xs font-medium text-danger hover:underline">
                    {langue === "fr" ? "Supprimer" : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FOU-05 : historique des livraisons */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <Truck className="h-4 w-4 text-primary" />
            {langue === "fr" ? "Livraisons" : "Deliveries"}
          </h3>
          {historique ? (
            <div className="rounded-xl border border-border/70 bg-surface-2/60 p-3 text-sm">
              <p className="text-foreground">
                {historique.nombre} {langue === "fr" ? "livraison(s)" : "delivery(ies)"}
              </p>
              <p className="text-xs text-muted">
                {langue === "fr" ? "Quantité cumulée" : "Cumulative quantity"} :{" "}
                {historique.quantite.toLocaleString(fr)}
              </p>
              <p className="text-xs text-muted">
                {langue === "fr" ? "Dernière livraison" : "Last delivery"} :{" "}
                {historique.derniereLivraison ?? "—"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">
              {chargement
                ? langue === "fr" ? "Chargement…" : "Loading…"
                : langue === "fr"
                  ? "Aucune livraison enregistrée à ce fournisseur."
                  : "No delivery recorded for this supplier."}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
