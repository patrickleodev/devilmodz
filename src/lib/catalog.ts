import type { Product } from "../entities/Product";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  badge: string;
  stock: number;
  deliveryType: string;
};

export type SeedProduct = {
  slug: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  deliveryType: string;
  badge: string;
  features: string[];
};

export const defaultProducts: SeedProduct[] = [
  {
    slug: "starter",
    title: "Pacote Basico",
    description: "Ideal para quem quer subir rapido sem perder a vibe do personagem.",
    price: 19.9,
    stock: 999,
    deliveryType: "manual",
    badge: "Entrega rapida",
    features: ["1 sessao assistida", "Suporte via Discord", "Atualizacao de status"],
  },
  {
    slug: "pro",
    title: "Pacote Pro",
    description: "Para progresso consistente com acompanhamento durante a execucao.",
    price: 49.9,
    stock: 999,
    deliveryType: "manual",
    badge: "Mais vendido",
    features: ["Ate 3 sessoes", "Prioridade no suporte", "Resumo de progresso"],
  },
  {
    slug: "elite",
    title: "Pacote Elite",
    description: "A opcao mais completa, com tratamento premium e entrega priorizada.",
    price: 79.9,
    stock: 999,
    deliveryType: "manual",
    badge: "Premium",
    features: ["Execucao prioritaria", "Gerenciamento completo", "Acompanhamento dedicado"],
  },
];

const getTagValue = (tags: string[] | null | undefined, prefix: string) =>
  (tags || []).find((tag) => tag.startsWith(prefix))?.slice(prefix.length).trim() || "";

export const buildProductTags = (product: SeedProduct) => [
  "public",
  `plan:${product.slug}`,
  `badge:${product.badge}`,
  ...product.features.map((feature) => `feature:${feature}`),
];

export const getProductSlug = (product: Pick<Product, "id" | "title" | "tags">) => {
  const slug = getTagValue(product.tags, "plan:");
  if (slug) return slug;

  const seed = defaultProducts.find((item) => item.title === product.title);
  return seed?.slug || product.id;
};

export const productToStoreProduct = (product: Product): StoreProduct => {
  const seed = defaultProducts.find((item) => item.slug === getProductSlug(product));
  const badge = getTagValue(product.tags, "badge:") || seed?.badge || "Disponivel";
  const features = (product.tags || [])
    .filter((tag) => tag.startsWith("feature:"))
    .map((tag) => tag.slice("feature:".length).trim())
    .filter(Boolean);

  return {
    id: product.id,
    slug: getProductSlug(product),
    name: product.title,
    description: product.description,
    price: Number(product.price || 0),
    features: features.length > 0 ? features : seed?.features || [],
    badge,
    stock: product.stock,
    deliveryType: product.deliveryType,
  };
};

export const findDefaultProductBySlug = (slug: string) => defaultProducts.find((product) => product.slug === slug);
