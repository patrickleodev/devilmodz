"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import type { StoreProduct } from "@/lib/catalog";

export default function PlanosPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(session?.user);
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch("/api/products");
        const payload = (await response.json()) as { products?: StoreProduct[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Falha ao carregar planos");
        }

        setProducts(payload.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado ao carregar planos");
      } finally {
        setLoadingProducts(false);
      }
    };

    void loadProducts();
  }, []);

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

      // Notify the header to pulse the cart icon
      try {
        window.dispatchEvent(new Event("cart_notify"));
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      <section className="py-2 md:py-4">
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

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {loadingProducts ? (
          <p className="text-sm text-slate-400">Carregando planos...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum plano disponivel no momento.</p>
        ) : (
          products.map((product) => (
            <article
              key={product.id}
              className="group flex h-full flex-col rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-cyan-950/20"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                  {product.badge}
                </span>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{product.slug}</span>
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
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">A partir de</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{money.format(product.price)}</p>
                  </div>
                  <button
                    disabled={pendingId === product.id}
                    onClick={() => handleAddToCart(product.id)}
                    className="inline-flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingId === product.id ? "Adicionando..." : isAuthenticated ? "Comprar agora" : "Entrar e comprar"}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <div className="flex justify-center">
        <Link
          href="/planos-personalizados"
          className="inline-flex items-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-3 font-semibold text-slate-950 shadow-lg transition hover:brightness-110"
        >
          🎨 Personalizar plano
        </Link>
      </div>

    </main>
  );
}
