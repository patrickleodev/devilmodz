import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { ensureDataSource } from "../../../../../lib/db";
import { Order } from "../../../../../entities/Order";
import { User } from "../../../../../entities/User";
import { archiveThread } from "../../../../../lib/discord";
import { resolveDbUser } from "../../../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
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
    const userRepo = ds.getRepository(User);

    const dbUser = await resolveDbUser(sessionUser);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

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

    if (!order.discordThreadId) return res.status(400).json({ error: "No ticket to close" });

    const ok = await archiveThread(order.discordThreadId);

    if (!ok) return res.status(500).json({ error: "Failed to archive thread" });

    order.discordThreadId = undefined as any;
    order.discordThreadUrl = undefined as any;
    await orderRepo.save(order);

    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
