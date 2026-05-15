"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderWithPayment = {
  id: string;
  status: string;
  amount: number;
  productId: string;
  createdAt: string;
  mpPreferenceId?: string;
  discordThreadUrl?: string | null;
  product?: { title?: string; name?: string } | null;
  payment?: { status?: string; provider?: string } | null;
};

export default function PaymentResultClient() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWithPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const fetchLatestOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const body = await res.json();
      const orders: OrderWithPayment[] = body.orders || [];
      if (orders.length === 0) {
        setError("Nenhum pedido encontrado para sua conta.");
        setOrder(null);
      } else {
        setOrder(orders[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar pedido");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderById = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const body = await res.json();
      setOrder(body.order || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar pedido");
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/ticket/open`, { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "Falha ao acessar ticket");
      }

      setOrder((current) => (current ? { ...current, discordThreadUrl: body.threadUrl } : current));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao acessar ticket");
    }
  };

  useEffect(() => {
    // parse orderId from URL on client side
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("orderId");
      setOrderId(id);
    }

    // initial fetch
    if (orderId) {
      fetchOrderById(orderId);
    } else {
      fetchLatestOrder();
    }

    // fetch current user info
    (async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const body = await res.json();
          setUserName(body.user?.name || null);
        }
      } catch (err) {
        // ignore
      }
    })();

    // poll every 5s to refresh status
    const interval = setInterval(() => {
      if (orderId) fetchOrderById(orderId);
      else fetchLatestOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/discord/invite", { method: "POST" });
        if (!res.ok) throw new Error("Failed to load invite link");
        const body = await res.json();
        setInviteUrl(body.inviteUrl || null);
      } catch (err) {
        setInviteError(err instanceof Error ? err.message : "Erro ao carregar convite");
      }
    })();
  }, []);

  const statusLabel = useMemo(() => {
    if (!order) return "Nenhum pedido";
    return order.status || order.payment?.status || "pending";
  }, [order]);

  const money = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
    []
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Pagamento confirmado</p>
        <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Seu acesso já está liberado.</h1>
        <p className="mt-3 text-sm text-slate-300">Entre no servidor do Discord e, quando estiver dentro, clique em "Já entrei" para voltar aos planos.</p>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div>Carregando...</div>
          ) : error ? (
            <div className="text-rose-400">{error}</div>
          ) : order ? (
            <div>
              <p className="text-sm text-slate-400">Pedido: {order.id}</p>
              <p className="text-sm text-slate-400">Valor: {money.format(order.amount)}</p>
              <p className="text-sm text-slate-400">Produto: {order.product?.title || order.product?.name || order.productId}</p>
              <p className="mt-4 text-lg font-medium text-white">Status: {statusLabel}</p>
              {userName ? <p className="text-sm text-slate-400">Discord: {userName}</p> : null}
              <p className="text-xs text-slate-500 mt-2">Criado em: {new Date(order.createdAt).toLocaleString()}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {order.discordThreadUrl ? (
                  <a
                    href={order.discordThreadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  >
                    Acessar ticket no Discord
                  </a>
                ) : order.status === "paid" || order.status === "completed" ? (
                  <button
                    onClick={() => order?.id && openTicket(order.id)}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  >
                    Acessar ticket
                  </button>
                ) : null}
                {inviteUrl ? (
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Entrar no servidor
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                    Carregando convite do servidor...
                  </span>
                )}
                {inviteError ? <div className="text-rose-400">{inviteError}</div> : null}
                <Link
                  href="/planos"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Já entrei
                </Link>
              </div>
            </div>
          ) : (
            <div>Nenhum pedido encontrado.</div>
          )}
        </div>
      </div>
    </main>
  );
}
