"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function signUp() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Compte cree. Verifiez votre boite mail si une confirmation est demandee.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-semibold">BTP Suivi Pro</h1>
        <p className="mb-6 text-sm text-zinc-600">Connexion</p>
        <label className="block text-sm font-medium">E-mail</label>
        <input
          className="mb-4 w-full rounded border p-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="block text-sm font-medium">Mot de passe</label>
        <input
          className="mb-4 w-full rounded border p-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {message && <p className="mb-4 text-sm text-red-600">{message}</p>}
        <div className="flex gap-3">
          <button
            className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={signIn}
            disabled={loading}
          >
            Se connecter
          </button>
          <button
            className="rounded border px-4 py-2 disabled:opacity-50"
            onClick={signUp}
            disabled={loading}
          >
            Creer un compte
          </button>
        </div>
      </div>
    </div>
  );
}