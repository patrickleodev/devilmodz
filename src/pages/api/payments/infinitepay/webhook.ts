import type { NextApiRequest, NextApiResponse } from "next";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { Product } from "../../../../entities/Product";
import { ensureDataSource } from "../../../../lib/db";
import { createOrderTicketThread } from "../../../../lib/discord";
import { User } from "../../../../entities/User";

const getTransactionIdFromRequest = (req: NextApiRequest) => {
  // InfinitePay sends transaction ID in different ways depending on webhook type
  const body = req.body as
    | { transactionId?: string; transaction_id?: string; data?: { id?: string } }
    | undefined;

  if (body?.transactionId) {
    return body.transactionId;
  }

  if (body?.transaction_id) {
    return body.transaction_id;
  }

  if (body?.data?.id) {
    return body.data.id;
  }

  return null;
};

const getCheckoutIdFromRequest = (req: NextApiRequest) => {
  const body = req.body as { checkoutId?: string; checkout_id?: string } | undefined;

  return body?.checkoutId || body?.checkout_id || null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[InfinitePay Webhook] Recebido request:", req.method);
  
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const transactionId = getTransactionIdFromRequest(req);
  const checkoutId = getCheckoutIdFromRequest(req);

  console.log("[InfinitePay Webhook] Transaction ID:", transactionId, "Checkout ID:", checkoutId);
  
  if (!transactionId && !checkoutId) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const dataSource = await ensureDataSource();
    const orderRepository = dataSource.getRepository(Order);
    const paymentRepository = dataSource.getRepository(Payment);
    const productRepository = dataSource.getRepository(Product);
    const userRepository = dataSource.getRepository(User);

    // If we have checkoutId, find payment by it
    let payment = checkoutId
      ? await paymentRepository.findOne({
          where: {
            provider: "infinitepay",
            providerPaymentId: checkoutId,
          },
        })
      : null;

    // If we have transactionId, fetch the actual transaction
    if (!payment && transactionId) {
      payment = await paymentRepository.findOne({
        where: {
          provider: "infinitepay",
          providerPaymentId: transactionId,
        },
      });
    }

    if (!payment) {
      // Use webhook payload directly since we don't have API authentication
      if (transactionId) {
        const transaction = req.body as any;
        // Prefer explicit metadata.orderId when available
        const orderId = String(transaction.metadata?.orderId || "");

        let order = null;

        if (orderId) {
          order = await orderRepository.findOneBy({ id: orderId });
        }

        // If no orderId in metadata, attempt heuristic reconciliation
        if (!order) {
          // Try match by customer email if available
          const payerEmail = (transaction.metadata && (transaction.metadata.payerEmail || transaction.metadata.email)) || (transaction as any).customer?.email || null;

          if (payerEmail) {
            const userRepo = dataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { email: payerEmail } });
            if (user) {
              const txAmtRaw = (transaction as any).amount || (transaction as any).transaction_amount || 0;
              const candidate = await orderRepository.findOne({ where: { userId: user.id, amount: Math.round(txAmtRaw / 100) || txAmtRaw, status: "pending" }, order: { createdAt: "DESC" } });
              if (candidate) order = candidate;
            }
          }

          // Fallback: match by amount + recent time window (30 minutes)
          if (!order) {
            const txAmount = (transaction as any).amount || (transaction as any).transaction_amount || 0; // likely in cents
            const amountCandidates = [] as number[];
            // possible stored order amounts: in BRL integer (e.g., 49) or cents
            if (txAmount > 1000) {
              amountCandidates.push(Math.round(txAmount / 100)); // convert cents to BRL
            }
            amountCandidates.push(txAmount); // also try as-is

            const txDate = transaction.createdAt ? new Date(transaction.createdAt) : (transaction as any).approvedAt ? new Date((transaction as any).approvedAt) : new Date();
            const earliest = new Date(txDate.getTime() - 30 * 60 * 1000);
            const latest = new Date(txDate.getTime() + 30 * 60 * 1000);

            for (const amt of amountCandidates) {
              const candidates = await orderRepository.find({ where: { amount: amt, status: "pending" }, order: { createdAt: "DESC" } });
              if (candidates && candidates.length > 0) {
                const match = candidates.find((c) => {
                  const created = new Date(c.createdAt);
                  return created >= earliest && created <= latest;
                });
                if (match) {
                  order = match;
                  break;
                }
              }
            }
          }
        }

        if (!order) {
          return res.status(200).json({ ok: true, ignored: true });
        }

        payment = paymentRepository.create({
          orderId: order.id,
          provider: "infinitepay",
          providerPaymentId: transactionId,
          status: transaction.status,
          rawPayload: transaction,
        });
      } else {
        return res.status(200).json({ ok: true, ignored: true });
      }
    }

    const order = await orderRepository.findOneBy({ id: payment.orderId });

    if (!order) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Update payment status based on InfinitePay transaction status
    const newStatus = mapInfinitePayStatusToOrderStatus(payment.status || "");

    payment.status = newStatus;
    payment.rawPayload = { ...payment.rawPayload, ...req.body };

    if (newStatus === "paid" || newStatus === "completed") {
      console.log("[InfinitePay Webhook] Pagamento confirmado para ordem:", order.id);
      order.status = "completed";
      payment.confirmedAt = payment.confirmedAt || new Date();

      if (!order.discordThreadId) {
        try {
          console.log("[InfinitePay Webhook] Iniciando criação de ticket Discord");
          const [product, dbUser] = await Promise.all([
            productRepository.findOneBy({ id: order.productId }),
            userRepository.findOneBy({ id: order.userId }),
          ]);

          const ticket = await createOrderTicketThread({
            orderId: order.id,
            productTitle: product?.title || "Unknown Product",
            amount: order.amount,
            mention: dbUser?.discordId ? `<@${dbUser.discordId}>` : null,
            userEmail: dbUser?.email || null,
            providerLabel: "InfinitePay",
          });

          if (ticket?.threadId) {
            order.discordThreadId = ticket.threadId;
            order.discordThreadUrl = ticket.threadUrl || undefined;
          }
        } catch (notifyErr) {
          // eslint-disable-next-line no-console
          console.error("Discord ticket creation failed:", notifyErr instanceof Error ? notifyErr.message : notifyErr);
        }
      }
    }

    await paymentRepository.save(payment);
    await orderRepository.save(order);

    return res.status(200).json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("InfinitePay webhook error:", error);
    return res.status(200).json({ ok: true }); // Always return 200 to prevent retries
  }
}

function mapInfinitePayStatusToOrderStatus(infinitePayStatus: string): string {
  const statusMap: Record<string, string> = {
    approved: "completed",
    confirmed: "completed",
    paid: "completed",
    completed: "completed",
    pending: "pending",
    pending_authorization: "pending",
    processing: "pending",
    canceled: "canceled",
    cancelled: "canceled",
    declined: "canceled",
    failed: "canceled",
    error: "canceled",
    expired: "canceled",
    chargedback: "canceled",
  };

  return statusMap[infinitePayStatus.toLowerCase()] || "pending";
}
