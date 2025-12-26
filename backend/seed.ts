import 'reflect-metadata';
import dotenv from 'dotenv';
import connectDatabase, { AppDataSource } from './config/database';
import { Asset } from './models/assetModel';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function seed() {
  try {
    await connectDatabase();

    const assetRepository = AppDataSource.getRepository(Asset);

    // ETH 자산 생성
    const ethExists = await assetRepository.findOne({ where: { symbol: 'ETH' } });
    if (!ethExists) {
      const eth = assetRepository.create({
        asset_id: uuidv4(),
        blockchain: 'ethereum',
        asset_type: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        contract_address: '',
      });
      await assetRepository.save(eth);
      console.log('✅ ETH asset created');
    } else {
      console.log('⚠️  ETH asset already exists');
    }

    // USDT 자산 생성
    const usdtExists = await assetRepository.findOne({ where: { symbol: 'USDT' } });
    if (!usdtExists) {
      const usdt = assetRepository.create({
        asset_id: uuidv4(),
        blockchain: 'ethereum',
        asset_type: 'erc20',
        symbol: 'USDT',
        name: 'Tether USD',
        contract_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      });
      await assetRepository.save(usdt);
      console.log('✅ USDT asset created');
    } else {
      console.log('⚠️  USDT asset already exists');
    }

    // SOL 자산 생성
    const solExists = await assetRepository.findOne({ where: { symbol: 'SOL' } });
    if (!solExists) {
      const sol = assetRepository.create({
        asset_id: uuidv4(),
        blockchain: 'solana',
        asset_type: 'native',
        symbol: 'SOL',
        name: 'Solana',
        contract_address: '',
      });
      await assetRepository.save(sol);
      console.log('✅ SOL asset created');
    } else {
      console.log('⚠️  SOL asset already exists');
    }

    // USDC 자산 생성
    const usdcExists = await assetRepository.findOne({ where: { symbol: 'USDC' } });
    if (!usdcExists) {
      const usdc = assetRepository.create({
        asset_id: uuidv4(),
        blockchain: 'ethereum',
        asset_type: 'erc20',
        symbol: 'USDC',
        name: 'USD Coin',
        contract_address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      });
      await assetRepository.save(usdc);
      console.log('✅ USDC asset created');
    } else {
      console.log('⚠️  USDC asset already exists');
    }

    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
