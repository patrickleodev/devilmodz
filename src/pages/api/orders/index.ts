import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { Order } from "../../../entities/Order";
import { Product } from "../../../entities/Product";
import { Payment } from "../../../entities/Payment";
import { resolveDbUser } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const ds = await ensureDataSource();
    const productRepo = ds.getRepository(Product);
    const paymentRepo = ds.getRepository(Payment);

    const dbUser = await resolveDbUser(sessionUser);

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const [columnPresence] = (await ds.query(
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

    const hasDiscordThreadId = Boolean(columnPresence?.hasDiscordThreadId);
    const hasDiscordThreadUrl = Boolean(columnPresence?.hasDiscordThreadUrl);

    const selectColumns = [
      `"id"`,
      `"userId"`,
      `"productId"`,
      `"amount"`,
      `"status"`,
      `"createdAt"`,
    ];

    if (hasDiscordThreadId) selectColumns.push(`"discordThreadId"`);
    if (hasDiscordThreadUrl) selectColumns.push(`"discordThreadUrl"`);

    const orders = (await ds.query(
      `
      SELECT ${selectColumns.join(", ")}
      FROM "orders"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      `,
      [dbUser.id]
    )) as Array<Order & { discordThreadId?: string | null; discordThreadUrl?: string | null }>;

    const detailed = await Promise.all(
      orders.map(async (o) => {
        const product = await productRepo.findOneBy({ id: o.productId });
        const payments = await paymentRepo.find({ where: { orderId: o.id } });
        const payment =
          payments.find((entry) => ["completed", "paid", "approved"].includes(String(entry.status).toLowerCase())) ||
          payments[0] ||
          null;
        return {
          ...o,
          discordThreadId: o.discordThreadId || null,
          discordThreadUrl: o.discordThreadUrl || null,
          product,
          payment,
        };
      })
    );

    return res.status(200).json({ orders: detailed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
