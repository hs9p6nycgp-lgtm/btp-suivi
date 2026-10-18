"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

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
  { value: "chef_equipe", label: "Chef d'equipe" },
  { value: "qualite", label: "Qualite" },
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
        "Utilisateur introuvable. Il doit d'abord se connecter pour creer son profil.",
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
      setMessage(error.message);
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
    setMessage("Utilisateur ajoute.");
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("chantier_utilisateurs")
      .update({ role: newRole })
      .eq("chantier_id", chantierId)
      .eq("utilisateur_id", userId);
    if (error) {
      setMessage(error.message);
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
      setMessage(error.message);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.utilisateur_id !== userId));
  }

  return (
    <section className="mb-8 card p-4">
      <h2 className="mb-3 text-lg font-medium">Equipe du chantier</h2>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium">E-mail utilisateur</label>
          <input
            className="w-full rounded border p-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Role</label>
          <select
            className="rounded border p-2"
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
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? "Ajout..." : "Ajouter"}
        </button>
      </form>

      {message && <p className="mb-3 text-sm text-zinc-600">{message}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Nom</th>
              <th className="p-2">E-mail</th>
              <th className="p-2">Role</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.utilisateur_id} className="border-b">
                <td className="p-2">{m.profil?.nom || "-"}</td>
                <td className="p-2">{m.profil?.email || "-"}</td>
                <td className="p-2">
                  <select
                    className="rounded border p-1"
                    value={m.role}
                    onChange={(e) =>
                      handleRoleChange(m.utilisateur_id, e.target.value)
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => handleRemove(m.utilisateur_id)}
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="p-2 text-zinc-600" colSpan={4}>
                  Aucun membre affecte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}