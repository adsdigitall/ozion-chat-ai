"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthStore } from "@/lib/stores/auth";

export default function ForgotPasswordPage() {
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await resetPassword(email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage("Enviamos as instruções de recuperação para o seu e-mail.");
  }

  return (
    <AuthShell
      eyebrow="Acesso seguro"
      title="Recupere sua senha da Ozion."
      description="Informe o e-mail cadastrado e enviaremos um link seguro para redefinir o acesso."
    >
      {error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}

      <form onSubmit={handleReset} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-700">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="h-14 w-full rounded-xl border border-zinc-200 bg-white px-12 text-base font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              <Send className="h-5 w-5" />
              Enviar recuperação
            </>
          )}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para login
      </Link>
    </AuthShell>
  );
}
