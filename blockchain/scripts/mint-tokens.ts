import { ethers } from "hardhat";

async function main() {
  console.log("🪙 테스트 토큰 민팅 시작...\n");

  const usdtAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const wethAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const [deployer, account1, account2, account3] = await ethers.getSigners();

  console.log("계정 목록:");
  console.log("Account 0:", deployer.address);
  console.log("Account 1:", account1.address);
  console.log("Account 2:", account2.address);
  console.log("Account 3:", account3.address);

  const usdt = await ethers.getContractAt("MockUSDT", usdtAddress);
  const weth = await ethers.getContractAt("MockUSDT", wethAddress);

  const accounts = [account1, account2, account3];

  for (const account of accounts) {
    console.log("\n💰", account.address, "에게 토큰 민팅 중...");

    const usdtAmount = ethers.parseUnits("10000", 6);
    const usdtTx = await usdt.mint(account.address, usdtAmount);
    await usdtTx.wait();
    console.log("  ✓ 10,000 USDT 민팅 완료");

    const wethAmount = ethers.parseUnits("10000", 6);
    const wethTx = await weth.mint(account.address, wethAmount);
    await wethTx.wait();
    console.log("  ✓ 10,000 WETH 민팅 완료");
  }

  console.log("\n✅ 모든 계정에 토큰 민팅 완료!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
