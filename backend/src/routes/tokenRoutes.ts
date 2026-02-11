import { Router } from 'express';
import * as tokenController from '../controllers/tokenController';

const router = Router();

// Get all allowed tokens
router.get('/', tokenController.getTokens);

// Get token by address
router.get('/:address', tokenController.getTokenByAddress);

// Add new token (admin)
router.post('/', tokenController.addToken);

// Update token allowance (admin)
router.patch('/:address/allowance', tokenController.updateTokenAllowance);

export default router;
