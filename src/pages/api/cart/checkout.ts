import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { CartItem } from "../../../entities/CartItem";
import { Product } from "../../../entities/Product";
import { Payment } from "../../../entities/Payment";
import { createCheckoutLink, getAppBaseUrl } from "../../../lib/infinitepay";
import { resolveDbUser } from "../../../lib/session";

type CheckoutResponse = {
  id?: string;
  url?: string;
  link?: string;
  slug?: string;
};

type CheckoutItem = {
  productId: string | null;
  title: string;
  description: string | null;
  deliveryType: string | null;
  tags: string | null;
  unitPrice: number;
  quantity: number;
  amount: number;
};

const serializeTags = (tags: Product["tags"] | string | null | undefined) =>
  Array.isArray(tags)
    ? tags.join(",")
    : typeof tags === "string"
      ? tags
      : null;

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
    const paymentRepo = ds.getRepository(Payment);

    const dbUser = await resolveDbUser(sessionUser);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const items = await cartRepo.find({ where: { userId: dbUser.id } });
    if (!items || items.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // load item details and build checkout items
    const mpItems: Array<{ id: string; title: string; quantity: number; unit_price: number; currency_id: "BRL" }> = [];
    const createdOrders: string[] = [];

    for (const it of items) {
      const product = it.productId ? await productRepo.findOneBy({ id: it.productId }) : null;
      const checkoutItem: CheckoutItem | null = product
        ? {
            productId: product.id,
            title: product.title,
            description: product.description,
            deliveryType: product.deliveryType,
            tags: serializeTags(product.tags),
            unitPrice: Number(product.price || 0),
            quantity: it.quantity,
            amount: Number(product.price || 0) * it.quantity,
          }
        : it.itemTitle && it.itemPrice
          ? {
              productId: null,
              title: it.itemTitle,
              description: it.itemDescription || null,
              deliveryType: it.itemDeliveryType || null,
              tags: serializeTags(it.itemTags),
              unitPrice: Number(it.itemPrice || 0),
              quantity: it.quantity,
              amount: Number(it.itemPrice || 0) * it.quantity,
            }
          : null;

      if (!checkoutItem) continue;

      // Use raw SQL insert to avoid TypeORM attempting to write columns that may not exist
      const insertRes = await ds.query(
        `INSERT INTO "orders" (
           "userId",
           "productId",
           "amount",
           "status",
           "productTitle",
           "productDescription",
           "productDeliveryType",
           "productTags"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING "id"`,
        [
          dbUser.id,
          checkoutItem.productId,
          checkoutItem.amount,
          "pending",
          checkoutItem.title,
          checkoutItem.description,
          checkoutItem.deliveryType,
          checkoutItem.tags,
        ]
      );

      const savedId = insertRes?.[0]?.id as string | undefined;
      if (savedId) createdOrders.push(savedId);

      mpItems.push({
        id: checkoutItem.productId || savedId || it.id,
        title: checkoutItem.title,
        quantity: checkoutItem.quantity,
        unit_price: checkoutItem.unitPrice,
        currency_id: "BRL",
      });
    }

    if (mpItems.length === 0) return res.status(400).json({ error: "No valid products in cart" });

    const notificationUrl = `${getAppBaseUrl()}/api/payments/infinitepay/webhook`;

    // Build InfinitePay items
    const ipItems = mpItems.map((it) => ({ description: it.title, quantity: it.quantity, price: Math.round(it.unit_price * 100) }));

    // Use Links API to create a hosted checkout link (more stable/public)
    const handle = process.env.INFINITEPAY_TAG;
    if (!handle) return res.status(500).json({ error: "INFINITEPAY_TAG not configured" });

    const firstOrderId = createdOrders[0];

    const payload: Record<string, unknown> = {
      handle,
      items: ipItems,
      order_nsu: firstOrderId,
      metadata: { orderId: firstOrderId, orderIds: createdOrders.join(",") },
      webhook_url: notificationUrl,
      redirect_url: `${getAppBaseUrl()}/`,
    };

    const checkoutRes = (await createCheckoutLink(payload)) as CheckoutResponse;
    const paymentUrl = checkoutRes.url || checkoutRes.link || (checkoutRes.slug ? `https://checkout.infinitepay.io/${handle}/${checkoutRes.slug}` : undefined);
    const providerPaymentId = checkoutRes.id || paymentUrl || checkoutRes.link || checkoutRes.slug || "";

    // attach provider id to all orders (use raw UPDATE)
    if (createdOrders.length > 0) {
      await ds.query(
        `UPDATE "orders" SET "mpPreferenceId" = $2 WHERE "id" = ANY($1::uuid[])`,
        [createdOrders, providerPaymentId]
      );
    }

    // Create payment records for ALL orders in the cart
    for (const orderId of createdOrders) {
      await paymentRepo.save(
        paymentRepo.create({
          orderId,
          provider: "infinitepay",
          providerPaymentId,
          status: "pending",
          rawPayload: { request: payload, response: checkoutRes, paymentUrl },
        })
      );
    }

    // Clear the cart after checkout
    await cartRepo.delete({ userId: dbUser.id });

    return res.status(200).json({ orderIds: createdOrders, provider: "infinitepay", paymentUrl, initPoint: paymentUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
