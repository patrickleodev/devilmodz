import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("products")
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
}

export default Product;
