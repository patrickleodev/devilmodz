import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { ensureDataSource } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";
import { doesDiscordChannelExist } from "../../../../lib/discord";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  if (!isAdminRole(sessionUser?.roles)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dataSource = await ensureDataSource();
  const orders = (await dataSource.query(`
    SELECT
      o."id",
      o."status",
      o."amount"::float AS "amount",
      to_char(o."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
      o."discordThreadId",
      o."discordThreadUrl",
      json_build_object(
        'id', u."id",
        'email', u."email",
        'name', u."name",
        'discordId', u."discordId"
      ) AS "user",
      json_build_object(
        'id', COALESCE(p."id"::text, o."productId"::text),
        'title', COALESCE(p."title", o."productTitle"),
        'deliveryType', COALESCE(p."deliveryType", o."productDeliveryType"),
        'tags', CASE
          WHEN COALESCE(p."tags", o."productTags") IS NULL THEN '[]'::json
          ELSE array_to_json(string_to_array(COALESCE(p."tags", o."productTags"), ','))
        END
      ) AS "product"
    FROM "orders" o
    LEFT JOIN "users" u ON u."id" = o."userId"
    LEFT JOIN "products" p ON p."id" = o."productId"
    ORDER BY o."createdAt" DESC
  `)) as Array<{
    id: string;
    discordThreadId?: string | null;
    discordThreadUrl?: string | null;
    [key: string]: unknown;
  }>;

  const staleOrderIds: string[] = [];
  for (const order of orders) {
    if (!order.discordThreadId) continue;
    const exists = await doesDiscordChannelExist(order.discordThreadId);
    if (exists === false) {
      staleOrderIds.push(order.id);
      order.discordThreadId = null;
      order.discordThreadUrl = null;
    }
  }

  if (staleOrderIds.length > 0) {
    await dataSource.query(
      `UPDATE "orders" SET "discordThreadId" = NULL, "discordThreadUrl" = NULL WHERE "id" = ANY($1::uuid[])`,
      [staleOrderIds]
    );
  }

  return res.status(200).json({ orders });
}
