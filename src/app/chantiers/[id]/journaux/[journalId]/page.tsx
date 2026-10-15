"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Journal = {
  id: string;
  chantier_id: string;
  date_journal: string;
  meteo: string | null;
  observations: string | null;
  statut: "brouillon" | "valide";
};

type Poste = { id: string; code: string | null; designation: string; unite: string };
type Section = { id: string; nom: string };
type Eff = { id: string; corps_metier: string; nombre: number };
type Engin = { id: string; type_engin: string; immatriculation: string | null; heures_marche: number; quantite_produite: number | null };
type Incident = { id: string; type: string; description: string | null; duree_heures: number };
type Photo = { id: string; chemin: string; legende: string | null; latitude: number | null; longitude: number | null };
type Qte = { id: string; poste_dqe_id: string; quantite: number; section_id: string | null };

export default function JournalDetailPage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");
  const journalId = String(params?.journalId ?? "");

  const [journal, setJournal] = useState<Journal | null>(null);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [effectifs, setEffectifs] = useState<Eff[]>([]);
  const [engins, setEngins] = useState<Engin[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [quantites, setQuantites] = useState<Qte[]>([]);

  const [meteo, setMeteo] = useState("");
  const [observations, setObservations] = useState("");

  const [effMetier, setEffMetier] = useState("");
  const [effNombre, setEffNombre] = useState("");

  const [engType, setEngType] = useState("");
  const [engImmat, setEngImmat] = useState("");
  const [engHeures, setEngHeures] = useState("");
  const [engQte, setEngQte] = useState("");

  const [incType, setIncType] = useState("autre");
  const [incDesc, setIncDesc] = useState("");
  const [incDuree, setIncDuree] = useState("");

  const [qtePoste, setQtePoste] = useState("");
  const [qteSection, setQteSection] = useState("");
  const [qteValeur, setQteValeur] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoLegende, setPhotoLegende] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const editable = journal?.statut !== "valide";

  async function loadAll() {
    const supabase = createClient();
    const [j, p, s, ef, en, inc, ph, qt] = await Promise.all([
      supabase.from("journaux").select("*").eq("id", journalId).maybeSingle(),
      supabase.from("postes_dqe").select("id,code,designation,unite").eq("chantier_id", chantierId).order("created_at"),
      supabase.from("sections_chantier").select("id,nom").eq("chantier_id", chantierId).order("created_at"),
      supabase.from("journal_effectifs").select("*").eq("journal_id", journalId),
      supabase.from("journal_engins").select("*").eq("journal_id", journalId),
      supabase.from("incidents_journal").select("*").eq("journal_id", journalId),
      supabase.from("photos_journal").select("*").eq("journal_id", journalId),
      supabase.from("quantites_realisees").select("*").eq("journal_id", journalId),
    ]);
    if (j.data) {
      setJournal(j.data as Journal);
      setMeteo(j.data.meteo ?? "");
      setObservations(j.data.observations ?? "");
    }
    if (p.data) setPostes(p.data as Poste[]);
    if (s.data) setSections(s.data as Section[]);
    if (ef.data) setEffectifs(ef.data as Eff[]);
    if (en.data) setEngins(en.data as Engin[]);
    if (inc.data) setIncidents(inc.data as Incident[]);
    if (ph.data) setPhotos(ph.data as Photo[]);
    if (qt.data) setQuantites(qt.data as Qte[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (journalId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalId]);

  async function saveEntete(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("journaux")
      .update({ meteo: meteo || null, observations: observations || null })
      .eq("id", journalId);
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Entete enregistre.");
    loadAll();
  }

  async function addEffectif(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const supabase = createClient();
    const { error } = await supabase.from("journal_effectifs").insert({
      journal_id: journalId,
      corps_metier: effMetier,
      nombre: Number(effNombre) || 0,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setEffMetier("");
    setEffNombre("");
    loadAll();
  }

  async function removeEffectif(id: string) {
    const supabase = createClient();
    await supabase.from("journal_effectifs").delete().eq("id", id);
    loadAll();
  }

  async function addEngin(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const supabase = createClient();
    const { error } = await supabase.from("journal_engins").insert({
      journal_id: journalId,
      type_engin: engType,
      immatriculation: engImmat || null,
      heures_marche: Number(engHeures) || 0,
      quantite_produite: engQte ? Number(engQte) : null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setEngType("");
    setEngImmat("");
    setEngHeures("");
    setEngQte("");
    loadAll();
  }

  async function removeEngin(id: string) {
    const supabase = createClient();
    await supabase.from("journal_engins").delete().eq("id", id);
    loadAll();
  }

  async function addIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const supabase = createClient();
    const { error } = await supabase.from("incidents_journal").insert({
      journal_id: journalId,
      type: incType,
      description: incDesc || null,
      duree_heures: Number(incDuree) || 0,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setIncDesc("");
    setIncDuree("");
    loadAll();
  }

  async function removeIncident(id: string) {
    const supabase = createClient();
    await supabase.from("incidents_journal").delete().eq("id", id);
    loadAll();
  }

  async function addQuantite(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    if (!qtePoste) {
      setMessage("Choisissez un poste DQE.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("quantites_realisees").insert({
      chantier_id: chantierId,
      poste_dqe_id: qtePoste,
      quantite: Number(qteValeur) || 0,
      journal_id: journalId,
      section_id: qteSection || null,
      date_saisie: journal?.date_journal ?? new Date().toISOString().slice(0, 10),
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setQteValeur("");
    loadAll();
  }

  async function removeQuantite(id: string) {
    const supabase = createClient();
    await supabase.from("quantites_realisees").delete().eq("id", id);
    loadAll();
  }

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    if (!photoFile) {
      setMessage("Choisissez une photo.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const path = `journaux/${journalId}/${Date.now()}-${photoFile.name}`;
    const { error: upErr } = await supabase.storage
      .from("chantiers-documents")
      .upload(path, photoFile);
    if (upErr) {
      setLoading(false);
      setMessage(`Televersement : ${upErr.message}`);
      return;
    }

    let lat: number | null = null;
    let lon: number | null = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // geolocalisation optionnelle
      }
    }

    const { error } = await supabase.from("photos_journal").insert({
      journal_id: journalId,
      chemin: path,
      legende: photoLegende || null,
      latitude: lat,
      longitude: lon,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPhotoFile(null);
    setPhotoLegende("");
    setMessage("Photo ajoutee.");
    loadAll();
  }

  async function validateJournal() {
    if (!editable) return;
    if (!confirm("Valider ce journal ? Une fois valide, il ne sera plus modifiable.")) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("journaux")
      .update({ statut: "valide", validated_at: new Date().toISOString() })
      .eq("id", journalId);
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Journal valide.");
    loadAll();
  }

  if (!journal) {
    return <main className="mx-auto max-w-3xl px-4 py-8">Chargement...</main>;
  }

  const posteLabel = (id: string) =>
    postes.find((p) => p.id === id)?.designation ?? id;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4">
        <a href={`/chantiers/${chantierId}/journaux`} className="text-sm text-orange-600">
          &lt; Retour aux journaux
        </a>
      </div>
      <h1 className="mb-1 text-2xl font-semibold">
        Journal du {new Date(journal.date_journal).toLocaleDateString("fr-FR")}
      </h1>
      <p className="mb-6 text-sm text-zinc-600">
        Statut : {journal.statut} {journal.statut === "valide" ? "(verrouille)" : ""}
      </p>

      {message && <p className="mb-4 text-sm text-orange-600">{message}</p>}

      {editable && (
        <section className="mb-6 card p-4">
          <h2 className="mb-3 text-lg font-medium">En-tete (meteo, observations)</h2>
          <form onSubmit={saveEntete} className="space-y-3">
            <input className="w-full rounded border p-2" placeholder="Meteo" value={meteo} onChange={(e) => setMeteo(e.target.value)} />
            <textarea className="w-full rounded border p-2" placeholder="Observations" value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} />
            <button type="submit" disabled={loading} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
              Enregistrer l&apos;en-tete
            </button>
          </form>
        </section>
      )}

      <section className="mb-6 card p-4">
        <h2 className="mb-3 text-lg font-medium">Effectifs par corps de metier</h2>
        {editable && (
          <form onSubmit={addEffectif} className="mb-3 flex flex-wrap gap-3">
            <input className="rounded border p-2" placeholder="Corps de metier" value={effMetier} onChange={(e) => setEffMetier(e.target.value)} required />
            <input className="rounded border p-2" type="number" placeholder="Nombre" value={effNombre} onChange={(e) => setEffNombre(e.target.value)} required />
            <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-white">Ajouter</button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {effectifs.map((e) => (
            <li key={e.id} className="flex justify-between">
              <span>{e.corps_metier} : {e.nombre}</span>
              {editable && (
                <button className="text-red-600" onClick={() => removeEffectif(e.id)}>Supprimer</button>
              )}
            </li>
          ))}
          {effectifs.length === 0 && <li className="text-zinc-600">Aucun effectif saisi.</li>}
        </ul>
      </section>

      <section className="mb-6 card p-4">
        <h2 className="mb-3 text-lg font-medium">Engins presents</h2>
        {editable && (
          <form onSubmit={addEngin} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input className="rounded border p-2" placeholder="Type d'engin" value={engType} onChange={(e) => setEngType(e.target.value)} required />
            <input className="rounded border p-2" placeholder="Immatriculation" value={engImmat} onChange={(e) => setEngImmat(e.target.value)} />
            <input className="rounded border p-2" type="number" step="0.01" placeholder="Heures de marche" value={engHeures} onChange={(e) => setEngHeures(e.target.value)} />
            <input className="rounded border p-2" type="number" step="0.01" placeholder="Quantite produite" value={engQte} onChange={(e) => setEngQte(e.target.value)} />
            <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-white">Ajouter</button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {engins.map((en) => (
            <li key={en.id} className="flex justify-between">
              <span>
                {en.type_engin}
                {en.immatriculation ? ` (${en.immatriculation})` : ""} - {en.heures_marche} h
                {en.quantite_produite !== null ? ` - ${en.quantite_produite} produit` : ""}
              </span>
              {editable && <button className="text-red-600" onClick={() => removeEngin(en.id)}>Supprimer</button>}
            </li>
          ))}
          {engins.length === 0 && <li className="text-zinc-600">Aucun engin saisi.</li>}
        </ul>
      </section>

      <section className="mb-6 card p-4">
        <h2 className="mb-3 text-lg font-medium">Incidents</h2>
        {editable && (
          <form onSubmit={addIncident} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select className="rounded border p-2" value={incType} onChange={(e) => setIncType(e.target.value)}>
              <option value="panne">Panne</option>
              <option value="intemperie">Intemperie</option>
              <option value="accident">Accident</option>
              <option value="arret">Arret</option>
              <option value="autre">Autre</option>
            </select>
            <input className="rounded border p-2" placeholder="Description" value={incDesc} onChange={(e) => setIncDesc(e.target.value)} />
            <input className="rounded border p-2" type="number" step="0.01" placeholder="Duree (h)" value={incDuree} onChange={(e) => setIncDuree(e.target.value)} />
            <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-white">Ajouter</button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {incidents.map((inc) => (
            <li key={inc.id} className="flex justify-between">
              <span>{inc.type} - {inc.description ?? "sans description"} ({inc.duree_heures} h)</span>
              {editable && <button className="text-red-600" onClick={() => removeIncident(inc.id)}>Supprimer</button>}
            </li>
          ))}
          {incidents.length === 0 && <li className="text-zinc-600">Aucun incident.</li>}
        </ul>
      </section>

      <section className="mb-6 card p-4">
        <h2 className="mb-3 text-lg font-medium">Quantites realisees par poste DQE</h2>
        {editable && (
          <form onSubmit={addQuantite} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select className="rounded border p-2" value={qtePoste} onChange={(e) => setQtePoste(e.target.value)} required>
              <option value="">Poste DQE</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ?? "-"} - {p.designation} ({p.unite})
                </option>
              ))}
            </select>
            <select className="rounded border p-2" value={qteSection} onChange={(e) => setQteSection(e.target.value)}>
              <option value="">Section (optionnel)</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
            <input className="rounded border p-2" type="number" step="0.01" placeholder="Quantite" value={qteValeur} onChange={(e) => setQteValeur(e.target.value)} required />
            <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-white">Ajouter</button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {quantites.map((q) => (
            <li key={q.id} className="flex justify-between">
              <span>{posteLabel(q.poste_dqe_id)} : {Number(q.quantite).toFixed(2)} (section {q.section_id ?? "-"})</span>
              {editable && <button className="text-red-600" onClick={() => removeQuantite(q.id)}>Supprimer</button>}
            </li>
          ))}
          {quantites.length === 0 && <li className="text-zinc-600">Aucune quantite saisie.</li>}
        </ul>
      </section>

      <section className="mb-6 card p-4">
        <h2 className="mb-3 text-lg font-medium">Photos</h2>
        {editable && (
          <form onSubmit={addPhoto} className="mb-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="file" accept="image/*" className="rounded border p-2" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              <input className="rounded border p-2" placeholder="Legende" value={photoLegende} onChange={(e) => setPhotoLegende(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
              {loading ? "Televersement..." : "Televerser la photo"}
            </button>
          </form>
        )}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {photos.map((ph) => (
            <li key={ph.id} className="rounded border p-2 text-sm">
              <p className="truncate">{ph.chemin}</p>
              {ph.legende && <p className="text-zinc-600">{ph.legende}</p>}
              {ph.latitude !== null && ph.longitude !== null && (
                <p className="text-xs text-zinc-500">
                  GPS : {ph.latitude}, {ph.longitude}
                </p>
              )}
            </li>
          ))}
          {photos.length === 0 && <li className="text-sm text-zinc-600">Aucune photo.</li>}
        </ul>
      </section>

      {editable && (
        <section className="mb-6 card p-4">
          <button
            type="button"
            onClick={validateJournal}
            disabled={loading}
            className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Validation..." : "Valider le journal (verrouille la saisie)"}
          </button>
        </section>
      )}
    </main>
  );
}