import type { NextApiRequest, NextApiResponse } from "next";
import { ensureDataSource } from "../../lib/db";
import { Product } from "../../entities/Product";
import { productToStoreProduct } from "../../lib/catalog";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dataSource = await ensureDataSource();
  const productRepository = dataSource.getRepository(Product);
  const products = await productRepository.find({ order: { price: "ASC" } });
  const catalogProducts = products.filter((product) => !(product.tags || []).includes("custom:plan"));
  const publicProducts = catalogProducts.filter((product) => (product.tags || []).includes("public"));

  return res.status(200).json({
    products: (publicProducts.length > 0 ? publicProducts : catalogProducts).map(productToStoreProduct),
  });
}
