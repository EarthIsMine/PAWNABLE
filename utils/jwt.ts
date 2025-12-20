import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types';

export class JwtUtil {
  private static SECRET = process.env.JWT_SECRET || 'default_secret';
  private static EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN } as SignOptions);
  }

  static verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.SECRET) as JwtPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      console.error('JWT decode failed:', error);
      return null;
    }
  }
}
