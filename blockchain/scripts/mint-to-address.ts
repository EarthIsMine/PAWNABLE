import { ethers } from "hardhat";

async function main() {
  // 사용자 지갑 주소 입력
  const userAddress = process.argv[2];

  if (!userAddress) {
    console.error("❌ 사용법: npx hardhat run scripts/mint-to-address.ts --network localhost <주소>");
    process.exit(1);
  }

  // 컨트랙트 주소
  const USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const USDC_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  console.log(`🪙 ${userAddress}에게 토큰 민팅 중...\n`);

  // USDT, USDC 컨트랙트 연결
  const usdt = await ethers.getContractAt("MockUSDT", USDT_ADDRESS);
  const usdc = await ethers.getContractAt("MockUSDT", USDC_ADDRESS);

  // 각 토큰 100,000개씩 민팅
  const amount = ethers.parseUnits("100000", 6);

  await usdt.mint(userAddress, amount);
  await usdc.mint(userAddress, amount);

  const usdtBalance = await usdt.balanceOf(userAddress);
  const usdcBalance = await usdc.balanceOf(userAddress);

  console.log("✅ 민팅 완료!\n");
  console.log(`주소: ${userAddress}`);
  console.log(`USDT 잔액: ${ethers.formatUnits(usdtBalance, 6)}`);
  console.log(`USDC 잔액: ${ethers.formatUnits(usdcBalance, 6)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
