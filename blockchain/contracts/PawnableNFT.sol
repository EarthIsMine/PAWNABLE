// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PawnableNFT
 * @dev 담보로 사용될 NFT 컨트랙트
 * @notice 테스트용 NFT - 실제 프로젝트에서는 외부 NFT도 담보로 사용 가능
 */
contract PawnableNFT is ERC721, Ownable {
    // 현재 발행된 토큰의 총 개수
    uint256 private _tokenIdCounter;

    // 토큰 ID => 메타데이터 URI 매핑
    mapping(uint256 => string) private _tokenURIs;

    /**
     * @dev NFT 발행 이벤트
     * @param to 수신자 주소
     * @param tokenId 발행된 토큰 ID
     */
    event NFTMinted(address indexed to, uint256 indexed tokenId);

    constructor() ERC721("Pawnable NFT", "PNFT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @notice 새로운 NFT를 발행합니다
     * @dev 누구나 민팅 가능 (테스트용)
     * @param to NFT를 받을 주소
     * @param uri 토큰의 메타데이터 URI
     * @return 발행된 토큰 ID
     */
    function mint(address to, string memory uri) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;

        emit NFTMinted(to, tokenId);
        return tokenId;
    }

    /**
     * @notice 특정 토큰의 메타데이터 URI를 반환합니다
     * @param tokenId 조회할 토큰 ID
     * @return 토큰의 메타데이터 URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    /**
     * @notice 현재까지 발행된 총 토큰 수를 반환합니다
     * @return 총 토큰 수
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
