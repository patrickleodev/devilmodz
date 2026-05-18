import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { DeliveryLog } from "../../../../entities/DeliveryLog";
import { ensureDataSource } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";
import { closeTicketAndGetTranscript, createOrderTicketThread } from "../../../../lib/discord";
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
  userName?: string | null;
  productTitle?: string | null;
};

const readStringValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const looksLikeCheckoutUrl = (value: string) => {
  const lower = value.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://") || lower.includes("checkout.infinitepay.io");
};

const resolveRefundTransactionId = (payment: Payment): string | null => {
  const raw = (payment.rawPayload || {}) as Record<string, unknown>;
  const candidates: Array<string | null> = [
    readStringValue(raw.transactionId),
    readStringValue(raw.transaction_id),
    readStringValue(raw.transaction_nsu),
    readStringValue(raw.id),
    readStringValue((raw.data as Record<string, unknown> | undefined)?.id),
    readStringValue(payment.providerPaymentId),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (looksLikeCheckoutUrl(candidate)) continue;
    return candidate;
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const sessionUser = session?.user as { roles?: string[]; email?: string } | undefined;

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
    const deliveryLogRepository = dataSource.getRepository(DeliveryLog);
    const order = await orderRepository.findOneBy({ id });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (req.method === "PATCH") {
      const { status, action } = req.body as { status?: string; action?: string };

      if (action === "refund") {
        const payment = await paymentRepository.findOneBy({ orderId: order.id, provider: "infinitepay" });

        if (!payment) {
          return res.status(400).json({ error: "Payment not found for refund" });
        }

        const transactionId = resolveRefundTransactionId(payment);
        if (!transactionId) {
          return res.status(400).json({
            error:
              "Nao foi possivel identificar o transactionId da InfinitePay para reembolso automatico. Atualize o pagamento via webhook ou faça o reembolso manual no painel da InfinitePay.",
          });
        }

        try {
          await refundInfinitePayTransaction(transactionId);
        } catch (refundErr) {
          const message = refundErr instanceof Error ? refundErr.message : String(refundErr);
          if (message.toLowerCase().includes("fetch failed")) {
            return res.status(400).json({
              error:
                "A InfinitePay nao disponibilizou o reembolso automatico pela API para esta venda. Cancele a venda no App/Web InfinitePay e, depois de confirmado, altere o status do pedido para refunded no seletor.",
            });
          }

          return res.status(502).json({ error: `Falha ao solicitar reembolso na InfinitePay: ${message}` });
        }

        order.status = "refunded";
        payment.status = "refunded";
        payment.providerPaymentId = transactionId;
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
          u."name" AS "userName",
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
        userName: details.userName || null,
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

      const closeResult = await closeTicketAndGetTranscript(order.discordThreadId);

      if (!closeResult.ok) {
        return res.status(500).json({ error: "Failed to archive thread" });
      }

      await deliveryLogRepository.save(
        deliveryLogRepository.create({
          orderId: order.id,
          deliveredBy: `admin:${session?.user?.email || "unknown"}`,
          message: JSON.stringify({
            type: "ticket_transcript",
            source: "admin-close-ticket",
            threadId: order.discordThreadId,
            closedAt: new Date().toISOString(),
            messageCount: closeResult.messageCount,
            transcript: closeResult.transcript || "",
          }),
        })
      );

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
