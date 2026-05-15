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

const findOrderForWebhook = async (
  dataSource: Awaited<ReturnType<typeof ensureDataSource>>,
  payload: any,
  transactionId?: string | null
) => {
  const orderId = String(payload?.metadata?.orderId || payload?.external_reference || payload?.reference || "");

  if (orderId) {
    const loaded = await loadOrderById(dataSource, orderId);
    if (loaded.order) {
      return loaded.order;
    }
  }

  const payerEmail = payload?.metadata?.payerEmail || payload?.metadata?.email || payload?.customer?.email || null;

  if (payerEmail) {
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: payerEmail } });
    if (user) {
      const txAmount = Number(payload?.amount || payload?.transaction_amount || 0);
      const amountCandidates = toOrderAmountCandidates(txAmount);

      for (const amt of amountCandidates) {
        const candidates = (await dataSource.query(
          `SELECT "id", "userId", "productId", "amount", "status", "createdAt"
           FROM "orders"
           WHERE "userId" = $1 AND ABS("amount" - $2::numeric) < 0.01 AND "status" = 'pending'
           ORDER BY "createdAt" DESC
           LIMIT 1`,
          [user.id, amt]
        )) as Array<OrderRow>;

        if (candidates.length > 0) {
          return candidates[0];
        }
      }
    }
  }

  if (transactionId || payload?.amount || payload?.transaction_amount) {
    const txAmount = Number(payload?.amount || payload?.transaction_amount || 0);
    const amountCandidates = toOrderAmountCandidates(txAmount);
    const txDate = payload?.createdAt ? new Date(payload.createdAt) : payload?.approvedAt ? new Date(payload.approvedAt) : new Date();
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

      const match = candidates.find((c) => {
        const created = new Date(c.createdAt);
        return created >= earliest && created <= latest;
      });

      if (match) {
        return match;
      }
    }
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[InfinitePay Webhook] Recebido request:", req.method);
  console.log("[InfinitePay Webhook] Body completo:", JSON.stringify(req.body, null, 2));
  
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
      const transaction = req.body as any;
      const order = await findOrderForWebhook(dataSource, transaction, transactionId);

        if (!order) {
          console.log("[InfinitePay Webhook] Unable to match order for incoming payload. Payload:", JSON.stringify(transaction));
          return res.status(200).json({ ok: true, ignored: true });
        }

        payment = paymentRepository.create({
          orderId: order.id,
          provider: "infinitepay",
          providerPaymentId: transactionId ?? undefined,
          status: transaction.status,
          rawPayload: transaction,
        } as Partial<Payment>);
    } else if (checkoutId && payment.provider !== "infinitepay") {
      payment.provider = "infinitepay";
    }

    const { order } = await loadOrderById(dataSource, payment.orderId);

    if (!order) {
      console.log("[InfinitePay Webhook] Payment references missing orderId:", payment.orderId, "payment raw payload:", JSON.stringify(payment.rawPayload));
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Update payment status based on InfinitePay transaction status
    const newStatus = mapInfinitePayStatusToOrderStatus(payment.status || "");

    console.log("[InfinitePay Webhook] Mapped payment status:", payment.status, "->", newStatus);

    payment.status = newStatus;
    payment.rawPayload = { ...payment.rawPayload, ...req.body };

    if (newStatus === "paid" || newStatus === "completed") {
      console.log("[InfinitePay Webhook] Pagamento confirmado para ordem:", order.id);
      console.log("[InfinitePay Webhook] Order status:", order.status, "Order discordThreadId:", order.discordThreadId);
      payment.confirmedAt = payment.confirmedAt || new Date();

      if (!order.discordThreadId) {
        try {
          console.log("[InfinitePay Webhook] Iniciando criação de ticket Discord");
          const [product, dbUser] = await Promise.all([
            productRepository.findOneBy({ id: order.productId }),
            userRepository.findOneBy({ id: order.userId }),
          ]);

          console.log("[InfinitePay Webhook] Product found:", product?.title, "User found:", dbUser?.email);
          console.log("[InfinitePay Webhook] Calling createOrderTicketThread with:", {
            orderId: order.id,
            productTitle: product?.title || "Unknown Product",
            amount: order.amount,
            mention: dbUser?.discordId ? `<@${dbUser.discordId}>` : null,
            userEmail: dbUser?.email || null,
            providerLabel: "InfinitePay",
          });

          const ticket = await createOrderTicketThread({
            orderId: order.id,
            productTitle: product?.title || "Unknown Product",
            amount: order.amount,
            mention: dbUser?.discordId ? `<@${dbUser.discordId}>` : null,
            userEmail: dbUser?.email || null,
            providerLabel: "InfinitePay",
          });

          console.log("[InfinitePay Webhook] Ticket creation result:", ticket);

          if (ticket?.threadId) {
            console.log("[InfinitePay Webhook] Ticket created successfully, updating order status");
            await updateOrderStatus(dataSource, order.id, "completed", ticket);
          } else {
            console.log("[InfinitePay Webhook] Ticket is null/no threadId, updating order to completed anyway");
            await updateOrderStatus(dataSource, order.id, "completed");
          }
        } catch (notifyErr) {
          // eslint-disable-next-line no-console
          console.error("[InfinitePay Webhook] ERROR - Discord ticket creation failed:", notifyErr instanceof Error ? notifyErr.message : String(notifyErr));
          console.error("[InfinitePay Webhook] Stack:", notifyErr instanceof Error ? notifyErr.stack : "No stack");
          // Still update order status to completed, but without ticket
          try {
            await updateOrderStatus(dataSource, order.id, "completed");
            console.log("[InfinitePay Webhook] Updated order to completed despite ticket error");
          } catch (updateErr) {
            console.error("[InfinitePay Webhook] Failed to update order status:", updateErr instanceof Error ? updateErr.message : String(updateErr));
          }
        }
      } else {
        console.log("[InfinitePay Webhook] Order already has discordThreadId:", order.discordThreadId, "- skipping ticket creation");
        await updateOrderStatus(dataSource, order.id, "completed", {
          threadId: order.discordThreadId,
          threadUrl: order.discordThreadUrl || undefined,
        });
      }
    } else {
      console.log("[InfinitePay Webhook] Payment status is not paid/completed, skipping ticket creation. Status:", newStatus);
    }

    await paymentRepository.save(payment);

    return res.status(200).json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("InfinitePay webhook error:", error);
    try {
      console.error('[InfinitePay webhook] request body:', JSON.stringify(req.body));
      console.error('[InfinitePay webhook] transactionId:', transactionId, 'checkoutId:', checkoutId);
    } catch (e) {
      // ignore serialization errors
    }

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
