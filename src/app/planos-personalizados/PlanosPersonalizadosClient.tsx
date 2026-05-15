"use client";
import { useState } from "react";

import { PLAN_OPTIONS as OPCOES } from "@/lib/planosOptions";

export default function PlanosPersonalizadosClient() {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const valorTotal = OPCOES.filter((o) => selecionados.includes(o.id)).reduce((acc, o) => acc + o.valor, 0);

  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const handleChange = (id: string) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCheckoutUrl(null);
    setUsedFallback(false);

    try {
      const res = await fetch("/api/payments/infinitepay/custom-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opcoes: selecionados }),
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
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-8 shadow-2xl border border-white/5">
        <h1 className="text-3xl font-extrabold text-white">Monte seu Plano Personalizado</h1>
        <p className="mt-2 text-sm text-slate-300">Escolha as opções que deseja e siga para o checkout seguro.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-3">
            {OPCOES.map((op) => (
              <label key={op.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/3 p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(op.id)}
                    onChange={() => handleChange(op.id)}
                    className="h-5 w-5 rounded border-slate-300 bg-white/5 text-cyan-400 focus:ring-cyan-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{op.label}</div>
                    <div className="text-xs text-slate-400">(+{money.format(op.valor)})</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-white">{money.format(op.valor)}</div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div>
              <div className="text-xs text-slate-400">Total</div>
              <div className="text-2xl font-bold text-white">{money.format(valorTotal)}</div>
            </div>
            <button
              type="submit"
              disabled={loading || valorTotal === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
            >
              {loading ? "Abrindo checkout..." : "Gerar Checkout"}
            </button>
          </div>
        </form>

        {usedFallback && (
          <div className="mt-4 rounded-md bg-yellow-600/10 border border-yellow-600/20 p-3 text-sm text-yellow-300">
            Foi utilizado um checkout público como fallback. Você será redirecionado.
          </div>
        )}

        {checkoutUrl && !usedFallback && (
          <div className="mt-4 text-sm text-slate-300">Redirecionando para o checkout...</div>
        )}
      </div>
    </div>
  );
}
