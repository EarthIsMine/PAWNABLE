import { ethers } from "hardhat";

async function main() {
  const USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const USDC_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const recipientAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  console.log("🔄 토큰 전송 시작...\n");

  const [deployer] = await ethers.getSigners();
  console.log("전송자:", deployer.address);
  console.log("수신자:", recipientAddress);

  // USDT 컨트랙트 연결
  const usdt = await ethers.getContractAt("MockUSDT", USDT_ADDRESS);
  const usdc = await ethers.getContractAt("MockUSDT", USDC_ADDRESS);

  const amount = ethers.parseUnits("50000", 6); // 50,000 토큰

  // 전송 전 잔액 확인
  const usdtBalanceBefore = await usdt.balanceOf(recipientAddress);
  const usdcBalanceBefore = await usdc.balanceOf(recipientAddress);

  console.log("\n전송 전 잔액:");
  console.log("USDT:", ethers.formatUnits(usdtBalanceBefore, 6));
  console.log("USDC:", ethers.formatUnits(usdcBalanceBefore, 6));

  // USDT 민팅
  console.log("\n📝 USDT 민팅 중...");
  const tx1 = await usdt.mint(recipientAddress, amount);
  await tx1.wait();
  console.log("✅ USDT 민팅 완료");

  // USDC 민팅
  console.log("\n📝 USDC 민팅 중...");
  const tx2 = await usdc.mint(recipientAddress, amount);
  await tx2.wait();
  console.log("✅ USDC 민팅 완료");

  // 전송 후 잔액 확인
  const usdtBalanceAfter = await usdt.balanceOf(recipientAddress);
  const usdcBalanceAfter = await usdc.balanceOf(recipientAddress);

  console.log("\n전송 후 잔액:");
  console.log("USDT:", ethers.formatUnits(usdtBalanceAfter, 6));
  console.log("USDC:", ethers.formatUnits(usdcBalanceAfter, 6));

  console.log("\n🎉 완료! 메타마스크를 새로고침하세요.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
