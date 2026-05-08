import AppDataSource from "./data-source";
import { Product } from "../entities/Product";

const defaultProducts = [
  {
    title: "Pacote Básico",
    description: "Ideal para quem quer subir rápido sem perder a vibe do personagem.",
    price: 20,
    stock: 999,
    deliveryType: "manual",
    tags: ["starter", "public"],
  },
  {
    title: "Pacote Pro",
    description: "Para progresso consistente com acompanhamento durante a execução.",
    price: 50,
    stock: 999,
    deliveryType: "manual",
    tags: ["pro", "public"],
  },
  {
    title: "Pacote Elite",
    description: "A opção mais completa, com tratamento premium e entrega priorizada.",
    price: 80,
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
  }

  return AppDataSource;
};

export default ensureDataSource;
