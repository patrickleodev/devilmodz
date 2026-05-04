import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Order } from "./Order";

@Entity({ name: "payments" })
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.payments, { nullable: false })
  @JoinColumn({ name: "orderId" })
  order!: Order;

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
