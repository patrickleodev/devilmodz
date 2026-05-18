import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { Product } from "../../../../entities/Product";
import { Payment } from "../../../../entities/Payment";
import { ensureDataSource } from "../../../../lib/db";
import { createCheckoutLink, getAppBaseUrl } from "../../../../lib/infinitepay";
import { sendDiscordChannelMessage, buildOrderCreatedMessage } from "../../../../lib/discord";
import { User } from "../../../../entities/User";
import { getProductSlug } from "../../../../lib/catalog";

type CheckoutBody = {
  productId?: string;
  quantity?: number;
};

type CheckoutResponse = {
  id?: string;
  url?: string;
  link?: string;
  checkout_url?: string;
  slug?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const serializeTags = (tags: Product["tags"] | string | null | undefined) =>
  Array.isArray(tags)
    ? tags.join(",")
    : typeof tags === "string"
      ? tags
      : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;

  if (!sessionUser?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = req.body as CheckoutBody;
  const productId = body.productId;
  const quantity = Math.max(1, Number(body.quantity || 1));

  if (!productId) {
    return res.status(400).json({ error: "productId is required" });
  }

  try {
    const dataSource = await ensureDataSource();
    const productRepository = dataSource.getRepository(Product);
    const paymentRepository = dataSource.getRepository(Payment);
    const userRepository = dataSource.getRepository(User);

    const dbUser = await userRepository.findOneBy({ discordId: sessionUser.id });
    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const product = UUID_PATTERN.test(productId)
      ? await productRepository.findOneBy({ id: productId })
      : (await productRepository.find()).find((item) => getProductSlug(item) === productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const unitPrice = Number(product.price || 0);
    const amount = unitPrice * quantity;
    const result = await dataSource.query(
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
        product.id,
        amount,
        "pending",
        product.title,
        product.description,
        product.deliveryType,
        serializeTags(product.tags),
      ]
    );

    const savedOrderId = result?.[0]?.id as string | undefined;

    if (!savedOrderId) {
      return res.status(500).json({ error: "Failed to create order" });
    }

    const handle = process.env.INFINITEPAY_TAG;
    if (!handle) return res.status(500).json({ error: "INFINITEPAY_TAG not configured" });

    const checkout = (await createCheckoutLink({
      handle,
      items: [{ description: product.title, quantity, price: Math.round(unitPrice * 100) }],
      order_nsu: savedOrderId,
      webhook_url: `${getAppBaseUrl()}/api/payments/infinitepay/webhook`,
      redirect_url: `${getAppBaseUrl()}/`,
    })) as CheckoutResponse;

    const checkoutUrl =
      checkout.url ||
      checkout.link ||
      checkout.checkout_url ||
      (checkout.slug ? `https://checkout.infinitepay.io/${handle}/${checkout.slug}` : undefined);

    await dataSource.query(`UPDATE "orders" SET "mpPreferenceId" = $2 WHERE "id" = $1`, [
      savedOrderId,
      checkout.id || checkoutUrl || "",
    ]);

    await paymentRepository.save(
      paymentRepository.create({
        orderId: savedOrderId,
        provider: "infinitepay",
        providerPaymentId: checkout.id || checkoutUrl || "",
        status: "pending",
        rawPayload: {
          checkoutUrl,
          productId: product.id,
          source: "dynamic-checkout",
          response: checkout,
        },
      })
    );

    try {
      const mention = dbUser.discordId ? `<@${dbUser.discordId}>` : null;
      await sendDiscordChannelMessage(
        buildOrderCreatedMessage({
          orderId: savedOrderId,
          productTitle: product.title,
          amount,
          mention,
          userEmail: session?.user?.email || null,
        })
      );
    } catch (notifyErr) {
      console.warn("Discord notify failed:", notifyErr);
    }

    return res.status(200).json({
      orderId: savedOrderId,
      checkoutUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
