import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number | null) => (value === null ? value : Number(value)),
};

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "uuid", nullable: true })
  productId?: string | null;

  @Column({ type: "text", nullable: true })
  productTitle?: string | null;

  @Column({ type: "text", nullable: true })
  productDescription?: string | null;

  @Column({ type: "text", nullable: true })
  productDeliveryType?: string | null;

  @Column("simple-array", { nullable: true })
  productTags?: string[] | null;

  @Column({ type: "numeric", precision: 10, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ type: "text", default: "pending" })
  status!: string;

  @Column({ type: "text", nullable: true })
  mpPreferenceId?: string;

  @Column({ type: "text", nullable: true })
  discordThreadId?: string;

  @Column({ type: "text", nullable: true })
  discordThreadUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

export default Order;
