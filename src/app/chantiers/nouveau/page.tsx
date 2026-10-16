"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getLangue, traduireErreur } from "@/lib/i18n";

type TypeChantier = "route" | "batiment";

export default function NouveauChantierPage() {
  const router = useRouter();
  const langue = getLangue();
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeChantier>("route");
  const [maitreOuvrage, setMaitreOuvrage] = useState("");
  const [montant, setMontant] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [seuil, setSeuil] = useState("10");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage(langue === "fr" ? "Vous devez être connecté pour créer un chantier." : "You must be logged in to create a site.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("chantiers")
      .insert({
        nom,
        type,
        maitre_ouvrage: maitreOuvrage || null,
        montant_marche: Number(montant) || 0,
        date_debut: dateDebut || null,
        date_fin_prevue: dateFin || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        longueur: longueur ? Number(longueur) : null,
        largeur: largeur ? Number(largeur) : null,
        hauteur: hauteur ? Number(hauteur) : null,
        seuil_ecart_pct: Number(seuil) || 10,
        statut: "en_preparation",
        proprietaire_id: user.id,
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    router.push(`/chantiers/${data.id}`);
  }

  const typeLabel = (t: TypeChantier) => {
    return langue === "fr" ? (t === "route" ? "Route" : "Bâtiment") : (t === "route" ? "Road" : "Building");
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{langue === "fr" ? "Nouveau chantier" : "New Site"}</h1>
          <p className="text-sm text-slate-500">
            {langue === "fr" ? "Créez un nouveau chantier et configurez ses paramètres initiaux." : "Create a new site and configure its initial settings."}
          </p>
        </div>
        <LinkBack />
      </div>

      <Card variant="elevated" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Nom du chantier *" : "Site name *"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Type *" : "Type *"}
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                value={type}
                onChange={(e) => setType(e.target.value as TypeChantier)}
              >
                <option value="route">{typeLabel("route")}</option>
                <option value="batiment">{typeLabel("batiment")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {langue === "fr" ? "Maître d'ouvrage" : "Project Owner"}
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              value={maitreOuvrage}
              onChange={(e) => setMaitreOuvrage(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {langue === "fr" ? "Montant du marché (FCFA)" : "Contract Amount (FCFA)"}
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Date de début" : "Start Date"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Date de fin prévue" : "Planned End Date"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Latitude (optionnel)" : "Latitude (optional)"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Longitude (optionnel)" : "Longitude (optional)"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="number"
                step="0.000001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Longueur (m)" : "Length (m)"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="number"
                step="0.01"
                value={longueur}
                onChange={(e) => setLongueur(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Largeur (m)" : "Width (m)"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="number"
                step="0.01"
                value={largeur}
                onChange={(e) => setLargeur(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {langue === "fr" ? "Hauteur (m)" : "Height (m)"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="number"
                step="0.01"
                value={hauteur}
                onChange={(e) => setHauteur(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {langue === "fr" ? "Seuil d'alerte écart de quantité (%)" : "Quantity variance alert threshold (%)"}
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              type="number"
              value={seuil}
              onChange={(e) => setSeuil(e.target.value)}
            />
          </div>

          {message && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {loading ? (langue === "fr" ? "Création..." : "Creating...") : (langue === "fr" ? "Créer le chantier" : "Create Site")}
          </button>
        </form>
      </Card>
    </main>
  );
}

function LinkBack() {
  const langue = getLangue();
  return (
    <Link
      href="/chantiers"
      className="inline-flex items-center gap-2 text-sm text-orange-600 font-semibold hover:underline transition-colors"
    >
      <span>←</span>
      {langue === "fr" ? "Retour aux chantiers" : "Back to sites"}
    </Link>
  );
}