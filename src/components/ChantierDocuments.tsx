"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { ClipboardCheck, Download, File, FileSignature, FileText, Ruler, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, type DemandeConfirmation } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { traduireErreur } from "@/lib/i18n";
import {
  LIMITE_DOCUMENT_OCTETS,
  TYPES_DOCUMENTS,
  libelleTypeDocument,
  tailleLisible,
} from "@/lib/chantiers/complet";

type DocumentChantier = {
  id: string;
  nom: string;
  type: string;
  chemin: string;
  created_at: string;
};

const CLASSE_CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

const BUCKET = "chantiers-documents";

function iconesType(type: string) {
  switch (type) {
    case "plan":
      return <Ruler className="h-4 w-4" />;
    case "marche":
      return <FileSignature className="h-4 w-4" />;
    case "ordre_service":
      return <FileText className="h-4 w-4" />;
    case "pv":
      return <ClipboardCheck className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

function nomFichierSecurise(nom: string): string {
  return (
    nom
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "document"
  );
}

function formaterDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR");
}

export default function ChantierDocuments({ chantierId }: { chantierId: string }) {
  const [documents, setDocuments] = useState<DocumentChantier[]>([]);
  const [tailles, setTailles] = useState<Record<string, number>>({});
  const [charge, setCharge] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("plan");
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, setConfirmation] = useState<DemandeConfirmation | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("documents_chantier")
      .select("id,nom,type,chemin,created_at")
      .eq("chantier_id", chantierId)
      .order("created_at", { ascending: false });
    if (error) {
      setMessage(traduireErreur(error));
      setCharge(true);
      return;
    }
    setDocuments((data ?? []) as DocumentChantier[]);

    // Tailles des fichiers (une seule requete sur le dossier du chantier)
    const { data: objets } = await supabase.storage.from(BUCKET).list(chantierId, { limit: 200 });
    if (objets) {
      const map: Record<string, number> = {};
      for (const objet of objets) {
        const taille = Number((objet.metadata as { size?: number } | null)?.size ?? NaN);
        if (Number.isFinite(taille)) map[`${chantierId}/${objet.name}`] = taille;
      }
      setTailles(map);
    }
    setCharge(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId]);

  function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setMessage(null);
    if (f && f.size > LIMITE_DOCUMENT_OCTETS) {
      setFichier(null);
      setNom("");
      setMessage(`Fichier trop lourd (${tailleLisible(f.size)}). La limite est de 25 Mo.`);
      return;
    }
    setFichier(f);
    if (f) setNom(f.name);
  }

  async function envoyer() {
    if (!fichier) {
      setMessage("Choisissez d'abord un fichier.");
      return;
    }
    setEnvoi(true);
    setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const chemin = `${chantierId}/${Date.now()}-${nomFichierSecurise(fichier.name)}`;
    const { error: errUpload } = await supabase.storage.from(BUCKET).upload(chemin, fichier, {
      contentType: fichier.type || undefined,
    });
    if (errUpload) {
      setEnvoi(false);
      setMessage(traduireErreur(errUpload));
      return;
    }

    const { error: errInsert } = await supabase.from("documents_chantier").insert({
      chantier_id: chantierId,
      nom: nom.trim() || fichier.name,
      type,
      chemin,
      uploaded_by: user?.id ?? null,
    });
    setEnvoi(false);
    if (errInsert) {
      setMessage(traduireErreur(errInsert));
      return;
    }
    setFichier(null);
    setNom("");
    load();
  }

  async function ouvrir(document: DocumentChantier) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(document.chemin, 3600);
    if (error || !data?.signedUrl) {
      setMessage(error ? traduireErreur(error) : "Lien indisponible pour ce document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function supprimer(document: DocumentChantier) {
    const supabase = createClient();
    const { error: errStorage } = await supabase.storage.from(BUCKET).remove([document.chemin]);
    if (errStorage) {
      setMessage(traduireErreur(errStorage));
      return;
    }
    const { error } = await supabase.from("documents_chantier").delete().eq("id", document.id);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    toast("Document supprimé.");
    load();
  }

  return (
    <Card padding="lg">
      <div className="mb-4">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          Documents
          {documents.length > 0 && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
              {documents.length}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Plans, marché, ordres de service, PV : gardez les pièces du chantier au même endroit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface-2/60 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary-light/60">
          <Upload className="h-4 w-4" />
          <span className="truncate">{fichier ? fichier.name : "Choisir un fichier…"}</span>
          <input type="file" className="hidden" onChange={choisirFichier} />
        </label>
        <input
          className={CLASSE_CHAMP}
          placeholder="Nom du document"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <div className="flex gap-2">
          <select className={CLASSE_CHAMP} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES_DOCUMENTS.map((t) => (
              <option key={t} value={t}>
                {libelleTypeDocument(t)}
              </option>
            ))}
          </select>
          <Button type="button" onClick={envoyer} isLoading={envoi}>
            Envoyer
          </Button>
        </div>
      </div>
      {fichier && (
        <p className="mt-2 text-xs text-muted">
          {tailleLisible(fichier.size)} · limite 25 Mo par fichier.
        </p>
      )}

      {message && (
        <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">{message}</div>
      )}

      {charge && documents.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-2/50 p-4 text-center text-sm text-muted">
          Aucun document joint au chantier.
        </p>
      )}

      {documents.length > 0 && (
        <ul className="mt-4 divide-y divide-border/60">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {iconesType(document.type)}
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => ouvrir(document)}
                  className="block max-w-full truncate text-left text-sm font-semibold text-foreground transition hover:text-primary"
                >
                  {document.nom}
                </button>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <Badge variant="default">{libelleTypeDocument(document.type)}</Badge>
                  <span className="text-xs text-muted">{formaterDate(document.created_at)}</span>
                  {tailles[document.chemin] !== undefined && (
                    <span className="text-xs text-muted">· {tailleLisible(tailles[document.chemin])}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => ouvrir(document)}
                className="rounded-lg p-2 text-muted transition hover:bg-primary/10 hover:text-primary"
                aria-label={`Ouvrir ${document.nom}`}
                title="Ouvrir / télécharger"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmation({
                    titre: `Supprimer le document « ${document.nom} » ?`,
                    message: "Le fichier et sa fiche seront définitivement supprimés.",
                    confirmerLibelle: "Supprimer",
                    danger: true,
                    action: () => supprimer(document),
                  })
                }
                className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                aria-label={`Supprimer ${document.nom}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog demande={confirmation} onFermer={() => setConfirmation(null)} />
    </Card>
  );
}
