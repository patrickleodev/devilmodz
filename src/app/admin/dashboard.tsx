"use client";

import { useEffect, useMemo, useState } from "react";

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
  product?: { title?: string | null; id?: string | null; deliveryType?: string | null };
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

    return {
      clients: users.length,
      products: products.length,
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

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {[
            ["orders", "Pedidos"],
            ["clients", "Clientes"],
            ["products", "Produtos"],
          ].map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view as "orders" | "clients" | "products")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeView === view
                  ? "bg-cyan-300 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeView === "orders" ? (
          <section className="grid gap-4">
            {loading ? (
              <p className="text-sm text-slate-400">Carregando pedidos...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum pedido encontrado.</p>
            ) : (
              orders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pedido {order.id.slice(0, 8)}</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">
                        {order.product?.title || order.product?.id || "Produto removido"}
                      </h2>
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
                      className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Entregar
                    </button>
                    <button
                      onClick={() => updateOrder(order.id, { action: "refund" })}
                      disabled={isBusy(order.id)}
                      className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                          className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Encerrar ticket
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => updateOrder(order.id, { action: "open-ticket" })}
                        disabled={isBusy(order.id)}
                        className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
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
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Catalogo</p>
              <h2 className="mt-2 text-2xl font-semibold">{editingProductId ? "Editar produto" : "Criar produto"}</h2>

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
                  className="inline-flex flex-1 justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionState?.includes(":save")
                    ? "Salvando..."
                    : actionState === "create-product"
                      ? "Criando..."
                      : editingProductId
                        ? "Salvar alteracoes"
                        : "Salvar produto"}
                </button>
                {editingProductId ? (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    disabled={Boolean(actionState)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <p className="text-sm text-slate-400">Carregando produtos...</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum produto encontrado.</p>
              ) : (
                products.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{product.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{product.description}</p>
                      </div>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                        {money.format(product.price)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/5 px-3 py-1">Estoque: {product.stock}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1">Entrega: {product.deliveryType}</span>
                      {(product.tags || []).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-3 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editProduct(product)}
                        disabled={Boolean(actionState)}
                        className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        disabled={Boolean(actionState)}
                        className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionState === `product:${product.id}:delete` ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
