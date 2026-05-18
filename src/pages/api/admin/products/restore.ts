import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { Product } from "../../../../entities/Product";
import { ensureDataSource, seedDefaultProducts } from "../../../../lib/db";
import { isAdminRole } from "../../../../lib/admin";
import { defaultProducts } from "../../../../lib/catalog";

const normalizeTags = (tags: Product["tags"] | string | null | undefined) =>
  Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  if (!isAdminRole(sessionUser?.roles)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dataSource = await ensureDataSource();
  const productRepository = dataSource.getRepository(Product);

  try {
    const seedPlanTags = new Set(defaultProducts.map((p) => `plan:${p.slug}`));

    const allProducts = await productRepository.find();
    const referencedProducts = (await dataSource.query(
      `SELECT "productId" FROM "orders"
       UNION
       SELECT "productId" FROM "cart_items"`
    )) as Array<{ productId?: string | null }>;
    const referencedProductIds = new Set(referencedProducts.map((row) => row.productId).filter(Boolean));

    const productsToRemove = allProducts.filter((prod) => {
      const tags = normalizeTags(prod.tags);
      const hasSeed = tags.some((t) => seedPlanTags.has(t));
      const isReferenced = referencedProductIds.has(prod.id);

      return !hasSeed && !isReferenced;
    });

    if (productsToRemove.length > 0) {
      await dataSource.query(
        `DELETE FROM "products" WHERE "id" = ANY($1::uuid[])`,
        [productsToRemove.map((product) => product.id)]
      );
    }

    // Ensure the seed products exist and match seed data (force update)
    await seedDefaultProducts({ force: true });

    return res.status(200).json({ ok: true, removed: productsToRemove.length });
  } catch {
    return res.status(500).json({ error: "Falha ao restaurar produtos" });
  }
}
