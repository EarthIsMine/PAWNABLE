import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/message', authController.getAuthMessage);
router.post('/login', authController.walletLogin);

// Protected routes
router.post('/verify', authMiddleware, authController.verifyToken);

export default router;
