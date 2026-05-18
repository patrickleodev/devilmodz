"use client";

import React, { useState } from "react";

export default function PlanosPersonalizadosClient() {
  const [milhoes, setMilhoes] = useState(0);
  const [trajes, setTrajes] = useState(0);
  const [carros, setCarros] = useState(0);
  const [nivelPersonalizado, setNivelPersonalizado] = useState(false);
  const [unlockAll, setUnlockAll] = useState(false);
  const [allProperties, setAllProperties] = useState(false);
  const [kdEditado, setKdEditado] = useState(false);
  const [corridinhaMod, setCorridinhaMod] = useState(false);
  const [dataCriacao, setDataCriacao] = useState(false);
  const [pesquisasBunker, setPesquisasBunker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = Math.max(0, milhoes / 30);
  const PRICE_PER_STEP = 14.9;
  const PRICE_PER_TRAJE = 0.95;
  const PRICE_PER_CARRO = 2.9;
  const PRICE_NIVEL_PERSONALIZADO = 6;
  const PRICE_UNLOCK_ALL = 17.9;
  const PRICE_ALL_PROPERTIES = 19.9;
  const PRICE_KD_EDITADO = 1.5;
  const PRICE_CORRIDINHA_MOD = 3.0;
  const PRICE_DATA_CRIACAO = 4.0;
  const PRICE_PESQUISAS_BUNKER = 5.0;

  const trajesTotal = trajes * PRICE_PER_TRAJE;
  const carrosTotal = carros * PRICE_PER_CARRO;
  const nivelPersonalizadoTotal = nivelPersonalizado ? PRICE_NIVEL_PERSONALIZADO : 0;
  const unlockAllTotal = unlockAll ? PRICE_UNLOCK_ALL : 0;
  const allPropertiesTotal = allProperties ? PRICE_ALL_PROPERTIES : 0;
  const kdEditadoTotal = kdEditado ? PRICE_KD_EDITADO : 0;
  const corridinhaModTotal = corridinhaMod ? PRICE_CORRIDINHA_MOD : 0;
  const dataCriacaoTotal = dataCriacao ? PRICE_DATA_CRIACAO : 0;
  const pesquisasBunkerTotal = pesquisasBunker ? PRICE_PESQUISAS_BUNKER : 0;
  const valorTotal = steps * PRICE_PER_STEP + trajesTotal + carrosTotal + nivelPersonalizadoTotal + unlockAllTotal + allPropertiesTotal + kdEditadoTotal + corridinhaModTotal + dataCriacaoTotal + pesquisasBunkerTotal;
  const displayMilhoes = `${milhoes.toLocaleString("pt-BR")} milhões`;

  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const moneyPercent = Math.round((milhoes / 3000) * 100);
  const trajesPercent = Math.round((trajes / 100) * 100);
  const carrosPercent = Math.round((carros / 200) * 100);

  const extras = [
    {
      id: "nivelPersonalizado",
      label: "Nível personalizado",
      price: PRICE_NIVEL_PERSONALIZADO,
      checked: nivelPersonalizado,
      onChange: (checked: boolean) => setNivelPersonalizado(checked),
    },
    {
      id: "unlockAll",
      label: "Desbloqueio completo",
      price: PRICE_UNLOCK_ALL,
      checked: unlockAll,
      onChange: (checked: boolean) => setUnlockAll(checked),
    },
    {
      id: "allProperties",
      label: "Todas as propriedades",
      price: PRICE_ALL_PROPERTIES,
      checked: allProperties,
      onChange: (checked: boolean) => setAllProperties(checked),
    },
    {
      id: "kdEditado",
      label: "KD editado",
      price: PRICE_KD_EDITADO,
      checked: kdEditado,
      onChange: (checked: boolean) => setKdEditado(checked),
    },
    {
      id: "corridinhaMod",
      label: "Corridinha mod",
      price: PRICE_CORRIDINHA_MOD,
      checked: corridinhaMod,
      onChange: (checked: boolean) => setCorridinhaMod(checked),
    },
    {
      id: "dataCriacao",
      label: "Data de criação",
      price: PRICE_DATA_CRIACAO,
      checked: dataCriacao,
      onChange: (checked: boolean) => setDataCriacao(checked),
    },
    {
      id: "pesquisasBunker",
      label: "Pesquisas do bunker",
      price: PRICE_PESQUISAS_BUNKER,
      checked: pesquisasBunker,
      onChange: (checked: boolean) => setPesquisasBunker(checked),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (valorTotal < 2) {
      setError(`Preço mínimo para gerar checkout: ${money.format(2)}`);
      return;
    }
    try {
      setLoading(true);
      // Simulate adding to cart / checkout flow. Replace with real API call if desired.
      await new Promise((res) => setTimeout(res, 700));
    } catch (err) {
      setError("Erro ao adicionar ao carrinho.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[60vh] px-4 py-12 sm:px-6 lg:px-10">
      <style>{`
        .pp-range { appearance: none; }
        .pp-range::-webkit-slider-runnable-track { height: 6px; border-radius: 9999px; }
        .pp-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 18px; width: 18px; border-radius: 9999px; background: #ffffff; border: 2px solid rgba(255,255,255,0.12); box-shadow: 0 1px 2px rgba(0,0,0,0.3); margin-top: -6px; }
        .pp-range::-moz-range-thumb { height: 18px; width: 18px; border-radius: 9999px; background: #ffffff; border: 2px solid rgba(255,255,255,0.12); box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
      `}</style>

      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Monte seu Plano Personalizado</h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Arraste o controle para definir o valor em milhões (dinheiro) e siga para o checkout seguro.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 overflow-visible lg:flex-row lg:items-start lg:gap-6">
            <div className="min-w-0 flex-1">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center text-sm font-medium text-slate-200">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M12 1v22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M17 5H9a3 3 0 000 6h6a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Dinheiro
                  </div>
                  <div className="text-sm font-medium text-white border border-white/10 rounded-md px-3 py-1">{displayMilhoes}</div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={3000}
                  step={30}
                  value={milhoes}
                  onChange={(event) => setMilhoes(Number(event.target.value))}
                  className="pp-range mt-5 h-2 w-full cursor-pointer rounded-full"
                  style={{ background: `linear-gradient(to right, #34d399 ${moneyPercent}%, #334155 ${moneyPercent}%)` }}
                />

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>0 milhões</span>
                  <span>cada 30 milhões = {money.format(PRICE_PER_STEP)}</span>
                  <span>3 bilhões</span>
                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm font-medium text-slate-200">
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M12 3l2 2 4 1v4a4 4 0 01-4 4h-4a4 4 0 01-4-4V6l4-1 2-2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 14v5a1 1 0 001 1h8a1 1 0 001-1v-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Trajes mod
                    </div>
                    <div className="text-sm font-medium text-white border border-white/10 rounded-md px-3 py-1">{trajes}</div>
                  </div>

                  <div className="mt-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={trajes}
                      onChange={(e) => setTrajes(Number(e.target.value))}
                      className="pp-range mt-3 h-2 w-full cursor-pointer rounded-full"
                      style={{ background: `linear-gradient(to right, #22d3ee ${trajesPercent}%, #334155 ${trajesPercent}%)` }}
                    />

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>0</span>
                      <span className="text-center">cada traje = {money.format(PRICE_PER_TRAJE)}</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm font-medium text-slate-200">
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M5 19a2 2 0 100-4 2 2 0 000 4zM19 19a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Carros mod
                      </div>
                      <div className="text-sm font-medium text-white border border-white/10 rounded-md px-3 py-1">{carros}</div>
                    </div>

                    <div className="mt-3">
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={1}
                        value={carros}
                        onChange={(e) => setCarros(Number(e.target.value))}
                        className="pp-range mt-3 h-2 w-full cursor-pointer rounded-full"
                        style={{ background: `linear-gradient(to right, #fb7185 ${carrosPercent}%, #334155 ${carrosPercent}%)` }}
                      />

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>0</span>
                        <span className="text-center">cada carro = {money.format(PRICE_PER_CARRO)}</span>
                        <span>200</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Adicionais</h2>
                    <p className="mt-1 text-xs text-slate-400">Selecione extras para incluir no plano.</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-slate-200">{extra.label}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-cyan-200">{money.format(extra.price)}</span>
                      </span>
                      <span className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => extra.onChange(!extra.checked)}
                          aria-pressed={extra.checked}
                          aria-label={extra.label}
                          className={`relative h-7 w-14 rounded-full p-1 transition ${extra.checked ? "bg-cyan-400" : "bg-slate-700"} cursor-pointer`}
                        >
                          <span
                            className="absolute left-1 top-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-out"
                            style={{ transform: extra.checked ? "translate(28px, -50%)" : "translate(0, -50%)" }}
                          >
                            <span className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-transparent text-sm focus:outline-none`}> 
                              <span className={`absolute inset-0 flex items-center justify-center transition-all duration-150 ${extra.checked ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>
                                <span className="absolute h-[2px] w-3.5 rounded-full bg-slate-700 rotate-45" />
                                <span className="absolute h-[2px] w-3.5 rounded-full bg-slate-700 -rotate-45" />
                              </span>

                              <svg
                                className={`w-5 h-5 text-cyan-400 transition-all duration-180 transform ${extra.checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M6 12l4 4 8-8" />
                              </svg>
                            </span>
                          </span>
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="min-w-0 lg:w-[360px] lg:sticky lg:top-[97px] lg:self-start lg:z-10">
              <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Resumo</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-300">
                    {milhoes > 0 && (
                      <div className="flex justify-between">
                        <span>Dinheiro ({milhoes}m)</span>
                        <span>{money.format(steps * PRICE_PER_STEP)}</span>
                      </div>
                    )}
                    {trajes > 0 && (
                      <div className="flex justify-between">
                        <span>Trajes ({trajes})</span>
                        <span>{money.format(trajesTotal)}</span>
                      </div>
                    )}
                    {carros > 0 && (
                      <div className="flex justify-between">
                        <span>Carros ({carros})</span>
                        <span>{money.format(carrosTotal)}</span>
                      </div>
                    )}
                    {nivelPersonalizado && (
                      <div className="flex justify-between">
                        <span>Nivel personalizado</span>
                        <span>{money.format(nivelPersonalizadoTotal)}</span>
                      </div>
                    )}
                    {unlockAll && (
                      <div className="flex justify-between">
                        <span>Desbloqueio completo</span>
                        <span>{money.format(unlockAllTotal)}</span>
                      </div>
                    )}
                    {kdEditado && (
                      <div className="flex justify-between">
                        <span>KD editado</span>
                        <span>{money.format(kdEditadoTotal)}</span>
                      </div>
                    )}
                    {corridinhaMod && (
                      <div className="flex justify-between">
                        <span>Corridinha mod</span>
                        <span>{money.format(corridinhaModTotal)}</span>
                      </div>
                    )}
                    {dataCriacao && (
                      <div className="flex justify-between">
                        <span>Data de criação</span>
                        <span>{money.format(dataCriacaoTotal)}</span>
                      </div>
                    )}
                    {pesquisasBunker && (
                      <div className="flex justify-between">
                        <span>Pesquisas do bunker</span>
                        <span>{money.format(pesquisasBunkerTotal)}</span>
                      </div>
                    )}
                    {allProperties && (
                      <div className="flex justify-between">
                        <span>Todas as propriedades</span>
                        <span>{money.format(allPropertiesTotal)}</span>
                      </div>
                    )}
                    {milhoes === 0 && trajes === 0 && carros === 0 && !nivelPersonalizado && (
                      <div className="text-sm text-slate-400">Nenhum item selecionado</div>
                    )}
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
                  <div className="mt-1 text-3xl font-black text-white">{money.format(valorTotal)}</div>
                </div>

                {valorTotal < 2 && (
                  <div className="mb-2 flex items-center rounded-md bg-yellow-600/10 px-3 py-1 text-xs text-yellow-300">
                    <svg className="mr-2 h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h17a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 9v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Preço mínimo para gerar checkout: {money.format(2)}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || valorTotal < 2}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Adicionando ao carrinho..." : "Adicionar ao Carrinho"}
                </button>

                {error && (
                  <div className="rounded-md border border-red-600/20 bg-red-600/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
              </div>
            </aside>
          </form>
        </div>
      </div>
    </div>
  );
}
