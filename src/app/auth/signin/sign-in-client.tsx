"use client";

import { type FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type SignInClientProps = {
  callbackUrl: string;
};

export default function SignInClient({ callbackUrl }: SignInClientProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"discord" | "credentials" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginWithCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading("credentials");
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      setLoading(null);
      return;
    }

    window.location.href = result?.url || callbackUrl;
  };

  return (
    <div className="mt-8 text-left">
      <form onSubmit={loginWithCredentials} className="grid gap-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="E-mail do admin"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
          required
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
          required
        />
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        <button
          type="submit"
          disabled={loading !== null}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "credentials" ? "Entrando..." : "Entrar como admin"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">ou</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={() => {
          setLoading("discord");
          void signIn("discord", { callbackUrl });
        }}
        disabled={loading !== null}
        className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading === "discord" ? "Conectando..." : "Continuar com Discord"}
      </button>
    </div>
  );
}
