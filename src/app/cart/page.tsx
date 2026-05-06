"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function CartPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load cart");
      setItems(payload.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchCart();
  }, [session]);

  const handleAdd = async (productId: string) => {
    if (!session) return signIn("discord", { callbackUrl: "/cart" });
    await fetch("/api/cart", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }), headers: { "Content-Type": "application/json" } });
    fetchCart();
  };

  const handleRemove = async (itemId: string) => {
    await fetch("/api/cart", { method: "DELETE", body: JSON.stringify({ itemId }), headers: { "Content-Type": "application/json" } });
    fetchCart();
  };

  const handleClearCart = async () => {
    if (!session) return signIn("discord", { callbackUrl: "/cart" });
    await fetch("/api/cart", {
      method: "DELETE",
      body: JSON.stringify({ clearAll: true }),
      headers: { "Content-Type": "application/json" },
    });
    fetchCart();
  };

  const handleCheckout = async () => {
    if (!session) return signIn("discord", { callbackUrl: "/cart" });
    setLoading(true);
    try {
      const res = await fetch("/api/cart/checkout", { method: "POST" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Checkout failed");
      const url = payload.paymentUrl || payload.initPoint || payload.sandboxInitPoint;
      if (!url) throw new Error("No payment url returned");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
        <h1 className="mb-4 text-2xl font-bold">Carrinho</h1>
        {!session ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p>Faça login com Discord para acessar seu carrinho.</p>
            <button onClick={() => signIn("discord", { callbackUrl: "/cart" })} className="mt-3 w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 sm:w-auto">Entrar</button>
          </div>
        ) : null}

        {error ? <div className="mt-4 text-red-500">{error}</div> : null}

        <div className="mt-6 space-y-4">
          {loading ? <div>Carregando...</div> : null}
          {items.length === 0 && !loading ? <div>Seu carrinho está vazio.</div> : null}
          {items.map((it) => (
            <div key={it.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="break-words font-medium">{it.product?.title || it.productId}</div>
                <div className="text-sm text-slate-400">Quantidade: {it.quantity}</div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <button onClick={() => handleRemove(it.id)} className="w-full rounded-2xl bg-rose-500 px-3 py-2 text-white sm:w-auto">Remover</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={handleCheckout} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 sm:w-auto">Finalizar compra</button>
          <button onClick={handleClearCart} className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-semibold text-rose-100 transition hover:bg-rose-500/20 sm:w-auto">Limpar carrinho</button>
        </div>
      </div>
    </main>
  );
}
