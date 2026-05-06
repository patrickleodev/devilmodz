export type StoreProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  badge: string;
};

export const products: StoreProduct[] = [
  {
    id: "starter",
    name: "Pacote Starter",
    description: "Ideal para quem quer subir rápido sem perder a vibe do personagem.",
    price: 49,
    badge: "Entrega rápida",
    features: ["1 sessão assistida", "Suporte via Discord", "Atualização de status"],
  },
  {
    id: "pro",
    name: "Pacote Pro",
    description: "Para progresso consistente com acompanhamento durante a execução.",
    price: 129,
    badge: "Mais vendido",
    features: ["Até 3 sessões", "Prioridade no suporte", "Resumo de progresso"],
  },
  {
    id: "elite",
    name: "Pacote Elite",
    description: "A opção mais completa, com tratamento premium e entrega priorizada.",
    price: 249,
    badge: "Premium",
    features: ["Execução prioritária", "Gerenciamento completo", "Acompanhamento dedicado"],
  },
];
