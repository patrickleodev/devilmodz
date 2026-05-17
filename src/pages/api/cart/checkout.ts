import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { CartItem } from "../../../entities/CartItem";
import { Product } from "../../../entities/Product";
import { Order } from "../../../entities/Order";
import { Payment } from "../../../entities/Payment";
import { createCheckoutLink, getAppBaseUrl } from "../../../lib/infinitepay";
import { sendDiscordChannelMessage, buildOrderCreatedMessage } from "../../../lib/discord";
import { User } from "../../../entities/User";
import { resolveDbUser } from "../../../lib/session";
import { products as storeProducts } from "../../../lib/products";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const ds = await ensureDataSource();
    const cartRepo = ds.getRepository(CartItem);
    const productRepo = ds.getRepository(Product);
    const orderRepo = ds.getRepository(Order);
    const paymentRepo = ds.getRepository(Payment);

    const dbUser = await resolveDbUser(sessionUser);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const items = await cartRepo.find({ where: { userId: dbUser.id } });
    if (!items || items.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // load product details and build MP items
    const mpItems: any[] = [];
    const createdOrders: string[] = [];
    let total = 0;

    for (const it of items) {
      const product = await productRepo.findOneBy({ id: it.productId });
      if (!product) continue;
      const selectedCatalogPlan = storeProducts.find((plan) => plan.name === product.title || plan.id === product.id);
      const unitPrice = selectedCatalogPlan?.price ?? product.price;
      const amount = unitPrice * it.quantity;
      total += amount;

      // Use raw SQL insert to avoid TypeORM attempting to write columns that may not exist
      const insertRes = await ds.query(
        `INSERT INTO "orders" ("userId", "productId", "amount", "status") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [dbUser.id, product.id, amount, "pending"]
      );

      const savedId = insertRes?.[0]?.id as string | undefined;
      if (savedId) createdOrders.push(savedId);

      mpItems.push({ id: product.id, title: product.title, quantity: it.quantity, unit_price: unitPrice, currency_id: "BRL" });
    }

    if (mpItems.length === 0) return res.status(400).json({ error: "No valid products in cart" });

    const notificationUrl = `${getAppBaseUrl()}/api/payments/infinitepay/webhook`;

    // Build InfinitePay items
    const ipItems = mpItems.map((it) => ({ description: it.title, quantity: it.quantity, price: Math.round(it.unit_price * 100) }));

    // Use Links API to create a hosted checkout link (more stable/public)
    const handle = process.env.INFINITEPAY_TAG;
    if (!handle) return res.status(500).json({ error: "INFINITEPAY_TAG not configured" });

    const payload: Record<string, unknown> = {
      handle,
      items: ipItems,
      order_nsu: createdOrders.join(","),
      webhook_url: notificationUrl,
      redirect_url: `${getAppBaseUrl()}/`,
    };

    const checkoutRes = await createCheckoutLink(payload);

    // attach provider id to first order if available (use raw UPDATE)
    const firstOrderId = createdOrders[0];
    if (firstOrderId) {
      await ds.query(
        `UPDATE "orders" SET "mpPreferenceId" = $2 WHERE "id" = $1`,
        [firstOrderId, (checkoutRes as any).id || ""]
      );
    }

    await paymentRepo.save(paymentRepo.create({ orderId: firstOrderId || "", provider: "infinitepay", providerPaymentId: (checkoutRes as any).id || "", status: "pending", rawPayload: checkoutRes }));

    const paymentUrl = (checkoutRes as any).url || (checkoutRes as any).link || ((checkoutRes as any).slug ? `https://checkout.infinitepay.io/${handle}/${(checkoutRes as any).slug}` : undefined);

    return res.status(200).json({ orderIds: createdOrders, provider: "infinitepay", paymentUrl, initPoint: paymentUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
