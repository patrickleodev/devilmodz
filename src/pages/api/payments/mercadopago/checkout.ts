import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { Product } from "../../../../entities/Product";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { createMercadoPagoPreference, getAppBaseUrl } from "../../../../lib/mercadopago";
import { ensureDataSource } from "../../../../lib/db";

type CheckoutBody = {
  productId?: string;
  quantity?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;

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

    const product = await productRepository.findOneBy({ id: productId });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const amount = product.price * quantity;
    const order = orderRepository.create({
      userId: sessionUser.id,
      productId: product.id,
      amount,
      status: "pending",
    });

    const savedOrder = await orderRepository.save(order);
    const notificationUrl = `${getAppBaseUrl()}/api/payments/mercadopago/webhook`;

    const preference = await createMercadoPagoPreference({
      externalReference: savedOrder.id,
      notificationUrl,
      metadata: {
        orderId: savedOrder.id,
        productId: product.id,
        userId: sessionUser.id,
      },
      items: [
        {
          id: product.id,
          title: product.title,
          quantity,
          unit_price: product.price,
          currency_id: "BRL",
        },
      ],
    });

    savedOrder.mpPreferenceId = preference.id;
    await orderRepository.save(savedOrder);

    await paymentRepository.save(
      paymentRepository.create({
        orderId: savedOrder.id,
        provider: "mercadopago",
        providerPaymentId: preference.id,
        status: "pending",
        rawPayload: preference,
      })
    );

    return res.status(200).json({
      orderId: savedOrder.id,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
