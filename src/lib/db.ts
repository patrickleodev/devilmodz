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

  if (options.seedProducts) {
    await seedDefaultProducts({ dataSource: AppDataSource });
  }

  return AppDataSource;
};

export default ensureDataSource;
