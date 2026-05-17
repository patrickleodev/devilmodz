import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { ensureDataSource } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";
import { archiveThread, createOrderTicketThread } from "../../../../lib/discord";
import { refundInfinitePayTransaction } from "../../../../lib/infinitepay";

type TicketOrderDetails = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  status: string;
  discordThreadId?: string | null;
  discordThreadUrl?: string | null;
  userEmail?: string | null;
  userDiscordId?: string | null;
  productTitle?: string | null;
};

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
      const payment = await paymentRepository.findOneBy({ orderId: order.id, provider: "infinitepay" });

      if (!payment?.providerPaymentId) {
        return res.status(400).json({ error: "Payment not found for refund" });
      }

      await refundInfinitePayTransaction(payment.providerPaymentId);
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

    if (action === "open-ticket") {
      const [details] = (await dataSource.query(
        `
        SELECT
          o."id",
          o."userId",
          o."productId",
          o."amount"::float AS "amount",
          o."status",
          o."discordThreadId",
          o."discordThreadUrl",
          u."email" AS "userEmail",
          u."discordId" AS "userDiscordId",
          p."title" AS "productTitle"
        FROM "orders" o
        LEFT JOIN "users" u ON u."id" = o."userId"
        LEFT JOIN "products" p ON p."id" = o."productId"
        WHERE o."id" = $1
        LIMIT 1
        `,
        [order.id]
      )) as TicketOrderDetails[];

      if (!details) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (details.discordThreadId && details.discordThreadUrl) {
        return res.status(200).json({ order, threadUrl: details.discordThreadUrl });
      }

      const ticket = await createOrderTicketThread({
        orderId: details.id,
        productTitle: details.productTitle || "Produto",
        amount: details.amount,
        mention: details.userDiscordId ? `<@${details.userDiscordId}>` : null,
        userEmail: details.userEmail || null,
      });

      if (!ticket?.threadId) {
        return res.status(500).json({ error: "Failed to create ticket" });
      }

      order.discordThreadId = ticket.threadId;
      order.discordThreadUrl = ticket.threadUrl || undefined;
      const updatedOrder = await orderRepository.save(order);
      return res.status(200).json({ order: updatedOrder, threadUrl: ticket.threadUrl });
    }

    if (action === "close-ticket") {
      if (!order.discordThreadId) {
        return res.status(400).json({ error: "No ticket to close" });
      }

      const ok = await archiveThread(order.discordThreadId);

      if (!ok) {
        return res.status(500).json({ error: "Failed to archive thread" });
      }

      order.discordThreadId = undefined;
      order.discordThreadUrl = undefined;
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
