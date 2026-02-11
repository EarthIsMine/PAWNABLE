# PAWNABLE - Frontend Blockchain Integration Guide

## Network & Contract

| 항목 | 값 |
|---|---|
| Network | Base Sepolia Testnet |
| Chain ID | `84532` |
| RPC URL | `https://sepolia.base.org` |
| Contract Address | `0xBDB3c41A11731023f3ca1a8dAB1838388Bac0ED1` |
| Basescan | https://sepolia.basescan.org/address/0xbdb3c41a11731023f3ca1a8dab1838388bac0ed1 |
| Native Token | `0x0000000000000000000000000000000000000000` (ETH) |

## Supported Tokens (Base Sepolia)

| Symbol | Address | Decimals |
|--------|---------|----------|
| ETH | `0x0000000000000000000000000000000000000000` | 18 |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | 6 |

---

## MetaMask Network 설정

```
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
```

---

## EIP-712 서명 (Borrower가 Intent 생성할 때)

Borrower가 대출 조건에 서명할 때 MetaMask의 `eth_signTypedData_v4`를 사용합니다.

### Domain

```typescript
const domain = {
  name: "PawnableLoan",
  version: "1",
  chainId: 84532,
  verifyingContract: "0xBDB3c41A11731023f3ca1a8dAB1838388Bac0ED1",
};
```

### Types

```typescript
const types = {
  LoanIntent: [
    { name: "borrower", type: "address" },
    { name: "collateralToken", type: "address" },
    { name: "collateralAmount", type: "uint256" },
    { name: "principalToken", type: "address" },
    { name: "principalAmount", type: "uint256" },
    { name: "interestBps", type: "uint256" },
    { name: "durationSeconds", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};
```

### 서명 예시 (ethers.js v6)

```typescript
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const borrowerAddress = await signer.getAddress();

// 1. 현재 nonce 조회
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
const nonce = await contract.nonces(borrowerAddress);

// 2. intent 값 구성
const message = {
  borrower: borrowerAddress,
  collateralToken: "0x4200000000000000000000000000000000000006", // WETH
  collateralAmount: ethers.parseEther("1"),                      // 1 WETH
  principalToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",  // USDC
  principalAmount: ethers.parseUnits("1000", 6),                 // 1000 USDC
  interestBps: 500,                                              // 5%
  durationSeconds: 604800,                                       // 7일
  nonce: nonce,
  deadline: Math.floor(Date.now() / 1000) + 3600,               // 1시간 후 만료
};

// 3. EIP-712 서명
const signature = await signer.signTypedData(domain, types, message);

// 4. intent hash 계산
const intentHash = await contract.getIntentHash(
  message.borrower,
  message.collateralToken,
  message.collateralAmount,
  message.principalToken,
  message.principalAmount,
  message.interestBps,
  message.durationSeconds,
  message.nonce,
  message.deadline
);

// 5. 백엔드에 전송
await fetch("http://localhost:8080/api/intents", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chainId: 84532,
    verifyingContract: CONTRACT_ADDRESS,
    borrower: message.borrower,
    collateralToken: message.collateralToken,
    collateralAmount: message.collateralAmount.toString(),
    principalToken: message.principalToken,
    principalAmount: message.principalAmount.toString(),
    interestBps: message.interestBps,
    durationSeconds: message.durationSeconds,
    nonce: message.nonce.toString(),
    deadline: message.deadline.toString(),
    intentHash: intentHash,
    signature: signature,
  }),
});
```

---

## 컨트랙트 호출 (Lender/Borrower 트랜잭션)

### Lender: 대출 실행 (executeLoan)

Lender가 intent를 수락할 때 호출합니다.

```typescript
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// ERC20 원금인 경우: 먼저 approve 필요
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(CONTRACT_ADDRESS, principalAmount);

// executeLoan 호출
const tx = await contract.executeLoan(
  borrower,           // address
  collateralToken,    // address
  collateralAmount,   // uint256
  principalToken,     // address
  principalAmount,    // uint256
  interestBps,        // uint256
  durationSeconds,    // uint256
  nonce,              // uint256
  deadline,           // uint256
  signature           // bytes
);
const receipt = await tx.wait();

// 이벤트에서 loanId 추출
const event = receipt.logs.find(
  (log) => contract.interface.parseLog(log)?.name === "LoanExecuted"
);
const loanId = contract.interface.parseLog(event).args.loanId;
```

### Borrower: 상환 (repayLoan)

```typescript
// ERC20 원금인 경우: approve 필요 (원금 + 이자)
const repayAmount = await contract.getRepayAmount(loanId);
await usdc.approve(CONTRACT_ADDRESS, repayAmount);

// repayLoan 호출
const tx = await contract.repayLoan(loanId);
await tx.wait();
```

### ETH 원금인 경우

```typescript
// ETH를 원금으로 빌려줄 때 (Lender)
const tx = await contract.executeLoan(
  borrower, collateralToken, collateralAmount,
  "0x0000000000000000000000000000000000000000", // ETH
  ethers.parseEther("0.5"), interestBps, durationSeconds,
  nonce, deadline, signature,
  { value: ethers.parseEther("0.5") }  // msg.value로 ETH 전송
);

// ETH를 상환할 때 (Borrower)
const repayAmount = await contract.getRepayAmount(loanId);
const tx = await contract.repayLoan(loanId, { value: repayAmount });
```

### ETH 담보 예치 (Borrower)

ETH를 담보로 쓰려면 먼저 예치해야 합니다 (ETH는 approve가 없으므로).

```typescript
// 예치
const tx = await contract.depositEth({ value: ethers.parseEther("1") });

// 인출
const tx = await contract.withdrawEth(ethers.parseEther("1"));

// 잔액 확인
const balance = await contract.ethDeposits(borrowerAddress);
```

---

## ERC20 Approve 흐름 (담보 토큰)

Borrower가 ERC20 담보를 사용하려면 컨트랙트에 approve가 필요합니다.

```typescript
const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);

// 잔액 확인
const balance = await weth.balanceOf(borrowerAddress);

// allowance 확인
const allowance = await weth.allowance(borrowerAddress, CONTRACT_ADDRESS);

// approve (무제한 또는 필요 금액)
if (allowance < collateralAmount) {
  const tx = await weth.approve(CONTRACT_ADDRESS, ethers.MaxUint256);
  await tx.wait();
}
```

---

## 전체 Flow 다이어그램

```
Borrower                    Frontend                   Backend                  Contract
   |                           |                          |                        |
   |  1. 대출 조건 입력          |                          |                        |
   |-------------------------->|                          |                        |
   |                           |  2. nonce 조회            |                        |
   |                           |------------------------------------------>------->|
   |                           |<------------------------------------------<-------|
   |  3. EIP-712 서명 요청       |                          |                        |
   |  (MetaMask 팝업)           |                          |                        |
   |<--------------------------|                          |                        |
   |  4. 서명 승인               |                          |                        |
   |-------------------------->|                          |                        |
   |                           |  5. POST /api/intents     |                        |
   |                           |------------------------->|                        |
   |                           |  6. Intent 저장 완료       |                        |
   |                           |<-------------------------|                        |
   |                           |                          |                        |
   |                           |                          |                        |
Lender                         |                          |                        |
   |  7. Intent 목록 조회        |                          |                        |
   |-------------------------->|  GET /api/intents         |                        |
   |                           |------------------------->|                        |
   |                           |<-------------------------|                        |
   |  8. 마음에 드는 Intent 수락  |                          |                        |
   |-------------------------->|                          |                        |
   |                           |  9. approve (ERC20 원금)   |                        |
   |                           |------------------------------------------>------->|
   |                           |  10. executeLoan()        |                        |
   |                           |------------------------------------------>------->|
   |                           |  11. Tx 완료               |                        |
   |                           |<------------------------------------------<-------|
   |                           |  12. POST /api/intents/:id/execute                 |
   |                           |------------------------->|                        |
   |                           |  13. POST /api/loans      |                        |
   |                           |------------------------->|                        |
```

---

## 금액 표시 규칙

모든 금액은 **raw uint256** 문자열로 저장됩니다. UI에 표시할 때 decimals로 변환하세요.

```typescript
import { formatUnits, parseUnits } from "ethers";

// raw → 표시용
formatUnits("1000000000", 6);   // "1000.0"      (USDC: 6 decimals)
formatUnits("1000000000000000000", 18); // "1.0" (ETH/WETH: 18 decimals)

// 입력 → raw
parseUnits("1000", 6);          // 1000000000n   (USDC)
parseUnits("1", 18);            // 1000000000000000000n (ETH)
```

### 이자율 (interestBps)

```
500 bps = 5.00%
100 bps = 1.00%
 50 bps = 0.50%

// 표시: (interestBps / 100).toFixed(2) + "%"
// 상환금액 = principalAmount * (10000 + interestBps) / 10000
```

---

## Contract ABI

아래 ABI를 `src/abi/PawnableLoan.json`으로 저장해서 사용하세요.

```json
[
  {
    "type": "function",
    "name": "executeLoan",
    "inputs": [
      { "name": "borrower", "type": "address" },
      { "name": "collateralToken", "type": "address" },
      { "name": "collateralAmount", "type": "uint256" },
      { "name": "principalToken", "type": "address" },
      { "name": "principalAmount", "type": "uint256" },
      { "name": "interestBps", "type": "uint256" },
      { "name": "durationSeconds", "type": "uint256" },
      { "name": "nonce", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "signature", "type": "bytes" }
    ],
    "outputs": [{ "name": "loanId", "type": "uint256" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "repayLoan",
    "inputs": [{ "name": "loanId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "claimCollateral",
    "inputs": [{ "name": "loanId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "depositEth",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "withdrawEth",
    "inputs": [{ "name": "amount", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "incrementNonce",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getLoan",
    "inputs": [{ "name": "loanId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "borrower", "type": "address" },
          { "name": "lender", "type": "address" },
          { "name": "collateralToken", "type": "address" },
          { "name": "collateralAmount", "type": "uint256" },
          { "name": "principalToken", "type": "address" },
          { "name": "principalAmount", "type": "uint256" },
          { "name": "interestBps", "type": "uint256" },
          { "name": "startTimestamp", "type": "uint256" },
          { "name": "dueTimestamp", "type": "uint256" },
          { "name": "status", "type": "uint8" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRepayAmount",
    "inputs": [{ "name": "loanId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getIntentHash",
    "inputs": [
      { "name": "borrower", "type": "address" },
      { "name": "collateralToken", "type": "address" },
      { "name": "collateralAmount", "type": "uint256" },
      { "name": "principalToken", "type": "address" },
      { "name": "principalAmount", "type": "uint256" },
      { "name": "interestBps", "type": "uint256" },
      { "name": "durationSeconds", "type": "uint256" },
      { "name": "nonce", "type": "uint256" },
      { "name": "deadline", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bytes32" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonces",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ethDeposits",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextLoanId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "LoanExecuted",
    "inputs": [
      { "name": "loanId", "type": "uint256", "indexed": true },
      { "name": "borrower", "type": "address", "indexed": true },
      { "name": "lender", "type": "address", "indexed": true },
      { "name": "collateralToken", "type": "address", "indexed": false },
      { "name": "collateralAmount", "type": "uint256", "indexed": false },
      { "name": "principalToken", "type": "address", "indexed": false },
      { "name": "principalAmount", "type": "uint256", "indexed": false },
      { "name": "interestBps", "type": "uint256", "indexed": false },
      { "name": "startTimestamp", "type": "uint256", "indexed": false },
      { "name": "dueTimestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LoanRepaid",
    "inputs": [
      { "name": "loanId", "type": "uint256", "indexed": true },
      { "name": "borrower", "type": "address", "indexed": true },
      { "name": "repayAmount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "CollateralClaimed",
    "inputs": [
      { "name": "loanId", "type": "uint256", "indexed": true },
      { "name": "lender", "type": "address", "indexed": true },
      { "name": "collateralAmount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "EthDeposited",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "EthWithdrawn",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "NonceIncremented",
    "inputs": [
      { "name": "borrower", "type": "address", "indexed": true },
      { "name": "newNonce", "type": "uint256", "indexed": false }
    ]
  }
]
```

---

## LoanStatus 매핑

컨트랙트의 `status` 필드는 `uint8`로 반환됩니다.

| 값 | 상태 | 의미 |
|---|---|---|
| `0` | ONGOING | 진행 중 (상환 가능) |
| `1` | REPAID | 상환 완료 (담보 반환됨) |
| `2` | CLAIMED | 청산 완료 (담보가 lender에게 이동) |
