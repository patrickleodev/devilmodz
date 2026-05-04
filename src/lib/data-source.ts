import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Product } from "../entities/Product";
import { Order } from "../entities/Order";
import { Payment } from "../entities/Payment";
import { DeliveryLog } from "../entities/DeliveryLog";

const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/devilmodz";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  synchronize: false,
  logging: false,
  entities: [User, Product, Order, Payment, DeliveryLog],
  migrations: [],
  subscribers: [],
});

export default AppDataSource;
