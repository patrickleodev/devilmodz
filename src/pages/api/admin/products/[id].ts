import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { Product } from "../../../../entities/Product";
import { ensureDataSource } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  if (!isAdminRole(sessionUser?.roles)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const id = req.query.id;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid product id" });
  }

  const dataSource = await ensureDataSource();
  const productRepository = dataSource.getRepository(Product);
  const product = await productRepository.findOneBy({ id });

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (req.method === "PATCH") {
    const { title, description, price, stock, deliveryType, tags } = req.body as {
      title?: string;
      description?: string;
      price?: number;
      stock?: number;
      deliveryType?: string;
      tags?: string[];
    };

    if (typeof title === "string") product.title = title;
    if (typeof description === "string") product.description = description;
    if (typeof price === "number") product.price = price;
    if (typeof stock === "number") product.stock = stock;
    if (typeof deliveryType === "string") product.deliveryType = deliveryType;
    if (Array.isArray(tags)) product.tags = tags;

    const updatedProduct = await productRepository.save(product);
    return res.status(200).json({ product: updatedProduct });
  }

  if (req.method === "DELETE") {
    await productRepository.remove(product);
    return res.status(204).end();
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}
