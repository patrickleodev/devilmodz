import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Product } from "../entities/Product";
import { Order } from "../entities/Order";
import { Payment } from "../entities/Payment";
import { DeliveryLog } from "../entities/DeliveryLog";
import { CartItem } from "../entities/CartItem";

const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/devilmodz";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  synchronize: process.env.TYPEORM_SYNCHRONIZE === "true" || process.env.NODE_ENV !== "production",
  logging: false,
  entities: [User, Product, Order, Payment, DeliveryLog, CartItem],
  migrations: [],
  subscribers: [],
});

export default AppDataSource;
