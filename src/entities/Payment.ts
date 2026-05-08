import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  orderId!: string;

  @Column({ type: "text" })
  provider!: string;

  @Column({ type: "text", nullable: true })
  providerPaymentId?: string;

  @Column({ type: "text", default: "pending" })
  status!: string;

  @Column("json", { nullable: true })
  rawPayload?: any;

  @Column({ type: "timestamp", nullable: true })
  confirmedAt?: Date;
}

export default Payment;
