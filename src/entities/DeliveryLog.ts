import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Order } from "./Order";

@Entity({ name: "delivery_logs" })
export class DeliveryLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.deliveryLogs, { nullable: false })
  @JoinColumn({ name: "orderId" })
  order!: Order;

  @Column()
  orderId!: string;

  @Column({ nullable: true })
  deliveredBy?: string;

  @Column("text")
  message!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

export default DeliveryLog;
