import type { NextApiRequest, NextApiResponse } from "next";
import { ensureDataSource } from "../../lib/db";
import { Product } from "../../entities/Product";
import { productToStoreProduct } from "../../lib/catalog";

type CachedProducts = {
  expiresAt: number;
  products: ReturnType<typeof productToStoreProduct>[];
};

const PRODUCTS_CACHE_TTL_MS = 60 * 1000;
let cachedProducts: CachedProducts | null = null;
let cachedProductsPromise: Promise<ReturnType<typeof productToStoreProduct>[]> | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  if (cachedProducts && cachedProducts.expiresAt > now) {
    return res.status(200).json({ products: cachedProducts.products });
  }

  if (!cachedProductsPromise) {
    cachedProductsPromise = (async () => {
      const dataSource = await ensureDataSource({ skipMaintenance: true });
      const productRepository = dataSource.getRepository(Product);
      const products = await productRepository.find({ order: { price: "ASC" } });
      const catalogProducts = products.filter((product) => !(product.tags || []).includes("custom:plan"));
      const publicProducts = catalogProducts.filter((product) => (product.tags || []).includes("public"));
      return (publicProducts.length > 0 ? publicProducts : catalogProducts).map(productToStoreProduct);
    })().finally(() => {
      cachedProductsPromise = null;
    });
  }

  const products = await cachedProductsPromise;
  cachedProducts = { products, expiresAt: now + PRODUCTS_CACHE_TTL_MS };

  return res.status(200).json({
    products,
  });
}
