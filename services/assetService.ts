import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Asset } from '../models/assetModel';
import { CreateAssetDto } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AssetService {
  private assetRepository: Repository<Asset>;

  constructor() {
    this.assetRepository = AppDataSource.getRepository(Asset);
  }

  async getAllAssets(): Promise<Asset[]> {
    return await this.assetRepository.find();
  }

  async getAssetById(asset_id: string): Promise<Asset | null> {
    return await this.assetRepository.findOne({ where: { asset_id } });
  }

  async getAssetsByBlockchain(blockchain: string): Promise<Asset[]> {
    return await this.assetRepository.find({ where: { blockchain } });
  }

  async getAssetBySymbol(symbol: string): Promise<Asset | null> {
    return await this.assetRepository.findOne({ where: { symbol } });
  }

  async createAsset(dto: CreateAssetDto): Promise<Asset> {
    const existingAsset = await this.getAssetBySymbol(dto.symbol);
    if (existingAsset) {
      throw new Error('Asset with this symbol already exists');
    }

    const asset = this.assetRepository.create({
      asset_id: uuidv4(),
      blockchain: dto.blockchain,
      asset_type: dto.asset_type,
      symbol: dto.symbol,
      name: dto.name,
      contract_address: dto.contract_address,
    });

    return await this.assetRepository.save(asset);
  }

  async deleteAsset(asset_id: string): Promise<boolean> {
    const asset = await this.getAssetById(asset_id);
    if (!asset) {
      throw new Error('Asset not found');
    }

    await this.assetRepository.remove(asset);
    return true;
  }
}
