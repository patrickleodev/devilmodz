import type { NextApiRequest, NextApiResponse } from "next";
import { Payment } from "../../../../entities/Payment";
import { Product } from "../../../../entities/Product";
import { ensureDataSource } from "../../../../lib/db";
import { createOrderTicketThread } from "../../../../lib/discord";
import { User } from "../../../../entities/User";

type OrderRow = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  status: string;
  createdAt: Date;
  discordThreadId?: string | null;
  discordThreadUrl?: string | null;
};

const toOrderAmountCandidates = (rawAmount: number) => {
  const candidates = new Set<number>();

  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return [] as number[];
  }

  candidates.add(Number(rawAmount.toFixed(2)));

  if (rawAmount > 1000) {
    candidates.add(Number((rawAmount / 100).toFixed(2)));
  }

  return Array.from(candidates);
};

const getOrderColumnPresence = async (dataSource: Awaited<ReturnType<typeof ensureDataSource>>) => {
  const [columnPresence] = (await dataSource.query(
    `
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'orders'
          AND column_name = 'discordThreadId'
      ) AS "hasDiscordThreadId",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'orders'
          AND column_name = 'discordThreadUrl'
      ) AS "hasDiscordThreadUrl"
    `
  )) as Array<{ hasDiscordThreadId: boolean; hasDiscordThreadUrl: boolean }>;

  return {
    hasDiscordThreadId: Boolean(columnPresence?.hasDiscordThreadId),
    hasDiscordThreadUrl: Boolean(columnPresence?.hasDiscordThreadUrl),
  };
};

const loadOrderById = async (dataSource: Awaited<ReturnType<typeof ensureDataSource>>, id: string) => {
  const presence = await getOrderColumnPresence(dataSource);
  const selectColumns = [`"id"`, `"userId"`, `"productId"`, `"amount"`, `"status"`, `"createdAt"`];

  if (presence.hasDiscordThreadId) selectColumns.push(`"discordThreadId"`);
  if (presence.hasDiscordThreadUrl) selectColumns.push(`"discordThreadUrl"`);

  const [order] = (await dataSource.query(
    `SELECT ${selectColumns.join(", ")}
     FROM "orders"
     WHERE "id" = $1`,
    [id]
  )) as Array<OrderRow>;

  return { order, presence };
};

const updateOrderStatus = async (
  dataSource: Awaited<ReturnType<typeof ensureDataSource>>,
  id: string,
  status: string,
  ticket?: { threadId?: string | null; threadUrl?: string | null }
) => {
  const presence = await getOrderColumnPresence(dataSource);
  const setClauses = [`"status" = $2`];
  const values: Array<string | null> = [id, status];

  if (presence.hasDiscordThreadId && ticket?.threadId) {
    setClauses.push(`"discordThreadId" = $3`);
    values.push(ticket.threadId);
  }

  if (presence.hasDiscordThreadUrl) {
    const urlIndex = values.length + 1;
    setClauses.push(`"discordThreadUrl" = $${urlIndex}`);
    values.push(ticket?.threadUrl || null);
  }

  await dataSource.query(
    `UPDATE "orders"
     SET ${setClauses.join(", ")}
     WHERE "id" = $1`,
    values
  );
};

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
          order = (await loadOrderById(dataSource, orderId)).order;
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
              const userAmountCandidates = toOrderAmountCandidates(txAmtRaw);
              const candidate = (await dataSource.query(
                `SELECT "id", "userId", "productId", "amount", "status", "createdAt"
                 FROM "orders"
                 WHERE "userId" = $1 AND ABS("amount" - $2::numeric) < 0.01 AND "status" = 'pending'
                 ORDER BY "createdAt" DESC
                 LIMIT 1`,
                [user.id, userAmountCandidates[0] || txAmtRaw]
              )) as Array<OrderRow>;
              if (candidate.length > 0) order = candidate[0];
            }
          }

          // Fallback: match by amount + recent time window (30 minutes)
          if (!order) {
            const txAmount = (transaction as any).amount || (transaction as any).transaction_amount || 0; // likely in cents
            const amountCandidates = toOrderAmountCandidates(txAmount);

            const txDate = transaction.createdAt ? new Date(transaction.createdAt) : (transaction as any).approvedAt ? new Date((transaction as any).approvedAt) : new Date();
            const earliest = new Date(txDate.getTime() - 30 * 60 * 1000);
            const latest = new Date(txDate.getTime() + 30 * 60 * 1000);

            for (const amt of amountCandidates) {
              const candidates = (await dataSource.query(
                `SELECT "id", "userId", "productId", "amount", "status", "createdAt"
                 FROM "orders"
                 WHERE ABS("amount" - $1::numeric) < 0.01 AND "status" = 'pending'
                 ORDER BY "createdAt" DESC`,
                [amt]
              )) as Array<OrderRow>;
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

    const { order } = await loadOrderById(dataSource, payment.orderId);

    if (!order) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Update payment status based on InfinitePay transaction status
    const newStatus = mapInfinitePayStatusToOrderStatus(payment.status || "");

    payment.status = newStatus;
    payment.rawPayload = { ...payment.rawPayload, ...req.body };

    if (newStatus === "paid" || newStatus === "completed") {
      console.log("[InfinitePay Webhook] Pagamento confirmado para ordem:", order.id);
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
            await updateOrderStatus(dataSource, order.id, "completed", ticket);
          } else {
            await updateOrderStatus(dataSource, order.id, "completed");
          }
        } catch (notifyErr) {
          // eslint-disable-next-line no-console
          console.error("Discord ticket creation failed:", notifyErr instanceof Error ? notifyErr.message : notifyErr);
        }
      } else {
        await updateOrderStatus(dataSource, order.id, "completed", {
          threadId: order.discordThreadId,
          threadUrl: order.discordThreadUrl || undefined,
        });
      }
    }

    await paymentRepository.save(payment);

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
