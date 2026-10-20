import Link from "next/link";
import {
  Bell,
  BookOpen,
  Box,
  Building2,
  CalendarRange,
  Calculator,
  ClipboardCheck,
  Coins,
  Download,
  FileText,
  Film,
  LifeBuoy,
  ListChecks,
  PenLine,
  Printer,
  Ruler,
  Scale,
  ShieldCheck,
  Wallet,
  Truck,
  User,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Aide" };

const ETAPES = [
  {
    titre: "Créez le chantier",
    texte:
      "Renseignez le client, le montant du marché et les dates : tout le suivi s'articule autour de cette fiche.",
    href: "/chantiers/nouveau",
    lien: "Créer un chantier",
  },
  {
    titre: "Structurez l'ouvrage",
    texte:
      "Découpez en sections (PK, niveaux, lots), ajoutez intervenants et documents — la maquette 3D se génère à partir de ces éléments.",
    href: "/chantiers",
    lien: "Ouvrir mes chantiers",
  },
  {
    titre: "Saisissez le journal",
    texte:
      "Météo, effectifs, engins, quantités, photos : la saisie du jour fonctionne même sans réseau.",
    href: "/chantiers",
    lien: "Ouvrir un chantier",
  },
  {
    titre: "Pilotez et éditez",
    texte:
      "Coûts, qualité, livraisons, planning… puis les rapports et exports pour vos réunions de chantier.",
    href: "/rapports",
    lien: "Voir les rapports",
  },
];

const MODULES = [
  { href: "/chantiers", icon: <Building2 className="h-5 w-5" />, nom: "Chantiers", desc: "Fiches, sections, intervenants, documents" },
  { href: "/chantiers", icon: <PenLine className="h-5 w-5" />, nom: "Journal", desc: "Saisie quotidienne, météo, photos" },
  { href: "/chantiers", icon: <CalendarRange className="h-5 w-5" />, nom: "Planning", desc: "Tâches, retards, chemin critique" },
  { href: "/chantiers", icon: <Coins className="h-5 w-5" />, nom: "Coûts", desc: "DQE, dépenses, avancement financier" },
  { href: "/chantiers", icon: <ClipboardCheck className="h-5 w-5" />, nom: "Qualité", desc: "Essais, éprouvettes, non-conformités" },
  { href: "/chantiers", icon: <Scale className="h-5 w-5" />, nom: "Métré", desc: "Calculs de quantités d'ouvrages" },
  { href: "/chantiers", icon: <Truck className="h-5 w-5" />, nom: "Livraisons", desc: "Stocks matériaux et seuils d'alerte" },
  { href: "/chantiers", icon: <ShieldCheck className="h-5 w-5" />, nom: "Sécurité (HSE)", desc: "Incidents, accidents, indicateurs" },
  { href: "/parametres", icon: <Building2 className="h-5 w-5" />, nom: "Mon entreprise", desc: "Logo, coordonnées, destinataires" },
  { href: "/chantiers", icon: <Wallet className="h-5 w-5" />, nom: "Situations de paiement", desc: "Décomptes, retenue, acomptes" },
  { href: "/chantiers", icon: <Box className="h-5 w-5" />, nom: "Modélisation 3D", desc: "L'ouvrage en trois dimensions" },
  { href: "/bpu", icon: <BookOpen className="h-5 w-5" />, nom: "Base de prix (BPU)", desc: "Prix unitaires de votre entreprise" },
  { href: "/referentiel", icon: <FileText className="h-5 w-5" />, nom: "Référentiel de prix", desc: "Base de prix de la Côte d'Ivoire" },
  { href: "/calculateurs/devis", icon: <Calculator className="h-5 w-5" />, nom: "Calcul de devis", desc: "Estimation du coût des ouvrages" },
  { href: "/calculateurs/mur", icon: <Ruler className="h-5 w-5" />, nom: "Calcul de murs", desc: "Surface, matériaux, coût" },
  { href: "/fournisseurs", icon: <Users className="h-5 w-5" />, nom: "Fournisseurs", desc: "Contacts, NIF, RCCM" },
  { href: "/rapports", icon: <Printer className="h-5 w-5" />, nom: "Rapports", desc: "Documents pour les réunions" },
  { href: "/export", icon: <Download className="h-5 w-5" />, nom: "Export Excel", desc: "Fichiers CSV pour le bureau" },
  { href: "/alertes", icon: <Bell className="h-5 w-5" />, nom: "Centre d'alertes", desc: "Tout ce qui demande votre attention" },
  { href: "/compte", icon: <User className="h-5 w-5" />, nom: "Mon compte", desc: "Vos coordonnées et votre profil" },
  { href: "/demo", icon: <Film className="h-5 w-5" />, nom: "Démo 30 s", desc: "Trois vidéos pour présenter l'application" },
  { href: "/exigences", icon: <ListChecks className="h-5 w-5" />, nom: "Exigences", desc: "La couverture du cahier des charges" },
];

export default function AidePage() {
  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow="Assistance"
        title="Aide & prise en main"
        description="L'essentiel pour démarrer et bien utiliser BTP Suivi Pro."
        icon={<LifeBuoy className="h-5 w-5" />}
      />

      {/* Démarrage rapide */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-foreground">Démarrage rapide</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ETAPES.map((etape, index) => (
            <div
              key={etape.titre}
              className="anim-fade-up h-full rounded-2xl border border-border/70 bg-surface p-5 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-3 font-semibold text-foreground">{etape.titre}</p>
              <p className="mt-1 text-sm text-muted">{etape.texte}</p>
              <Link
                href={etape.href}
                className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
              >
                {etape.lien}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Les modules */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-foreground">Les modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MODULES.map((module) => (
            <Link
              key={module.nom}
              href={module.href}
              className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                {module.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{module.nom}</span>
                <span className="mt-0.5 block text-xs text-muted">{module.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Hors connexion + bon à savoir */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            Mode hors connexion
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              Chaque saisie hors réseau rejoint une <strong className="text-foreground">file locale</strong> et
              part automatiquement dès le retour de la connexion.
            </li>
            <li>
              Les <strong className="text-foreground">photos</strong> du journal et des bons de livraison sont
              conservées sur l&apos;appareil : elles partent elles aussi automatiquement.
            </li>
            <li>
              Les écrans déjà consultés (accueil, alertes, livraisons) restent <strong className="text-foreground">
                lisibles sans réseau
              </strong>
              , avec un bandeau orange qui indique l&apos;heure de la copie.
            </li>
            <li>
              La <strong className="text-foreground">pastille orange</strong> en bas à droite indique le nombre
              d&apos;actions encore en attente.
            </li>
            <li>
              Installez l&apos;application depuis la bannière de l&apos;accueil pour l&apos;avoir sur
              l&apos;écran d&apos;accueil, en plein écran et avec les pages déjà consultées disponibles.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary-deep" aria-hidden />
            Bon à savoir
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <strong className="text-foreground">Ctrl+K</strong> (ou ⌘K sur Mac) ouvre la recherche globale :
              tapez le nom d&apos;un chantier pour y sauter directement ; les flèches haut/bas parcourent les
              résultats, Entrée ouvre, Échap ferme.
            </li>
            <li>
              La <strong className="text-foreground">cloche</strong> en haut de l&apos;écran regroupe tout ce qui
              demande votre attention sur tous vos chantiers (alertes, non-conformités, retards, stocks bas) ;
              l&apos;onglet <strong className="text-foreground">Traités</strong> garde l&apos;historique de ce qui
              a été traité, et un bouton exporte la liste en CSV.
            </li>
            <li>
              Dans un journal, <strong className="text-foreground">Imprimer le PV</strong> sort un procès-verbal
              A4 prêt à signer ; <strong className="text-foreground">Copier le texte</strong> met le journal au
              format message pour l&apos;envoyer par WhatsApp.
            </li>
            <li>
              L&apos;icône <strong className="text-foreground">contraste</strong> (en haut, à côté du thème)
              active le <strong className="text-foreground">mode terrain</strong> : textes plus grands et
              contrastes renforcés, pour lire l&apos;écran en plein soleil.
            </li>
            <li>
              Le journal a trois états : <strong className="text-foreground">brouillon</strong> (modifiable),{" "}
              <strong className="text-foreground">validé</strong> (verrouillé), puis{" "}
              <strong className="text-foreground">rouvert</strong> pour corriger une erreur.
            </li>
            <li>Un essai hors tolérance crée automatiquement une fiche de non-conformité.</li>
            <li>Montants en FCFA sans décimale ; dates au format JJ/MM/AAAA.</li>
            <li>Les seuils d&apos;alerte de stock se règlent chantier par chantier.</li>
            <li>
              Renseignez vos coordonnées dans <strong className="text-foreground">Mon compte</strong> (en bas du
              menu) : elles apparaissent dans les équipes de chantier et sur les procès-verbaux.
            </li>
            <li>
              <strong className="text-foreground">Mon entreprise</strong> (menu latéral) enregistre votre logo et vos
              coordonnées : ils s&apos;impriment en tête des rapports et des fiches de chantier. C&apos;est aussi là
              que se règlent les <strong className="text-foreground">destinataires par défaut</strong> des rapports.
            </li>
            <li>
              Depuis <strong className="text-foreground">Rapports</strong>, le bouton « Envoyer par e-mail » prépare le
              rapport en un fichier unique (logo compris) et ouvre votre messagerie ; les chiffres clés sont repris
              dans le message, pour les lire sans ouvrir la pièce jointe.
            </li>
            <li>
              La <strong className="text-foreground">check-list sécurité</strong> se remplit chaque matin dans
              l&apos;écran Sécurité (EPI, échauffement, signalisation, extincteur) : elle donne le taux de conformité et
              le nombre de jours consécutifs de check-list complète.
            </li>
            <li>
              Le bouton <strong className="text-foreground">micro</strong> à côté des observations du journal dicte
              votre texte (il s&apos;ajoute à ce qui est déjà écrit).
            </li>
            <li>
              Dans <strong className="text-foreground">Fournisseurs</strong>, « Demander un devis » prépare le
              message pour le fournisseur ; sa réponse se saisit ensuite dans « Conditions tarifaires », où les offres
              se comparent poste par poste et le choix retenu est motivé.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
