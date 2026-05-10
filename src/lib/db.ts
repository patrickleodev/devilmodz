import AppDataSource from "./data-source";
import { Product } from "../entities/Product";

const defaultProducts = [
  {
    title: "Pacote Básico",
    description: "Ideal para quem quer subir rápido sem perder a vibe do personagem.",
    price: 19.9,
    stock: 999,
    deliveryType: "manual",
    tags: ["starter", "public"],
  },
  {
    title: "Pacote Pro",
    description: "Para progresso consistente com acompanhamento durante a execução.",
    price: 49.9,
    stock: 999,
    deliveryType: "manual",
    tags: ["pro", "public"],
  },
  {
    title: "Pacote Elite",
    description: "A opção mais completa, com tratamento premium e entrega priorizada.",
    price: 79.9,
    stock: 999,
    deliveryType: "manual",
    tags: ["elite", "public"],
  },
];

export const ensureDataSource = async () => {
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

  const productRepository = AppDataSource.getRepository(Product);
  const existingProducts = await productRepository.find();

  if (existingProducts.length === 0) {
    await productRepository.save(defaultProducts.map((product) => productRepository.create(product)));
  } else {
    const defaultByTitle = new Map(defaultProducts.map((product) => [product.title, product] as const));

    for (const product of existingProducts) {
      const defaultProduct = defaultByTitle.get(product.title);
      if (defaultProduct && product.price !== defaultProduct.price) {
        product.price = defaultProduct.price;
        product.description = defaultProduct.description;
        product.stock = defaultProduct.stock;
        product.deliveryType = defaultProduct.deliveryType;
        product.tags = defaultProduct.tags;
        await productRepository.save(product);
      }
    }
  }

  return AppDataSource;
};

export default ensureDataSource;
