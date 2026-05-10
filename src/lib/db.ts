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
