"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type CartItem = any;

export default function CartSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
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
    if (open && session) fetchCart();
  }, [open, session]);

  const handleRemove = async (itemId: string) => {
    await fetch("/api/cart", { method: "DELETE", body: JSON.stringify({ itemId }), headers: { "Content-Type": "application/json" } });
    fetchCart();
  };

  const handleClearCart = async () => {
    if (!session) return signIn("discord");
    await fetch("/api/cart", { method: "DELETE", body: JSON.stringify({ clearAll: true }), headers: { "Content-Type": "application/json" } });
    fetchCart();
  };

  const handleCheckout = async () => {
    if (!session) return signIn("discord");
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <aside className="ml-auto w-full max-w-md bg-slate-950/95 backdrop-blur border-l border-white/10 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Carrinho</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">✕</button>
        </div>

        {!session ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p>Faça login com Discord para acessar seu carrinho.</p>
            <button onClick={() => signIn("discord")} className="mt-3 w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">Entrar</button>
          </div>
        ) : null}

        {error ? <div className="mt-4 text-red-500">{error}</div> : null}

        <div className="mt-6 space-y-4">
          {loading ? <div>Carregando...</div> : null}
          {items.length === 0 && !loading ? <div>Seu carrinho está vazio.</div> : null}
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{it.product?.title || it.productId}</div>
                <div className="text-sm text-slate-400">Quantidade: {it.quantity}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRemove(it.id)} className="rounded-2xl bg-rose-500 px-3 py-2 text-white">Remover</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button onClick={handleCheckout} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">Finalizar compra</button>
          <button onClick={handleClearCart} className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-semibold text-rose-100">Limpar carrinho</button>
        </div>
      </aside>
    </div>
  );
}
