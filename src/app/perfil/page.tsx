"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

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

const ORDERS_PER_PAGE = 15;

const DEMO_PRODUCTS = [
  { title: "Pacote Starter", amount: 29.9 },
  { title: "Pacote Pro", amount: 59.9 },
  { title: "Pacote Elite", amount: 99.9 },
  { title: "Conta Premium", amount: 149.9 },
];

const buildDemoOrders = (count = 45): AccountOrder[] => {
  const now = new Date();
  const statuses = ["completed", "paid", "processing", "pending"];
  const paymentStatuses = ["paid", "approved", "pending", "pending"];

  // Distribuição pensada para testar os rótulos da timeline:
  // Hoje, Ontem, dias da semana e datas antigas.
  const dayOffsets = [
    0, 0, 0,
    1, 1,
    2, 2,
    3, 3,
    4,
    5,
    6,
    7,
    8,
    10,
    12,
    14,
    18,
    20,
    24,
    28,
    30,
    33,
    37,
    40,
  ];

  const normalizedOffsets = Array.from({ length: count }, (_, index) => dayOffsets[index % dayOffsets.length] + Math.floor(index / dayOffsets.length) * 7);

  return normalizedOffsets.map((dayOffset, index) => {
    const timestamp = new Date(now);
    timestamp.setDate(now.getDate() - dayOffset);
    timestamp.setHours(10 + (index % 8), (index * 7) % 60, 0, 0);

    const product = DEMO_PRODUCTS[index % DEMO_PRODUCTS.length];

    return {
      id: `demo-${String(index + 1).padStart(4, "0")}`,
      status: statuses[index % statuses.length],
      amount: product.amount + (index % 3) * 10,
      createdAt: timestamp.toISOString(),
      productId: `demo-product-${index % DEMO_PRODUCTS.length}`,
      discordThreadUrl: index % 6 === 0 ? `https://discord.com/channels/demo/${index + 1}` : null,
      product: {
        id: `demo-product-${index % DEMO_PRODUCTS.length}`,
        title: product.title,
      },
      payment: {
        status: paymentStatuses[index % paymentStatuses.length],
        provider: "demo",
      },
    };
  });
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const orderId = new URLSearchParams(window.location.search).get("orderId");
    return orderId ? [orderId] : [];
  });
  const isDemoPreviewEnabled = process.env.NODE_ENV !== "production";

  const money = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
    []
  );

  const displayOrders = useMemo(() => {
    const hasRealOrders = orders.length > 0;
    const shouldShowDemo = isDemoPreviewEnabled && (!hasRealOrders || showDemoPreview);

    if (!shouldShowDemo) return orders;

    // Fallback para teste visual da página e paginação
    return buildDemoOrders(45);
  }, [orders, isDemoPreviewEnabled, showDemoPreview]);

  const totalPages = Math.max(1, Math.ceil(displayOrders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageOrders = displayOrders.slice((safePage - 1) * ORDERS_PER_PAGE, safePage * ORDERS_PER_PAGE);

  useEffect(() => {
    if (!session?.user) return;

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError(null);

      try {
        const response = await fetch("/api/orders");
        const payload = (await response.json()) as { orders?: AccountOrder[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Não foi possível carregar seus pedidos");
        }

        setOrders(payload.orders || []);
      } catch (error) {
        setOrdersError(error instanceof Error ? error.message : "Erro ao carregar pedidos");
      } finally {
        setOrdersLoading(false);
      }
    };

    void loadOrders();
  }, [session?.user]);

  useEffect(() => {
    if (expandedOrderIds.length) {
      const orderIndex = displayOrders.findIndex((order) => expandedOrderIds.includes(order.id));
      if (orderIndex >= 0) {
        setPage(Math.floor(orderIndex / ORDERS_PER_PAGE) + 1);
        return;
      }
    }

    setPage(1);
  }, [session?.user, displayOrders, expandedOrderIds, showDemoPreview]);

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
        <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
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
            onClick={() => signIn("discord", { callbackUrl: "/perfil" })}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110"
          >
            Entrar com Discord
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="w-full min-w-0 space-y-8">
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
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-600 hover:text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
              </svg>
              Sair
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

        <section className="w-full min-w-0 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 md:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Histórico de compras</h2>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-400 sm:items-end">
              {isDemoPreviewEnabled ? (
                <button
                  type="button"
                  onClick={() => setShowDemoPreview((current) => !current)}
                  className="inline-flex w-fit items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  {showDemoPreview ? "Ocultar pedidos de teste" : "Mostrar pedidos de teste"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 w-full min-w-0 space-y-4">
            {ordersLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Carregando pedidos...
              </div>
            ) : ordersError ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {ordersError}
              </div>
            ) : (
              (() => {
                const groups: Record<string, AccountOrder[]> = {};
                pageOrders.forEach((o) => {
                  const d = new Date(o.createdAt);
                  const key = d.toISOString().slice(0, 10);
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(o);
                });

                const sortedKeys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

                const getLabel = (isoDate: string) => {
                  const d = new Date(isoDate + "T00:00:00");
                  const today = new Date();
                  const todayKey = today.toISOString().slice(0, 10);
                  const yesterday = new Date(today);
                  yesterday.setDate(today.getDate() - 1);
                  const yesterdayKey = yesterday.toISOString().slice(0, 10);

                  if (isoDate === todayKey) return "Hoje";
                  if (isoDate === yesterdayKey) return "Ontem";

                  const diffMs = Number(new Date(today.toDateString())) - Number(new Date(d.toDateString()));
                  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays > 0 && diffDays < 7) {
                    return d.toLocaleDateString("pt-BR", { weekday: "long" });
                  }

                  return d.toLocaleDateString("pt-BR");
                };

                return (
                  <div className="w-full min-w-0 space-y-6">
                    {!orders.length && isDemoPreviewEnabled ? (
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        Exibindo pedidos fictícios para teste da paginação.
                      </div>
                    ) : showDemoPreview && isDemoPreviewEnabled ? (
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        Visualização de pedidos de teste ativada para conferir os rótulos.
                      </div>
                    ) : null}

                    {!orders.length && !isDemoPreviewEnabled ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                        Você ainda não tem pedidos.
                      </div>
                    ) : null}

                    {sortedKeys.map((key) => (
                      <div key={key} className="w-full min-w-0">
                        <h3 className="mb-3 text-sm font-semibold text-slate-300">{getLabel(key)}</h3>
                        <div className="w-full min-w-0 space-y-4">
                          {groups[key].map((order) => {
                            const productTitle = order.product?.title || order.product?.name || order.productId;
                            const paymentStatus = order.payment?.status || "pending";
                            const isExpanded = expandedOrderIds.includes(order.id);

                            return (
                              <article key={order.id} className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pedido {order.id.slice(0, 8)}</p>
                                    <h3 className="mt-2 break-words text-lg font-semibold text-white">{productTitle}</h3>
                                  </div>
                                </div>

                                {isExpanded ? (
                                  <div className="mt-5 grid w-full min-w-0 gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm md:grid-cols-2">
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ID completo</p>
                                      <p className="mt-1 break-all text-slate-200">{order.id}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Produto</p>
                                      <p className="mt-1 break-words text-slate-200">{productTitle}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pedido</p>
                                      <p className="mt-1 text-slate-200">{order.status}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pagamento</p>
                                      <p className="mt-1 text-slate-200">
                                        {paymentStatus}
                                        {order.payment?.provider ? ` via ${order.payment.provider}` : ""}
                                      </p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Valor</p>
                                      <p className="mt-1 text-slate-200">{money.format(order.amount)}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Criado em</p>
                                      <p className="mt-1 text-slate-200">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                                    </div>
                                  </div>
                                ) : null}

                                <div className="mt-4 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedOrderIds((current) =>
                                        current.includes(order.id)
                                          ? current.filter((id) => id !== order.id)
                                          : [...current, order.id]
                                      )
                                    }
                                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 sm:w-auto"
                                  >
                                    <span>{isExpanded ? "Ocultar detalhes" : "Ver detalhes"}</span>
                                    <svg aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2]" viewBox="0 0 20 20">
                                      {isExpanded ? (
                                        <path d="M5 12.5 10 7.5l5 5" strokeLinecap="round" strokeLinejoin="round" />
                                      ) : (
                                        <path d="M5 7.5 10 12.5l5-5" strokeLinecap="round" strokeLinejoin="round" />
                                      )}
                                    </svg>
                                  </button>
                                  {order.discordThreadUrl ? (
                                    <a
                                      href={order.discordThreadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                                    >
                                      Acessar ticket no Discord
                                    </a>
                                  ) : order.status === "completed" || order.status === "paid" ? (
                                    <>
                                      <button
                                        onClick={() => openTicket(order.id)}
                                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                                      >
                                        Acessar ticket
                                      </button>
                                      <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
                                        Ticket automático em processamento
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Página {safePage} de {totalPages} · {displayOrders.length} pedidos
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Página anterior"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 16L6 10l6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Anterior</span>
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Próxima página"
              >
                <span>Próxima</span>
                <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
