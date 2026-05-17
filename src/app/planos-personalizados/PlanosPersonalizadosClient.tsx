"use client";
import { useState } from "react";

export default function PlanosPersonalizadosClient() {
  const [milhoes, setMilhoes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const steps = Math.max(1, milhoes / 30);
  const PRICE_PER_STEP = 14.9;
  const valorTotal = steps * PRICE_PER_STEP;
  const displayMilhoes = `${milhoes.toLocaleString("pt-BR")} milhões`;

  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCheckoutUrl(null);
    setUsedFallback(false);

    try {
      const res = await fetch("/api/payments/infinitepay/custom-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milhoes }),
      });
      const data = await res.json();
      if (data.fallback) setUsedFallback(true);
      setCheckoutUrl(data.url);
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-6 shadow-2xl sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Monte seu Plano Personalizado</h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">Arraste o controle para definir o valor em milhões (dinheiro) e siga para o checkout seguro.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-200">Dinheiro</div>
                  <div className="text-2xl font-black tracking-tight text-white sm:text-3xl">{displayMilhoes}</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Preço</div>
                  <div className="text-2xl font-black text-emerald-300 sm:text-3xl">{money.format(valorTotal)}</div>
                </div>
              </div>

              <input
                type="range"
                min={30}
                max={3000}
                step={30}
                value={milhoes}
                onChange={(event) => setMilhoes(Number(event.target.value))}
                className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
              />

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>30 milhões</span>
                <span>cada 30 milhões = {money.format(PRICE_PER_STEP)}</span>
                <span>3 bilhões</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:sticky lg:bottom-6">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
                <div className="mt-1 text-3xl font-black text-white">{money.format(valorTotal)}</div>
              </div>
              <button
                type="submit"
                disabled={loading || valorTotal === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Abrindo checkout..." : "Gerar Checkout"}
              </button>
              {usedFallback && (
                <div className="rounded-md border border-yellow-600/20 bg-yellow-600/10 p-3 text-sm text-yellow-300">
                  Foi utilizado um checkout público como fallback. Você será redirecionado.
                </div>
              )}
              {checkoutUrl && !usedFallback && (
                <div className="text-sm text-slate-300">Redirecionando para o checkout...</div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
