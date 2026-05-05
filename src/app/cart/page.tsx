"use client";

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
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">Carrinho</h1>
      {!session ? (
        <div>
          <p>Faça login com Discord para acessar seu carrinho.</p>
          <button onClick={() => signIn("discord", { callbackUrl: "/cart" })} className="mt-3 rounded bg-cyan-400 px-4 py-2">Entrar</button>
        </div>
      ) : null}

      {error ? <div className="mt-4 text-red-500">{error}</div> : null}

      <div className="mt-6 space-y-4">
        {loading ? <div>Carregando...</div> : null}
        {items.length === 0 && !loading ? <div>Seu carrinho está vazio.</div> : null}
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded border p-4">
            <div>
              <div className="font-medium">{it.product?.title || it.productId}</div>
              <div className="text-sm text-slate-400">Quantidade: {it.quantity}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleRemove(it.id)} className="rounded bg-rose-500 px-3 py-1 text-white">Remover</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={handleCheckout} className="rounded bg-emerald-400 px-4 py-2 font-semibold">Finalizar compra</button>
        <button onClick={fetchCart} className="rounded border px-4 py-2">Atualizar</button>
      </div>
    </main>
  );
}
