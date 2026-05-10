"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  AccessDenied: "Seu acesso foi negado durante a autenticação.",
  Callback: "Houve um problema ao concluir o retorno do Discord.",
  OAuthCallback: "O Discord não concluiu o login corretamente.",
  OAuthAccountNotLinked: "Esta conta do Discord já está associada a outro login.",
  Configuration: "A configuração de autenticação precisa ser revisada.",
  Default: "Não foi possível entrar no momento.",
};

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error") || "";
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">DEVIL MODZ</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Entrar com Discord</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">{message}</p>

        <button
          type="button"
          onClick={() => signIn("discord", { callbackUrl })}
          className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110"
        >
          Continuar com Discord
        </button>
      </section>
    </main>
  );
}