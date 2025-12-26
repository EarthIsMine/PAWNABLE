import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  user_id: string;

  @Column({ type: 'varchar', unique: true })
  wallet_address: string;

  @Column({ type: 'varchar' })
  nickname: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
