"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { products } from "@/lib/products";

export default function PlanosPage() {
  const { data: session, status } = useSession();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(session?.user);
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const sessionLabel = useMemo(() => {
    if (status === "loading") return "Verificando sessão...";
    if (session?.user?.name) return `Olá, ${session.user.name}`;
    if (isAuthenticated) return "Sessão ativa";
    return "Entre para comprar";
  }, [isAuthenticated, session?.user?.name, status]);

  const handleAddToCart = async (productId: string) => {
    setError(null);

    if (!isAuthenticated) {
      await signIn("discord", { callbackUrl: "/planos" });
      return;
    }

    try {
      setPendingId(productId);
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao adicionar ao carrinho");

      // Open cart sidebar so user sees the item
      try {
        window.dispatchEvent(new Event("open_cart"));
      } catch (e) {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      <div className="flex justify-end mb-4">
        <Link
          href="/planos-personalizados"
          className="inline-flex items-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-3 font-semibold text-slate-950 shadow-lg hover:brightness-110"
        >
          🎨 Personalizar plano
        </Link>
      </div>
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur md:p-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              Planos da loja
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Escolha o plano ideal para sua upagem.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Veja os pacotes disponíveis, entre com Discord e siga direto para o checkout pelo InfinitePay.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-300 shadow-lg shadow-black/20 lg:max-w-sm">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Status da conta</p>
            <p className="mt-2 text-lg font-medium text-white">{sessionLabel}</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
              {isAuthenticated
                ? "Sua sessão está ativa. Escolha um plano e finalize o pagamento quando quiser."
                : "Faça login com Discord para liberar o checkout e salvar seu pedido."}
            </p>
            {!isAuthenticated ? (
              <button
                onClick={() => signIn("discord", { callbackUrl: "/planos" })}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200"
              >
                Entrar com Discord
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="group flex h-full flex-col rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-cyan-950/20"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                {product.badge}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{product.id}</span>
            </div>

            <h2 className="mt-6 text-2xl font-semibold text-white">{product.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{product.description}</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">A partir de</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{money.format(product.price)}</p>
                </div>
                <button
                  disabled={pendingId === product.id}
                  onClick={() => handleAddToCart(product.id)}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {pendingId === product.id ? "Adicionando..." : isAuthenticated ? "Adicionar ao carrinho" : "Entrar e adicionar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Pagamento", "InfinitePay com checkout pronto por link e redirecionamento imediato."],
          ["Login", "Autenticação com Discord e base pronta para credenciais administrativas."],
          ["Entrega", "Estrutura preparada para integração com Discord.js e logs de execução."],
        ].map(([title, description]) => (
          <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
        >
          Voltar para a home
        </Link>
      </div>
    </main>
  );
}
