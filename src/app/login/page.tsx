"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Construction } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getLangue, traduireErreur } from "@/lib/i18n";

type Mode = "email" | "telephone";

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
    <div className="flex min-h-screen bg-background">
      {/* Partie visuelle : bleu nuit avec dégradé */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-primary md:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/40 via-primary/60 to-primary" />
        <div className="bg-grid absolute inset-0 opacity-30" aria-hidden />
        <IllustrationChantier />
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
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep text-white shadow-lg shadow-primary/25">
                <Construction className="h-6 w-6" />
              </span>
              <span className="text-2xl font-bold tracking-tight text-foreground">BTP Suivi Pro</span>
            </div>
            <p className="text-sm text-muted">
              {langue === "fr" ? "Gestion et suivi de chantiers" : "Site management and tracking"}
            </p>
          </div>

          <Card variant="elevated" padding="lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground md:text-2xl">
                  {signup ? t("title_signup") : t("title_signin")}
                </h2>
                <p className="text-sm text-muted">{signup ? t("subtitle_signup") : t("subtitle_signin")}</p>
              </div>
              {!signup && (
                <div className="flex gap-1 rounded-xl border border-border/80 bg-surface-2 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("email");
                      setMessage(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      mode === "email"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {t("email")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("telephone");
                      setMessage(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      mode === "telephone"
                        ? "bg-primary text-white shadow-sm"
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
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">{t("telephone")}</label>
                    <input
                      className="w-full rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                      type="tel"
                      value={telInscription}
                      onChange={(e) => setTelInscription(e.target.value)}
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
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t("password")}</label>
                <input
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {!signup && mode === "email" && (
                <div className="text-right">
                  <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-primary hover:underline">
                    {t("forgot_password")}
                  </Link>
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                  {message}
                </div>
              )}

              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? t("waiting") : signup ? t("signup_btn") : t("signin")}
              </Button>
            </form>

            {!signup && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-center text-sm text-muted">
                  {t("no_account")} &nbsp;
                  <button
                    type="button"
                    onClick={() => {
                      setSignup(true);
                      setMessage(null);
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("create_account")}
                  </button>
                </p>
              </div>
            )}
            {signup && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-center text-sm text-muted">
                  {t("has_account")} &nbsp;
                  <button
                    type="button"
                    onClick={() => {
                      setSignup(false);
                      setMessage(null);
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("signin")}
                  </button>
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
