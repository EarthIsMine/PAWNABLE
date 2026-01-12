import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();

  console.log(`\n블록체인 네트워크의 총 계정 수: ${signers.length}\n`);

  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const address = await signer.getAddress();
    const balance = await ethers.provider.getBalance(address);

    console.log(`계정 #${i + 1}: ${address}`);
    console.log(`  잔액: ${ethers.formatEther(balance)} ETH\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
