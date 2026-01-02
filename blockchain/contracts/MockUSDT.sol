// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @dev 테스트용 USDT 토큰
 * @notice 실제 USDT를 대체하는 테스트 토큰 (6 decimals)
 */
contract MockUSDT is ERC20 {
    /**
     * @dev USDT는 6 decimals 사용
     */
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock USDT", "USDT") {
        // 초기 공급량: 1,000,000 USDT
        _mint(msg.sender, 1_000_000 * 10**DECIMALS);
    }

    /**
     * @notice 누구나 테스트용 토큰을 민팅할 수 있습니다
     * @param to 토큰을 받을 주소
     * @param amount 민팅할 토큰 양
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice USDT는 6 decimals 사용
     * @return decimals 값 (6)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
}
