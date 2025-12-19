import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// .env 파일 로드
config();
import { User } from '../models/userModel';
import { Asset } from '../models/assetModel';
import { Loan } from '../models/loanModel';
import { Collateral } from '../models/collaterals';
import { OnchainTxLog } from '../models/onchain_tx_log';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'pawnable',
  synchronize: true, // 개발 환경에서만 true, 프로덕션에서는 false로 설정
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Asset, Loan, Collateral, OnchainTxLog],
  migrations: [],
  subscribers: [],
});

const connectDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export default connectDatabase;
