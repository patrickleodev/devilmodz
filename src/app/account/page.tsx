"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function AccountPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-300">
          Carregando conta...
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
            Área da conta
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            Entre para gerenciar sua conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Faça login com Discord para ver seus dados e acessar as opções da conta.
          </p>
          <button
            onClick={() => signIn("discord", { callbackUrl: "/account" })}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110"
          >
            Entrar com Discord
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-10 sm:px-6 lg:px-10">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "Perfil"}
                className="h-20 w-20 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-semibold text-white">
                {(session.user.name || "D").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Minha conta
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                {session.user.name || "Usuário"}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {session.user.email || "Sem email associado"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ir para o carrinho
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center justify-center rounded-2xl bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
            >
              Sair da conta
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">ID do usuário</p>
            <p className="mt-2 break-all text-sm text-slate-400">
              {(session.user as { id?: string }).id || "Não disponível"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">Status</p>
            <p className="mt-2 text-sm text-slate-400">Sessão ativa com Discord.</p>
          </div>
        </div>
      </section>
    </main>
  );
}