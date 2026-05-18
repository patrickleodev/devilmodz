import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { ensureDataSource } from "../../../../../lib/db";
import { closeTicketAndGetTranscript } from "../../../../../lib/discord";
import { resolveDbUser } from "../../../../../lib/session";
import { DeliveryLog } from "../../../../../entities/DeliveryLog";

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
    const deliveryLogRepo = ds.getRepository(DeliveryLog);

    const dbUser = await resolveDbUser(sessionUser);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const [columnPresence] = (await ds.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discordThreadId'
         ) AS "hasDiscordThreadId",
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discordThreadUrl'
         ) AS "hasDiscordThreadUrl"
      `
    )) as Array<{ hasDiscordThreadId: boolean; hasDiscordThreadUrl: boolean }>;

    const hasDiscordThreadId = Boolean(columnPresence?.hasDiscordThreadId);
    const hasDiscordThreadUrl = Boolean(columnPresence?.hasDiscordThreadUrl);

    const selectCols = [
      '"id"',
      '"userId"',
      '"productId"',
      '"amount"',
      '"status"',
      '"createdAt"',
    ];

    if (hasDiscordThreadId) selectCols.push('COALESCE("discordThreadId", NULL) AS "discordThreadId"');
    if (hasDiscordThreadUrl) selectCols.push('COALESCE("discordThreadUrl", NULL) AS "discordThreadUrl"');

    const [order] = (await ds.query(`SELECT ${selectCols.join(', ')} FROM "orders" WHERE "id" = $1`, [id])) as Array<any>;
    
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== dbUser.id) return res.status(403).json({ error: "Forbidden" });

    if (!hasDiscordThreadId || !order.discordThreadId) return res.status(400).json({ error: "No ticket to close" });

    const closeResult = await closeTicketAndGetTranscript(order.discordThreadId);

    if (!closeResult.ok) return res.status(500).json({ error: "Failed to archive thread" });

    await deliveryLogRepo.save(
      deliveryLogRepo.create({
        orderId: id,
        deliveredBy: `user:${dbUser.email || dbUser.id}`,
        message: JSON.stringify({
          type: "ticket_transcript",
          source: "user-close-ticket",
          threadId: order.discordThreadId,
          closedAt: new Date().toISOString(),
          messageCount: closeResult.messageCount,
          transcript: closeResult.transcript || "",
        }),
      })
    );

    if (hasDiscordThreadId) {
      if (hasDiscordThreadUrl) {
        await ds.query(
          `UPDATE "orders" SET "discordThreadId" = NULL, "discordThreadUrl" = NULL WHERE "id" = $1`,
          [id]
        );
      } else {
        await ds.query(
          `UPDATE "orders" SET "discordThreadId" = NULL WHERE "id" = $1`,
          [id]
        );
      }
    } else {
      // If DB doesn't support thread columns, just log and continue
      console.log('[Orders Ticket Close] DB does not have discordThreadId column; skipping update');
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
