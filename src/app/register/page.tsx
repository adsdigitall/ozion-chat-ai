"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthStore } from "@/lib/stores/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.43z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.34l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A9.99 9.99 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 13.98A6.01 6.01 0 0 1 6.08 12c0-.69.12-1.36.32-1.98V7.43H3.06A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.06 4.57l3.34-2.59z" />
      <path fill="#EA4335" d="M12 5.9c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.96 2.91 14.7 2 12 2a9.99 9.99 0 0 0-8.94 5.43l3.34 2.59C7.19 7.66 9.4 5.9 12 5.9z" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signUp(email, password, name);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();

    if (result.error) {
      setGoogleLoading(false);
      setError(result.error);
    }
  };

  return (
    <AuthShell
      eyebrow="Setup instantaneo"
      title="Crie sua conta e comece a vender mais."
      description="Configure seu acesso ao Ozion para conectar atendimento, funis, voz e inteligencia artificial."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white text-base font-bold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
        ) : (
          <GoogleIcon />
        )}
        Criar/entrar com Google
      </button>

      <div className="my-7 flex items-center gap-4 text-sm font-semibold text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200" />
        Ou cadastre com seus dados
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-700">Nome</label>
          <div className="relative">
            <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 w-full rounded-xl border border-zinc-200 bg-white px-12 text-base font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Seu nome"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-700">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 w-full rounded-xl border border-zinc-200 bg-white px-12 text-base font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="seu@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-700">Senha</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-500" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 w-full rounded-xl border border-zinc-200 bg-white px-12 pr-14 text-base font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Digite uma senha segura"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              Criar conta
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm font-semibold text-zinc-500">
        Ja tem conta?{" "}
        <Link className="font-black text-emerald-600 transition hover:text-emerald-700" href="/login">
          Entrar
        </Link>
      </div>
    </AuthShell>
  );
}
