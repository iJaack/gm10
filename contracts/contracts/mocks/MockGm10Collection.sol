// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockGm10Collection is ERC721 {
    uint256 public nextTokenId;
    string private baseTokenUri;

    constructor(string memory name_, string memory symbol_, string memory baseTokenUri_)
        ERC721(name_, symbol_)
    {
        baseTokenUri = baseTokenUri_;
        nextTokenId = 1;
    }

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _mint(to, tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenUri;
    }
}
