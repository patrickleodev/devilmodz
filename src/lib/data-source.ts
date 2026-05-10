import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Product } from "../entities/Product";
import { Order } from "../entities/Order";
import { Payment } from "../entities/Payment";
import { DeliveryLog } from "../entities/DeliveryLog";
import { CartItem } from "../entities/CartItem";

const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/devilmodz";
const isProduction = process.env.NODE_ENV === "production";
const synchronizeInEnv = process.env.TYPEORM_SYNCHRONIZE === "true";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  // Never auto-sync schema in production; use explicit migrations instead.
  synchronize: !isProduction && synchronizeInEnv,
  logging: false,
  entities: [User, Product, Order, Payment, DeliveryLog, CartItem],
  migrations: [],
  subscribers: [],
});

export default AppDataSource;
