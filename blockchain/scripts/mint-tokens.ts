import { ethers } from "hardhat";

async function main() {
  // .env.local에서 컨트랙트 주소 읽기
  const USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const USDC_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  const signers = await ethers.getSigners();

  console.log("🪙 테스트 토큰 민팅 시작...\n");

  // USDT 컨트랙트 연결
  const usdt = await ethers.getContractAt("MockUSDT", USDT_ADDRESS);
  const usdc = await ethers.getContractAt("MockUSDT", USDC_ADDRESS);

  // 민팅할 계정들 (Account #0 ~ #9)
  const recipients = signers.slice(0, 10);
  const amount = ethers.parseUnits("10000", 6); // 10,000 토큰

  console.log("각 계정에 10,000 USDT와 10,000 USDC를 민팅합니다...\n");

  for (let i = 0; i < recipients.length; i++) {
    const address = recipients[i].address;

    // USDT 민팅
    await usdt.mint(address, amount);
    const usdtBalance = await usdt.balanceOf(address);

    // USDC 민팅
    await usdc.mint(address, amount);
    const usdcBalance = await usdc.balanceOf(address);

    console.log(`✅ Account #${i}: ${address}`);
    console.log(`   USDT: ${ethers.formatUnits(usdtBalance, 6)}`);
    console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}\n`);
  }

  console.log("🎉 민팅 완료!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
