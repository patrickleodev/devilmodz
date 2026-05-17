"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { SiMastercard, SiMercadopago, SiPix, SiVisa } from "react-icons/si";

const paymentMethods = [
  { name: "Mercado Pago", icon: SiMercadopago, className: "text-sky-300" },
  { name: "Pix", icon: SiPix, className: "text-emerald-300" },
  { name: "Visa", icon: SiVisa, className: "text-blue-300" },
  { name: "Mastercard", icon: SiMastercard, className: "text-orange-300" },
];

export default function Home() {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      <section className="mx-auto w-full max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              SERVIÇOS DIGITAIS • ENTREGA RÁPIDA
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Upagem e contas prontas com entrega segura e suporte dedicado
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Suba de nível sem perder tempo — escolha um pacote, adicione ao carrinho e finalize pelo checkout seguro. Atendimento humanizado e garantia anti-ban.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/planos"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-3 font-semibold text-slate-950 shadow-lg"
              >
                Ver planos
              </Link>

              {!isAuthenticated ? (
                <button
                  onClick={() => signIn("discord", { callbackUrl: "/" })}
                  className="mt-2 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white hover:bg-white/10 sm:mt-0"
                >
                  Entrar com Discord
                </button>
              ) : null}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="text-sm text-slate-400">Pagamentos:</span>
              {paymentMethods.map(({ name, icon: Icon, className }) => (
                <span
                  key={name}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white"
                  aria-label={name}
                >
                  <Icon className={`h-5 w-5 ${className}`} aria-hidden="true" />
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="border-l border-white/10 pl-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Planos Populares</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="font-semibold text-white">Pacote Básico</p>
                  <p className="text-sm text-slate-400">Entrega rápida • Suporte via Discord</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">R$19,90</p>
                  <Link href="/planos" className="mt-2 inline-block text-sm text-cyan-300">Ver opções</Link>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="font-semibold text-white">Pacote Pro</p>
                  <p className="text-sm text-slate-400">Até 3 sessões • Prioridade no suporte</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">R$49,90</p>
                  <Link href="/planos" className="mt-2 inline-block text-sm text-cyan-300">Ver opções</Link>
                </div>
              </div>

              <div className="flex items-center justify-between pb-1">
                <div>
                  <p className="font-semibold text-white">Pacote Elite</p>
                  <p className="text-sm text-slate-400">Entrega prioritária • Acompanhamento dedicado</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">R$79,90</p>
                  <Link href="/planos" className="mt-2 inline-block text-sm text-cyan-300">Ver opções</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-12">
        <h2 className="text-2xl font-semibold text-white">Por que escolher a gente</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/6 bg-white/5 p-6">
            <h3 className="font-semibold text-white">100% Seguro</h3>
            <p className="mt-2 text-sm text-slate-300">Métodos privados que minimizam riscos e garantem a segurança.</p>
          </div>
          <div className="rounded-2xl border border-white/6 bg-white/5 p-6">
            <h3 className="font-semibold text-white">Entrega Expressa</h3>
            <p className="mt-2 text-sm text-slate-300">Produtos digitais com entrega automática quando aplicável.</p>
          </div>
          <div className="rounded-2xl border border-white/6 bg-white/5 p-6">
            <h3 className="font-semibold text-white">Suporte Humano</h3>
            <p className="mt-2 text-sm text-slate-300">Equipe pronta para ajudar via Discord e WhatsApp.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-12">
        <h2 className="text-2xl font-semibold text-white">Depoimentos</h2>
        <div className="mt-6 space-y-4">
          <blockquote className="rounded-2xl border border-white/6 bg-white/5 p-6">
            <p className="text-slate-300">&quot;Atendimento top e entrega rápida. Recomendo 100%&quot;</p>
            <footer className="mt-3 text-sm text-slate-400">— Cliente satisfeito</footer>
          </blockquote>
        </div>
      </section>

      
    </main>
  );
}
