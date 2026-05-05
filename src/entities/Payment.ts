import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  orderId!: string;

  @Column()
  provider!: string;

  @Column({ nullable: true })
  providerPaymentId?: string;

  @Column({ default: "pending" })
  status!: string;

  @Column("json", { nullable: true })
  rawPayload?: any;

  @Column({ nullable: true })
  confirmedAt?: Date;
}

export default Payment;
