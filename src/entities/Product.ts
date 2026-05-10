import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number | null) => (value === null ? value : Number(value)),
};

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", nullable: true })
  title!: string;

  @Column("text")
  description!: string;

  @Column({ type: "numeric", precision: 10, scale: 2, transformer: numericTransformer })
  price!: number;

  @Column("int", { default: 0 })
  stock!: number;

  @Column({ type: "text", default: "manual" })
  deliveryType!: string;

  @Column("simple-array", { nullable: true })
  tags!: string[];

  @CreateDateColumn()
  createdAt!: Date;
}

export default Product;
