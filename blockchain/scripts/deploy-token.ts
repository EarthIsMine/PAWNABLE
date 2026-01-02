import { ethers } from "hardhat";

/**
 * @title PAWNABLE Token Collateral 컨트랙트 배포 스크립트
 * @notice 이 스크립트는 다음을 배포합니다:
 *   1. MockUSDT - 테스트용 USDT 토큰 (대출 토큰)
 *   2. MockWETH - 테스트용 WETH 토큰 (담보 토큰)
 *   3. MockUSDC - 테스트용 USDC 토큰 (담보 토큰)
 *   4. PawnableLoanToken - ETH/ERC20 담보 대출 컨트랙트
 */
async function main() {
  console.log("🚀 PAWNABLE Token Collateral 컨트랙트 배포 시작...\n");

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

  const usdtSupply = await usdt.totalSupply();
  console.log(
    "   총 공급량:",
    ethers.formatUnits(usdtSupply, 6),
    "USDT\n"
  );

  // ==================== 2. MockWETH 배포 ====================
  console.log("2️⃣  MockWETH 배포 중...");
  const MockERC20 = await ethers.getContractFactory("MockUSDT"); // MockUSDT를 재사용
  const weth = await MockERC20.deploy();
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("✅ MockWETH 배포 완료:", wethAddress, "\n");

  // ==================== 3. MockUSDC 배포 ====================
  console.log("3️⃣  MockUSDC 배포 중...");
  const usdc = await MockERC20.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ MockUSDC 배포 완료:", usdcAddress, "\n");

  // ==================== 4. PawnableLoanToken 배포 ====================
  console.log("4️⃣  PawnableLoanToken 배포 중...");
  const PawnableLoanToken = await ethers.getContractFactory("PawnableLoanToken");
  const loanToken = await PawnableLoanToken.deploy();
  await loanToken.waitForDeployment();
  const loanTokenAddress = await loanToken.getAddress();
  console.log("✅ PawnableLoanToken 배포 완료:", loanTokenAddress);

  const platformFee = await loanToken.platformFeeBps();
  console.log("   플랫폼 수수료:", Number(platformFee) / 100, "%\n");

  // ==================== 배포 완료 ====================
  console.log("🎉 모든 컨트랙트 배포 완료!\n");
  console.log("=" .repeat(70));
  console.log("📋 배포된 컨트랙트 주소:");
  console.log("=" .repeat(70));
  console.log("MockUSDT (대출 토큰)    :", usdtAddress);
  console.log("MockWETH (담보 토큰)    :", wethAddress);
  console.log("MockUSDC (담보 토큰)    :", usdcAddress);
  console.log("PawnableLoanToken       :", loanTokenAddress);
  console.log("=" .repeat(70));
  console.log("\n💡 사용 예시:");
  console.log("1. ETH를 담보로 대출 요청:");
  console.log("   requestLoanWithETH() + msg.value (ETH 전송)");
  console.log("\n2. WETH를 담보로 대출 요청:");
  console.log("   approve(WETH) → requestLoanWithToken(WETH, amount)");
  console.log("\n3. USDC를 담보로 대출 요청:");
  console.log("   approve(USDC) → requestLoanWithToken(USDC, amount)\n");

  // .env 파일 형식으로 출력
  console.log("📄 .env 파일에 추가할 내용:");
  console.log("=" .repeat(70));
  console.log(`USDT_CONTRACT_ADDRESS=${usdtAddress}`);
  console.log(`WETH_CONTRACT_ADDRESS=${wethAddress}`);
  console.log(`USDC_CONTRACT_ADDRESS=${usdcAddress}`);
  console.log(`LOAN_TOKEN_CONTRACT_ADDRESS=${loanTokenAddress}`);
  console.log("=" .repeat(70));
}

// 에러 핸들링과 함께 실행
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 중 오류 발생:");
    console.error(error);
    process.exit(1);
  });
