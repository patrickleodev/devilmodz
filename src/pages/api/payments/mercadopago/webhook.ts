import type { NextApiRequest, NextApiResponse } from "next";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { fetchMercadoPagoPayment } from "../../../../lib/mercadopago";
import { ensureDataSource } from "../../../../lib/db";
import { buildOrderPaidMessage, sendDiscordChannelMessage } from "../../../../lib/discord";

const getPaymentIdFromRequest = (req: NextApiRequest) => {
  if (typeof req.query.id === "string") {
    return req.query.id;
  }

  const body = req.body as { data?: { id?: string | number }; id?: string | number } | undefined;

  if (body?.data?.id !== undefined) {
    return String(body.data.id);
  }

  if (body?.id !== undefined) {
    return String(body.id);
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const paymentId = getPaymentIdFromRequest(req);

  if (!paymentId) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const dataSource = await ensureDataSource();
    const orderRepository = dataSource.getRepository(Order);
    const paymentRepository = dataSource.getRepository(Payment);

    const mpPayment = await fetchMercadoPagoPayment(paymentId);
    const orderId = String(mpPayment.external_reference || mpPayment.metadata?.orderId || "");

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const order = await orderRepository.findOneBy({ id: orderId });

    if (!order) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    let payment = await paymentRepository.findOne({
      where: {
        orderId: order.id,
        provider: "mercadopago",
      },
    });

    if (!payment) {
      payment = paymentRepository.create({
        orderId: order.id,
        provider: "mercadopago",
        providerPaymentId: String(mpPayment.id),
        status: mpPayment.status,
        rawPayload: mpPayment,
      });
    } else {
      payment.providerPaymentId = String(mpPayment.id);
      payment.status = mpPayment.status;
      payment.rawPayload = mpPayment;
    }

    if (mpPayment.status === "approved") {
      order.status = "paid";
      payment.confirmedAt = mpPayment.date_approved ? new Date(mpPayment.date_approved) : new Date();
    } else {
      order.status = mpPayment.status;
    }

    await paymentRepository.save(payment);
    await orderRepository.save(order);

    if (mpPayment.status === "approved") {
      await sendDiscordChannelMessage(
        buildOrderPaidMessage({
          orderId: order.id,
          productTitle: order.productId,
          amount: order.amount,
        })
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
