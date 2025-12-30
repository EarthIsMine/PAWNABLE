/**
 * Seed Test Users with Pre-generated Auth Signatures
 *
 * This script creates test users in the database and generates
 * authentication signatures that can be used directly in Insomnia.
 *
 * Usage:
 *   npm run seed:test-users
 */

import 'reflect-metadata';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import connectDatabase, { AppDataSource } from './config/database';
import { User } from './models/userModel';
import { Asset } from './models/assetModel';
import { Loan } from './models/loanModel';
import { CryptoUtil } from './utils/crypto';
import { JwtUtil } from './utils/jwt';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Test wallets with known private keys (NEVER use these on mainnet!)
const TEST_WALLETS = [
  {
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    // This is the first account from Hardhat's default mnemonic
  },
  {
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    // This is the second account from Hardhat's default mnemonic
  },
];

interface TestUser {
  user_id: string;
  wallet_address: string;
  privateKey: string;
  nickname: string;
  email: string;
  timestamp: number;
  signature: string;
  token: string;
}

async function seedTestUsers() {
  try {
    await connectDatabase();
    console.log('📦 Database connected\n');

    const userRepository = AppDataSource.getRepository(User);
    const assetRepository = AppDataSource.getRepository(Asset);
    const loanRepository = AppDataSource.getRepository(Loan);
    const testUsers: TestUser[] = [];

    // Get first asset for default asset_id
    const assets = await assetRepository.find({
      order: { created_at: 'ASC' },
      take: 1,
    });
    const defaultAssetId = assets.length > 0 ? assets[0].asset_id : '';

    // Generate current timestamp (valid for 5 minutes)
    const timestamp = Date.now();

    for (let i = 0; i < TEST_WALLETS.length; i++) {
      const { privateKey } = TEST_WALLETS[i];
      const wallet = new ethers.Wallet(privateKey);

      const userId = `test-user-${String(i + 1).padStart(3, '0')}`;
      const nickname = `Test User ${i + 1}`;
      const email = `testuser${i + 1}@pawnable.test`;

      console.log(`\n${'='.repeat(80)}`);
      console.log(`Creating Test User ${i + 1}:`);
      console.log(`${'='.repeat(80)}`);

      // Check if user already exists
      let existingUser = await userRepository.findOne({
        where: { wallet_address: wallet.address },
      });

      if (!existingUser) {
        // Also check by user_id
        existingUser = await userRepository.findOne({
          where: { user_id: userId },
        });
      }

      if (existingUser) {
        console.log('⚠️  User already exists in database - using existing user');
        // Update user info to match
        existingUser.user_id = userId;
        existingUser.wallet_address = wallet.address;
        existingUser.nickname = nickname;
        existingUser.email = email;
        await userRepository.save(existingUser);
        console.log('✅ User info updated');
      } else {
        // Create user in database
        const user = userRepository.create({
          id: uuidv4(),
          user_id: userId,
          wallet_address: wallet.address,
          nickname: nickname,
          email: email,
        });

        await userRepository.save(user);
        console.log('✅ User created in database');
      }

      // Generate auth message
      const message = CryptoUtil.generateAuthMessage(wallet.address, timestamp);

      // Sign the message
      const signature = await wallet.signMessage(message);

      // Generate JWT token
      const token = JwtUtil.generateToken({
        user_id: userId,
        wallet_address: wallet.address,
      });

      const testUser: TestUser = {
        user_id: userId,
        wallet_address: wallet.address,
        privateKey: privateKey,
        nickname: nickname,
        email: email,
        timestamp: timestamp,
        signature: signature,
        token: token,
      };

      testUsers.push(testUser);

      // Display info
      console.log('\n📋 User Details:');
      console.log('   User ID:', userId);
      console.log('   Wallet Address:', wallet.address);
      console.log('   Private Key:', privateKey);
      console.log('   Nickname:', nickname);
      console.log('   Email:', email);
      console.log('\n🔐 Authentication Info (valid for 1 hour):');
      console.log('   Timestamp:', timestamp);
      console.log('   Signature:', signature.substring(0, 30) + '...');
      console.log('   JWT Token:', token.substring(0, 30) + '...');
    }

    // Create a test loan for testing (borrower: user 1, status: pending)
    console.log('\n\n' + '═'.repeat(80));
    console.log('Creating Test Loan:');
    console.log('═'.repeat(80));

    const testLoanId = 'test-loan-001';
    let existingLoan = await loanRepository.findOne({
      where: { loan_id: testLoanId },
    });

    if (existingLoan) {
      console.log('⚠️  Test loan already exists - using existing loan');
      console.log('   Loan ID:', existingLoan.loan_id);
      console.log('   Status:', existingLoan.status);
    } else {
      const repayDueDate = new Date();
      repayDueDate.setDate(repayDueDate.getDate() + 30); // 30 days from now

      const testLoan = loanRepository.create({
        loan_id: testLoanId,
        borrower_id: testUsers[0].user_id, // Test User 1 as borrower
        loan_asset_id: defaultAssetId,
        loan_amount: 1.0, // 1 ETH
        interest_rate_pct: 10.0, // 10%
        total_repay_amount: 1.1, // 1.1 ETH
        repay_due_at: repayDueDate,
        status: 'pending',
      });

      await loanRepository.save(testLoan);
      existingLoan = testLoan;
      console.log('✅ Test loan created');
      console.log('   Loan ID:', testLoan.loan_id);
      console.log('   Borrower:', testUsers[0].user_id);
      console.log('   Amount: 1.0 ETH');
      console.log('   Interest Rate: 10%');
      console.log('   Status: pending');
    }

    const defaultLoanId = existingLoan ? existingLoan.loan_id : '';

    // Generate Insomnia environment JSON
    console.log('\n\n' + '═'.repeat(80));
    console.log('📋 INSOMNIA ENVIRONMENT CONFIGURATION');
    console.log('═'.repeat(80));
    console.log('\nCopy this into your Insomnia environment:\n');

    const insomniaEnv = {
      base_url: 'http://yt4307.mooo.com:8085',
      api_url: 'http://yt4307.mooo.com:8085/api',
      // Test User 1
      test_user_1_id: testUsers[0].user_id,
      test_user_1_wallet: testUsers[0].wallet_address,
      test_user_1_private_key: testUsers[0].privateKey,
      test_user_1_token: testUsers[0].token,
      test_user_1_timestamp: testUsers[0].timestamp,
      test_user_1_signature: testUsers[0].signature,
      // Test User 2
      test_user_2_id: testUsers[1].user_id,
      test_user_2_wallet: testUsers[1].wallet_address,
      test_user_2_private_key: testUsers[1].privateKey,
      test_user_2_token: testUsers[1].token,
      test_user_2_timestamp: testUsers[1].timestamp,
      test_user_2_signature: testUsers[1].signature,
      // Default to user 1
      user_id: testUsers[0].user_id,
      wallet_address: testUsers[0].wallet_address,
      token: testUsers[0].token,
      // Placeholders for testing
      asset_id: defaultAssetId,
      loan_id: defaultLoanId,
    };

    console.log(JSON.stringify(insomniaEnv, null, 2));

    // Generate ready-to-use login request
    console.log('\n\n' + '═'.repeat(80));
    console.log('🚀 READY-TO-USE LOGIN REQUESTS FOR INSOMNIA');
    console.log('═'.repeat(80));

    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      console.log(`\n--- Test User ${i + 1} Login Request ---`);
      console.log('POST /api/auth/login');
      console.log('Body:');
      console.log(JSON.stringify({
        wallet_address: user.wallet_address,
        signature: user.signature,
        timestamp: user.timestamp,
      }, null, 2));
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('═'.repeat(80));
    console.log('1. These signatures are valid for 60 minutes (1 hour) from:', new Date(timestamp).toISOString());
    console.log('2. After 1 hour, run this script again to generate new signatures');
    console.log('3. NEVER use these private keys on mainnet - they are publicly known!');
    console.log('4. JWT tokens are valid for 7 days');
    console.log('\n✅ Seed completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedTestUsers();
