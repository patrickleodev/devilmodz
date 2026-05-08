import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "uuid" })
  productId!: string;

  @Column("integer")
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
