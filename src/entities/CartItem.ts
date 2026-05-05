import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("cart_items")
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  productId!: string;

  @Column("integer", { default: 1 })
  quantity!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

export default CartItem;
