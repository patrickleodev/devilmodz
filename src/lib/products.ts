import { defaultProducts } from "./catalog";

export type StoreProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  badge: string;
  checkoutUrl: string;
};

export const products: StoreProduct[] = defaultProducts.map((product) => ({
  id: product.slug,
  name: product.title,
  description: product.description,
  price: product.price,
  features: product.features,
  badge: product.badge,
  checkoutUrl: "",
}));
