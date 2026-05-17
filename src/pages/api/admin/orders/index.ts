import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { ensureDataSource } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";

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
  const orders = await dataSource.query(`
    SELECT
      o."id",
      o."status",
      o."amount"::float AS "amount",
      o."createdAt",
      o."discordThreadId",
      o."discordThreadUrl",
      json_build_object(
        'id', u."id",
        'email', u."email",
        'name', u."name",
        'discordId', u."discordId"
      ) AS "user",
      json_build_object(
        'id', p."id",
        'title', p."title",
        'deliveryType', p."deliveryType",
        'tags', CASE WHEN p."tags" IS NULL THEN '[]'::json ELSE array_to_json(string_to_array(p."tags", ',')) END
      ) AS "product"
    FROM "orders" o
    LEFT JOIN "users" u ON u."id" = o."userId"
    LEFT JOIN "products" p ON p."id" = o."productId"
    ORDER BY o."createdAt" DESC
  `);

  return res.status(200).json({ orders });
}
