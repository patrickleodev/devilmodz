import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { CartItem } from "../../../entities/CartItem";
import { resolveDbUser } from "../../../lib/session";

const cartItemToResponse = (item: CartItem) => ({
  ...item,
  product: item.productId
    ? null
    : {
        id: null,
        title: item.itemTitle,
        description: item.itemDescription,
        price: item.itemPrice,
        deliveryType: item.itemDeliveryType,
        tags: item.itemTags || [],
      },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  const { milhoes, trajes, carros } = req.body as {
    milhoes?: number;
    trajes?: number;
    carros?: number;
    nivelPersonalizado?: boolean;
  };
  const nivelPersonalizado = req.body?.nivelPersonalizado === true;

  if (typeof milhoes !== "number" || typeof trajes !== "number" || typeof carros !== "number") {
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
  const price = steps * 14.9 + trajes * 0.95 + carros * 2.9 + (nivelPersonalizado ? 6 : 0);

  if (price < 2) {
    return res.status(400).json({ error: "Total must be at least R$ 2.00" });
  }

  try {
    const dataSource = await ensureDataSource();
    const dbUser = await resolveDbUser(sessionUser);

    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const cartRepo = dataSource.getRepository(CartItem);
    const itemTags = [
      "custom:plan",
      "badge:Personalizado",
      `money:${milhoes}`,
      `clothes:${trajes}`,
      `cars:${carros}`,
      ...(nivelPersonalizado ? ["level:custom"] : []),
    ];
    const cartItem = cartRepo.create({
      userId: dbUser.id,
      productId: null,
      itemTitle: "Plano Personalizado GTA",
      itemDescription: "Plano personalizado com configuracoes customizadas",
      itemPrice: price,
      itemDeliveryType: "automatic",
      itemTags,
      quantity: 1,
    });

    await cartRepo.save(cartItem);

    const cartItems = await cartRepo.find({ where: { userId: dbUser.id } });

    return res.status(200).json({
      success: true,
      cartItemId: cartItem.id,
      items: cartItems.map(cartItemToResponse),
      message: "Plano adicionado ao carrinho",
    });
  } catch (error) {
    console.error("[API] /api/cart/personalized error:", error);
    return res.status(500).json({ error: "Failed to add personalized plan to cart" });
  }
}
