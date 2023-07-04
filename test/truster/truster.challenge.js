const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, player;
    let token, pool;

    const TOKENS_IN_POOL = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        pool = await (await ethers.getContractFactory('TrusterLenderPool', deployer)).deploy(token.address);
        expect(await pool.token()).to.eq(token.address);

        await token.transfer(pool.address, TOKENS_IN_POOL);
        expect(await token.balanceOf(pool.address)).to.equal(TOKENS_IN_POOL);

        expect(await token.balanceOf(player.address)).to.equal(0);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        // Henryk: The TrusterLenderPool will transfer the requested amount
        // to the borrower and then blindly execute any encoded function through the
        // "byte calldata" parameter against a target smart contract using the ".functionCall"

        // Henryk Exploit Plan:
        // 1. Encode the approve() function and pass as the "byte calldata"__" parameter. 
        // Set the attacker smart contract as who to approve.
        // 2. Set the "target" smart contract to be the token of the pool
        // 3. Take out a "0" loan to not have to even bothering returning it. This will make
        // the flash loan succeed. Alternatively, if a flash loan amount is taken out,
        // it must be returned to the pool so the flashLoan succeeds. I did a "0" amount to just
        // have less code and not have to do the transfer back.
        // 4. Since "approve" was called on behalf of the pool, execute a "transferFrom"
        // on the ERC20 token to take drain the pool

        attacker = await (await ethers.getContractFactory('TrustedAttacker', player)).deploy(pool.address, token.address);
        await attacker.attack();
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(player.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await token.balanceOf(pool.address)
        ).to.equal(0);
    });
});

