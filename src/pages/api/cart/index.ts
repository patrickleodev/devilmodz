import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { In } from "typeorm";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { CartItem } from "../../../entities/CartItem";
import { Product } from "../../../entities/Product";
import { resolveDbUser } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  const dataSource = await ensureDataSource();
  const cartRepo = dataSource.getRepository(CartItem);
  const productRepo = dataSource.getRepository(Product);

  const dbUser = await resolveDbUser(sessionUser);
  if (!dbUser) return res.status(404).json({ error: "User not found" });

  const loadCartItems = async () => {
    const items = await cartRepo.find({ where: { userId: dbUser.id } });
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = productIds.length
      ? await productRepo.find({ where: { id: In(productIds) } })
      : [];
    const productsById = new Map(products.map((product) => [product.id, product]));

    return items.map((item) => ({
      ...item,
      product: productsById.get(item.productId) || null,
    }));
  };

  try {
    if (req.method === "GET") {
      return res.status(200).json({ items: await loadCartItems() });
    }

    if (req.method === "POST") {
      const { productId, quantity } = req.body as { productId?: string; quantity?: number };
      if (!productId) return res.status(400).json({ error: "productId required" });
      const qty = Math.max(1, Number(quantity || 1));

      const existing = await cartRepo.findOneBy({ userId: dbUser.id, productId });
      if (existing) {
        existing.quantity = qty;
        await cartRepo.save(existing);
      } else {
        const created = cartRepo.create({ userId: dbUser.id, productId, quantity: qty });
        await cartRepo.save(created);
      }

      return res.status(200).json({ items: await loadCartItems() });
    }

    if (req.method === "DELETE") {
      const { itemId, productId, clearAll } = req.body as { itemId?: string; productId?: string; clearAll?: boolean };

      if (clearAll) {
        await cartRepo.delete({ userId: dbUser.id } as any);
        return res.status(200).json({ ok: true });
      }

      if (!itemId && !productId) return res.status(400).json({ error: "itemId or productId required" });

      if (itemId) {
        await cartRepo.delete({ id: itemId, userId: dbUser.id } as any);
      } else if (productId) {
        await cartRepo.delete({ userId: dbUser.id, productId } as any);
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
