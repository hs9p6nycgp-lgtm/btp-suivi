"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLangue } from "@/lib/i18n";
import { Users } from "lucide-react";

type Fournisseur = {
  id: string;
  raison_sociale: string;
  type: string;
  adresse: string | null;
  ville: string | null;
  contact_nom: string | null;
  contact_tel: string | null;
  contact_email: string | null;
  nif: string | null;
  rccm: string | null;
  created_at: string;
};

const TYPES = [
  { value: "materiaux", label: "Matériaux" },
  { value: "loueur_engins", label: "Loueur d'engins" },
  { value: "transporteur", label: "Transporteur" },
  { value: "sous_traitant", label: "Sous-traitant" },
  { value: "laboratoire", label: "Laboratoire" },
];

export default function FournisseursPage() {
  const langue = getLangue();
  const [items, setItems] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtreType, setFiltreType] = useState("");

  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [raisonSociale, setRaisonSociale] = useState("");
  const [type, setType] = useState("materiaux");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [nif, setNif] = useState("");
  const [rccm, setRccm] = useState("");

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("fournisseurs")
      .select("*")
      .eq("proprietaire_id", user.id)
      .order("raison_sociale", { ascending: true });
    if (error) { setMessage(error.message); setLoading(false); return; }
    setItems((data ?? []) as Fournisseur[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setEditing(null);
    setRaisonSociale("");
    setType("materiaux");
    setAdresse("");
    setVille("");
    setContactNom("");
    setContactTel("");
    setContactEmail("");
    setNif("");
    setRccm("");
    setShowForm(false);
  }

  function startEdit(f: Fournisseur) {
    setEditing(f);
    setRaisonSociale(f.raison_sociale);
    setType(f.type);
    setAdresse(f.adresse ?? "");
    setVille(f.ville ?? "");
    setContactNom(f.contact_nom ?? "");
    setContactTel(f.contact_tel ?? "");
    setContactEmail(f.contact_email ?? "");
    setNif(f.nif ?? "");
    setRccm(f.rccm ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raisonSociale.trim()) { setMessage("La raison sociale est obligatoire."); return; }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      proprietaire_id: user?.id,
      raison_sociale: raisonSociale.trim(),
      type,
      adresse: adresse.trim() || null,
      ville: ville.trim() || null,
      contact_nom: contactNom.trim() || null,
      contact_tel: contactTel.trim() || null,
      contact_email: contactEmail.trim() || null,
      nif: nif.trim() || null,
      rccm: rccm.trim() || null,
    };
    let error;
    if (editing) {
      const res = await supabase.from("fournisseurs").update(payload).eq("id", editing.id);
      error = res.error;
    } else {
      const res = await supabase.from("fournisseurs").insert(payload);
      error = res.error;
    }
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setMessage(editing ? "Fournisseur mis à jour." : "Fournisseur créé.");
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("fournisseurs").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    setMessage("Fournisseur supprimé.");
    load();
  }

  const filtres = items.filter((f) => {
    const q = search.trim().toLowerCase();
    if (q && !f.raison_sociale.toLowerCase().includes(q) && !(f.ville ?? "").toLowerCase().includes(q)) return false;
    if (filtreType && f.type !== filtreType) return false;
    return true;
  });

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Réseau" : "Network"}
        title="Fournisseurs"
        description="Gérez vos fournisseurs de matériaux, loueurs d'engins, transporteurs, sous-traitants et laboratoires."
        icon={<Users className="h-5 w-5" />}
        actions={
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            Nouveau fournisseur
          </button>
        }
      />

      {message && <p className="mb-4 text-sm text-muted">{message}</p>}

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
        />
        <select
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value)}
          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
        >
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="mb-6 card p-4">
          <h2 className="mb-3 text-lg font-medium text-primary">{editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Raison sociale *" value={raisonSociale} onChange={(e) => setRaisonSociale(e.target.value)} required />
            <select className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Contact (nom)" value={contactNom} onChange={(e) => setContactNom(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Téléphone" value={contactTel} onChange={(e) => setContactTel(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="E-mail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="NIF" value={nif} onChange={(e) => setNif(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="RCCM" value={rccm} onChange={(e) => setRccm(e.target.value)} />
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Enregistrement..." : (editing ? "Mettre à jour" : "Créer")}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {loading && <p className="text-sm text-muted">Chargement...</p>}
      {!loading && filtres.length === 0 && <p className="text-sm text-muted">Aucun fournisseur.</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtres.map((f) => (
          <div key={f.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{f.raison_sociale}</h3>
                <p className="text-xs text-muted">{TYPES.find((t) => t.value === f.type)?.label ?? f.type}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(f)} className="text-xs text-primary hover:underline">Modifier</button>
                <button onClick={() => handleDelete(f.id)} className="text-xs text-danger hover:underline">Supprimer</button>
              </div>
            </div>
            {f.ville && <p className="mt-2 text-sm text-muted">{f.ville}</p>}
            {f.contact_nom && <p className="text-sm">{f.contact_nom} {f.contact_tel ? `· ${f.contact_tel}` : ""}</p>}
            {f.contact_email && <p className="text-sm text-muted">{f.contact_email}</p>}
            {(f.nif || f.rccm) && <p className="mt-1 text-xs text-muted">NIF: {f.nif ?? "-"} · RCCM: {f.rccm ?? "-"}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
