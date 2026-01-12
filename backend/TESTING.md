# Testing Guide for PAWNABLE API

## Testing Authentication with Insomnia

The authentication flow requires wallet signature verification, which makes it challenging to test with just Insomnia. Here are the recommended approaches:

### Method 1: Using the Test Script (Recommended)

We provide a Node.js script that automates the entire auth flow:

```bash
# Install dependencies if needed
npm install

# Run the test script with your test wallet private key
npx tsx test-auth-signature.ts 0xYOUR_PRIVATE_KEY_HERE
```

The script will:
1. Get an auth message from the server
2. Sign it with your wallet
3. Test the login endpoint
4. Output the exact values to use in Insomnia

**⚠️ Security Note**: Only use test wallet private keys, never use keys with real funds!

### Method 2: Manual Testing with Insomnia

If you want to test manually:

#### Step 1: Get Auth Message
Call the `1. Get Auth Message` endpoint:
```json
POST /api/auth/message
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Welcome to PAWNABLE!\n\nSign this message to authenticate.\n\nWallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\nTimestamp: 1735430400000",
    "timestamp": 1735430400000
  }
}
```

#### Step 2: Sign the Message

You need to sign the message using one of these methods:

**Option A: Using ethers.js in Node.js**
```javascript
const { ethers } = require('ethers');

const privateKey = '0xYOUR_PRIVATE_KEY';
const wallet = new ethers.Wallet(privateKey);

const message = "...message from step 1...";
const signature = await wallet.signMessage(message);

console.log('Signature:', signature);
```

**Option B: Using MetaMask Console**
```javascript
const message = "...message from step 1...";
const signature = await ethereum.request({
  method: 'personal_sign',
  params: [message, ethereum.selectedAddress],
});
console.log('Signature:', signature);
```

#### Step 3: Login with Signature

Call the `2. Login` endpoint with the values from steps 1 and 2:

```json
POST /api/auth/login
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "message": "Welcome to PAWNABLE!\n\nSign this message to authenticate.\n\nWallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\nTimestamp: 1735430400000",
  "signature": "0x...signature from step 2...",
  "timestamp": 1735430400000
}
```

**⚠️ Important**: The timestamp expires after 5 minutes! If you get "Authentication request expired" error, start over from Step 1.

## Common Errors and Solutions

### "Authentication request expired. Please try again."
- **Cause**: The timestamp is older than 5 minutes
- **Solution**: Get a fresh auth message (Step 1) and complete all steps within 5 minutes

### "Invalid authentication message"
- **Cause**: The message doesn't match what the server expects
- **Common Issues**:
  - Wallet address case mismatch (0xABC vs 0xabc)
  - Different timestamp used in message vs login request
  - Message format doesn't match exactly
- **Solution**: Make sure you're using the exact message from Step 1

### "Invalid signature"
- **Cause**: The signature doesn't match the message and wallet
- **Common Issues**:
  - Wrong private key used
  - Message was modified after signing
  - Wallet address doesn't match the signer
- **Solution**: Re-sign the exact message with the correct wallet

## Environment Variables

The test script uses these environment variables:

- `API_URL`: API base URL (default: `http://yt4307.mooo.com:8085/api`)

Example:
```bash
API_URL=http://localhost:8085/api npx tsx test-auth-signature.ts 0xYOUR_PRIVATE_KEY
```

## Generating Test Wallets

If you need a test wallet:

```javascript
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
// ⚠️ Keep this private key secure! Only for testing!
```

## Testing Other Endpoints

Once you have a valid token from the login flow:

1. Update the `token` variable in your Insomnia environment
2. The token will be automatically included in authenticated requests
3. Token is valid for 7 days (168 hours)

## Troubleshooting

### CORS Errors
If testing from a browser, you may encounter CORS issues. Use the backend test script instead.

### Network Issues
Ensure the backend server is running:
```bash
npm run dev
# Server should start on port 8085
```

### Database Issues
Make sure PostgreSQL is running and the database is initialized:
```bash
npm run db:migrate
npm run db:seed
```
