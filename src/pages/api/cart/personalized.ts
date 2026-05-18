import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { CartItem } from "../../../entities/CartItem";
import { Product } from "../../../entities/Product";
import { resolveDbUser } from "../../../lib/session";
import { In } from "typeorm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  const { milhoes, trajes, carros } = req.body as {
    milhoes?: number;
    trajes?: number;
    carros?: number;
  };

  // Validation
  if (
    typeof milhoes !== "number" ||
    typeof trajes !== "number" ||
    typeof carros !== "number"
  ) {
    return res.status(400).json({ error: "Invalid input: milhoes, trajes, and carros are required" });
  }

  if (milhoes < 0 || milhoes > 3000 || milhoes % 30 !== 0) {
    return res.status(400).json({ error: "Invalid milhoes: must be 0-3000, step 30" });
  }

  if (trajes < 0 || trajes > 100) {
    return res.status(400).json({ error: "Invalid trajes: must be 0-100" });
  }

  if (carros < 0 || carros > 200) {
    return res.status(400).json({ error: "Invalid carros: must be 0-200" });
  }

  const steps = Math.max(0, milhoes / 30);
  const PRICE_PER_STEP = 14.9;
  const PRICE_PER_TRAJE = 0.95;
  const PRICE_PER_CARRO = 2.9;
  const price = steps * PRICE_PER_STEP + trajes * PRICE_PER_TRAJE + carros * PRICE_PER_CARRO;

  if (price < 2) {
    return res.status(400).json({ error: "Total must be at least R$ 2.00" });
  }

  try {
    const dataSource = await ensureDataSource();
    const dbUser = await resolveDbUser(sessionUser);

    if (!dbUser) return res.status(404).json({ error: "User not found" });

    // Create temporary product with generic title for checkout, details in tags for admin
    const productQuery = await dataSource.query(
      `INSERT INTO "products" ("title", "description", "price", "deliveryType", "tags", "stock", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING "id"`,
      [
        "Plano Personalizado GTA",
        "Produto personalizado com configurações customizadas",
        price,
        "automatic",
        `custom:plan,money:${milhoes},clothes:${trajes},cars:${carros}`,
        1,
      ]
    );

    const productId = productQuery[0].id;

    // Add to cart
    const cartRepo = dataSource.getRepository(CartItem);
    const cartItem = cartRepo.create({
      userId: dbUser.id,
      productId,
      quantity: 1,
    });

    await cartRepo.save(cartItem);

    const cartItems = await cartRepo.find({ where: { userId: dbUser.id } });
    const productIds = [...new Set(cartItems.map((item) => item.productId))];
    const products = productIds.length
      ? await dataSource.getRepository(Product).find({ where: { id: In(productIds) } })
      : [];
    const productsById = new Map(products.map((product) => [product.id, product]));

    return res.status(200).json({
      success: true,
      productId,
      cartItemId: cartItem.id,
      items: cartItems.map((item) => ({
        ...item,
        product: productsById.get(item.productId) || null,
      })),
      message: "Plano adicionado ao carrinho",
    });
  } catch (error) {
    console.error("[API] /api/cart/personalized error:", error);
    return res.status(500).json({ error: "Failed to add personalized plan to cart" });
  }
}
