import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { User } from "./User";
import { Product } from "./Product";
import { Payment } from "./Payment";
import { DeliveryLog } from "./DeliveryLog";

@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.orders, { nullable: false, eager: true })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Product, (product) => product.orders, { nullable: false, eager: true })
  @JoinColumn({ name: "productId" })
  product!: Product;

  @Column()
  productId!: string;

  @Column("integer")
  amount!: number;

  @Column({ default: "pending" })
  status!: string;

  @Column({ nullable: true })
  mpPreferenceId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @OneToMany(() => DeliveryLog, (log) => log.order)
  deliveryLogs!: DeliveryLog[];
}

export default Order;
