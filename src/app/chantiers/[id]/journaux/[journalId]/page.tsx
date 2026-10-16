"use client";

import { createClient } from "@/lib/supabase/client";
import { offlineInsert, offlineUpdate, offlineDelete } from "@/lib/offline/mutations";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getLangue } from "@/lib/i18n";

export default function JournalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const journalId = String(params?.journalId ?? "");
  const langue = getLangue();

  const [journal, setJournal] = useState<any>(null);
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

  const [postes, setPostes] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [effectifs, setEffectifs] = useState<any[]>([]);
  const [engins, setEngins] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [quantites, setQuantites] = useState<any[]>([]);

  useEffect(() => {
    if (journalId) loadAll();
  }, [journalId]);

  async function loadAll() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
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
      setJournal(j.data);
      setMeteo(j.data.meteo ?? "");
      setObservations(j.data.observations ?? "");
    }
    if (p.data) setPostes(p.data);
    if (s.data) setSections(s.data);
    if (ef.data) setEffectifs(ef.data);
    if (en.data) setEngins(en.data);
    if (inc.data) setIncidents(inc.data);
    if (ph.data) setPhotos(ph.data);
    if (qt.data) setQuantites(qt.data);
  }

  const editable = journal?.statut !== "valide";

  async function saveEntete(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await offlineUpdate("journaux", journalId, { meteo: meteo || null, observations: observations || null });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setMessage(langue === "fr" ? "En-tête enregistré." : "Header saved.");
    loadAll();
  }

  async function addEffectif(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const supabase = createClient();
    const { error } = await offlineInsert("journal_effectifs", { journal_id: journalId, corps_metier: effMetier, nombre: Number(effNombre) || 0 });
    if (error) { setMessage(error.message); return; }
    setEffMetier(""); setEffNombre("");
    loadAll();
  }

  async function addEngin(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const supabase = createClient();
    const { error } = await offlineInsert("journal_engins", {
      journal_id: journalId, type_engin: engType, immatriculation: engImmat || null,
      heures_marche: Number(engHeures) || 0, quantite_produite: engQte ? Number(engQte) : null,
    });
    if (error) { setMessage(error.message); return; }
    setEngType(""); setEngImmat(""); setEngHeures(""); setEngQte("");
    loadAll();
  }

  async function addIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const supabase = createClient();
    const { error } = await offlineInsert("incidents_journal", {
      journal_id: journalId, type: incType, description: incDesc || null, duree_heures: Number(incDuree) || 0,
    });
    if (error) { setMessage(error.message); return; }
    setIncDesc(""); setIncDuree("");
    loadAll();
  }

  async function addQuantite(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    const supabase = createClient();
    const { error } = await offlineInsert("quantites_realisees", {
      chantier_id: chantierId, poste_dqe_id: qtePoste, quantite: Number(qteValeur) || 0,
      journal_id: journalId, section_id: qteSection || null,
      date_saisie: journal?.date_journal,
    });
    if (error) { setMessage(error.message); return; }
    setQteValeur("");
    loadAll();
  }

  async function removeItem(table: string, id: string) {
    if (!editable) return;
    const supabase = createClient();
    const { error } = await offlineDelete(table, id);
    if (error) { setMessage(error.message); return; }
    loadAll();
  }

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!editable || !photoFile) return;
    setLoading(true);
    const supabase = createClient();
    const path = `journaux/${journalId}/${Date.now()}-${photoFile.name}`;
    const { error: upErr } = await supabase.storage.from("chantiers-documents").upload(path, photoFile);
    if (upErr) { setLoading(false); setMessage(upErr.message); return; }

    let lat: number | null = null, lon: number | null = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
        );
        lat = pos.coords.latitude; lon = pos.coords.longitude;
      } catch {}
    }

    const { error } = await supabase.from("photos_journal").insert({
      journal_id: journalId, chemin: path, legende: photoLegende || null, latitude: lat, longitude: lon,
    });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setPhotoFile(null); setPhotoLegende("");
    setMessage(langue === "fr" ? "Photo ajoutée." : "Photo added.");
    loadAll();
  }

  async function validateJournal() {
    if (!editable) return;
    if (!confirm(langue === "fr" ? "Valider ce journal ? Une fois validé, il ne sera plus modifiable." : "Validate this journal? Once validated, it cannot be modified.")) return;
    setLoading(true);
    const supabase = createClient();

    // NOT-01 : générer des alertes si l'écart de quantité dépasse le seuil du chantier
    try {
      const { data: chantier } = await supabase.from("chantiers").select("seuil_ecart_pct").eq("id", chantierId).maybeSingle();
      const seuil = Number(chantier?.seuil_ecart_pct ?? 10);
      const { data: postes } = await supabase.from("postes_dqe").select("id,quantite_marche").eq("chantier_id", chantierId);
      const posteMap = new Map<string, number>();
      for (const p of postes ?? []) posteMap.set(p.id, Number(p.quantite_marche) || 0);
      const { data: qtes } = await supabase.from("quantites_realisees").select("poste_dqe_id,quantite").eq("journal_id", journalId);
      const realMap = new Map<string, number>();
      for (const q of qtes ?? []) realMap.set(q.poste_dqe_id, (realMap.get(q.poste_dqe_id) ?? 0) + Number(q.quantite));
      for (const [posteId, qteRealisee] of realMap) {
        const qtePrevue = posteMap.get(posteId) ?? 0;
        if (qtePrevue <= 0) continue;
        const ecart = ((qteRealisee - qtePrevue) / qtePrevue) * 100;
        if (Math.abs(ecart) > seuil) {
          await supabase.from("alertes").insert({
            chantier_id: chantierId,
            type: "quantite",
            valeur: Math.round(ecart * 100) / 100,
            seuil,
            statut: "ouverte",
          });
        }
      }
    } catch (e) {
      // Ne pas bloquer la validation si la génération d'alertes échoue
      console.error("Erreur génération alertes:", e);
    }

    const { error } = await offlineUpdate("journaux", journalId, { statut: "valide", validated_at: new Date().toISOString() });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setMessage(langue === "fr" ? "Journal validé." : "Journal validated.");
    loadAll();
  }

  if (!journal) return <div className="p-4">Chargement...</div>;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-orange-600 hover:underline">
          ← Retour chantier
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Journal du {new Date(journal.date_journal).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Statut : {journal.statut} {journal.statut === "valide" ? (langue === "fr" ? "(verrouillé)" : "(locked)") : "(draft)"}
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
          {message}
        </div>
      )}

      {editable && (
        <CardVariant padding="lg" className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-slate-900">En-tête (météo, observations)</h2>
          <form onSubmit={saveEntete} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Météo</label>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={meteo} onChange={(e) => setMeteo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observations</label>
              <textarea className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="rounded-xl bg-orange-600 px-4 py-3 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
              {loading ? "Enregistrement..." : "Enregistrer l'en-tête"}
            </button>
          </form>
        </CardVariant>
      )}

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CardVariant padding="lg">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Effectifs</h2>
          {editable && (
            <form onSubmit={addEffectif} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Corps de métier" value={effMetier} onChange={(e) => setEffMetier(e.target.value)} required />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" placeholder="Nombre" value={effNombre} onChange={(e) => setEffNombre(e.target.value)} required />
              <button type="submit" className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-medium hover:bg-orange-700">Ajouter</button>
            </form>
          )}
          <ul className="space-y-2">
            {effectifs.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm rounded border border-slate-200 p-2">
                <span>{e.corps_metier} : {e.nombre}</span>
                {editable && <button onClick={() => removeItem("journal_effectifs", e.id)} className="text-rose-600 text-xs">Supprimer</button>}
              </li>
            ))}
            {effectifs.length === 0 && <li className="text-sm text-slate-500">Aucun effectif.</li>}
          </ul>
        </CardVariant>

        <CardVariant padding="lg" className="mt-6 lg:mt-0">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Engins</h2>
          {editable && (
            <form onSubmit={addEngin} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Type d'engin" value={engType} onChange={(e) => setEngType(e.target.value)} required />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Immatriculation" value={engImmat} onChange={(e) => setEngImmat(e.target.value)} />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" step="0.01" placeholder="Heures" value={engHeures} onChange={(e) => setEngHeures(e.target.value)} />
              <button type="submit" className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-medium hover:bg-orange-700">Ajouter</button>
            </form>
          )}
          <ul className="space-y-2">
            {engins.map((en) => (
              <li key={en.id} className="flex items-center justify-between text-sm rounded border border-slate-200 p-2">
                <span>{en.type_engin} - {en.heures_marche} h</span>
                {editable && <button onClick={() => removeItem("journal_engins", en.id)} className="text-rose-600 text-xs">Supprimer</button>}
              </li>
            ))}
            {engins.length === 0 && <li className="text-sm text-slate-500">Aucun engin.</li>}
          </ul>
        </CardVariant>

        <CardVariant padding="lg" className="mt-6 lg:mt-0">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Incidents</h2>
          {editable && (
            <form onSubmit={addIncident} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={incType} onChange={(e) => setIncType(e.target.value)}>
                <option value="panne">Panne</option>
                <option value="intemperie">Intempérie</option>
                <option value="accident">Accident</option>
                <option value="arret">Arrêt</option>
                <option value="autre">Autre</option>
              </select>
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Description" value={incDesc} onChange={(e) => setIncDesc(e.target.value)} />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" step="0.01" placeholder="Durée (h)" value={incDuree} onChange={(e) => setIncDuree(e.target.value)} />
              <button type="submit" className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-medium hover:bg-orange-700">Ajouter</button>
            </form>
          )}
          <ul className="space-y-2">
            {incidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between text-sm rounded border border-slate-200 p-2">
                <span>{inc.type} - {inc.description ?? "sans description"} ({inc.duree_heures} h)</span>
                {editable && <button onClick={() => removeItem("incidents_journal", inc.id)} className="text-rose-600 text-xs">Supprimer</button>}
              </li>
            ))}
            {incidents.length === 0 && <li className="text-sm text-slate-500">Aucun incident.</li>}
          </ul>
        </CardVariant>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Quantités réalisées</h2>
        <CardVariant padding="lg">
          {editable && (
            <form onSubmit={addQuantite} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={qtePoste} onChange={(e) => setQtePoste(e.target.value)} required>
                <option value="">Poste DQE</option>
                {postes.map((p) => <option key={p.id} value={p.id}>{p.code ?? "-"} - {p.designation}</option>)}
              </select>
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={qteSection} onChange={(e) => setQteSection(e.target.value)}>
                <option value="">Section (optionnel)</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" step="0.01" placeholder="Quantité" value={qteValeur} onChange={(e) => setQteValeur(e.target.value)} required />
              <button type="submit" className="rounded-xl bg-orange-600 px-4 py-2.5 text-white font-semibold hover:bg-orange-700">Ajouter</button>
            </form>
          )}
          <ul className="space-y-2">
            {quantites.map((q) => (
              <li key={q.id} className="flex items-center justify-between text-sm rounded border border-slate-200 p-2">
                <span>{postes.find((p) => p.id === q.poste_dqe_id)?.designation ?? q.poste_dqe_id} : {Number(q.quantite).toFixed(2)}</span>
                {editable && <button onClick={() => removeItem("quantites_realisees", q.id)} className="text-rose-600 text-xs">Supprimer</button>}
              </li>
            ))}
            {quantites.length === 0 && <li className="text-sm text-slate-500">Aucune quantité.</li>}
          </ul>
        </CardVariant>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Photos</h2>
        <CardVariant padding="lg">
          {editable && (
            <form onSubmit={addPhoto} className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input type="file" accept="image/*" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Légende" value={photoLegende} onChange={(e) => setPhotoLegende(e.target.value)} />
              <button type="submit" disabled={loading} className="rounded-xl bg-orange-600 px-4 py-2.5 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm">
                {loading ? "Téléversement..." : "Téléverser"}
              </button>
            </form>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {photos.map((ph) => (
              <div key={ph.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-600 truncate">{ph.chemin}</p>
                {ph.legende && <p className="text-sm text-slate-500">{ph.legende}</p>}
                {ph.latitude !== null && ph.longitude !== null && (
                  <p className="text-xs text-slate-400">GPS : {ph.latitude}, {ph.longitude}</p>
                )}
              </div>
            ))}
            {photos.length === 0 && <p className="text-sm text-slate-500">Aucune photo.</p>}
          </div>
        </CardVariant>
      </section>

      {editable && (
        <div className="mt-8">
          <button onClick={validateJournal} disabled={loading} className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
            {loading ? "Validation..." : "Valider le journal (verrouille la saisie)"}
          </button>
        </div>
      )}
    </main>
  );
}

function CardVariant({ children, padding = "lg", className = "" }: { children: React.ReactNode; padding?: string; className?: string }) {
  const paddingMap = { none: "p-0", sm: "p-3", md: "p-5", lg: "p-6" };
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${paddingMap[padding as keyof typeof paddingMap] || "p-6"} ${className}`}>
      {children}
    </div>
  );
}