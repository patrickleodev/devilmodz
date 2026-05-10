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

  @Column({ type: "uuid" })
  productId!: string;

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
