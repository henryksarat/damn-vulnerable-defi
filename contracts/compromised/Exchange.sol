// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TrustfulOracle.sol";
import "../DamnValuableNFT.sol";

/**
 * @title Exchange
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract Exchange is ReentrancyGuard {
    using Address for address payable;

    DamnValuableNFT public immutable token;
    TrustfulOracle public immutable oracle;

    error InvalidPayment();
    error SellerNotOwner(uint256 id);
    error TransferNotApproved();
    error NotEnoughFunds();

    event TokenBought(address indexed buyer, uint256 tokenId, uint256 price);
    event TokenSold(address indexed seller, uint256 tokenId, uint256 price);

    constructor(address _oracle) payable {
        token = new DamnValuableNFT();
        token.renounceOwnership();
        oracle = TrustfulOracle(_oracle);
    }

    // Henryk: Having payable will store the Eth in this smart contract from the
    // sender, which is why we send back the difference between sent Eth and the 
    // price of the NFT
    function buyOne() external payable nonReentrant returns (uint256 id) {
        if (msg.value == 0)
            revert InvalidPayment();

        // Price should be in [wei / NFT]
        uint256 price = oracle.getMedianPrice(token.symbol());
        if (msg.value < price)
            revert InvalidPayment();

        id = token.safeMint(msg.sender);
        unchecked {
            // Henryk: Send back anything extra back to the sender just in 
            // case they sent too much
            payable(msg.sender).sendValue(msg.value - price);
        }

        emit TokenBought(msg.sender, id, price);
    }


    // Henryk: there is no check on price so that can be exploited
    function sellOne(uint256 id) external nonReentrant {
        if (msg.sender != token.ownerOf(id))
            revert SellerNotOwner(id);
    
        if (token.getApproved(id) != address(this))
            revert TransferNotApproved();

        // Price should be in [wei / NFT]
        uint256 price = oracle.getMedianPrice(token.symbol());
        if (address(this).balance < price)
            revert NotEnoughFunds();

        token.transferFrom(msg.sender, address(this), id);
        token.burn(id);

        // Henryk: Send back whatever the current price is to the sender
        payable(msg.sender).sendValue(price);

        emit TokenSold(msg.sender, id, price);
    }

    receive() external payable {}
}
