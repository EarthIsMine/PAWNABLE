import { Request, Response } from 'express';
import { AssetService } from '../services/assetService';
import { ResponseUtil } from '../utils/response';
import { CreateAssetDto } from '../types';

export class AssetController {
  private assetService: AssetService;

  constructor() {
    this.assetService = new AssetService();
  }

  getAllAssets = async (req: Request, res: Response) => {
    try {
      const assets = await this.assetService.getAllAssets();
      return ResponseUtil.success(res, assets, 'Assets retrieved successfully');
    } catch (error) {
      console.error('Get all assets error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  getAssetById = async (req: Request, res: Response) => {
    try {
      const { asset_id } = req.params;
      const asset = await this.assetService.getAssetById(asset_id);

      if (!asset) {
        return ResponseUtil.notFound(res, 'Asset not found');
      }

      return ResponseUtil.success(res, asset, 'Asset retrieved successfully');
    } catch (error) {
      console.error('Get asset by ID error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  getAssetsByBlockchain = async (req: Request, res: Response) => {
    try {
      const { blockchain } = req.params;
      const assets = await this.assetService.getAssetsByBlockchain(blockchain);
      return ResponseUtil.success(res, assets, 'Assets retrieved successfully');
    } catch (error) {
      console.error('Get assets by blockchain error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  createAsset = async (req: Request, res: Response) => {
    try {
      const dto: CreateAssetDto = req.body;

      if (!dto.blockchain || !dto.asset_type || !dto.symbol || !dto.name) {
        return ResponseUtil.badRequest(res, 'Missing required fields');
      }

      const asset = await this.assetService.createAsset(dto);
      return ResponseUtil.created(res, asset, 'Asset created successfully');
    } catch (error) {
      console.error('Create asset error:', error);
      const message = (error as Error).message;
      if (message.includes('already exists')) {
        return ResponseUtil.badRequest(res, message);
      }
      return ResponseUtil.serverError(res, message);
    }
  };

  deleteAsset = async (req: Request, res: Response) => {
    try {
      const { asset_id } = req.params;
      await this.assetService.deleteAsset(asset_id);
      return ResponseUtil.success(res, null, 'Asset deleted successfully');
    } catch (error) {
      console.error('Delete asset error:', error);
      const message = (error as Error).message;
      if (message === 'Asset not found') {
        return ResponseUtil.notFound(res, message);
      }
      return ResponseUtil.serverError(res, message);
    }
  };
}
