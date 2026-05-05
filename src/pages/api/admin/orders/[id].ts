import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { ensureDataSource } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";
import { refundMercadoPagoPayment } from "../../../../lib/mercadopago";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  if (!isAdminRole(sessionUser?.roles)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const id = req.query.id;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid order id" });
  }

  const dataSource = await ensureDataSource();
  const orderRepository = dataSource.getRepository(Order);
  const paymentRepository = dataSource.getRepository(Payment);
  const order = await orderRepository.findOneBy({ id });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (req.method === "PATCH") {
    const { status, action } = req.body as { status?: string; action?: string };

    if (action === "refund") {
      const payment = await paymentRepository.findOneBy({ orderId: order.id, provider: "mercadopago" });

      if (!payment?.providerPaymentId) {
        return res.status(400).json({ error: "Payment not found for refund" });
      }

      await refundMercadoPagoPayment(payment.providerPaymentId);
      order.status = "refunded";
      payment.status = "refunded";
      await paymentRepository.save(payment);
      const updatedOrder = await orderRepository.save(order);
      return res.status(200).json({ order: updatedOrder });
    }

    if (action === "deliver") {
      order.status = "delivered";
      const updatedOrder = await orderRepository.save(order);
      return res.status(200).json({ order: updatedOrder });
    }

    if (typeof status === "string") {
      order.status = status;
      const updatedOrder = await orderRepository.save(order);
      return res.status(200).json({ order: updatedOrder });
    }

    return res.status(400).json({ error: "Nothing to update" });
  }

  if (req.method === "GET") {
    return res.status(200).json({ order });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).json({ error: "Method not allowed" });
}
