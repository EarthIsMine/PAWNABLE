import { UserService } from './userService';
import { CryptoUtil } from '../utils/crypto';
import { JwtUtil } from '../utils/jwt';
import { WalletAuthPayload } from '../types';

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * 지갑 서명 검증 및 JWT 발급
   */
  async authenticateWallet(payload: WalletAuthPayload): Promise<{ token: string; user_id: string }> {
    const { wallet_address, signature, timestamp } = payload;

    // 1. 타임스탬프 유효성 검증 (60분 이내)
    if (!CryptoUtil.isTimestampValid(timestamp, 60)) {
      throw new Error('Authentication request expired. Please try again.');
    }

    // 2. 서버에서 메시지 생성
    const message = CryptoUtil.generateAuthMessage(wallet_address, timestamp);

    // 3. 서명 검증
    const isValid = CryptoUtil.verifySignature(message, signature, wallet_address);
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // 4. 사용자 조회 또는 생성
    const user = await this.userService.findOrCreateByWallet(wallet_address);

    // 5. JWT 토큰 생성
    const token = JwtUtil.generateToken({
      user_id: user.user_id,
      wallet_address: user.wallet_address,
    });

    return {
      token,
      user_id: user.user_id,
    };
  }

  /**
   * 인증용 타임스탬프 생성
   * 프론트엔드는 이 timestamp를 받아서 서명에 사용
   * 서버는 로그인 시 wallet_address + timestamp로 메시지 재생성
   */
  generateAuthMessage(wallet_address: string): { timestamp: number } {
    const timestamp = Date.now();
    return { timestamp };
  }
}
