import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { ensureDataSource } from "../../../../../lib/db";
import { Product } from "../../../../../entities/Product";
import { createOrderTicketThread } from "../../../../../lib/discord";
import { resolveDbUser } from "../../../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  console.log("[Orders Ticket Open] Request received:", req.method, req.query.id);
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

    console.log("[Orders Ticket Open] Data source ready");

    const dbUser = await resolveDbUser(sessionUser);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    console.log("[Orders Ticket Open] Resolved DB user:", dbUser.id);

    const [order] = (await ds.query(
      `SELECT "id", "userId", "productId", "amount", "status", "createdAt", 
              COALESCE("discordThreadId", NULL) AS "discordThreadId",
              COALESCE("discordThreadUrl", NULL) AS "discordThreadUrl"
       FROM "orders" 
       WHERE "id" = $1`,
      [id]
    )) as Array<any>;
    
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== dbUser.id) return res.status(403).json({ error: "Forbidden" });

    console.log("[Orders Ticket Open] Order validated:", order.id, order.status);

    if (order.discordThreadId && order.discordThreadUrl) {
      return res.status(200).json({ threadUrl: order.discordThreadUrl });
    }

    // Fetch product details
    const productRepo = ds.getRepository(Product);
    const product = await productRepo.findOneBy({ id: order.productId });

    // Create ticket thread
    const ticket = await createOrderTicketThread({
      orderId: order.id,
      productTitle: product?.title || "Unknown Product",
      amount: order.amount,
      mention: dbUser.discordId ? `<@${dbUser.discordId}>` : null,
      userEmail: dbUser.email || null,
    });

    console.log("[Orders Ticket Open] Ticket creation result:", ticket);

    if (!ticket) return res.status(500).json({ error: "Failed to create ticket" });

    if (ticket.threadId) {
      await ds.query(
        `UPDATE "orders"
         SET "discordThreadId" = $2,
             "discordThreadUrl" = $3
         WHERE "id" = $1`,
        [id, ticket.threadId, ticket.threadUrl || null]
      );
      return res.status(200).json({ threadUrl: ticket.threadUrl });
    }

    return res.status(500).json({ error: "Ticket creation returned no thread id" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
