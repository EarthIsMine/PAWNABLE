import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ResponseUtil } from '../utils/response';
import { CreateUserDto, UpdateUserDto } from '../types';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * GET /api/users
   * 모든 사용자 조회
   */
  getAllUsers = async (req: Request, res: Response) => {
    try {
      const users = await this.userService.getAllUsers();
      return ResponseUtil.success(res, users, 'Users retrieved successfully');
    } catch (error) {
      console.error('Get all users error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * GET /api/users/:user_id
   * 특정 사용자 조회
   */
  getUserById = async (req: Request, res: Response) => {
    try {
      const { user_id } = req.params;
      const user = await this.userService.getUserById(user_id);

      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      return ResponseUtil.success(res, user, 'User retrieved successfully');
    } catch (error) {
      console.error('Get user by ID error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * GET /api/users/wallet/:wallet_address
   * 지갑 주소로 사용자 조회
   */
  getUserByWallet = async (req: Request, res: Response) => {
    try {
      const { wallet_address } = req.params;
      const user = await this.userService.getUserByWalletAddress(wallet_address);

      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      return ResponseUtil.success(res, user, 'User retrieved successfully');
    } catch (error) {
      console.error('Get user by wallet error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * POST /api/users
   * 새 사용자 생성
   */
  createUser = async (req: Request, res: Response) => {
    try {
      const dto: CreateUserDto = req.body;

      if (!dto.wallet_address || !dto.nickname || !dto.email) {
        return ResponseUtil.badRequest(res, 'Missing required fields');
      }

      const user = await this.userService.createUser(dto);
      return ResponseUtil.created(res, user, 'User created successfully');
    } catch (error) {
      console.error('Create user error:', error);
      const message = (error as Error).message;
      if (message.includes('already exists')) {
        return ResponseUtil.badRequest(res, message);
      }
      return ResponseUtil.serverError(res, message);
    }
  };

  /**
   * PUT /api/users/:user_id
   * 사용자 정보 업데이트
   */
  updateUser = async (req: Request, res: Response) => {
    try {
      const { user_id } = req.params;
      const dto: UpdateUserDto = req.body;

      const user = await this.userService.updateUser(user_id, dto);
      return ResponseUtil.success(res, user, 'User updated successfully');
    } catch (error) {
      console.error('Update user error:', error);
      const message = (error as Error).message;
      if (message === 'User not found') {
        return ResponseUtil.notFound(res, message);
      }
      if (message.includes('already exists')) {
        return ResponseUtil.badRequest(res, message);
      }
      return ResponseUtil.serverError(res, message);
    }
  };

  /**
   * DELETE /api/users/:user_id
   * 사용자 삭제
   */
  deleteUser = async (req: Request, res: Response) => {
    try {
      const { user_id } = req.params;
      await this.userService.deleteUser(user_id);
      return ResponseUtil.success(res, null, 'User deleted successfully');
    } catch (error) {
      console.error('Delete user error:', error);
      const message = (error as Error).message;
      if (message === 'User not found') {
        return ResponseUtil.notFound(res, message);
      }
      return ResponseUtil.serverError(res, message);
    }
  };

  /**
   * GET /api/users/me
   * 현재 로그인된 사용자 정보 조회
   */
  getCurrentUser = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res, 'Not authenticated');
      }

      const user = await this.userService.getUserById(req.user.user_id);

      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      return ResponseUtil.success(res, user, 'Current user retrieved successfully');
    } catch (error) {
      console.error('Get current user error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };
}
