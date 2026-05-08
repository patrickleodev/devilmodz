import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { ensureDataSource } from "../../../lib/db";
import { Order } from "../../../entities/Order";
import { Product } from "../../../entities/Product";
import { Payment } from "../../../entities/Payment";
import { User } from "../../../entities/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const ds = await ensureDataSource();
    const orderRepo = ds.getRepository(Order);
    const productRepo = ds.getRepository(Product);
    const paymentRepo = ds.getRepository(Payment);
    const userRepo = ds.getRepository(User);

    const where = sessionUser.email
      ? [{ email: sessionUser.email }, { discordId: sessionUser.id }, { id: sessionUser.id }]
      : [{ discordId: sessionUser.id }, { id: sessionUser.id }];

    const dbUser = await userRepo.findOne({ where });

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await orderRepo.find({ where: { userId: dbUser.id }, order: { createdAt: "DESC" } });

    const detailed = await Promise.all(
      orders.map(async (o) => {
        const product = await productRepo.findOneBy({ id: o.productId });
        const payment = await paymentRepo.findOne({ where: { orderId: o.id } });
        return { ...o, product, payment };
      })
    );

    return res.status(200).json({ orders: detailed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
