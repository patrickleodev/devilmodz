"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { FiTrash2 } from "react-icons/fi";
import { FaSteam, FaXbox, FaGamepad } from "react-icons/fa";
import { SiRockstargames } from "react-icons/si";

type CartItem = any;

const getCartItemCount = (items: CartItem[]) => {
  return items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
};

const notifyCartCountChanged = (items: CartItem[]) => {
  window.dispatchEvent(new CustomEvent("cart_count_changed", { detail: { count: getCartItemCount(items) } }));
};

export default function CartSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginFormVisible, setLoginFormVisible] = useState(false);
  const [loginDetails, setLoginDetails] = useState({
    platform: "PC",
    version: "enhanced",
    store: "steam",
    storeAccount: "",
    storePassword: "",
    rockstarEmail: "",
    rockstarPassword: "",
  });
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const total = items.reduce(
    (sum, item) => sum + Number(item.product?.price || 0) * Number(item.quantity || 1),
    0
  );

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load cart");
      const nextItems = payload.items || [];
      setItems(nextItems);
      notifyCartCountChanged(nextItems);
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
    setItems([]);
    notifyCartCountChanged([]);
    fetchCart();
  };

  const handleCheckout = async (details?: { account?: string; password?: string; platform?: string }) => {
    if (!session) return signIn("discord");
    setLoading(true);
    try {
      const body = details ? { loginDetails: details } : undefined;
      const res = await fetch("/api/cart/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
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
                    <div className="text-sm text-slate-400">
                      Quantidade: {it.quantity} - {money.format(Number(it.product?.price || 0))}
                      {Number(it.quantity || 1) > 1 ? ` cada - Total ${money.format(Number(it.product?.price || 0) * Number(it.quantity || 1))}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(it.id)}
                    aria-label="Remover item do carrinho"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/5 text-rose-500 transition hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {session && items.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-slate-300">Total</span>
              <span className="text-lg font-semibold text-white">{money.format(total)}</span>
            </div>

            {/* Login details form shown before checkout when required */}
            <>
              <button onClick={() => setLoginFormVisible(true)} className="w-full cursor-pointer rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">Finalizar compra</button>
              <button onClick={handleClearCart} className="w-full cursor-pointer bg-transparent px-0 py-0 text-center text-sm font-semibold text-slate-300 transition hover:text-white">Limpar carrinho</button>
            </>
          </div>
        ) : null}
      </aside>

      {/* Centered modal for login details (separate from the sidebar) */}
      {loginFormVisible && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setLoginFormVisible(false)} />
          <div className="relative z-[90] w-full max-w-3xl rounded-lg bg-slate-950 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white">Informações da conta para o serviço</h3>
            <p className="mt-1 text-sm text-slate-400">Forneça as informações necessárias para que possamos iniciar o serviço.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-300">Versão do jogo</label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    aria-pressed={loginDetails.version === "legacy"}
                    onClick={() => setLoginDetails((s) => ({ ...s, version: "legacy" }))}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition cursor-pointer ${loginDetails.version === "legacy" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-white"}`}
                  >
                    Legacy
                  </button>
                  <button
                    type="button"
                    aria-pressed={loginDetails.version === "enhanced"}
                    onClick={() => setLoginDetails((s) => ({ ...s, version: "enhanced" }))}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition cursor-pointer ${loginDetails.version === "enhanced" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-white"}`}
                  >
                    Enhanced
                  </button>
                </div>
              </div>


              <div>
                <label className="text-xs text-slate-300">Onde você joga</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    aria-pressed={loginDetails.store === "steam"}
                    onClick={() => setLoginDetails((s) => ({ ...s, store: "steam" }))}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${loginDetails.store === "steam" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-white"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FaSteam className="h-4 w-4" />
                      <span>Steam</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={loginDetails.store === "epic"}
                    onClick={() => setLoginDetails((s) => ({ ...s, store: "epic" }))}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${loginDetails.store === "epic" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-white"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FaGamepad className="h-4 w-4" />
                      <span>Epic Games</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={loginDetails.store === "xboxpass"}
                    onClick={() => setLoginDetails((s) => ({ ...s, store: "xboxpass" }))}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${loginDetails.store === "xboxpass" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-white"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FaXbox className="h-4 w-4" />
                      <span>Game Pass</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={loginDetails.store === "rockstar"}
                    onClick={() => setLoginDetails((s) => ({ ...s, store: "rockstar" }))}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${loginDetails.store === "rockstar" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-white"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <SiRockstargames className="h-4 w-4" />
                      <span>Rockstar</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* store-specific credentials */}
              <div>
                {loginDetails.store === "rockstar" ? (
                  <>
                    <label className="text-xs text-slate-300">Email Rockstar</label>
                    <input value={loginDetails.rockstarEmail} onChange={(e) => setLoginDetails((s) => ({ ...s, rockstarEmail: e.target.value }))} className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white" />
                    <label className="mt-2 text-xs text-slate-300">Senha Rockstar</label>
                    <input type="password" value={loginDetails.rockstarPassword} onChange={(e) => setLoginDetails((s) => ({ ...s, rockstarPassword: e.target.value }))} className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white" />
                  </>
                ) : (
                  <>
                    <label className="text-xs text-slate-300">Conta (usuário ou email) - {loginDetails.store}</label>
                    <input value={loginDetails.storeAccount} onChange={(e) => setLoginDetails((s) => ({ ...s, storeAccount: e.target.value }))} className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white" />
                    <label className="mt-2 text-xs text-slate-300">Senha da conta</label>
                    <input type="password" value={loginDetails.storePassword} onChange={(e) => setLoginDetails((s) => ({ ...s, storePassword: e.target.value }))} className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white" />

                    <div className="mt-3">
                      <label className="text-xs text-slate-300">Email Rockstar (necessário para este método)</label>
                      <input value={loginDetails.rockstarEmail} onChange={(e) => setLoginDetails((s) => ({ ...s, rockstarEmail: e.target.value }))} className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white" />
                      <label className="mt-2 text-xs text-slate-300">Senha Rockstar</label>
                      <input type="password" value={loginDetails.rockstarPassword} onChange={(e) => setLoginDetails((s) => ({ ...s, rockstarPassword: e.target.value }))} className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white" />
                    </div>
                  </>
                )}
              </div>

              {/* generic account/password fields removed per request */}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLoginFormVisible(false);
                    handleCheckout(loginDetails);
                  }}
                  className="flex-1 cursor-pointer rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"
                >
                  Confirmar e pagar
                </button>
                <button onClick={() => setLoginFormVisible(false)} className="flex-1 cursor-pointer rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white">Cancelar</button>
              </div>

              <div className="text-xs text-slate-400">Informações de login são enviadas de forma direta ao pedido. Não armazene senhas sensíveis sem criptografia.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
