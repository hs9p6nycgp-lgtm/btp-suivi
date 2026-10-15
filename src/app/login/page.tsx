"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "telephone">("email");
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
      setMessage(error.message);
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
      setMessage(error.message);
      return;
    }
    setMessage("Compte cree. Verifiez votre boite mail si une confirmation est demandee.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md card p-6">
        <h1 className="mb-2 text-2xl font-semibold">BTP Suivi Pro</h1>
        <p className="mb-6 text-sm text-zinc-600">
          {signup ? "Creation de compte" : "Connexion"}
        </p>

        {!signup && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              className={`rounded px-3 py-1 text-sm ${
                mode === "email" ? "bg-orange-600 text-white" : "border"
              }`}
              onClick={() => setMode("email")}
            >
              E-mail
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1 text-sm ${
                mode === "telephone" ? "bg-orange-600 text-white" : "border"
              }`}
              onClick={() => setMode("telephone")}
            >
              Telephone
            </button>
          </div>
        )}

        <form
          onSubmit={signup ? handleSignUp : handleSignIn}
          className="space-y-4"
        >
          {signup ? (
            <>
              <div>
                <label className="block text-sm font-medium">Nom</label>
                <input
                  className="w-full rounded border p-2"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">E-mail *</label>
                <input
                  className="w-full rounded border p-2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Telephone</label>
                <input
                  className="w-full rounded border p-2"
                  value={telInscription}
                  onChange={(e) => setTelInscription(e.target.value)}
                />
              </div>
            </>
          ) : mode === "email" ? (
            <div>
              <label className="block text-sm font-medium">E-mail</label>
              <input
                className="w-full rounded border p-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium">Telephone</label>
              <input
                className="w-full rounded border p-2"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Mot de passe</label>
            <input
              className="w-full rounded border p-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!signup && mode === "email" && (
            <div className="text-sm">
              <Link href="/mot-de-passe-oublie" className="text-orange-600">
                Mot de passe oublie ?
              </Link>
            </div>
          )}

          {message && <p className="text-sm text-red-600">{message}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading
                ? "Veuillez patienter..."
                : signup
                  ? "Creer le compte"
                  : "Se connecter"}
            </button>
            <button
              type="button"
              className="rounded border px-4 py-2 disabled:opacity-50"
              onClick={() => {
                setSignup(!signup);
                setMessage(null);
              }}
              disabled={loading}
            >
              {signup ? "J'ai deja un compte" : "Creer un compte"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-zinc-500">
          Note : la connexion par telephone necessite l&apos;activation du
          fournisseur SMS dans Supabase. La reinitialisation par e-mail
          requiert la configuration SMTP du projet.
        </p>
      </div>
    </div>
  );
}