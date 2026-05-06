import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { Product } from "../../../../entities/Product";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { createInfinitePayCheckout, getAppBaseUrl } from "../../../../lib/infinitepay";
import { ensureDataSource } from "../../../../lib/db";
import { sendDiscordChannelMessage, buildOrderCreatedMessage } from "../../../../lib/discord";
import { User } from "../../../../entities/User";

type CheckoutBody = {
  productId?: string;
  quantity?: number;
};

const PRODUCT_ALIASES: Record<string, string> = {
  starter: "Pacote Starter",
  pro: "Pacote Pro",
  elite: "Pacote Elite",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const orderRepository = dataSource.getRepository(Order);
    const paymentRepository = dataSource.getRepository(Payment);
    const userRepository = dataSource.getRepository(User);

    // Look up user by Discord ID to get their UUID
    const dbUser = await userRepository.findOneBy({ discordId: sessionUser.id });
    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const product = UUID_PATTERN.test(productId)
      ? await productRepository.findOneBy({ id: productId })
      : await productRepository.findOneBy({ title: PRODUCT_ALIASES[productId] || productId });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const amount = product.price * quantity;
    const order = orderRepository.create({
      userId: dbUser.id,
      productId: product.id,
      amount,
      status: "pending",
    });

    const savedOrder = await orderRepository.save(order);
    const notificationUrl = `${getAppBaseUrl()}/api/payments/infinitepay/webhook`;

    const checkout = await createInfinitePayCheckout({
      externalReference: savedOrder.id,
      notificationUrl,
      items: [
        {
          name: product.title,
          quantity,
          price: product.price,
        },
      ],
      payerEmail: session?.user?.email || undefined,
      payerName: session?.user?.name || undefined,
      metadata: {
        orderId: savedOrder.id,
        productId: product.id,
        userId: dbUser.id,
      },
    });

    savedOrder.mpPreferenceId = checkout.id; // reuse field for InfinitePay checkout ID
    await orderRepository.save(savedOrder);

    await paymentRepository.save(
      paymentRepository.create({
        orderId: savedOrder.id,
        provider: "infinitepay",
        providerPaymentId: checkout.id,
        status: "pending",
        rawPayload: checkout,
      })
    );

    // notify Discord channel about created order (mention user if discordId available)
    try {
      const mention = dbUser.discordId ? `<@${dbUser.discordId}>` : null;
      await sendDiscordChannelMessage(
        buildOrderCreatedMessage({
          orderId: savedOrder.id,
          productTitle: product.title,
          amount,
          mention,
          userEmail: session?.user?.email || null,
        })
      );
    } catch (notifyErr) {
      // ignore notification failures
      // eslint-disable-next-line no-console
      console.warn("Discord notify failed:", notifyErr);
    }

    return res.status(200).json({
      orderId: savedOrder.id,
      checkoutId: checkout.id,
      checkoutUrl: checkout.url,
      qrCode: checkout.qrCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
