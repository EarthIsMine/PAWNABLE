import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Loan } from './loanModel';
import { Asset } from './assetModel';

@Entity('onchain_tx_logs')
export class OnchainTxLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  tx_log_id: string;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'varchar' })
  direction: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'varchar' })
  from_address: string;

  @Column({ type: 'varchar' })
  to_address: string;

  @Column({ type: 'timestamp', nullable: true })
  occurred_at: Date;

  @Column({ type: 'varchar' })
  tx_status: string;

  @Column({ type: 'varchar' })
  loan_id: string;

  @Column({ type: 'varchar' })
  asset_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Loan, { nullable: true })
  @JoinColumn({ name: 'loan_id', referencedColumnName: 'loan_id' })
  loan: Loan;

  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: 'asset_id', referencedColumnName: 'asset_id' })
  asset: Asset;
}
