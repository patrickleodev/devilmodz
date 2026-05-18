import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { In } from "typeorm";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { CartItem } from "../../../entities/CartItem";
import { Product } from "../../../entities/Product";
import { resolveDbUser } from "../../../lib/session";
import { findDefaultProductBySlug, getProductSlug, buildProductTags } from "../../../lib/catalog";

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
    const productIds = [
      ...new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id))),
    ];
    const products = productIds.length
      ? await productRepo.find({ where: { id: In(productIds) } })
      : [];
    const productsById = new Map(products.map((product) => [product.id, product]));

    return items.map((item) => ({
      ...item,
      product: item.productId
        ? productsById.get(item.productId) || null
        : {
            id: null,
            title: item.itemTitle,
            description: item.itemDescription,
            price: item.itemPrice,
            deliveryType: item.itemDeliveryType,
            tags: item.itemTags || [],
          },
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

      const isUuid = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      let dbProductId = productId;

      if (!isUuid(productId)) {
        const seedProduct = findDefaultProductBySlug(productId);
        if (!seedProduct) return res.status(400).json({ error: "Unknown product slug" });

        let dbProduct: Product | undefined | null = (await productRepo.find()).find((product) => getProductSlug(product) === productId);
        if (!dbProduct) {
          const createdProduct = productRepo.create({
            title: seedProduct.title,
            description: seedProduct.description,
            price: seedProduct.price,
            stock: seedProduct.stock,
            deliveryType: seedProduct.deliveryType,
            tags: buildProductTags(seedProduct),
          } as Partial<Product>);
          await productRepo.save(createdProduct);
          dbProduct = createdProduct;
        }

        dbProductId = dbProduct.id;
      }

      const existing = await cartRepo.findOneBy({ userId: dbUser.id, productId: dbProductId });
      if (existing) {
        existing.quantity = existing.quantity + qty;
        await cartRepo.save(existing);
      } else {
        const created = cartRepo.create({ userId: dbUser.id, productId: dbProductId, quantity: qty });
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
        const isUuid = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        let dbProductId = productId;
        if (!isUuid(productId)) {
          const dbProd = (await productRepo.find()).find((product) => getProductSlug(product) === productId);
          if (dbProd) dbProductId = dbProd.id;
        }

        await cartRepo.delete({ userId: dbUser.id, productId: dbProductId } as any);
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
