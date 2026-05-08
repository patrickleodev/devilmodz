"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

type AccountOrder = {
  id: string;
  status: string;
  amount: number;
  createdAt: string;
  productId: string;
  discordThreadUrl?: string | null;
  product?: {
    id?: string;
    title?: string;
    name?: string;
  } | null;
  payment?: {
    status?: string;
    provider?: string;
  } | null;
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const money = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
    []
  );

  useEffect(() => {
    if (!session?.user) return;

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError(null);

      try {
        const response = await fetch("/api/orders");
        const payload = (await response.json()) as { orders?: AccountOrder[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Não foi possível carregar seu histórico");
        }

        setOrders(payload.orders || []);
      } catch (error) {
        setOrdersError(error instanceof Error ? error.message : "Erro ao carregar histórico");
      } finally {
        setOrdersLoading(false);
      }
    };

    void loadOrders();
  }, [session?.user]);

  const openTicket = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/ticket/open`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao abrir ticket");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, discordThreadUrl: body.threadUrl } : o)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao abrir ticket");
    }
  };

  const closeTicket = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/ticket/close`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao fechar ticket");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, discordThreadUrl: undefined } : o)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao fechar ticket");
    }
  };

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-300">
          Carregando conta...
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
            Área da conta
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            Entre para gerenciar sua conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Faça login com Discord para ver seus dados e acessar as opções da conta.
          </p>
          <button
            onClick={() => signIn("discord", { callbackUrl: "/account" })}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110"
          >
            Entrar com Discord
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-10 sm:px-6 lg:px-10">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "Perfil"}
                className="h-20 w-20 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-semibold text-white">
                {(session.user.name || "D").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Minha conta
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                {session.user.name || "Usuário"}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {session.user.email || "Sem email associado"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ir para o carrinho
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center justify-center rounded-2xl bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
            >
              Sair da conta
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">ID do usuário</p>
            <p className="mt-2 break-all text-sm text-slate-400">
              {(session.user as { id?: string }).id || "Não disponível"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">Status</p>
            <p className="mt-2 text-sm text-slate-400">Sessão ativa com Discord.</p>
          </div>
        </div>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 md:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Histórico</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Compras recentes</h2>
            </div>
            <p className="text-sm text-slate-400">Pedidos e tickets criados automaticamente após a confirmação.</p>
          </div>

          <div className="mt-6 space-y-4">
            {ordersLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Carregando histórico...
              </div>
            ) : ordersError ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {ordersError}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Nenhuma compra encontrada ainda.
              </div>
            ) : (
              orders.map((order) => {
                const productTitle = order.product?.title || order.product?.name || order.productId;
                const paymentStatus = order.payment?.status || "pending";

                return (
                  <article key={order.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pedido {order.id.slice(0, 8)}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{productTitle}</h3>
                        <p className="mt-1 text-sm text-slate-400">Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                          Pedido {order.status}
                        </span>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                          Pagamento {paymentStatus}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white">
                          {money.format(order.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href={`/payment/result?orderId=${order.id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                      >
                        Acompanhar pedido
                      </Link>
                      {order.discordThreadUrl ? (
                        <a
                          href={order.discordThreadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          Abrir ticket no Discord
                        </a>
                      ) : order.status === "completed" ? (
                        <>
                          <button
                            onClick={() => openTicket(order.id)}
                            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                          >
                            Abrir ticket
                          </button>
                          <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
                            Ticket automático em processamento
                          </span>
                        </>
                      ) : null}
                      {order.discordThreadUrl ? (
                        <button
                          onClick={() => closeTicket(order.id)}
                          className="ml-2 inline-flex items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                        >
                          Fechar ticket
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}