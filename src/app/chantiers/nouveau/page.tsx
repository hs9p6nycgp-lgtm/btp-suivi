"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TypeChantier = "route" | "batiment";

export default function NouveauChantierPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeChantier>("route");
  const [maitreOuvrage, setMaitreOuvrage] = useState("");
  const [montant, setMontant] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [seuil, setSeuil] = useState("10");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
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
        seuil_ecart_pct: Number(seuil) || 10,
        statut: "en_preparation",
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push(`/chantiers/${data.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Nouveau chantier</h1>
      <form onSubmit={handleSubmit} className="space-y-4 card p-6">
        <div>
          <label className="block text-sm font-medium">Nom du chantier *</label>
          <input
            className="w-full rounded border p-2"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Type *</label>
          <select
            className="w-full rounded border p-2"
            value={type}
            onChange={(e) => setType(e.target.value as TypeChantier)}
          >
            <option value="route">Route</option>
            <option value="batiment">Batiment</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Maitre d&apos;ouvrage</label>          <input
            className="w-full rounded border p-2"
            value={maitreOuvrage}
            onChange={(e) => setMaitreOuvrage(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Montant du marche (FCFA)</label>
          <input
            className="w-full rounded border p-2"
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Date de debut</label>
            <input
              className="w-full rounded border p-2"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Date de fin prevue</label>
            <input
              className="w-full rounded border p-2"
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Latitude (optionnel)</label>
            <input
              className="w-full rounded border p-2"
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Longitude (optionnel)</label>
            <input
              className="w-full rounded border p-2"
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">
            Seuil d&apos;alerte ecart de quantite (%)
          </label>
          <input
            className="w-full rounded border p-2"
            type="number"
            value={seuil}
            onChange={(e) => setSeuil(e.target.value)}
          />
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creation..." : "Creer le chantier"}
        </button>
      </form>
    </main>
  );
}