import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './userModel';
import { Asset } from './assetModel';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  loan_id: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  loan_amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  interest_rate_pct: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  total_repay_amount: number;

  @Column({ type: 'timestamp' })
  repay_due_at: Date;

  @Column({ type: 'varchar' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  matched_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @Column({ type: 'varchar' })
  lender_id: string;

  @Column({ type: 'varchar' })
  borrower_id: string;

  @Column({ type: 'varchar' })
  loan_asset_id: string;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations (선택사항)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lender_id', referencedColumnName: 'user_id' })
  lender: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'borrower_id', referencedColumnName: 'user_id' })
  borrower: User;

  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: 'loan_asset_id', referencedColumnName: 'asset_id' })
  loanAsset: Asset;
}
