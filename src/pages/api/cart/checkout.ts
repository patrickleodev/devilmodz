import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { CartItem } from "../../../entities/CartItem";
import { Product } from "../../../entities/Product";
import { Order } from "../../../entities/Order";
import { Payment } from "../../../entities/Payment";
import { createMercadoPagoPreference, getAppBaseUrl, getMercadoPagoCheckoutMode, getMercadoPagoCheckoutUrl } from "../../../lib/mercadopago";
import { sendDiscordChannelMessage, buildOrderCreatedMessage } from "../../../lib/discord";
import { User } from "../../../entities/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const items = await cartRepo.find({ where: { userId: sessionUser.id } });
    if (!items || items.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // load product details and build MP items
    const mpItems: any[] = [];
    const createdOrders: string[] = [];
    let total = 0;

    for (const it of items) {
      const product = await productRepo.findOneBy({ id: it.productId });
      if (!product) continue;
      const amount = product.price * it.quantity;
      total += amount;

      const order = orderRepo.create({ userId: sessionUser.id, productId: product.id, amount, status: "pending" });
      const saved = await orderRepo.save(order);
      createdOrders.push(saved.id);

      mpItems.push({ id: product.id, title: product.title, quantity: it.quantity, unit_price: product.price, currency_id: "BRL" });
    }

    if (mpItems.length === 0) return res.status(400).json({ error: "No valid products in cart" });

    const notificationUrl = `${getAppBaseUrl()}/api/payments/mercadopago/webhook`;
    const preference = await createMercadoPagoPreference({
      externalReference: createdOrders.join(","),
      notificationUrl,
      metadata: { orderIds: createdOrders, userId: sessionUser.id },
      payerEmail: session?.user?.email || undefined,
      items: mpItems,
    });

    // attach preference to first order
    const firstOrderId = createdOrders[0];
    if (firstOrderId) {
      const first = await orderRepo.findOneBy({ id: firstOrderId });
      if (first) {
        first.mpPreferenceId = preference.id;
        await orderRepo.save(first);
      }
    }

    await paymentRepo.save(paymentRepo.create({ orderId: firstOrderId || "", provider: "mercadopago", providerPaymentId: preference.id, status: "pending", rawPayload: preference }));

    // notify Discord channel about created orders (mention user if possible)
    try {
      const userRepo = ds.getRepository(User);
      const dbUser = await userRepo.findOneBy({ id: sessionUser.id });
      const mention = dbUser?.discordId ? `<@${dbUser.discordId}>` : null;
      const firstProduct = mpItems[0];
      await sendDiscordChannelMessage(
        buildOrderCreatedMessage({ orderId: firstOrderId || "", productTitle: firstProduct?.title || "", amount: total, mention, userEmail: session?.user?.email || null })
      );
    } catch (notifyErr) {
      // ignore notification errors
      // eslint-disable-next-line no-console
      console.warn("Discord notify failed:", notifyErr);
    }

    // clear cart
    await Promise.all(items.map((it) => cartRepo.delete({ id: it.id } as any)));

    const paymentUrl = getMercadoPagoCheckoutUrl(preference);
    const checkoutMode = getMercadoPagoCheckoutMode();

    return res.status(200).json({ orderIds: createdOrders, preferenceId: preference.id, paymentUrl, checkoutMode, initPoint: preference.init_point, sandboxInitPoint: preference.sandbox_init_point });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
