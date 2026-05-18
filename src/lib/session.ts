import { DataSource } from "typeorm";
import { ensureDataSource } from "./db";
import { User } from "../entities/User";

const isUuid = (s?: string | null) => {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
};

export const resolveDbUser = async (
  sessionUser?: { id?: string; email?: string } | null,
  dataSource?: DataSource
) => {
  if (!sessionUser) return null;
  const ds = dataSource || (await ensureDataSource({ skipMaintenance: true }));
  const repo = ds.getRepository(User);

  const where: any[] = [];
  if (sessionUser.email) where.push({ email: sessionUser.email });
  if (sessionUser.id) where.push({ discordId: sessionUser.id });
  if (sessionUser.id && isUuid(sessionUser.id)) where.push({ id: sessionUser.id });

  if (where.length === 0) return null;

  return repo.findOne({ where });
};

export default resolveDbUser;
