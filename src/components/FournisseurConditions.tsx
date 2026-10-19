"use client";

// Conditions tarifaires des fournisseurs (FOU-03, FOU-04).
//
// Saisie des offres de prix, comparaison des offres d'un meme poste,
// choix motive et trace, et report du prix retenu dans la base de prix.

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getLangue, traduireErreur } from "@/lib/i18n";
import {
  choisirOffre,
  grouperParPoste,
  messageDemandeDevis,
  objetDemandeDevis,
  offrePerimee,
  propagationVersBasePrix,
  type OffreFournisseur,
} from "@/lib/fournisseurs/conditions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Fournisseur = {
  id: string;
  raison_sociale: string;
  email?: string | null;
  validite_prix_jours?: number | null;
};

type Props = {
  fournisseurs: Fournisseur[];
  onMessage?: (message: string) => void;
};

const CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";
export default function FournisseurConditions({ fournisseurs, onMessage }: Props) {
  const langue = getLangue();
  const [offres, setOffres] = useState<OffreFournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [fournisseurId, setFournisseurId] = useState("");
  const [poste, setPoste] = useState("");
  const [prix, setPrix] = useState("");
  const [unite, setUnite] = useState("");
  const [delai, setDelai] = useState("");
  const [conditions, setConditions] = useState("");
  const [dateDevis, setDateDevis] = useState(new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState("");
  const [offreAChoisir, setOffreAChoisir] = useState<string | null>(null);

  // FOU-08 : demande de devis prete a envoyer
  const [chantiers, setChantiers] = useState<{ id: string; nom: string }[]>([]);
  const [chantierId, setChantierId] = useState("");
  const [posteDemande, setPosteDemande] = useState("");
  const [quantiteDemande, setQuantiteDemande] = useState("");
  const [uniteDemande, setUniteDemande] = useState("");
  const [delaiDemande, setDelaiDemande] = useState("");
  const [messagePret, setMessagePret] = useState<string | null>(null);
  // La colonne « unite » est ajoutee par la migration 0024 : tant qu'elle
  // n'est pas en base, l'offre est enregistree sans unite.
  const [colonneUnite, setColonneUnite] = useState<boolean | null>(null);

  // Chantiers de l'utilisateur : la demande de devis porte sur un chantier (FOU-08)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("chantiers")
        .select("id,nom")
        .eq("proprietaire_id", user.id)
        .order("created_at", { ascending: false });
      setChantiers((data ?? []) as { id: string; nom: string }[]);
    });
  }, []);

  const charger = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("devis_fournisseurs").select("*");
    if (error) {
      onMessage?.(traduireErreur(error));
      setLoading(false);
      return;
    }
    const nomParId = new Map(fournisseurs.map((f) => [f.id, f.raison_sociale]));
    setOffres(
      ((data ?? []) as Array<Record<string, unknown>>).map((o) => ({
        id: String(o.id),
        fournisseurId: String(o.fournisseur_id ?? ""),
        fournisseurNom: nomParId.get(String(o.fournisseur_id)) ?? "Fournisseur",
        poste: String(o.poste ?? ""),
        unite: (o.unite as string | null) ?? null,
        prixUnitaire: Number(o.prix_unitaire ?? 0),
        delaiLivraisonJours: o.delai_livraison_jours === null || o.delai_livraison_jours === undefined ? null : Number(o.delai_livraison_jours),
        conditions: (o.conditions as string | null) ?? null,
        dateDevis: String(o.date_devis ?? ""),
        choisi: Boolean(o.choisi),
        motifChoix: (o.motif_choix as string | null) ?? null,
      })),
    );
    // Colonne « unite » disponible en base ? (migration 0024)
    const testColonne = await supabase.from("devis_fournisseurs").select("unite").limit(1);
    setColonneUnite(!testColonne.error);
    setLoading(false);
  }, [fournisseurs, onMessage]);

  // Chantiers de l'utilisateur : une offre peut etre rattachee a un chantier.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("chantiers")
        .select("id,nom")
        .eq("proprietaire_id", user.id)
        .order("created_at", { ascending: false });
      setChantiers((data ?? []) as { id: string; nom: string }[]);
    });
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function ajouterOffre(e: React.FormEvent) {
    e.preventDefault();
    if (!fournisseurId) {
      onMessage?.(langue === "fr" ? "Choisissez d'abord un fournisseur." : "Choose a supplier first.");
      return;
    }
    const supabase = createClient();
    const donnees: Record<string, unknown> = {
      fournisseur_id: fournisseurId,
      poste: poste.trim(),
      prix_unitaire: Number(prix) || 0,
      delai_livraison_jours: delai ? Number(delai) : null,
      conditions: conditions.trim() || null,
      date_devis: dateDevis || null,
      choisi: false,
    };
    if (colonneUnite) donnees.unite = unite.trim() || null;
    if (chantierId) donnees.chantier_id = chantierId;
    const { error } = await supabase.from("devis_fournisseurs").insert(donnees);
    if (error) {
      onMessage?.(traduireErreur(error));
      return;
    }
    setPoste("");
    setPrix("");
    setUnite("");
    setDelai("");
    setConditions("");
    onMessage?.(langue === "fr" ? "Offre enregistrée." : "Offer saved.");
    charger();
  }

  async function enregistrerChoix(offreId: string) {
    const resultat = choisirOffre(offres, offreId, motif);
    if (resultat.erreur) {
      onMessage?.(resultat.erreur);
      return;
    }
    const supabase = createClient();
    // Un seul choix retenu par poste : on decoche d'abord les autres.
    for (const o of resultat.offres) {
      if (o.choisi) {
        await supabase
          .from("devis_fournisseurs")
          .update({ choisi: true, motif_choix: o.motifChoix })
          .eq("id", o.id);
      } else if (o.choisi === false && o.motifChoix) {
        await supabase.from("devis_fournisseurs").update({ choisi: false, motif_choix: null }).eq("id", o.id);
      }
    }
    setOffreAChoisir(null);
    setMotif("");
    onMessage?.(langue === "fr" ? "Choix enregistré avec son motif." : "Choice saved with its reason.");
    charger();
  }

  async function reporterDansBasePrix(offre: OffreFournisseur) {
    const propagation = propagationVersBasePrix(offre);
    const supabase = createClient();
    const { data: existants } = await supabase
      .from("bpu_postes")
      .select("id,code,designation,unite,prix_unitaire,source,date_source")
      .ilike("designation", offre.poste)
      .limit(1);
    const existant = (existants ?? [])[0] as Record<string, unknown> | undefined;
    if (existant) {
      const { error } = await supabase
        .from("bpu_postes")
        .update({
          prix_unitaire: propagation.prix_unitaire,
          source: propagation.source,
          date_source: propagation.date_source,
          statut: "valide",
        })
        .eq("id", existant.id);
      if (error) {
        onMessage?.(traduireErreur(error));
        return;
      }
      // Historique du referentiel (REF-03) si le prix y est repris.
      const { data: refLignes } = await supabase
        .from("referentiel_prix")
        .select("id,prix_unitaire")
        .ilike("designation", offre.poste)
        .limit(1);
      const ref = (refLignes ?? [])[0] as Record<string, unknown> | undefined;
      if (ref && Number(ref.prix_unitaire) !== propagation.prix_unitaire) {
        await supabase
          .from("referentiel_prix")
          .update({ prix_unitaire: propagation.prix_unitaire, source: propagation.source, date_source: propagation.date_source })
          .eq("id", ref.id);
        await supabase.from("historique_prix").insert({
          referentiel_prix_id: ref.id,
          ancien_prix: Number(ref.prix_unitaire),
          nouveau_prix: propagation.prix_unitaire,
          motif: propagation.motif,
        });
      }
      onMessage?.(
        langue === "fr"
          ? `Base de prix mise à jour : ${offre.poste} à ${propagation.prix_unitaire.toLocaleString("fr-FR")} FCFA (source : ${propagation.source}).`
          : `Price base updated: ${offre.poste} at ${propagation.prix_unitaire} FCFA.`,
      );
    } else {
      const { error } = await supabase.from("bpu_postes").insert({
        designation: offre.poste,
        unite: offre.unite ?? "u",
        prix_unitaire: propagation.prix_unitaire,
        source: propagation.source,
        date_source: propagation.date_source,
        statut: "valide",
      });
      if (error) {
        onMessage?.(traduireErreur(error));
        return;
      }
      onMessage?.(
        langue === "fr"
          ? `Poste ajouté à la base de prix : ${offre.poste} à ${propagation.prix_unitaire.toLocaleString("fr-FR")} FCFA.`
          : `Item added to the price base: ${offre.poste}.`,
      );
    }
  }

  async function supprimerOffre(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("devis_fournisseurs").delete().eq("id", id);
    if (error) {
      onMessage?.(traduireErreur(error));
      return;
    }
    charger();
  }

  /**
   * FOU-08 : demande de devis. Le message est partage (e-mail, WhatsApp ou
   * autre application de messagerie) ; le fournisseur repond en saisissant
   * son offre dans l'application.
   */
  async function envoyerDemandeDevis(e: React.FormEvent) {
    e.preventDefault();
    const fournisseur = fournisseurs.find((f) => f.id === fournisseurId);
    const chantier = chantiers.find((c) => c.id === chantierId);
    if (!fournisseur || !chantier) {
      setMessagePret(
        langue === "fr"
          ? "Choisissez un fournisseur et un chantier avant de préparer la demande."
          : "Choose a supplier and a site before preparing the request.",
      );
      return;
    }
    const texte = messageDemandeDevis({
      fournisseur: fournisseur.raison_sociale,
      chantier: chantier.nom,
      poste: posteDemande.trim() || "à préciser",
      quantite: quantiteDemande ? Number(quantiteDemande) : null,
      unite: uniteDemande.trim() || null,
      delaiSouhaiteJours: delaiDemande ? Number(delaiDemande) : null,
      dateReponse: null,
    });
    const objet = objetDemandeDevis(chantier.nom, posteDemande.trim() || "poste à préciser");
    try {
      const partage = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      };
      if (partage.share) {
        await partage.share({ title: objet, text: texte });
        setMessagePret(
          langue === "fr"
            ? "Demande prête : choisissez l'application de messagerie dans la fenêtre de partage."
            : "Request ready: choose the messaging app in the share sheet.",
        );
        return;
      }
    } catch {
      // Partage annule ou indisponible : on montre le message.
    }
    setMessagePret(texte);
  }

  const comparaisons = grouperParPoste(offres);
  const fr = langue === "fr" ? "fr-FR" : "en-US";

  return (
    <Card className="mb-6">
      <h2 className="mb-1 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
        {langue === "fr" ? "Conditions tarifaires" : "Pricing conditions"}
      </h2>
      <p className="mb-4 text-sm text-muted">
        {langue === "fr"
          ? "Saisissez les offres de vos fournisseurs, comparez-les poste par poste et tracez le choix retenu (FOU-03, FOU-04)."
          : "Record supplier offers, compare them item by item and trace the decision (FOU-03, FOU-04)."}
      </p>

      {/* Saisie d'une offre */}
      <form onSubmit={ajouterOffre} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <select
          className={CHAMP}
          value={fournisseurId}
          onChange={(e) => setFournisseurId(e.target.value)}
          required
        >
          <option value="">{langue === "fr" ? "Fournisseur *" : "Supplier *"}</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>{f.raison_sociale}</option>
          ))}
        </select>
        <input className={CHAMP} placeholder={langue === "fr" ? "Poste *" : "Item *"} value={poste} onChange={(e) => setPoste(e.target.value)} required />
        <input className={CHAMP} type="number" placeholder={langue === "fr" ? "Prix unitaire (FCFA) *" : "Unit price (FCFA) *"} value={prix} onChange={(e) => setPrix(e.target.value)} required />
        <input className={CHAMP} placeholder={langue === "fr" ? "Unité (sac, m³, t)" : "Unit (bag, m³, t)"} value={unite} onChange={(e) => setUnite(e.target.value)} />
        <input className={CHAMP} type="number" placeholder={langue === "fr" ? "Délai de livraison (j)" : "Delivery time (days)"} value={delai} onChange={(e) => setDelai(e.target.value)} />
        <input className={CHAMP} type="date" value={dateDevis} onChange={(e) => setDateDevis(e.target.value)} />
        <select className={CHAMP} value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
          <option value="">{langue === "fr" ? "Chantier (facultatif)" : "Site (optional)"}</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        <input className={CHAMP} placeholder={langue === "fr" ? "Conditions (paiement, transport…)" : "Conditions (payment, transport…)"} value={conditions} onChange={(e) => setConditions(e.target.value)} />
        <Button type="submit">{langue === "fr" ? "Ajouter l'offre" : "Add offer"}</Button>
      </form>

      {/* FOU-08 : demande de devis */}
      <form onSubmit={envoyerDemandeDevis} className="mb-6 rounded-2xl border border-border/80 bg-surface-2/50 p-4">
        <h3 className="mb-1 text-sm font-bold text-foreground">
          {langue === "fr" ? "Demander un devis" : "Request a quote"}
        </h3>
        <p className="mb-3 text-xs text-muted">
          {langue === "fr"
            ? "Le message est préparé et envoyé à votre messagerie (e-mail, WhatsApp…) ; le fournisseur répond en saisissant son offre ci-dessus."
            : "The message is prepared and sent to your messaging app; the supplier replies by entering their offer above."}
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select className={CHAMP} value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
            <option value="">{langue === "fr" ? "Chantier *" : "Site *"}</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <input className={CHAMP} placeholder={langue === "fr" ? "Poste demandé" : "Requested item"} value={posteDemande} onChange={(e) => setPosteDemande(e.target.value)} />
          <input className={CHAMP} type="number" placeholder={langue === "fr" ? "Quantité" : "Quantity"} value={quantiteDemande} onChange={(e) => setQuantiteDemande(e.target.value)} />
          <input className={CHAMP} placeholder={langue === "fr" ? "Unité" : "Unit"} value={uniteDemande} onChange={(e) => setUniteDemande(e.target.value)} />
          <input className={CHAMP} type="number" placeholder={langue === "fr" ? "Délai souhaité (j)" : "Wanted delay (days)"} value={delaiDemande} onChange={(e) => setDelaiDemande(e.target.value)} />
          <Button type="submit">
            {langue === "fr" ? "Préparer la demande" : "Prepare request"}
          </Button>
        </div>
        {messagePret && (
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border/70 bg-surface p-3 text-xs text-muted">
            {messagePret}
          </pre>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-muted">{langue === "fr" ? "Chargement…" : "Loading…"}</p>
      ) : comparaisons.length === 0 ? (
        <p className="text-sm text-muted">
          {langue === "fr"
            ? "Aucune offre enregistrée pour l'instant."
            : "No offer recorded yet."}
        </p>
      ) : (
        <div className="space-y-5">
          {comparaisons.map((comparaison) => {
            const meilleureId = comparaison.meilleureOffre?.id;
            const choisie = comparaison.offres.find((o) => o.choisi) ?? null;
            return (
              <div key={comparaison.poste} className="rounded-2xl border border-border/80 bg-surface-2/50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    {comparaison.poste}
                    {comparaison.unite ? ` (${comparaison.unite})` : ""}
                  </h3>
                  {comparaison.offresComparables > 1 && (
                    <span className="text-xs text-muted">
                      {langue === "fr"
                        ? `écart de prix : ${comparaison.ecartPourcent.toLocaleString(fr, { maximumFractionDigits: 1 })} %`
                        : `price gap: ${comparaison.ecartPourcent.toLocaleString(fr, { maximumFractionDigits: 1 })} %`}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="p-2 text-xs font-semibold uppercase tracking-wider text-muted">
                          {langue === "fr" ? "Fournisseur" : "Supplier"}
                        </th>
                        <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                          {langue === "fr" ? "Prix unitaire" : "Unit price"}
                        </th>
                        <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                          {langue === "fr" ? "Délai" : "Delay"}
                        </th>
                        <th className="p-2 text-xs font-semibold uppercase tracking-wider text-muted">
                          {langue === "fr" ? "Conditions / date" : "Conditions / date"}
                        </th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {comparaison.offres.map((offre) => {
                        const fournisseur = fournisseurs.find((f) => f.id === offre.fournisseurId);
                        const perimee = offrePerimee(offre.dateDevis, fournisseur?.validite_prix_jours);
                        return (
                          <tr key={offre.id} className="border-b border-border/60 last:border-0">
                            <td className="p-2">
                              <span className="font-medium text-foreground">{offre.fournisseurNom}</span>
                              {offre.id === meilleureId && (
                                <Badge variant="success" className="ml-2">
                                  {langue === "fr" ? "Meilleur prix" : "Best price"}
                                </Badge>
                              )}
                              {offre.choisi && (
                                <Badge variant="success" className="ml-2">
                                  {langue === "fr" ? "Retenu" : "Selected"}
                                </Badge>
                              )}
                              {perimee && (
                                <Badge variant="warning" className="ml-2">
                                  {langue === "fr" ? "Hors validité" : "Expired"}
                                </Badge>
                              )}
                              {offre.motifChoix && (
                                <span className="mt-1 block text-xs text-muted">
                                  {langue === "fr" ? "Motif : " : "Reason: "}
                                  {offre.motifChoix}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono tabular-nums text-foreground">
                              {offre.prixUnitaire.toLocaleString(fr)}
                            </td>
                            <td className="p-2 text-right text-muted">
                              {offre.delaiLivraisonJours !== null ? `${offre.delaiLivraisonJours} j` : "-"}
                            </td>
                            <td className="p-2 text-muted">
                              {offre.conditions ? `${offre.conditions} — ` : ""}
                              {offre.dateDevis}
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                {offreAChoisir === offre.id ? (
                                  <span className="flex items-center gap-2">
                                    <input
                                      className="rounded-lg border border-border/80 bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-primary-light"
                                      placeholder={langue === "fr" ? "Motif du choix *" : "Reason *"}
                                      value={motif}
                                      onChange={(e) => setMotif(e.target.value)}
                                    />
                                    <Button type="button" onClick={() => enregistrerChoix(offre.id)}>
                                      {langue === "fr" ? "Valider" : "Save"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setOffreAChoisir(null)}>
                                      {langue === "fr" ? "Annuler" : "Cancel"}
                                    </Button>
                                  </span>
                                ) : (
                                  <Button type="button" variant="outline" onClick={() => { setOffreAChoisir(offre.id); setMotif(""); }}>
                                    {langue === "fr" ? "Choisir" : "Select"}
                                  </Button>
                                )}
                                {offre.choisi && (
                                  <Button type="button" onClick={() => reporterDansBasePrix(offre)}>
                                    {langue === "fr" ? "Reporter dans la base de prix" : "Push to price base"}
                                  </Button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => supprimerOffre(offre.id)}
                                  className="text-xs font-medium text-danger hover:underline"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {choisie && (
                  <p className="mt-2 text-xs text-muted">
                    {langue === "fr"
                      ? `Offre retenue : ${choisie.fournisseurNom} — ${choisie.prixUnitaire.toLocaleString(fr)} FCFA${choisie.motifChoix ? ` (${choisie.motifChoix})` : ""}.`
                      : `Selected offer: ${choisie.fournisseurNom} — ${choisie.prixUnitaire} FCFA${choisie.motifChoix ? ` (${choisie.motifChoix})` : ""}.`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
