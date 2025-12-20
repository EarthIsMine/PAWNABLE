import { Router } from 'express';
import { AssetController } from '../controllers/assetController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const assetController = new AssetController();

// Public routes
router.get('/', assetController.getAllAssets);
router.get('/:asset_id', assetController.getAssetById);
router.get('/blockchain/:blockchain', assetController.getAssetsByBlockchain);

// Protected routes (admin only in production)
router.post('/', authMiddleware, assetController.createAsset);
router.delete('/:asset_id', authMiddleware, assetController.deleteAsset);

export default router;
