import type { NextApiRequest, NextApiResponse } from "next";
import { Order } from "../../../../entities/Order";
import { Payment } from "../../../../entities/Payment";
import { Product } from "../../../../entities/Product";
import { fetchInfinitePayTransaction } from "../../../../lib/infinitepay";
import { ensureDataSource } from "../../../../lib/db";
import { buildOrderPaidMessage, sendDiscordChannelMessage } from "../../../../lib/discord";

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
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const transactionId = getTransactionIdFromRequest(req);
  const checkoutId = getCheckoutIdFromRequest(req);

  if (!transactionId && !checkoutId) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const dataSource = await ensureDataSource();
    const orderRepository = dataSource.getRepository(Order);
    const paymentRepository = dataSource.getRepository(Payment);
    const productRepository = dataSource.getRepository(Product);

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
      // Try to fetch from InfinitePay and create the payment record
      if (transactionId) {
        const transaction = await fetchInfinitePayTransaction(transactionId);
        const orderId = String(transaction.metadata?.orderId || "");

        if (!orderId) {
          return res.status(200).json({ ok: true, ignored: true });
        }

        const order = await orderRepository.findOneBy({ id: orderId });

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
      order.status = "completed";

      // notify Discord about paid order
      try {
        const product = await productRepository.findOneBy({ id: order.productId });
        await sendDiscordChannelMessage(
          buildOrderPaidMessage({
            orderId: order.id,
            productTitle: product?.title || "Unknown Product",
            amount: order.amount,
            userEmail: null,
          })
        );
      } catch (notifyErr) {
        // ignore notification failures
        // eslint-disable-next-line no-console
        console.warn("Discord notify failed:", notifyErr);
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
