import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  discordId?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column("simple-array", { default: "" })
  roles!: string[];

  @CreateDateColumn()
  createdAt!: Date;
}

export default User;
