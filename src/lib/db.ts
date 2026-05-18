import { DataSource } from "typeorm";
import AppDataSource from "./data-source";
import { Product } from "../entities/Product";
import { buildProductTags, defaultProducts } from "./catalog";

const legacyTitles: Record<string, string[]> = {
  starter: ["Pacote Basico", "Pacote B\u00c3\u00a1sico", "Pacote Starter"],
  pro: ["Pacote Pro"],
  elite: ["Pacote Elite"],
};

export const seedDefaultProducts = async (options: { force?: boolean; dataSource?: DataSource } = {}) => {
  const dataSource = options.dataSource || AppDataSource;
  const productRepository = dataSource.getRepository(Product);
  const existingProducts = await productRepository.find();

  for (const seed of defaultProducts) {
    const product =
      existingProducts.find((item) => (item.tags || []).includes(`plan:${seed.slug}`)) ||
      existingProducts.find((item) => legacyTitles[seed.slug]?.includes(item.title));

    if (product) {
      if (options.force) {
        product.title = seed.title;
        product.description = seed.description;
        product.price = seed.price;
        product.stock = seed.stock;
        product.deliveryType = seed.deliveryType;
      }
      const currentTags = product.tags || [];
      const seedTags = buildProductTags(seed);
      product.tags = Array.from(new Set([...currentTags, ...seedTags]));
      await productRepository.save(product);
      continue;
    }

    await productRepository.save(
      productRepository.create({
        title: seed.title,
        description: seed.description,
        price: seed.price,
        stock: seed.stock,
        deliveryType: seed.deliveryType,
        tags: buildProductTags(seed),
      })
    );
  }
};

export const ensureDataSource = async (options: { seedProducts?: boolean } = {}) => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const [amountColumn] = (await AppDataSource.query(
    `
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'amount'
    LIMIT 1
    `
  )) as Array<{ data_type?: string }>;

  if (amountColumn?.data_type === "integer" || amountColumn?.data_type === "smallint" || amountColumn?.data_type === "bigint") {
    await AppDataSource.query(
      `ALTER TABLE "orders"
       ALTER COLUMN "amount" TYPE numeric(10,2)
       USING "amount"::numeric(10,2)`
    );
  }

  const [priceColumn] = (await AppDataSource.query(
    `
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'price'
    LIMIT 1
    `
  )) as Array<{ data_type?: string }>;

  if (priceColumn?.data_type === "integer" || priceColumn?.data_type === "smallint" || priceColumn?.data_type === "bigint") {
    await AppDataSource.query(
      `ALTER TABLE "products"
       ALTER COLUMN "price" TYPE numeric(10,2)
       USING "price"::numeric(10,2)`
    );
  }

  await AppDataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "productTitle" text`);
  await AppDataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "productDescription" text`);
  await AppDataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "productDeliveryType" text`);
  await AppDataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "productTags" text`);
  await AppDataSource.query(`ALTER TABLE "orders" ALTER COLUMN "productId" DROP NOT NULL`);
  await AppDataSource.query(`ALTER TABLE "cart_items" ALTER COLUMN "productId" DROP NOT NULL`);
  await AppDataSource.query(`ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "itemTitle" text`);
  await AppDataSource.query(`ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "itemDescription" text`);
  await AppDataSource.query(`ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "itemPrice" numeric(10,2)`);
  await AppDataSource.query(`ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "itemDeliveryType" text`);
  await AppDataSource.query(`ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "itemTags" text`);
  await AppDataSource.query(
    `UPDATE "orders" o
     SET
       "productTitle" = COALESCE(o."productTitle", p."title"),
       "productDescription" = COALESCE(o."productDescription", p."description"),
       "productDeliveryType" = COALESCE(o."productDeliveryType", p."deliveryType"),
       "productTags" = COALESCE(o."productTags", p."tags")
     FROM "products" p
     WHERE o."productId" = p."id"
       AND (
         o."productTitle" IS NULL
         OR o."productDescription" IS NULL
         OR o."productDeliveryType" IS NULL
         OR o."productTags" IS NULL
       )`
  );
  await AppDataSource.query(
    `UPDATE "cart_items" c
     SET
       "itemTitle" = COALESCE(c."itemTitle", p."title"),
       "itemDescription" = COALESCE(c."itemDescription", p."description"),
       "itemPrice" = COALESCE(c."itemPrice", p."price"),
       "itemDeliveryType" = COALESCE(c."itemDeliveryType", p."deliveryType"),
       "itemTags" = COALESCE(c."itemTags", p."tags"),
       "productId" = NULL
     FROM "products" p
     WHERE c."productId" = p."id"
       AND string_to_array(COALESCE(p."tags", ''), ',') @> ARRAY['custom:plan']`
  );
  await AppDataSource.query(
    `UPDATE "orders" o
     SET "productId" = NULL
     FROM "products" p
     WHERE o."productId" = p."id"
       AND string_to_array(COALESCE(p."tags", ''), ',') @> ARRAY['custom:plan']`
  );
  await AppDataSource.query(
    `UPDATE "orders" o
     SET "productTitle" = COALESCE(
       NULLIF(o."productTitle", ''),
       NULLIF(pay."rawPayload" #>> '{request,items,0,description}', ''),
       NULLIF(pay."rawPayload" #>> '{items,0,description}', '')
     )
     FROM "payments" pay
     WHERE pay."orderId" = o."id"
       AND pay."rawPayload" IS NOT NULL
       AND (o."productTitle" IS NULL OR o."productTitle" = '')
       AND (
         NULLIF(pay."rawPayload" #>> '{request,items,0,description}', '') IS NOT NULL
         OR NULLIF(pay."rawPayload" #>> '{items,0,description}', '') IS NOT NULL
       )`
  );

  if (options.seedProducts) {
    await seedDefaultProducts({ dataSource: AppDataSource });
  }

  return AppDataSource;
};

export default ensureDataSource;
