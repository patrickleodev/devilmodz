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

    // poll every 5s to refresh status
    const interval = setInterval(() => {
      if (orderId) fetchOrderById(orderId);
      else fetchLatestOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  const statusLabel = useMemo(() => {
    if (!order) return "Nenhum pedido";
    return order.status || order.payment?.status || "pending";
  }, [order]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold text-white">Status do pagamento</h1>
        <p className="mt-3 text-sm text-slate-300">Acompanhe o status do seu pedido abaixo. A página atualiza automaticamente.</p>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div>Carregando...</div>
          ) : error ? (
            <div className="text-rose-400">{error}</div>
          ) : order ? (
            <div>
              <p className="text-sm text-slate-400">Pedido: {order.id}</p>
              <p className="text-sm text-slate-400">Valor: R$ {order.amount}</p>
              <p className="text-sm text-slate-400">Produto: {order.product?.title || order.product?.name || order.productId}</p>
              <p className="mt-4 text-lg font-medium text-white">Status: {statusLabel}</p>
              <p className="text-xs text-slate-500 mt-2">Criado em: {new Date(order.createdAt).toLocaleString()}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/account" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                  Ver histórico de compras
                </Link>
                {order.discordThreadUrl ? (
                  <a
                    href={order.discordThreadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  >
                    Abrir ticket no Discord
                  </a>
                ) : null}
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
