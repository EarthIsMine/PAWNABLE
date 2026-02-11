# PAWNABLE - Frontend Blockchain Integration Guide

## Network & Contract

| 항목 | 값 |
|---|---|
| Network | Base Sepolia Testnet |
| Chain ID | `84532` |
| RPC URL | `https://sepolia.base.org` |
| Contract Address | `0x33064676A784F99b58437ce9e04B50A2FE851586` |
| Basescan | https://sepolia.basescan.org/address/0x33064676a784f99b58437ce9e04b50a2fe851586 |
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

## 아키텍처 개요

이전 EIP-712 Intent 모델과 달리, **모든 주문이 온체인에 직접 생성**됩니다.

- Borrower가 `createLoanRequest()`를 호출하면 담보가 즉시 컨트랙트에 lock
- 오프체인 서명 불필요 (nonce, deadline, signature 없음)
- 백엔드는 순수 인덱서 — 온체인 이벤트를 DB에 기록만

---

## 컨트랙트 호출

### Borrower: 대출 요청 생성 (createLoanRequest)

ERC20 담보인 경우 먼저 approve가 필요합니다.

```typescript
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// === ERC20 담보 (예: WETH) ===
// 1. approve
const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);
await (await weth.approve(CONTRACT_ADDRESS, ethers.parseEther("1"))).wait();

// 2. createLoanRequest
const tx = await contract.createLoanRequest(
  WETH_ADDRESS,                                    // collateralToken
  ethers.parseEther("1"),                          // collateralAmount (1 WETH)
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e",   // principalToken (USDC)
  ethers.parseUnits("1000", 6),                    // principalAmount (1000 USDC)
  500,                                              // interestBps (5%)
  604800                                            // duration (7일)
);
const receipt = await tx.wait();

// 이벤트에서 requestId 추출
const event = receipt.logs.find(
  (log) => contract.interface.parseLog(log)?.name === "LoanRequestCreated"
);
const requestId = contract.interface.parseLog(event).args.requestId;
```

### Borrower: ETH 담보로 대출 요청

```typescript
// ETH 담보는 msg.value로 전송 (approve 불필요)
const tx = await contract.createLoanRequest(
  "0x0000000000000000000000000000000000000000",   // collateralToken = ETH
  ethers.parseEther("1"),                          // collateralAmount
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e",   // principalToken (USDC)
  ethers.parseUnits("1000", 6),                    // principalAmount
  500,                                              // interestBps
  604800,                                           // duration
  { value: ethers.parseEther("1") }                // msg.value = collateralAmount
);
```

### Borrower: 대출 요청 취소 (cancelLoanRequest)

OPEN 상태일 때만 가능. 담보가 borrower에게 반환됩니다.

```typescript
const tx = await contract.cancelLoanRequest(requestId);
await tx.wait();
// 담보 자동 반환됨
```

### Lender: 자금 제공 (fundLoan)

대출 요청을 수락하여 원금을 borrower에게 전송합니다.

```typescript
// === ERC20 원금 (예: USDC) ===
// 1. approve
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
await (await usdc.approve(CONTRACT_ADDRESS, principalAmount)).wait();

// 2. fundLoan
const tx = await contract.fundLoan(requestId);
const receipt = await tx.wait();

// 이벤트에서 loanId 추출
const event = receipt.logs.find(
  (log) => contract.interface.parseLog(log)?.name === "LoanFunded"
);
const loanId = contract.interface.parseLog(event).args.loanId;
```

### Lender: ETH 원금으로 자금 제공

```typescript
const tx = await contract.fundLoan(requestId, {
  value: principalAmount  // msg.value = principalAmount
});
```

### Borrower: 상환 (repayLoan)

기한 내에 원금+이자를 상환하면 담보가 반환됩니다.

```typescript
// 상환 금액 조회
const repayAmount = await contract.getRepayAmount(loanId);

// ERC20 원금인 경우: approve 필요
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
await (await usdc.approve(CONTRACT_ADDRESS, repayAmount)).wait();

// repayLoan
const tx = await contract.repayLoan(loanId);
await tx.wait();
// 담보 자동 반환됨
```

### ETH 원금 상환

```typescript
const repayAmount = await contract.getRepayAmount(loanId);
const tx = await contract.repayLoan(loanId, { value: repayAmount });
await tx.wait();
```

### 담보 청산 (claimCollateral)

기한 초과 시 누구나 호출 가능. 담보가 lender에게 전달됩니다.

```typescript
const tx = await contract.claimCollateral(loanId);
await tx.wait();
// 담보 → lender
```

---

## ERC20 Approve 흐름

Borrower가 ERC20 담보를 사용하거나, Lender가 ERC20 원금을 제공할 때 approve가 필요합니다.

```typescript
const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);

// 잔액 확인
const balance = await token.balanceOf(userAddress);

// allowance 확인
const allowance = await token.allowance(userAddress, CONTRACT_ADDRESS);

// approve (부족한 경우)
if (allowance < amount) {
  const tx = await token.approve(CONTRACT_ADDRESS, ethers.MaxUint256);
  await tx.wait();
}
```

---

## 전체 Flow 다이어그램

```
Borrower                    Frontend                   Contract                 Backend (Indexer)
   |                           |                          |                        |
   |  1. 대출 조건 입력          |                          |                        |
   |-------------------------->|                          |                        |
   |                           |  2. approve (ERC20 담보)  |                        |
   |                           |------------------------->|                        |
   |                           |  3. createLoanRequest()  |                        |
   |                           |------------------------->|                        |
   |                           |  4. Tx 완료 (담보 lock됨)  |                        |
   |                           |<-------------------------|                        |
   |                           |                          |  LoanRequestCreated    |
   |                           |                          |----------------------->|
   |                           |                          |  POST /loan-requests   |
   |                           |                          |                        |
Lender                         |                          |                        |
   |  5. 대출 요청 목록 조회      |                          |                        |
   |-------------------------->|  GET /api/loan-requests   |                        |
   |                           |-------------------------------------------------->|
   |                           |<--------------------------------------------------|
   |  6. 마음에 드는 요청 수락    |                          |                        |
   |-------------------------->|                          |                        |
   |                           |  7. approve (ERC20 원금)  |                        |
   |                           |------------------------->|                        |
   |                           |  8. fundLoan(requestId)  |                        |
   |                           |------------------------->|                        |
   |                           |  9. Tx 완료 (원금→Borrower)|                        |
   |                           |<-------------------------|                        |
   |                           |                          |  LoanFunded            |
   |                           |                          |----------------------->|
   |                           |                          |  POST /loans           |
   |                           |                          |                        |
Borrower                       |                          |                        |
   |  10. 상환                  |                          |                        |
   |-------------------------->|  repayLoan(loanId)       |                        |
   |                           |------------------------->|                        |
   |                           |  담보 반환됨               |                        |
   |                           |<-------------------------|                        |
   |                           |                          |  LoanRepaid            |
   |                           |                          |----------------------->|
   |                           |                          |                        |
   |               OR (기한 초과 시)                        |                        |
   |                           |                          |                        |
Anyone                         |                          |                        |
   |  11. 담보 청산              |                          |                        |
   |-------------------------->|  claimCollateral(loanId) |                        |
   |                           |------------------------->|                        |
   |                           |  담보→Lender              |                        |
   |                           |<-------------------------|                        |
   |                           |                          |  CollateralClaimed     |
   |                           |                          |----------------------->|
```

---

## 금액 표시 규칙

모든 금액은 **raw uint256** 문자열로 저장됩니다. UI에 표시할 때 decimals로 변환하세요.

```typescript
import { formatUnits, parseUnits } from "ethers";

// raw → 표시용
formatUnits("1000000000", 6);   // "1000.0"      (USDC: 6 decimals)
formatUnits("1000000000000000000", 18); // "1.0" (ETH: 18 decimals)

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
    "name": "createLoanRequest",
    "inputs": [
      { "name": "collateralToken", "type": "address" },
      { "name": "collateralAmount", "type": "uint256" },
      { "name": "principalToken", "type": "address" },
      { "name": "principalAmount", "type": "uint256" },
      { "name": "interestBps", "type": "uint256" },
      { "name": "duration", "type": "uint256" }
    ],
    "outputs": [{ "name": "requestId", "type": "uint256" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "cancelLoanRequest",
    "inputs": [{ "name": "requestId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fundLoan",
    "inputs": [{ "name": "requestId", "type": "uint256" }],
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
    "name": "getLoanRequest",
    "inputs": [{ "name": "requestId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "borrower", "type": "address" },
          { "name": "collateralToken", "type": "address" },
          { "name": "collateralAmount", "type": "uint256" },
          { "name": "principalToken", "type": "address" },
          { "name": "principalAmount", "type": "uint256" },
          { "name": "interestBps", "type": "uint256" },
          { "name": "duration", "type": "uint256" },
          { "name": "status", "type": "uint8" }
        ]
      }
    ],
    "stateMutability": "view"
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
          { "name": "requestId", "type": "uint256" },
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
    "name": "nextRequestId",
    "inputs": [],
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
    "name": "LoanRequestCreated",
    "inputs": [
      { "name": "requestId", "type": "uint256", "indexed": true },
      { "name": "borrower", "type": "address", "indexed": true },
      { "name": "collateralToken", "type": "address", "indexed": false },
      { "name": "collateralAmount", "type": "uint256", "indexed": false },
      { "name": "principalToken", "type": "address", "indexed": false },
      { "name": "principalAmount", "type": "uint256", "indexed": false },
      { "name": "interestBps", "type": "uint256", "indexed": false },
      { "name": "duration", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LoanRequestCancelled",
    "inputs": [
      { "name": "requestId", "type": "uint256", "indexed": true },
      { "name": "borrower", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "LoanFunded",
    "inputs": [
      { "name": "loanId", "type": "uint256", "indexed": true },
      { "name": "requestId", "type": "uint256", "indexed": true },
      { "name": "lender", "type": "address", "indexed": true },
      { "name": "borrower", "type": "address", "indexed": false },
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
  }
]
```

---

## Status 매핑

컨트랙트의 status 필드는 `uint8`로 반환됩니다.

### RequestStatus

| 값 | 상태 | 의미 |
|---|---|---|
| `0` | OPEN | 대출 요청 중 (담보 lock됨) |
| `1` | FUNDED | 자금 제공됨 (대출 성립) |
| `2` | CANCELLED | 취소됨 (담보 반환됨) |

### LoanStatus

| 값 | 상태 | 의미 |
|---|---|---|
| `0` | ONGOING | 진행 중 (상환 가능) |
| `1` | REPAID | 상환 완료 (담보 반환됨) |
| `2` | CLAIMED | 청산 완료 (담보가 lender에게 이동) |

---

## 이전 모델과의 주요 차이점

| 항목 | 이전 (Intent) | 현재 (Order Book) |
|------|--------------|-------------------|
| 주문 생성 | EIP-712 오프체인 서명 | `createLoanRequest()` 온체인 트랜잭션 |
| 담보 lock | `executeLoan` 시점 | `createLoanRequest` 시점 (즉시) |
| 취소 | nonce increment | `cancelLoanRequest()` 호출 |
| 필요 데이터 | signature, nonce, deadline, intentHash | 없음 (온체인에 모두 존재) |
| ETH 담보 | `depositEth()` 사전 예치 | `msg.value`로 직접 전송 |
| 백엔드 역할 | 서명 검증 + 상태 관리 | 순수 인덱서 (읽기 전용 캐시) |
