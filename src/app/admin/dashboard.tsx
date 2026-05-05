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
  user?: { email?: string | null; name?: string | null };
  product?: { title?: string | null; id?: string | null };
};

const emptyProductForm = {
  title: "",
  description: "",
  price: 0,
  stock: 0,
  deliveryType: "manual",
  tags: "",
};

export default function AdminDashboard() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    const refundedOrders = orders.filter((order) => order.status === "refunded").length;

    return {
      products: products.length,
      orders: orders.length,
      totalRevenue,
      refundedOrders,
    };
  }, [orders, products.length]);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [productsResponse, ordersResponse] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/orders"),
      ]);

      if (!productsResponse.ok || !ordersResponse.ok) {
        throw new Error("Não foi possível carregar os dados do painel");
      }

      const productsPayload = (await productsResponse.json()) as { products: AdminProduct[] };
      const ordersPayload = (await ordersResponse.json()) as { orders: AdminOrder[] };

      setProducts(productsPayload.products);
      setOrders(ordersPayload.orders);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao carregar o painel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createProduct = async () => {
    setActionState("create-product");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: productForm.title,
          description: productForm.description,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          deliveryType: productForm.deliveryType,
          tags: productForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao criar produto");
      }

      setProductForm(emptyProductForm);
      await loadData();
      setMessage("Produto criado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao criar produto");
    } finally {
      setActionState(null);
    }
  };

  const updateOrder = async (orderId: string, body: Record<string, string>) => {
    setActionState(orderId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao atualizar pedido");
      }

      await loadData();
      setMessage("Pedido atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao atualizar pedido");
    } finally {
      setActionState(null);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Painel admin</p>
          <h1 className="mt-3 text-3xl font-semibold">Gerenciar pedidos, produtos e reembolsos</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Aqui você controla o catálogo e opera os pedidos aprovados, entregues ou reembolsados.
          </p>
        </header>

        {message ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Produtos", String(summary.products)],
            ["Pedidos", String(summary.orders)],
            ["Faturamento", `R$ ${summary.totalRevenue}`],
            ["Reembolsos", String(summary.refundedOrders)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Catálogo</p>
                <h2 className="mt-2 text-2xl font-semibold">Criar produto</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                value={productForm.title}
                onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Título"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
              />
              <input
                value={productForm.price}
                onChange={(event) => setProductForm((current) => ({ ...current, price: Number(event.target.value) }))}
                type="number"
                placeholder="Preço"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
              />
              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descrição"
                className="min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500 md:col-span-2"
              />
              <input
                value={productForm.stock}
                onChange={(event) => setProductForm((current) => ({ ...current, stock: Number(event.target.value) }))}
                type="number"
                placeholder="Estoque"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
              />
              <select
                value={productForm.deliveryType}
                onChange={(event) => setProductForm((current) => ({ ...current, deliveryType: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
              >
                <option value="manual">Manual</option>
                <option value="automatic">Automático</option>
              </select>
              <input
                value={productForm.tags}
                onChange={(event) => setProductForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="Tags separadas por vírgula"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500 md:col-span-2"
              />
            </div>

            <button
              onClick={createProduct}
              disabled={actionState === "create-product"}
              className="mt-6 inline-flex w-full justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {actionState === "create-product" ? "Criando..." : "Salvar produto"}
            </button>

            <div className="mt-8 grid gap-4">
              {loading ? (
                <p className="text-sm text-slate-400">Carregando produtos...</p>
              ) : (
                products.map((product) => (
                  <article key={product.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{product.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{product.description}</p>
                      </div>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                        R$ {product.price}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/5 px-3 py-1">Estoque: {product.stock}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1">Entrega: {product.deliveryType}</span>
                      {product.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-3 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Pedidos</p>
              <h2 className="mt-2 text-2xl font-semibold">Fluxo de operação</h2>
            </div>

            <div className="mt-6 grid gap-4">
              {loading ? (
                <p className="text-sm text-slate-400">Carregando pedidos...</p>
              ) : (
                orders.map((order) => (
                  <article key={order.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Pedido {order.id.slice(0, 8)}</h3>
                        <p className="mt-2 text-sm text-slate-400">
                          {order.product?.title || order.product?.id || "Produto removido"} · {order.user?.email || order.user?.name || "Cliente"}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <span className="rounded-full bg-white/5 px-3 py-1">R$ {order.amount}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1">{new Date(order.createdAt).toLocaleString("pt-BR")}</span>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => updateOrder(order.id, { action: "deliver" })}
                        disabled={actionState === order.id}
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Entregar
                      </button>
                      <button
                        onClick={() => updateOrder(order.id, { action: "refund" })}
                        disabled={actionState === order.id}
                        className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reembolsar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
