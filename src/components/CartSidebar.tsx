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

  return (
    <div className={`fixed inset-0 z-60 flex transition-opacity duration-300 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" onClick={onClose} />

      <aside className={`ml-auto flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 p-6 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Carrinho</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label="Fechar carrinho"
          >
            ✕
          </button>
        </div>

        {!session ? (
          <div className="mt-4">
            <p className="text-slate-300">Faça login com Discord para acessar seu carrinho.</p>
            <button onClick={() => signIn("discord")} className="mt-3 w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">Entrar</button>
          </div>
        ) : null}

        {error ? <div className="mt-4 text-red-500">{error}</div> : null}

        <div className="mt-6 flex h-0 flex-1">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center text-slate-400">Carregando...</div>
          ) : items.length === 0 && session ? (
            <div className="flex h-full w-full items-center justify-center text-slate-400">Seu carrinho está vazio.</div>
          ) : (
            <div className="flex w-full flex-col gap-4">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 pr-3">
                    <div className="truncate font-medium">{it.product?.title || it.productId}</div>
                    <div className="text-sm text-slate-400">Quantidade: {it.quantity}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(it.id)}
                    aria-label="Remover item do carrinho"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/5 text-rose-500 transition hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {session && items.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
            <button onClick={handleCheckout} className="w-full cursor-pointer rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">Finalizar compra</button>
            <button onClick={handleClearCart} className="w-full cursor-pointer bg-transparent px-0 py-0 text-center text-sm font-semibold text-slate-300 transition hover:text-white">Limpar carrinho</button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
