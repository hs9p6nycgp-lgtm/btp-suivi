"use client";

import { useEffect, useState } from "react";
import { Save, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/toast";

// Mon compte : nom et téléphone de l'utilisateur.
//
// A l'inscription, ces informations sont rangées dans les « metadonnees » du
// compte d'authentification, mais pas dans la table `profils` : l'utilisateur
// n'apparait donc pas dans les equipes de chantier. Cette page cree la fiche
// manquante et la tient a jour (elle est aussi mise a jour a chaque
// enregistrement, pour que les deux sources restent d'accord).

export default function ComptePage() {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    let actif = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !actif) {
        if (actif) setChargement(false);
        return;
      }

      const { data: profil } = await supabase
        .from("profils")
        .select("nom, email, telephone, role_global")
        .eq("id", user.id)
        .maybeSingle();

      if (!actif) return;

      const meta = (user.user_metadata ?? {}) as { nom?: string; telephone?: string };
      setNom(profil?.nom ?? meta.nom ?? "");
      setTelephone(profil?.telephone ?? meta.telephone ?? "");
      setEmail(profil?.email ?? user.email ?? "");
      setRole(profil?.role_global ?? "utilisateur");
      setChargement(false);

      // Fiche absente : on la cree a partir des informations d'inscription,
      // pour que l'utilisateur apparaisse dans les equipes de chantier.
      if (!profil) {
        await supabase.from("profils").insert({
          id: user.id,
          nom: meta.nom ?? null,
          email: user.email ?? null,
          telephone: meta.telephone ?? null,
          role_global: "utilisateur",
        });
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setEnregistrement(false);
      toast("Session expirée : reconnectez-vous.", "erreur");
      return;
    }

    const nomNettoye = nom.trim();
    const telephoneNettoye = telephone.trim();

    const { error } = await supabase.from("profils").upsert(
      {
        id: user.id,
        nom: nomNettoye || null,
        email: user.email ?? null,
        telephone: telephoneNettoye || null,
      },
      { onConflict: "id" },
    );
    if (error) {
      setEnregistrement(false);
      toast("Enregistrement impossible.", "erreur");
      return;
    }

    // Les métadonnées du compte sont mises à jour en même temps : les deux
    // sources restent d'accord (la liste des équipes lit la table `profils`).
    await supabase.auth.updateUser({
      data: { nom: nomNettoye, telephone: telephoneNettoye },
    });

    setEnregistrement(false);
    toast("Profil enregistré.", "succes");
  }

  if (chargement) {
    return (
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-surface" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow="Réglages"
        title="Mon compte"
        description="Vos coordonnées : elles apparaissent dans les équipes de chantier et sur les procès-verbaux."
        icon={<User className="h-5 w-5" />}
      />

      <Card padding="lg" className="max-w-2xl">
        <form onSubmit={enregistrer} className="grid gap-4">
          <div>
            <label htmlFor="compte-nom" className="mb-1 block text-sm font-medium text-foreground">
              Nom et prénom
            </label>
            <input
              id="compte-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Koffi Konan"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label htmlFor="compte-telephone" className="mb-1 block text-sm font-medium text-foreground">
              Téléphone
            </label>
            <input
              id="compte-telephone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex. +225 07 00 00 00 00"
              inputMode="tel"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label htmlFor="compte-email" className="mb-1 block text-sm font-medium text-foreground">
              Adresse e-mail
            </label>
            <input
              id="compte-email"
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-border/80 bg-surface-2 px-3 py-2 text-sm text-muted"
            />
            <p className="mt-1 text-xs text-muted">
              L'adresse e-mail sert à la connexion : elle ne se modifie pas ici.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-foreground">Rôle</span>
            <p className="rounded-xl border border-border/80 bg-surface-2 px-3 py-2 text-sm text-muted">
              {role === "administrateur" ? "Administrateur" : "Utilisateur"}
            </p>
          </div>

          <div>
            <Button type="submit" disabled={enregistrement}>
              <Save className="mr-1.5 h-4 w-4" />
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
