"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Mail, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, type DemandeConfirmation } from "@/components/ui/ConfirmDialog";
import { traduireErreur } from "@/lib/i18n";
import { normaliserTelephone } from "@/lib/chantiers/complet";

type Intervenant = {
  id: string;
  nom: string;
  fonction: string | null;
  telephone: string | null;
  email: string | null;
};

const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

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

export default function ChantierIntervenants({ chantierId }: { chantierId: string }) {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [charge, setCharge] = useState(false);
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<DemandeConfirmation | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("intervenants_chantier")
      .select("id,nom,fonction,telephone,email")
      .eq("chantier_id", chantierId)
      .order("created_at", { ascending: true });
    setIntervenants((data ?? []) as Intervenant[]);
    setCharge(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId]);

  async function ajouter() {
    setMessage(null);
    if (!nom.trim()) {
      setMessage("Indiquez le nom de l'intervenant.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("intervenants_chantier").insert({
      chantier_id: chantierId,
      nom: nom.trim(),
      fonction: fonction.trim() || null,
      telephone: telephone.trim() || null,
      email: email.trim() || null,
    });
    setSaving(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setNom("");
    setFonction("");
    setTelephone("");
    setEmail("");
    load();
  }

  async function supprimer(intervenant: Intervenant) {
    const supabase = createClient();
    const { error } = await supabase.from("intervenants_chantier").delete().eq("id", intervenant.id);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    load();
  }

  return (
    <Card padding="lg">
      <div className="mb-4">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          Intervenants
          {intervenants.length > 0 && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
              {intervenants.length}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Maître d&apos;ouvrage, maître d&apos;œuvre, équipe terrain : les contacts utiles du chantier.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className={CLASSE_CHAMP} placeholder="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} />
        <input
          className={CLASSE_CHAMP}
          placeholder="Fonction (ex. : Chef de chantier)"
          list="intervenants-fonctions"
          value={fonction}
          onChange={(e) => setFonction(e.target.value)}
        />
        <input
          className={CLASSE_CHAMP}
          placeholder="Téléphone (ex. : 07 07 12 34 56)"
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className={CLASSE_CHAMP}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="button" onClick={ajouter} isLoading={saving}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>
      <datalist id="intervenants-fonctions">
        {FONCTIONS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      {message && (
        <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">{message}</div>
      )}

      {charge && intervenants.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-2/50 p-4 text-center text-sm text-muted">
          Aucun intervenant enregistré pour le moment.
        </p>
      )}

      {intervenants.length > 0 && (
        <ul className="mt-4 divide-y divide-border/60">
          {intervenants.map((intervenant) => {
            const tel = normaliserTelephone(intervenant.telephone);
            return (
              <li key={intervenant.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{intervenant.nom}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {intervenant.fonction && <Badge variant="info">{intervenant.fonction}</Badge>}
                    {tel && (
                      <a
                        href={`tel:${tel}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {intervenant.telephone}
                      </a>
                    )}
                    {intervenant.email && (
                      <a
                        href={`mailto:${intervenant.email}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {intervenant.email}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmation({
                      titre: `Supprimer « ${intervenant.nom} » ?`,
                      message: "L'intervenant sera retiré des contacts du chantier.",
                      confirmerLibelle: "Supprimer",
                      danger: true,
                      action: () => supprimer(intervenant),
                    })
                  }
                  className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Supprimer ${intervenant.nom}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog demande={confirmation} onFermer={() => setConfirmation(null)} />
    </Card>
  );
}
