import { ethers } from "hardhat";

/**
 * @title PAWNABLE 스마트 컨트랙트 배포 스크립트
 * @notice 이 스크립트는 다음을 배포합니다:
 *   1. MockUSDT - 테스트용 USDT 토큰
 *   2. PawnableNFT - 담보로 사용할 테스트 NFT
 *   3. PawnableLoan - 핵심 대출 컨트랙트
 */
async function main() {
  console.log("🚀 PAWNABLE 컨트랙트 배포 시작...\n");

  // 배포자 주소 확인
  const [deployer] = await ethers.getSigners();
  console.log("📍 배포자 주소:", deployer.address);
  console.log(
    "💰 배포자 잔액:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // ==================== 1. MockUSDT 배포 ====================
  console.log("1️⃣  MockUSDT 배포 중...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("✅ MockUSDT 배포 완료:", usdtAddress);

  // USDT 초기 공급량 확인
  const usdtSupply = await usdt.totalSupply();
  console.log(
    "   총 공급량:",
    ethers.formatUnits(usdtSupply, 6),
    "USDT\n"
  );

  // ==================== 2. PawnableNFT 배포 ====================
  console.log("2️⃣  PawnableNFT 배포 중...");
  const PawnableNFT = await ethers.getContractFactory("PawnableNFT");
  const nft = await PawnableNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("✅ PawnableNFT 배포 완료:", nftAddress, "\n");

  // ==================== 3. PawnableLoan 배포 ====================
  console.log("3️⃣  PawnableLoan 배포 중...");
  const PawnableLoan = await ethers.getContractFactory("PawnableLoan");
  const loan = await PawnableLoan.deploy();
  await loan.waitForDeployment();
  const loanAddress = await loan.getAddress();
  console.log("✅ PawnableLoan 배포 완료:", loanAddress);

  // 플랫폼 수수료 확인
  const platformFee = await loan.platformFeeBps();
  console.log("   플랫폼 수수료:", Number(platformFee) / 100, "%\n");

  // ==================== 배포 완료 ====================
  console.log("🎉 모든 컨트랙트 배포 완료!\n");
  console.log("=" .repeat(60));
  console.log("📋 배포된 컨트랙트 주소:");
  console.log("=" .repeat(60));
  console.log("MockUSDT       :", usdtAddress);
  console.log("PawnableNFT    :", nftAddress);
  console.log("PawnableLoan   :", loanAddress);
  console.log("=" .repeat(60));
  console.log("\n💡 다음 단계:");
  console.log("1. 이 주소들을 backend/.env 파일에 저장하세요");
  console.log("2. 테스트를 실행하세요: pnpm test");
  console.log("3. 프론트엔드에서 이 주소들을 사용하여 연결하세요\n");

  // .env 파일 형식으로 출력
  console.log("📄 .env 파일에 추가할 내용:");
  console.log("=" .repeat(60));
  console.log(`USDT_CONTRACT_ADDRESS=${usdtAddress}`);
  console.log(`NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`LOAN_CONTRACT_ADDRESS=${loanAddress}`);
  console.log("=" .repeat(60));
}

// 에러 핸들링과 함께 실행
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 중 오류 발생:");
    console.error(error);
    process.exit(1);
  });
