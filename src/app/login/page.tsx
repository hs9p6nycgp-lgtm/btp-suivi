"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getLangue, traduireErreur } from "@/lib/i18n";

type Mode = "email" | "telephone";

// Clés de mémorisation locale : le mode choisi et le dernier identifiant saisi
const CLE_MODE = "btp.connexion.mode";
const CLE_IDENTIFIANT = "btp.connexion.identifiant";

// Illustration décorative d'un chantier (monochrome, fond bleu nuit)
function IllustrationChantier() {
  return (
    <svg viewBox="0 0 480 320" className="h-full w-full" role="img" aria-label="Chantier">
      <defs>
        <linearGradient id="theme-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b6ea5" />
          <stop offset="100%" stopColor="#0f2a4a" />
        </linearGradient>
      </defs>
      <rect width="480" height="320" fill="url(#theme-gradient)" />
      {/* Sol */}
      <rect y="230" width="480" height="90" fill="#0f2a4a" opacity="0.55" />
      {/* Bâtiment en construction */}
      <g stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="60" y="120" width="90" height="120" />
        <rect x="165" y="70" width="110" height="170" />
        <rect x="290" y="140" width="80" height="100" />
        <line x1="60" y1="180" x2="150" y2="180" />
        <line x1="60" y1="220" x2="150" y2="220" />
        <line x1="180" y1="120" x2="180" y2="290" />
        <line x1="235" y1="120" x2="235" y2="290" />
        <line x1="295" y1="170" x2="375" y2="170" />
        <line x1="295" y1="210" x2="375" y2="210" />
        <path d="M60 290 L150 290 L150 240 L60 240 Z" fill="#ffffff" opacity="0.15" />
        <path d="M290 240 L375 240 L375 290 L290 290 Z" fill="#ffffff" opacity="0.15" />
      </g>
      {/* Tours de chantier */}
      <g stroke="#f97316" strokeWidth="4" fill="none" strokeLinecap="round">
        <line x1="400" y1="40" x2="400" y2="90" />
        <line x1="415" y1="40" x2="415" y2="90" />
        <line x1="400" y1="40" x2="415" y2="40" />
        <line x1="400" y1="90" x2="415" y2="90" />
        <path d="M395 100 L415 100 L415 130" />
      </g>
      {/* Engins */}
      <g fill="#f97316" opacity="0.9">
        <rect x="40" y="180" width="26" height="16" rx="3" />
        <circle cx="48" cy="196" r="5" />
        <circle cx="48" cy="196" r="2" fill="#0f2a4a" />
      </g>
      {/* Sols et axes */}
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="8 8">
        <line x1="20" y1="250" x2="460" y2="250" />
        <line x1="20" y1="280" x2="460" y2="280" />
        <line x1="20" y1="310" x2="460" y2="310" />
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const langue = getLangue();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [telInscription, setTelInscription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signup, setSignup] = useState(false);
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);
  const [connexionLente, setConnexionLente] = useState(false);

  // Si la connexion dépasse 8 secondes, on rassure l'utilisateur : le réseau
  // est lent mais l'application travaille toujours (pas besoin de recliquer).
  useEffect(() => {
    if (!loading) {
      setConnexionLente(false);
      return;
    }
    const minuteur = setTimeout(() => setConnexionLente(true), 8000);
    return () => clearTimeout(minuteur);
  }, [loading]);

  // Retrouve le mode de connexion utilisé la dernière fois sur cet appareil
  // (e-mail ou téléphone) et surveille l'état du réseau.
  useEffect(() => {
    try {
      const modeSauve = localStorage.getItem(CLE_MODE) as Mode | null;
      if (modeSauve === "email" || modeSauve === "telephone") setMode(modeSauve);
      const identifiantSauve = localStorage.getItem(CLE_IDENTIFIANT);
      if (identifiantSauve) {
        if (modeSauve === "telephone") setTelephone(identifiantSauve);
        else setEmail(identifiantSauve);
      }
    } catch {
      // stockage indisponible : on ignore
    }
    const majReseau = () => setHorsLigne(!navigator.onLine);
    majReseau();
    window.addEventListener("online", majReseau);
    window.addEventListener("offline", majReseau);
    return () => {
      window.removeEventListener("online", majReseau);
      window.removeEventListener("offline", majReseau);
    };
  }, []);

  // Change de mode (e-mail / téléphone) et le mémorise pour la prochaine fois
  function choisirMode(nouveau: Mode) {
    setMode(nouveau);
    setMessage(null);
    try {
      localStorage.setItem(CLE_MODE, nouveau);
    } catch {
      // stockage indisponible : on ignore
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } =
      mode === "email"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signInWithPassword({ phone: telephone, password });

    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    try {
      localStorage.setItem(CLE_IDENTIFIANT, mode === "email" ? email : telephone);
    } catch {
      // stockage indisponible : on ignore
    }
    router.replace("/");
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom, telephone: telInscription },
      },
    });
    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setMessage(
      langue === "fr"
        ? "Compte créé. Vérifiez votre boîte mail si une confirmation est demandée."
        : "Account created. Check your inbox if confirmation is required.",
    );
  }

  const t = (key: string) => {
    const labels: Record<string, { fr: string; en: string }> = {
      title_signin: { fr: "Connexion", en: "Sign In" },
      title_signup: { fr: "Création de compte", en: "Create Account" },
      subtitle_signin: { fr: "Bienvenue de retour.", en: "Welcome back." },
      subtitle_signup: { fr: "Rejoignez votre équipe de chantier.", en: "Join your construction team." },
      email: { fr: "E-mail", en: "Email" },
      telephone: { fr: "Téléphone", en: "Phone" },
      password: { fr: "Mot de passe", en: "Password" },
      full_name: { fr: "Nom complet", en: "Full Name" },
      forgot_password: { fr: "Mot de passe oublié ?", en: "Forgot password?" },
      no_account: { fr: "Pas encore de compte ?", en: "Don't have an account?" },
      has_account: { fr: "Vous avez déjà un compte ?", en: "Already have an account?" },
      create_account: { fr: "Créer un compte", en: "Create an account" },
      signin: { fr: "Se connecter", en: "Sign In" },
      signup_btn: { fr: "Créer le compte", en: "Create Account" },
      waiting: { fr: "Veuillez patienter...", en: "Please wait..." },
      account_created: {
        fr: "Compte créé. Vérifiez votre boîte mail si une confirmation est demandée.",
        en: "Account created. Check your inbox if confirmation is required.",
      },
    };
    return labels[key]?.[langue] || key;
  };

  return (
    // Écran partagé : image de chantier à gauche, formulaire à droite
    // (sur les pages de connexion, la coquille de l'application est masquée : voir AppShell)
    <div className="flex min-h-screen bg-background">
      {/* Partie visuelle : bleu nuit avec dégradé */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-primary md:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/40 via-primary/60 to-primary" />
        <div className="bg-grid absolute inset-0 opacity-30" aria-hidden />
        {/* Halos décoratifs animés */}
        <div className="anim-float pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-primary-light/40 blur-3xl" aria-hidden />
        <div className="anim-float anim-delay-3 pointer-events-none absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-action/25 blur-3xl" aria-hidden />
        <IllustrationChantier />
        {/* Marque en haut à gauche */}
        <div className="anim-fade-in absolute left-8 top-8 flex items-center gap-3 text-white">
          <img src="/logo.svg" alt="" className="h-11 w-11 rounded-2xl shadow-lg shadow-black/30" />
          <div className="leading-tight">
            <p className="text-sm font-bold">BTP Suivi Pro</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Suivi Chantiers CI</p>
          </div>
        </div>
        <div className="absolute bottom-8 left-8 right-8 max-w-sm text-white">
          <h2 className="text-2xl font-bold md:text-3xl">
            {langue === "fr" ? "Le chantier, suivi en temps réel" : "Site management in real time"}
          </h2>
          <p className="mt-3 text-sm text-white/80">
            {langue === "fr"
              ? "Suivez planning, coûts, qualité et livraisons de vos chantiers."
              : "Track planning, costs, quality and deliveries of your sites."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Planning", langue === "fr" ? "Coûts" : "Costs", langue === "fr" ? "Qualité" : "Quality", langue === "fr" ? "Livraisons" : "Deliveries"].map((etiquette) => (
              <span
                key={etiquette}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur"
              >
                {etiquette}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex w-full items-center justify-center px-4 py-10 md:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:hidden">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img src="/logo.svg" alt="" className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/25" />
              <span className="text-gradient text-2xl font-bold tracking-tight">BTP Suivi Pro</span>
            </div>
            <p className="text-sm text-muted">
              {langue === "fr" ? "Gestion et suivi de chantiers" : "Site management and tracking"}
            </p>
          </div>

          <Card variant="elevated" padding="lg" className="anim-fade-up">
            <div className="mb-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground md:text-2xl">
                  {signup ? t("title_signup") : t("title_signin")}
                </h2>
                <p className="text-sm text-muted">{signup ? t("subtitle_signup") : t("subtitle_signin")}</p>
              </div>
              {!signup && (
                <div
                  role="group"
                  aria-label={langue === "fr" ? "Choisir le moyen de connexion" : "Choose sign-in method"}
                  className="grid grid-cols-2 gap-1 rounded-xl border border-border/80 bg-surface-2 p-1"
                >
                  <button
                    type="button"
                    onClick={() => choisirMode("email")}
                    className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      mode === "email"
                        ? "bg-gradient-to-br from-primary to-primary-deep text-white shadow-md shadow-primary/25"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {t("email")}
                  </button>
                  <button
                    type="button"
                    onClick={() => choisirMode("telephone")}
                    className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      mode === "telephone"
                        ? "bg-gradient-to-br from-primary to-primary-deep text-white shadow-md shadow-primary/25"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {t("telephone")}
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={signup ? handleSignUp : handleSignIn} className="space-y-4">
              {signup ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">{t("full_name")}</label>
                    <input
                      className="w-full rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">{t("email")} *</label>
                    <input
                      className="w-full rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      required
                    />
                    <p className="mt-1 text-xs text-muted">
                      {langue === "fr"
                        ? "L'inscription se fait par e-mail. Le téléphone sert à vous joindre sur le chantier."
                        : "Sign-up uses an email. The phone number is used to reach you on site."}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">{t("telephone")}</label>
                    <input
                      className="w-full rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                      type="tel"
                      value={telInscription}
                      onChange={(e) => setTelInscription(e.target.value)}
                      placeholder="+225 07 00 00 00 00 00"
                      autoComplete="tel"
                    />
                  </div>
                </>
              ) : mode === "email" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("email")}</label>
                  <input
                    className="w-full rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("telephone")}</label>
                  <input
                    className="w-full rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+225 07 00 00 00 00 00"
                    autoComplete="tel"
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t("password")}</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 pr-11 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                    type={voirMotDePasse ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={signup ? "new-password" : "current-password"}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMotDePasse((v) => !v)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted transition hover:text-foreground"
                    aria-label={
                      voirMotDePasse
                        ? (langue === "fr" ? "Masquer le mot de passe" : "Hide password")
                        : (langue === "fr" ? "Afficher le mot de passe" : "Show password")
                    }
                  >
                    {voirMotDePasse ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!signup && mode === "email" && (
                <div className="text-right">
                  <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-primary hover:underline">
                    {t("forgot_password")}
                  </Link>
                </div>
              )}

              {horsLigne && !signup && (
                <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {langue === "fr"
                      ? "Pas de réseau pour le moment. La connexion a besoin d'Internet : réessayez dès que les barres reviennent."
                      : "No network right now. Sign-in needs Internet: try again as soon as you get signal."}
                  </p>
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">
                  {message}
                </div>
              )}

              <Button type="submit" size="lg" disabled={loading || (horsLigne && !signup)} className="w-full">
                {loading ? t("waiting") : signup ? t("signup_btn") : t("signin")}
              </Button>

              {connexionLente && (
                <p className="text-center text-xs text-muted">
                  {langue === "fr"
                    ? "Le réseau est lent : la connexion continue, inutile de recliquer."
                    : "Slow network: sign-in is still running, no need to tap again."}
                </p>
              )}
            </form>

            {!signup && (
              <div className="mt-6 space-y-3 border-t border-border pt-6">
                <p className="text-center text-sm text-muted">{t("no_account")}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSignup(true);
                    setMessage(null);
                  }}
                >
                  {t("create_account")}
                </Button>
              </div>
            )}
            {signup && (
              <div className="mt-6 space-y-3 border-t border-border pt-6">
                <p className="text-center text-sm text-muted">{t("has_account")}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSignup(false);
                    setMessage(null);
                  }}
                >
                  {t("signin")}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
