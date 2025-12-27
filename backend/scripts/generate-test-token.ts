import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// 테스트용 사용자 정보
const testPayload = {
  user_id: 'test-user-001',
  wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
};

const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '7d' });

console.log('\n=== Test JWT Token Generated ===\n');
console.log('Token:', token);
console.log('\n=== Use this in API requests ===\n');
console.log(`Authorization: Bearer ${token}\n`);
console.log('=== Payload ===');
console.log(JSON.stringify(testPayload, null, 2));
console.log('\n');
