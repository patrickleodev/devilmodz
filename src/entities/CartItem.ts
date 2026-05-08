import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("cart_items")
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "uuid" })
  productId!: string;

  @Column("integer", { default: 1 })
  quantity!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

export default CartItem;
