import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../..//lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { User } from "../../../entities/User";
import { resolveDbUser } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const dbUser = await resolveDbUser(sessionUser);

    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const safeUser = {
      id: dbUser.id,
      name: dbUser.name || null,
      email: dbUser.email || null,
      discordId: dbUser.discordId || null,
    };

    return res.status(200).json({ user: safeUser });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
