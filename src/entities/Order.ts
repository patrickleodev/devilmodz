import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

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
}

export default Order;
