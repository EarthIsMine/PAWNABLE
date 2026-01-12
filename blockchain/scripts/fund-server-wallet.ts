import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // 서버 지갑 주소
  const serverAddress = "0xd85CF7c1714438e5C73570b59ac479423a0b4720";

  console.log(`\n서버 지갑에 자금 전송 중...`);
  console.log(`서버 주소: ${serverAddress}\n`);

  // 1. ETH 전송 (가스비용)
  console.log(`1. ETH 전송 중...`);
  const ethTx = await deployer.sendTransaction({
    to: serverAddress,
    value: ethers.parseEther("10"), // 10 ETH
  });
  await ethTx.wait();
  console.log(`✓ 10 ETH 전송 완료: ${ethTx.hash}\n`);

  // 2. USDT 전송
  console.log(`2. USDT 전송 중...`);
  const usdtAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
  const usdtContract = await ethers.getContractAt("MockUSDT", usdtAddress);

  const usdtAmount = ethers.parseUnits("500000", 6); // 500,000 USDT
  const usdtTx = await usdtContract.transfer(serverAddress, usdtAmount);
  await usdtTx.wait();
  console.log(`✓ 500,000 USDT 전송 완료: ${usdtTx.hash}\n`);

  // 잔액 확인
  const ethBalance = await ethers.provider.getBalance(serverAddress);
  const usdtBalance = await usdtContract.balanceOf(serverAddress);

  console.log(`서버 지갑 최종 잔액:`);
  console.log(`- ETH: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`- USDT: ${ethers.formatUnits(usdtBalance, 6)} USDT\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
