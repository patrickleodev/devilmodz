import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("delivery_logs")
export class DeliveryLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

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
