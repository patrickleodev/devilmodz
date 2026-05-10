import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { Order } from "../../../entities/Order";
import { Product } from "../../../entities/Product";
import { Payment } from "../../../entities/Payment";
import { User } from "../../../entities/User";
import { resolveDbUser } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "order id is required" });

  try {
    const ds = await ensureDataSource();
    const productRepo = ds.getRepository(Product);
    const paymentRepo = ds.getRepository(Payment);

    const dbUser = await resolveDbUser(sessionUser);

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const [order] = (await ds.query(
      `SELECT "id", "userId", "productId", "amount", "status", "createdAt" FROM "orders" WHERE "id" = $1`,
      [id]
    )) as Array<Order>;
    
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== dbUser.id) return res.status(403).json({ error: "Forbidden" });

    const product = await productRepo.findOneBy({ id: order.productId });
    const payment = await paymentRepo.findOne({ where: { orderId: order.id } });

    return res.status(200).json({ order: { ...order, product, payment } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
