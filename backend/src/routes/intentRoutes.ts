import { Router } from 'express';
import * as intentController from '../controllers/intentController';

const router = Router();

// Create new intent
router.post('/', intentController.createIntent);

// Get all intents (with filters)
router.get('/', intentController.getIntents);

// Get intent by id
router.get('/:id', intentController.getIntentById);

// Cancel intent
router.post('/:id/cancel', intentController.cancelIntent);

// Mark intent as executed
router.post('/:id/execute', intentController.executeIntent);

// Check intent state (collateral balance/allowance)
router.get('/:id/state', intentController.checkIntentState);

export default router;
