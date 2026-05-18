import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? value : Number(value)),
};

@Entity("cart_items")
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "uuid", nullable: true })
  productId?: string | null;

  @Column({ type: "text", nullable: true })
  itemTitle?: string | null;

  @Column({ type: "text", nullable: true })
  itemDescription?: string | null;

  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true, transformer: numericTransformer })
  itemPrice?: number | null;

  @Column({ type: "text", nullable: true })
  itemDeliveryType?: string | null;

  @Column("simple-array", { nullable: true })
  itemTags?: string[] | null;

  @Column("integer", { default: 1 })
  quantity!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

export default CartItem;
