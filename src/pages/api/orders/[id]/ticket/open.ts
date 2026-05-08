import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { ensureDataSource } from "../../../../../lib/db";
import { Order } from "../../../../../entities/Order";
import { User } from "../../../../../entities/User";
import { createOrderTicketThread } from "../../../../../lib/discord";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "order id is required" });

  try {
    const ds = await ensureDataSource();
    const orderRepo = ds.getRepository(Order);
    const userRepo = ds.getRepository(User);

    const where = sessionUser.email
      ? [{ email: sessionUser.email }, { discordId: sessionUser.id }, { id: sessionUser.id }]
      : [{ discordId: sessionUser.id }, { id: sessionUser.id }];

    const dbUser = await userRepo.findOne({ where });
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const order = await orderRepo.findOneBy({ id });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== dbUser.id) return res.status(403).json({ error: "Forbidden" });

    if (order.discordThreadId && order.discordThreadUrl) {
      return res.status(200).json({ threadUrl: order.discordThreadUrl });
    }

    // Create ticket thread
    const ticket = await createOrderTicketThread({
      orderId: order.id,
      productTitle: order.productId,
      amount: order.amount,
      mention: dbUser.discordId ? `<@${dbUser.discordId}>` : null,
      userEmail: dbUser.email || null,
    });

    if (!ticket) return res.status(500).json({ error: "Failed to create ticket" });

    if (ticket.threadId) {
      order.discordThreadId = ticket.threadId;
      order.discordThreadUrl = ticket.threadUrl || undefined;
      await orderRepo.save(order);
      return res.status(200).json({ threadUrl: ticket.threadUrl });
    }

    return res.status(500).json({ error: "Ticket creation returned no thread id" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
