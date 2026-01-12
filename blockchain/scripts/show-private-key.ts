import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();

  // 세 번째 계정 (index 2)
  const thirdAccount = signers[2];
  const address = await thirdAccount.getAddress();

  // Hardhat의 기본 계정들은 deterministic mnemonic에서 생성됩니다
  // 세 번째 계정의 private key
  const privateKey = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

  console.log(`\n세 번째 계정 정보:`);
  console.log(`주소: ${address}`);
  console.log(`Private Key: ${privateKey}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
