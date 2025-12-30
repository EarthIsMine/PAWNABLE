import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { ResponseUtil } from '../utils/response';
import { WalletAuthPayload } from '../types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/auth/message
   * 인증 메시지 생성
   */
  getAuthMessage = async (req: Request, res: Response) => {
    try {
      const { wallet_address } = req.body;

      if (!wallet_address) {
        return ResponseUtil.badRequest(res, 'Wallet address is required');
      }

      const result = this.authService.generateAuthMessage(wallet_address);
      return ResponseUtil.success(res, result, 'Auth message generated');
    } catch (error) {
      console.error('Generate auth message error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * POST /api/auth/login
   * 지갑 로그인
   */
  walletLogin = async (req: Request, res: Response) => {
    try {
      const payload: WalletAuthPayload = req.body;

      if (!payload.wallet_address || !payload.signature || !payload.timestamp) {
        return ResponseUtil.badRequest(res, 'Missing required fields: wallet_address, signature, timestamp');
      }

      const result = await this.authService.authenticateWallet(payload);
      return ResponseUtil.success(res, result, 'Login successful');
    } catch (error) {
      console.error('Wallet login error:', error);
      const message = (error as Error).message;

      if (message.includes('expired') || message.includes('Invalid')) {
        return ResponseUtil.unauthorized(res, message);
      }

      return ResponseUtil.serverError(res, message);
    }
  };

  /**
   * POST /api/auth/verify
   * 토큰 검증
   */
  verifyToken = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res, 'Invalid token');
      }

      return ResponseUtil.success(res, req.user, 'Token is valid');
    } catch (error) {
      console.error('Verify token error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };
}
