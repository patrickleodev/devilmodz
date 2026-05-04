import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Order } from "./Order";

@Entity({ name: "products" })
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column("text")
  description!: string;

  @Column("integer")
  price!: number;

  @Column("int", { default: 0 })
  stock!: number;

  @Column({ default: "manual" })
  deliveryType!: string;

  @Column("simple-array", { nullable: true })
  tags!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Order, (order) => order.product)
  orders!: Order[];
}

export default Product;
