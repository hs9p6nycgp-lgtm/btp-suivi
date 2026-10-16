"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getLangue, traduireErreur } from "@/lib/i18n";

type Mode = "email" | "telephone";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🏗️</span>
            <span className="text-2xl font-bold text-slate-900">BTP Suivi Pro</span>
          </div>
          <p className="text-sm text-slate-500">
            {langue === "fr" ? "Gestion et suivi de chantiers" : "Site management and tracking"}
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{signup ? t("title_signup") : t("title_signin")}</h2>
              <p className="text-sm text-slate-500">{signup ? t("subtitle_signup") : t("subtitle_signin")}</p>
            </div>
            {!signup && (
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setMode("email");
                    setMessage(null);
                  }}
                  className={`text-sm font-medium rounded-lg px-3 py-1.5 transition-colors ${mode === "email" ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {t("email")}
                </button>
                <button
                  onClick={() => {
                    setMode("telephone");
                    setMessage(null);
                  }}
                  className={`text-sm font-medium rounded-lg px-3 py-1.5 transition-colors ${mode === "telephone" ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("full_name")}</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("email")} *</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("telephone")}</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    value={telInscription}
                    onChange={(e) => setTelInscription(e.target.value)}
                  />
                </div>
              </>
            ) : mode === "email" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("email")}</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("telephone")}</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("password")}</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {!signup && mode === "email" && (
              <div className="text-right">
                <Link href="/mot-de-passe-oublie" className="text-sm text-orange-600 hover:underline font-medium">
                  {t("forgot_password")}
                </Link>
              </div>
            )}

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
              {loading ? t("waiting") : signup ? t("signup_btn") : t("signin")}
            </button>
          </form>

          {!signup && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600 text-center">
                {t("no_account")} &nbsp;
                <button onClick={() => { setSignup(true); setMessage(null); }} className="text-orange-600 font-semibold hover:underline">
                  {t("create_account")}
                </button>
              </p>
            </div>
          )}
          {signup && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600 text-center">
                {t("has_account")} &nbsp;
                <button onClick={() => { setSignup(false); setMessage(null); }} className="text-orange-600 font-semibold hover:underline">
                  {t("signin")}
                </button>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}