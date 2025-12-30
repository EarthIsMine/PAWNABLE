import { ethers } from 'ethers';

export class CryptoUtil {
  /**
   * 지갑 서명 검증
   */
  static verifySignature(message: string, signature: string, expectedAddress: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * 인증 메시지 생성
   */
  static generateAuthMessage(walletAddress: string, timestamp: number): string {
    return `PAWNABLE Auth - Wallet: ${walletAddress} Timestamp: ${timestamp}`;
  }

  /**
   * 타임스탬프 유효성 검증 (5분 이내)
   */
  static isTimestampValid(timestamp: number, maxAgeMinutes: number = 5): boolean {
    const now = Date.now();
    const diff = now - timestamp;
    const maxAge = maxAgeMinutes * 60 * 1000;
    return diff >= 0 && diff <= maxAge;
  }
}
