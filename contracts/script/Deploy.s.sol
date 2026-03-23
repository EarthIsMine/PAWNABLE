// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PawnableLoan.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        PawnableLoan loan = new PawnableLoan(deployer);
        vm.stopBroadcast();

        console.log("PawnableLoan deployed at:", address(loan));
        console.log("Fee recipient:", deployer);
        console.log("Chain ID:", block.chainid);
    }
}
