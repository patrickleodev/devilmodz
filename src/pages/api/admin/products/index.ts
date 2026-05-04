import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { Product } from "../../../../entities/Product";
import { ensureDataSource } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  if (!isAdminRole(sessionUser?.roles)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const dataSource = await ensureDataSource();
  const productRepository = dataSource.getRepository(Product);

  if (req.method === "GET") {
    const products = await productRepository.find({ order: { createdAt: "DESC" } });
    return res.status(200).json({ products });
  }

  if (req.method === "POST") {
    const { title, description, price, stock, deliveryType, tags } = req.body as {
      title?: string;
      description?: string;
      price?: number;
      stock?: number;
      deliveryType?: string;
      tags?: string[];
    };

    if (!title || !description || typeof price !== "number") {
      return res.status(400).json({ error: "title, description and price are required" });
    }

    const product = productRepository.create({
      title,
      description,
      price,
      stock: typeof stock === "number" ? stock : 0,
      deliveryType: deliveryType || "manual",
      tags: Array.isArray(tags) ? tags : [],
    });

    const savedProduct = await productRepository.save(product);
    return res.status(201).json({ product: savedProduct });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
