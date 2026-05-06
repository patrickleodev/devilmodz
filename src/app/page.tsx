"use client";

import Link from "next/link";
import { useMemo } from "react";
import { signIn, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  const isAuthenticated = Boolean(session?.user);

  const sessionLabel = useMemo(() => {
    if (status === "loading") return "Verificando sessão...";
    if (session?.user?.name) return `Olá, ${session.user.name}`;
    if (isAuthenticated) return "Sessão ativa";
    return "Entre para continuar";
  }, [isAuthenticated, session?.user?.name, status]);

  return (
    <main className="flex min-h-screen flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <div className="flex flex-col gap-8 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur md:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                GTA account boosting marketplace
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Upagem premium com checkout seguro e acompanhamento em tempo real.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Acesse a aba de planos para ver os pacotes disponíveis e finalizar o pagamento pelo Mercado Pago.
                O fluxo já está preparado para pedidos, pagamentos e futuras entregas via Discord.
              </p>
            </div>

            <div className="w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-300 shadow-lg shadow-black/20 lg:max-w-sm">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Status da conta</p>
              <p className="mt-2 text-lg font-medium text-white">{sessionLabel}</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                {isAuthenticated
                  ? "Sua sessão está ativa. Veja os planos e siga para o checkout quando quiser."
                  : "Faça login com Discord para liberar o checkout e salvar seu pedido."}
              </p>
              {!isAuthenticated ? (
                <button
                  onClick={() => signIn("discord", { callbackUrl: "/" })}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  Entrar com Discord
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Planos", "Veja os pacotes disponíveis em uma aba separada e escolha com calma."],
              ["Pagamento", "Mercado Pago com fluxo pronto para webhooks e confirmação automática."],
              ["Login", "Autenticação com Discord e base pronta para credenciais administrativas."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/planos"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
