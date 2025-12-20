import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const userController = new UserController();

// Public routes
router.get('/wallet/:wallet_address', userController.getUserByWallet);

// Protected routes (require authentication)
router.get('/me', authMiddleware, userController.getCurrentUser);
router.get('/', authMiddleware, userController.getAllUsers);
router.get('/:user_id', authMiddleware, userController.getUserById);
router.post('/', userController.createUser);
router.put('/:user_id', authMiddleware, userController.updateUser);
router.delete('/:user_id', authMiddleware, userController.deleteUser);

export default router;
