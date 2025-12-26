import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Loan } from './loanModel';
import { Asset } from './assetModel';

@Entity('collaterals')
export class Collateral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  collateral_id: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  token_id: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  locked_price: number;

  @CreateDateColumn()
  locked_at: Date;

  @Column({ type: 'varchar' })
  loan_id: string;

  @Column({ type: 'varchar' })
  asset_id: string;

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
