"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { traduireErreur } from "@/lib/i18n";

type Member = {
  chantier_id: string;
  utilisateur_id: string;
  role: string;
  created_at: string;
  profil?: { id: string; nom: string | null; email: string | null } | null;
};

const ROLES = [
  { value: "administrateur", label: "Administrateur" },
  { value: "conducteur", label: "Conducteur de travaux" },
  { value: "chef_equipe", label: "Chef d'équipe" },
  { value: "qualite", label: "Qualité" },
  { value: "lecture", label: "Lecture seule" },
];

export default function ChantierEquipe({
  chantierId,
  initialMembers,
}: {
  chantierId: string;
  initialMembers: Member[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("lecture");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { data: profil, error: pErr } = await supabase
      .from("profils")
      .select("id, nom, email")
      .eq("email", email.trim())
      .maybeSingle();

    if (pErr || !profil) {
      setMessage(
        "Utilisateur introuvable. Il doit d'abord se connecter pour créer son profil.",
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("chantier_utilisateurs").upsert({
      chantier_id: chantierId,
      utilisateur_id: profil.id,
      role,
    });

    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setMembers((prev) => {
      const filtered = prev.filter((m) => m.utilisateur_id !== profil.id);
      return [
        ...filtered,
        {
          chantier_id: chantierId,
          utilisateur_id: profil.id,
          role,
          created_at: new Date().toISOString(),
          profil: { id: profil.id, nom: profil.nom, email: profil.email },
        },
      ];
    });
    setEmail("");
    setMessage("Utilisateur ajouté.");
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("chantier_utilisateurs")
      .update({ role: newRole })
      .eq("chantier_id", chantierId)
      .eq("utilisateur_id", userId);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setMembers((prev) =>
      prev.map((m) =>
        m.utilisateur_id === userId ? { ...m, role: newRole } : m,
      ),
    );
  }

  async function handleRemove(userId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("chantier_utilisateurs")
      .delete()
      .eq("chantier_id", chantierId)
      .eq("utilisateur_id", userId);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setMembers((prev) => prev.filter((m) => m.utilisateur_id !== userId));
  }

  return (
    <Card padding="lg">
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
        Équipe du chantier
      </h2>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-sm font-medium text-foreground">E-mail utilisateur</label>
          <input
            className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Rôle</label>
          <select
            className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Ajout..." : "Ajouter"}
        </Button>
      </form>

      {message && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 bg-surface-2 text-left">
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">Nom</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">E-mail</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">Rôle</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.utilisateur_id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                <td className="px-3 py-2.5 font-medium text-foreground">{m.profil?.nom || "-"}</td>
                <td className="px-3 py-2.5 text-muted">{m.profil?.email || "-"}</td>
                <td className="px-3 py-2.5">
                  <select
                    className="rounded-xl border border-border/80 bg-surface px-2 py-1 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light"
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.utilisateur_id, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    className="text-xs font-medium text-danger hover:underline"
                    onClick={() => handleRemove(m.utilisateur_id)}
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted" colSpan={4}>
                  Aucun membre affecté.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}