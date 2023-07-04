const { ethers } = require('hardhat');
const { expect } = require('chai');
const { setBalance } = require('@nomicfoundation/hardhat-network-helpers');

describe('[Challenge] Side entrance', function () {
    let deployer, player;
    let pool;

    const ETHER_IN_POOL = 1000n * 10n ** 18n;
    const PLAYER_INITIAL_ETH_BALANCE = 1n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        // Deploy pool and fund it
        pool = await (await ethers.getContractFactory('SideEntranceLenderPool', deployer)).deploy();
        await pool.deposit({ value: ETHER_IN_POOL });
        expect(await ethers.provider.getBalance(pool.address)).to.equal(ETHER_IN_POOL);

        // Player starts with limited ETH in balance
        await setBalance(player.address, PLAYER_INITIAL_ETH_BALANCE);
        expect(await ethers.provider.getBalance(player.address)).to.eq(PLAYER_INITIAL_ETH_BALANCE);

    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        // Henryk:
        // The pool has a simple way to make a deposit and a withdrawl for a smart contract at anytime.
        // When making a flash loan, the pool will execute a function against a smart contract
        // that has implemented the "execute" method with no paramters. "Value" is passed
        // because the "execute()" method has the modifier of "payable"
        // One thing to notice about the flash loan method is that it just makes sure
        // that the balance held by the pool smart contract is back to what
        // it used to be before teh flash loan. There is no check on how that balance
        // is actually made up

        // Henryk Exploit Plan:
        // 1. Since the flash loan only cares about the total balance help by the pool,
        // we will call the flash loan and when we receive the funds as the attacker,
        // we will automatically deposit them when our "execute()" function is called. Making
        // the deposit will fulfil the flash loan condition of the loan being paid back. Remember
        // that the pool doesn't care who owns what tokens and only gets the total tokens in
        // the pool smart contract. So we essentially just robbed from the pool itself
        // and put it in our name, and the pool smart contract is happy.
        // 2. After the "deposit()" is executed in the "execute()" method, the Pool smart 
        // contract will verify the balances of the Pool. This will complete the flash loan.
        // 3. The attacker smart contract will now call "withdraw()" since the attacker 
        // smart contract now own the tokens in the Pool map
        // 4. Once the attcker smart contract gets the Eth, the "receive()" function 
        // is called that we have overridden. In this function we will automatically send to 
        // an outside address.
        attacker = await (await ethers.getContractFactory('SideEntranceAttacker', player)).deploy(pool.address);
        await attacker.attack();
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player took all ETH from the pool
        expect(await ethers.provider.getBalance(pool.address)).to.be.equal(0);
        expect(await ethers.provider.getBalance(player.address)).to.be.gt(ETHER_IN_POOL);
    });
});
