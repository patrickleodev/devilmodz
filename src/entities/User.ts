import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", unique: true, nullable: true })
  email!: string;

  @Column({ type: "text", nullable: true })
  name?: string;

  @Column({ type: "text", nullable: true })
  discordId?: string;

  @Column({ type: "text", nullable: true })
  passwordHash?: string;

  @Column("simple-array", { default: "" })
  roles!: string[];

  @CreateDateColumn()
  createdAt!: Date;
}

export default User;
