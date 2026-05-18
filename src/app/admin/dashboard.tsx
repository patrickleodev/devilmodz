"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiEdit2, FiEye, FiX, FiSave, FiRefreshCw } from "react-icons/fi";

type AdminProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  deliveryType: string;
  tags: string[];
  createdAt: string;
};

type AdminOrder = {
  id: string;
  status: string;
  amount: number;
  createdAt: string;
  discordThreadUrl?: string | null;
  user?: { id?: string | null; email?: string | null; name?: string | null; discordId?: string | null };
  product?: { title?: string | null; id?: string | null; deliveryType?: string | null; tags?: string[] | null };
};

type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  discordId?: string | null;
  roles?: string[] | string | null;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt?: string | null;
};

type ProductPreviewSource = {
  title: string;
  description: string;
  price: number;
  stock: number;
  deliveryType: string;
  tags: string[];
};

const emptyProductForm = {
  title: "",
  description: "",
  price: "",
  stock: "",
  deliveryType: "manual",
  tags: "",
};

const statusOptions = ["pending", "paid", "completed", "processing", "delivered", "refunded"];

export default function AdminDashboard() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"orders" | "clients" | "products">("orders");

  const money = useMemo(() => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }), []);

  const summary = useMemo(() => {
    const paidRevenue = orders
      .filter((order) => order.status !== "refunded")
      .reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const openTickets = orders.filter((order) => Boolean(order.discordThreadUrl)).length;

    const nonCustomProductsCount = products.filter((p) => {
      const raw = (p as any).tags;
      const tags = Array.isArray(raw) ? raw : typeof raw === "string" ? (raw as string).split(",").map((t) => t.trim()).filter(Boolean) : [];
      return !tags.includes("custom:plan");
    }).length;

    return {
      clients: users.length,
      products: nonCustomProductsCount,
      orders: orders.length,
      paidRevenue,
      openTickets,
    };
  }, [orders, products.length, users.length]);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [productsResponse, ordersResponse, usersResponse] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/orders"),
        fetch("/api/admin/users"),
      ]);

      if (!productsResponse.ok || !ordersResponse.ok || !usersResponse.ok) {
        throw new Error("Nao foi possivel carregar os dados do painel");
      }

      const productsPayload = (await productsResponse.json()) as { products: AdminProduct[] };
      const ordersPayload = (await ordersResponse.json()) as { orders: AdminOrder[] };
      const usersPayload = (await usersResponse.json()) as { users: AdminUser[] };

      setProducts(productsPayload.products);
      setOrders(ordersPayload.orders);
      setUsers(usersPayload.users);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao carregar o painel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const resetProductForm = () => {
    setProductForm(emptyProductForm);
    setEditingProductId(null);
  };

  const restoreProducts = async () => {
    const confirmed = window.confirm("Restaurar produtos vai remover todos os personalizados e manter apenas os 3 do seed. Continuar?");
    if (!confirmed) return;

    setActionState("restore-products");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/products/restore", { method: "POST" });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Falha ao restaurar produtos");
      }

      await loadData();
      setMessage("Produtos restaurados com sucesso.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setActionState(null);
    }
  };

  const buildProductPayload = () => ({
    title: productForm.title,
    description: productForm.description,
    price: Number(productForm.price.replace(",", ".")),
    stock: Number(productForm.stock || 0),
    deliveryType: productForm.deliveryType,
    tags: productForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  });

  const saveProduct = async () => {
    const isEditing = Boolean(editingProductId);
    setActionState(isEditing ? `product:${editingProductId}:save` : "create-product");
    setMessage(null);

    try {
      const response = await fetch(editingProductId ? `/api/admin/products/${editingProductId}` : "/api/admin/products", {
        method: editingProductId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProductPayload()),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || (isEditing ? "Falha ao atualizar produto" : "Falha ao criar produto"));
      }

      resetProductForm();
      await loadData();
      setMessage(isEditing ? "Produto atualizado com sucesso." : "Produto criado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao salvar produto");
    } finally {
      setActionState(null);
    }
  };

  const editProduct = (product: AdminProduct) => {
    setProductForm({
      title: product.title || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      deliveryType: product.deliveryType || "manual",
      tags: (product.tags || []).join(", "),
    });
    setEditingProductId(product.id);
    setMessage(null);
  };

  const buildPreviewSource = (source: { title: string; description: string; price: string | number; stock: string | number; deliveryType: string; tags: string }) => ({
    title: source.title,
    description: source.description,
    price: Number(String(source.price).replace(",", ".") || 0),
    stock: Number(source.stock || 0),
    deliveryType: source.deliveryType,
    tags: source.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  });

  const previewFromForm = buildPreviewSource(productForm);

  const previewBadge = (product: ProductPreviewSource) => {
    const badgeTag = (product.tags || []).find((tag) => tag.startsWith("badge:"));
    if (badgeTag) {
      return badgeTag.replace("badge:", "");
    }

    return (product.tags || [])[0] || "Preview";
  };

  const previewSlug = (product: ProductPreviewSource) => {
    const planTag = (product.tags || []).find((tag) => tag.startsWith("plan:"));
    if (planTag) {
      return planTag.replace("plan:", "");
    }

    return product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };

  const previewFeatures = (product: ProductPreviewSource) =>
    (product.tags || [])
      .filter((tag) => tag.startsWith("feature:"))
      .map((tag) => tag.replace("feature:", ""))
      .filter(Boolean);

  const normalizeTags = (raw?: string[] | string | null) =>
    Array.isArray(raw)
      ? raw
      : typeof raw === "string"
      ? raw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  const deleteProduct = async (product: AdminProduct) => {
    const confirmed = window.confirm(`Excluir o produto "${product.title}"? Essa acao nao pode ser desfeita.`);

    if (!confirmed) {
      return;
    }

    setActionState(`product:${product.id}:delete`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Falha ao excluir produto");
      }

      if (editingProductId === product.id) {
        resetProductForm();
      }

      await loadData();
      setMessage("Produto excluido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao excluir produto");
    } finally {
      setActionState(null);
    }
  };

  const updateOrder = async (orderId: string, body: Record<string, string>) => {
    setActionState(`${orderId}:${body.action || body.status || "update"}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { error?: string; threadUrl?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao atualizar pedido");
      }

      await loadData();
      setMessage(payload.threadUrl ? "Ticket criado com sucesso." : "Pedido atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao atualizar pedido");
    } finally {
      setActionState(null);
    }
  };

  const isBusy = (orderId: string) => Boolean(actionState?.startsWith(`${orderId}:`));

  const { customProducts, nonCustomProducts } = useMemo(() => {
    const custom: AdminProduct[] = [];
    const nonCustom: AdminProduct[] = [];
    products.forEach((p) => {
      const raw = (p as any).tags;
      const tags = Array.isArray(raw) ? raw : typeof raw === "string" ? (raw as string).split(",").map((t) => t.trim()).filter(Boolean) : [];
      if (tags.includes("custom:plan")) custom.push(p);
      else nonCustom.push(p);
    });
    return { customProducts: custom, nonCustomProducts: nonCustom };
  }, [products]);

  return (
    <main className="px-4 py-6 text-white sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Painel admin</p>
          <h1 className="mt-3 text-3xl font-semibold">Operacao do site</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Acompanhe clientes, pedidos, tickets do Discord e catalogo em um so lugar.
          </p>
        </header>

        {message ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Clientes", String(summary.clients)],
            ["Pedidos", String(summary.orders)],
            ["Tickets", String(summary.openTickets)],
            ["Produtos", String(summary.products)],
            ["Faturamento", money.format(summary.paidRevenue)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex flex-wrap gap-2">
            {[
              ["orders", "Pedidos"],
              ["clients", "Clientes"],
              ["products", "Produtos"],
            ].map(([view, label]) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view as "orders" | "clients" | "products")}
                className={`cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  activeView === view
                    ? "bg-cyan-300 text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Atualizar tudo"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Atualizar painel
          </button>
        </div>

        {activeView === "orders" ? (
          <section className="grid gap-4">
            {loading ? (
              <p className="text-sm text-slate-400">Carregando pedidos...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum pedido encontrado.</p>
            ) : (
              orders.map((order) => (
                <article key={order.id} className={`rounded-2xl border ${normalizeTags(order.product?.tags).includes("custom:plan") ? "border-violet-500/30 bg-violet-500/5" : "border-white/10 bg-slate-950/70"} p-5`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pedido {order.id.slice(0, 8)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <h2 className="text-xl font-semibold text-white">
                          {order.product?.title || order.product?.id || "Produto removido"}
                        </h2>
                        {normalizeTags(order.product?.tags).includes("custom:plan") && (
                          <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-xs font-medium text-violet-300">
                            Personalizado
                          </span>
                        )}
                      </div>
                      {normalizeTags(order.product?.tags).includes("custom:plan") && (
                        <div className="mt-3 flex gap-3 text-xs text-slate-300">
                          {(() => {
                            const tagsArray = normalizeTags(order.product?.tags);
                            const moneyVal = tagsArray.find((t) => t.startsWith("money:"))?.split(":")[1] || "0";
                            const clothes = tagsArray.find((t) => t.startsWith("clothes:"))?.split(":")[1] || "0";
                            const cars = tagsArray.find((t) => t.startsWith("cars:"))?.split(":")[1] || "0";
                            return (
                              <>
                                <span className="rounded-md bg-emerald-500/15 px-2 py-1">💰 Dinheiro: {moneyVal}M</span>
                                <span className="rounded-md bg-cyan-500/15 px-2 py-1">👕 Trajes: {clothes}</span>
                                <span className="rounded-md bg-pink-500/15 px-2 py-1">🚗 Carros: {cars}</span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      <p className="mt-2 text-sm text-slate-400">
                        {order.user?.email || order.user?.name || "Cliente sem identificacao"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200">{order.status}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200">{money.format(order.amount)}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200">
                        {new Date(order.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
                    <select
                      value={order.status}
                      onChange={(event) => updateOrder(order.id, { status: event.target.value })}
                      disabled={isBusy(order.id)}
                      className="cursor-pointer rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateOrder(order.id, { action: "deliver" })}
                      disabled={isBusy(order.id)}
                      className="cursor-pointer rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Entregar
                    </button>
                    <button
                      onClick={() => updateOrder(order.id, { action: "refund" })}
                      disabled={isBusy(order.id)}
                      className="cursor-pointer rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reembolsar
                    </button>
                    {order.discordThreadUrl ? (
                      <>
                        <a
                          href={order.discordThreadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-white/10"
                        >
                          Abrir no Discord
                        </a>
                        <button
                          onClick={() => updateOrder(order.id, { action: "close-ticket" })}
                          disabled={isBusy(order.id)}
                          className="cursor-pointer rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Encerrar ticket
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => updateOrder(order.id, { action: "open-ticket" })}
                        disabled={isBusy(order.id)}
                          className="cursor-pointer rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Criar ticket
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        ) : null}

        {activeView === "clients" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {loading ? (
              <p className="text-sm text-slate-400">Carregando clientes...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum cliente encontrado.</p>
            ) : (
              users.map((user) => (
                <article key={user.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-white">{user.name || user.email || "Cliente"}</h2>
                      <p className="mt-1 truncate text-sm text-slate-400">{user.email || "Sem e-mail"}</p>
                      <p className="mt-1 text-xs text-slate-500">Discord: {user.discordId || "Nao vinculado"}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      {Array.isArray(user.roles) ? user.roles.join(", ") || "cliente" : user.roles || "cliente"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                    <span className="rounded-2xl bg-white/5 px-3 py-2">Pedidos: {user.ordersCount}</span>
                    <span className="rounded-2xl bg-white/5 px-3 py-2">Total: {money.format(user.totalSpent || 0)}</span>
                    <span className="rounded-2xl bg-white/5 px-3 py-2">
                      Ultimo: {user.lastOrderAt ? new Date(user.lastOrderAt).toLocaleDateString("pt-BR") : "-"}
                    </span>
                  </div>
                </article>
              ))
            )}
          </section>
        ) : null}

        {activeView === "products" ? (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Catalogo</p>
                  <h2 className="mt-2 text-2xl font-semibold">{editingProductId ? "Editar produto" : "Criar produto"}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/planos"
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:brightness-110"
                  >
                    Ver produtos
                  </Link>
                  <button
                    type="button"
                    onClick={restoreProducts}
                    disabled={Boolean(actionState)}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                    Restaurar produtos
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-200">
                  Nome
                  <input
                    value={productForm.title}
                    onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Nome do plano. Ex: Pacote Pro"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal outline-none placeholder:text-slate-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-200">
                  Preco
                  <input
                    value={productForm.price}
                    onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                    inputMode="decimal"
                    placeholder="Preco em reais. Ex: 49.90"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal outline-none placeholder:text-slate-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-200">
                  Descricao
                  <textarea
                    value={productForm.description}
                    onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Descreva o que o cliente recebe, prazo e atendimento incluso."
                    className="min-h-[110px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal outline-none placeholder:text-slate-500"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-200">
                    Estoque
                    <input
                      value={productForm.stock}
                      onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))}
                      inputMode="numeric"
                      placeholder="Quantidade disponivel. Ex: 999"
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal outline-none placeholder:text-slate-500"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-200">
                    Tipo de entrega
                    <select
                      value={productForm.deliveryType}
                      onChange={(event) => setProductForm((current) => ({ ...current, deliveryType: event.target.value }))}
                      className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-normal outline-none"
                    >
                      <option value="manual">Manual</option>
                      <option value="automatic">Automatico</option>
                    </select>
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium text-slate-200">
                  Tags
                  <input
                    value={productForm.tags}
                    onChange={(event) => setProductForm((current) => ({ ...current, tags: event.target.value }))}
                    placeholder="Tags separadas por virgula. Ex: public, plan:vip, badge:Mais vendido"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal outline-none placeholder:text-slate-500"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={saveProduct}
                  disabled={Boolean(actionState)}
                  className="cursor-pointer inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionState?.includes(":save")
                    ? "Salvando..."
                    : (
                      <>
                        <FiSave className="h-4 w-4" aria-hidden="true" />
                        {actionState === "create-product"
                          ? "Criando..."
                          : editingProductId
                            ? "Salvar alteracoes"
                            : "Salvar produto"}
                      </>
                    )}
                </button>
                {editingProductId ? (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    disabled={Boolean(actionState)}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiX className="h-4 w-4 inline-block mr-2" aria-hidden="true" />
                    Cancelar
                  </button>
                ) : null}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preview em tempo real</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Como o produto vai aparecer</h3>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{previewSlug(previewFromForm)}</span>
                </div>

                <article className="mt-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 sm:p-5 shadow-xl shadow-black/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                      {previewBadge(previewFromForm)}
                    </span>
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{previewSlug(previewFromForm)}</span>
                  </div>

                  <h4 className="mt-6 text-2xl font-semibold text-white">{previewFromForm.title || "Nome do produto"}</h4>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {previewFromForm.description || "Descreva o que o cliente recebe, prazo e atendimento incluso."}
                  </p>

                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    {(previewFeatures(previewFromForm).length > 0
                      ? previewFeatures(previewFromForm)
                      : ["Execucao prioritaria", "Gerenciamento completo", "Acompanhamento dedicado"]
                    ).map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">A partir de</p>
                      <p className="mt-1 text-3xl font-semibold text-white">
                        {previewFromForm.price > 0 ? money.format(previewFromForm.price) : "R$ 0,00"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full cursor-default items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 opacity-90"
                    >
                      Comprar agora
                    </button>
                  </div>
                </article>
              </div>
            </div>

            <div className="grid gap-4 self-start">
              {loading ? (
                <p className="text-sm text-slate-400">Carregando produtos...</p>
              ) : products.filter(p => !normalizeTags(p.tags).includes("custom:plan")).length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum produto encontrado.</p>
              ) : (
                products.filter(p => !normalizeTags(p.tags).includes("custom:plan")).map((product) => {
                  const isEditingProduct = editingProductId === product.id;
                  const isCustomPlan = normalizeTags(product.tags).includes("custom:plan");
                  
                  // Extract custom plan details from tags
                  let customPlanDetails = { money: 0, clothes: 0, cars: 0 };
                  if (isCustomPlan) {
                    normalizeTags(product.tags).forEach((tag) => {
                      if (tag.startsWith("money:")) customPlanDetails.money = parseInt(tag.split(":")[1], 10);
                      if (tag.startsWith("clothes:")) customPlanDetails.clothes = parseInt(tag.split(":")[1], 10);
                      if (tag.startsWith("cars:")) customPlanDetails.cars = parseInt(tag.split(":")[1], 10);
                    });
                  }
                  
                  return (
                  <article
                    key={product.id}
                    className={`rounded-2xl border ${
                      isCustomPlan ? "border-violet-500/30 bg-violet-500/5" : "border-white/10 bg-slate-950/70"
                    } p-4 ${
                      isEditingProduct ? "opacity-60 grayscale pointer-events-none" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{product.title}</h3>
                          {isCustomPlan && (
                            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-xs font-medium text-violet-300">
                              Personalizado
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{product.description}</p>
                        {isCustomPlan && (
                          <div className="mt-3 flex gap-3 text-xs text-slate-300">
                            <span className="rounded-md bg-emerald-500/15 px-2 py-1">💰 Dinheiro: {customPlanDetails.money}M</span>
                            <span className="rounded-md bg-cyan-500/15 px-2 py-1">👕 Trajes: {customPlanDetails.clothes}</span>
                            <span className="rounded-md bg-pink-500/15 px-2 py-1">🚗 Carros: {customPlanDetails.cars}</span>
                          </div>
                        )}
                      </div>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                        {money.format(product.price)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/5 px-3 py-1">Estoque: {product.stock}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1">Entrega: {product.deliveryType}</span>
                      {normalizeTags(product.tags).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-3 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewProduct(product)}
                        disabled={Boolean(actionState)}
                        className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiEye className="h-4 w-4" aria-hidden="true" />
                        Ver preview
                      </button>
                      <button
                        type="button"
                        onClick={() => editProduct(product)}
                        disabled={Boolean(actionState)}
                        className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiEdit2 className="h-4 w-4" aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        disabled={Boolean(actionState)}
                        className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiX className="h-4 w-4" aria-hidden="true" />
                        {actionState === `product:${product.id}:delete` ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </article>
                )})
              )}
            </div>
          </section>
        ) : null}

        {previewProduct ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              aria-hidden="true"
              onClick={() => setPreviewProduct(null)}
            />
            <section className="relative z-10 w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/40 sm:p-6">
              <div className="flex items-center justify-between gap-3 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preview do plano</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Como vai aparecer na vitrine</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewProduct(null)}
                  aria-label="Fechar preview"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/5 text-slate-200 transition hover:bg-white/10"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <article className="mt-5 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                    {previewBadge(previewProduct)}
                  </span>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {previewSlug(previewProduct)}
                  </span>
                </div>

                <h3 className="mt-6 text-2xl font-semibold text-white">{previewProduct.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{previewProduct.description}</p>

                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {(previewFeatures(previewProduct).length > 0 ? previewFeatures(previewProduct) : ["Execucao prioritaria", "Gerenciamento completo", "Acompanhamento dedicado"]).map(
                    (feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        {feature}
                      </li>
                    ),
                  )}
                </ul>

                <div className="mt-8 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">A partir de</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{money.format(previewProduct.price)}</p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full cursor-default items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 opacity-90"
                  >
                    Comprar agora
                  </button>
                </div>
              </article>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

