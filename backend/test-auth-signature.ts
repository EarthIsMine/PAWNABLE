/**
 * Test Script: Generate Wallet Signature for Auth Testing
 *
 * This script helps you test the /auth/login endpoint by:
 * 1. Getting an auth message from the server
 * 2. Signing it with a test wallet
 * 3. Providing the values to use in Insomnia
 *
 * Usage:
 *   npx tsx test-auth-signature.ts <PRIVATE_KEY>
 *
 * Example:
 *   npx tsx test-auth-signature.ts 0x1234567890abcdef...
 */

import { ethers } from 'ethers';

const API_URL = process.env.API_URL || 'http://yt4307.mooo.com:8085/api';

interface AuthMessageResponse {
  success: boolean;
  data?: {
    message: string;
    timestamp: number;
  };
  error?: string;
}

interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user_id: string;
  };
  error?: string;
}

async function testAuthFlow(): Promise<void> {
  const privateKey = process.argv[2];

  if (!privateKey) {
    console.error('Error: Private key is required');
    console.log('Usage: npx tsx test-auth-signature.ts <PRIVATE_KEY>');
    console.log('Example: npx tsx test-auth-signature.ts 0x1234567890abcdef...');
    process.exit(1);
  }

  try {
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    console.log('\n📝 Wallet Address:', wallet.address);
    console.log('─'.repeat(80));

    // Step 1: Get auth message from server
    console.log('\n1️⃣  Getting auth message from server...');
    const messageResponse = await fetch(`${API_URL}/auth/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_address: wallet.address,
      }),
    });

    const messageData: AuthMessageResponse = await messageResponse.json();

    if (!messageData.success || !messageData.data) {
      throw new Error(messageData.error || 'Failed to get auth message');
    }

    const { message, timestamp } = messageData.data;
    console.log('✅ Message received');
    console.log('   Message:', message.substring(0, 50) + '...');
    console.log('   Timestamp:', timestamp);

    // Step 2: Sign the message
    console.log('\n2️⃣  Signing message with wallet...');
    const signature = await wallet.signMessage(message);
    console.log('✅ Signature generated:', signature.substring(0, 20) + '...');

    // Step 3: Test login
    console.log('\n3️⃣  Testing login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_address: wallet.address,
        message,
        signature,
        timestamp,
      }),
    });

    const loginData: LoginResponse = await loginResponse.json();

    console.log('\n' + '─'.repeat(80));
    if (loginData.success && loginData.data) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('   Token:', loginData.data.token.substring(0, 30) + '...');
      console.log('   User ID:', loginData.data.user_id);
    } else {
      console.log('❌ LOGIN FAILED!');
      console.log('   Error:', loginData.error);
    }

    // Output for Insomnia
    console.log('\n' + '═'.repeat(80));
    console.log('📋 COPY THESE VALUES TO INSOMNIA:');
    console.log('═'.repeat(80));
    console.log('\nRequest Body for /auth/login:');
    console.log(JSON.stringify({
      wallet_address: wallet.address,
      message: message,
      signature: signature,
      timestamp: timestamp
    }, null, 2));
    console.log('\n' + '═'.repeat(80));

    if (loginData.success && loginData.data) {
      console.log('\n💡 TIP: Update your Insomnia environment with:');
      console.log('   - wallet_address:', wallet.address);
      console.log('   - token:', loginData.data.token);
      console.log('   - user_id:', loginData.data.user_id);
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'cause' in error) {
      console.error('   Cause:', error.cause);
    }
    process.exit(1);
  }
}

// Run the test
testAuthFlow();
