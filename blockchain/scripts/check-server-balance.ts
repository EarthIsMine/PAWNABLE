import { ethers } from "hardhat";

async function main() {
  // 서버 지갑 주소
  const serverPrivateKey = "0x3ed290d41ddc94a45b2ca33ba3271cfe02338c545922ed60ff4957432625316e";
  const serverWallet = new ethers.Wallet(serverPrivateKey);
  const serverAddress = serverWallet.address;

  console.log(`\n서버 지갑 주소: ${serverAddress}\n`);

  // ETH 잔액 확인
  const ethBalance = await ethers.provider.getBalance(serverAddress);
  console.log(`ETH 잔액: ${ethers.formatEther(ethBalance)} ETH`);

  // USDT 토큰 컨트랙트 주소
  const usdtAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";

  // USDT 컨트랙트 가져오기
  const usdtContract = await ethers.getContractAt("MockUSDT", usdtAddress);

  // USDT 잔액 확인
  const usdtBalance = await usdtContract.balanceOf(serverAddress);
  console.log(`USDT 잔액: ${ethers.formatUnits(usdtBalance, 6)} USDT\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
