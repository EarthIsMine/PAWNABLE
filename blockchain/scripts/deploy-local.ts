import { ethers } from "hardhat";

async function main() {
  console.log("🚀 로컬 테스트넷에 배포 시작...\n");

  const [deployer] = await ethers.getSigners();
  console.log("배포 계정:", deployer.address);
  console.log("계정 잔액:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. 테스트용 토큰들 배포
  console.log("📝 테스트 토큰 배포 중...");
  
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  console.log("✅ USDT 배포됨:", await usdt.getAddress());

  const MockWETH = await ethers.getContractFactory("MockUSDT");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();
  console.log("✅ WETH 배포됨:", await weth.getAddress());

  const MockUSDC = await ethers.getContractFactory("MockUSDT");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("✅ USDC 배포됨:", await usdc.getAddress());

  // 2. 메인 대출 컨트랙트 배포
  console.log("\n📝 PawnableLoanToken 컨트랙트 배포 중...");
  const PawnableLoanToken = await ethers.getContractFactory("PawnableLoanToken");
  const loanContract = await PawnableLoanToken.deploy();
  await loanContract.waitForDeployment();
  console.log("✅ PawnableLoanToken 배포됨:", await loanContract.getAddress());

  // 3. 테스트용 NFT 배포 (옵션)
  console.log("\n📝 테스트 NFT 배포 중...");
  const PawnableNFT = await ethers.getContractFactory("PawnableNFT");
  const nft = await PawnableNFT.deploy();
  await nft.waitForDeployment();
  console.log("✅ PawnableNFT 배포됨:", await nft.getAddress());

  // 4. 환경 변수 파일 생성
  const envContent = `# 로컬 테스트넷 배포 주소
LOAN_CONTRACT_ADDRESS=${await loanContract.getAddress()}
USDT_ADDRESS=${await usdt.getAddress()}
WETH_ADDRESS=${await weth.getAddress()}
USDC_ADDRESS=${await usdc.getAddress()}
NFT_ADDRESS=${await nft.getAddress()}

# 로컬 테스트넷 설정
NETWORK=localhost
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=1337

# 배포 계정 주소 (private key는 직접 입력)
DEPLOYER_ADDRESS=${deployer.address}
`;

  const fs = require('fs');
  fs.writeFileSync('.env.local', envContent);
  console.log("\n✅ .env.local 파일 생성됨");

  // 5. 테스트용 토큰 민팅 (옵션)
  console.log("\n📝 테스트 계정에 토큰 민팅 중...");
  const testAmount = ethers.parseUnits("10000", 6); // 10,000 USDT
  await usdt.mint(deployer.address, testAmount);
  console.log("✅", deployer.address, "에게 10,000 USDT 민팅됨");

  console.log("\n🎉 배포 완료!\n");
  console.log("=".repeat(60));
  console.log("컨트랙트 주소:");
  console.log("=".repeat(60));
  console.log("PawnableLoanToken:", await loanContract.getAddress());
  console.log("USDT:", await usdt.getAddress());
  console.log("WETH:", await weth.getAddress());
  console.log("USDC:", await usdc.getAddress());
  console.log("PawnableNFT:", await nft.getAddress());
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
