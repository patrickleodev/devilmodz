import type { NextApiRequest, NextApiResponse } from "next";
import { Payment } from "../../../../entities/Payment";
import { fetchMercadoPagoPayment } from "../../../../lib/mercadopago";
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
  console.log("[MercadoPago Webhook] Recebido request:", req.method);
  
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const paymentId = getPaymentIdFromRequest(req);

  console.log("[MercadoPago Webhook] Payment ID:", paymentId);
  
  if (!paymentId) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const dataSource = await ensureDataSource();
    const paymentRepository = dataSource.getRepository(Payment);
    const userRepository = dataSource.getRepository(User);

    const mpPayment = await fetchMercadoPagoPayment(paymentId);
    const orderId = String(mpPayment.external_reference || mpPayment.metadata?.orderId || "");

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const { order } = await loadOrderById(dataSource, orderId);

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

    if (mpPayment.status === "approved") {
      console.log("[MercadoPago Webhook] Pagamento aprovado para ordem:", order.id);
      if (!order.discordThreadId) {
        try {
          console.log("[MercadoPago Webhook] Iniciando criação de ticket Discord");
          const dbUser = await userRepository.findOneBy({ id: order.userId });
          const ticket = await createOrderTicketThread({
            orderId: order.id,
            productTitle: order.productId,
            amount: order.amount,
            mention: dbUser?.discordId ? `<@${dbUser.discordId}>` : null,
            userEmail: dbUser?.email || null,
            providerLabel: "Mercado Pago",
          });

          if (ticket?.threadId) {
            await updateOrderStatus(dataSource, order.id, "paid", ticket);
          } else {
            await updateOrderStatus(dataSource, order.id, "paid");
          }
        } catch (notifyErr) {
          // eslint-disable-next-line no-console
          console.error("Discord ticket creation failed:", notifyErr instanceof Error ? notifyErr.message : notifyErr);
        }
      } else {
        await updateOrderStatus(dataSource, order.id, "paid", {
          threadId: order.discordThreadId,
          threadUrl: order.discordThreadUrl || undefined,
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
