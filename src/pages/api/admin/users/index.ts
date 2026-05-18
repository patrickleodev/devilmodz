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
  const users = await dataSource.query(`
    SELECT
      u."id",
      u."name",
      u."email",
      u."discordId",
      u."roles",
      to_char(u."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
      COUNT(o."id")::int AS "ordersCount",
      COALESCE(SUM(o."amount"), 0)::float AS "totalSpent",
      to_char(MAX(o."createdAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "lastOrderAt"
    FROM "users" u
    LEFT JOIN "orders" o ON o."userId" = u."id"
    GROUP BY u."id"
    ORDER BY COALESCE(MAX(o."createdAt"), u."createdAt") DESC
  `);

  return res.status(200).json({ users });
}
