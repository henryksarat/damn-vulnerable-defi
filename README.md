![](cover.png)

**A set of challenges to learn offensive security of smart contracts in Ethereum.**

Featuring flash loans, price oracles, governance, NFTs, lending pools, smart contract wallets, timelocks, and more!

## Play

Visit [damnvulnerabledefi.xyz](https://damnvulnerabledefi.xyz)

## Help

For Q&A and troubleshooting running Damn Vulnerable DeFi, go [here](https://github.com/tinchoabbate/damn-vulnerable-defi/discussions/categories/support-q-a-troubleshooting).

## Disclaimer

All Solidity code, practices and patterns in this repository are DAMN VULNERABLE and for educational purposes only.

DO NOT USE IN PRODUCTION.

# Solution Details

How to execute one test for a quick development loop:

```
npx hardhat test --grep "Unstop"
```

## Unstoppable

In **UnstoppableVault.sol**, the _flashLoan()_ method has a check to see if **totalSupply != totalAssets**. The _totalSupply_ and _totalAssets_ will increment if you call _deposit()_. However, _totalAssets_ will ONLY increase if you execute a traditional ERC20 _transfer()_ to the UnstoppableVault smart contract.

**Exploit**

Transfer Eth directly to the UnstoppableVault smart contract. Example way to do this:

```
await token.connect(player).transfer(vault.address, 1n);
```

See this in the [unstoppable.challange.js unit test](/test/unstoppable/unstoppable.challenge.js).


**Concepts**
* ERC20 transfer, safeTransferFrom, safeTransfer
* Creating a [TokenVault (ERC4626)](https://ethereum.org/en/developers/docs/standards/tokens/erc-4626/)


## Naive Receiver

**FlashLoanReceiver.sol** is an honest receiver (aka victim) of the flash loan and implements **IERC3156FlashBorrower** interface how it is supposed to. However, the Pool (**NaiveReceiverLenderPool.sol**) has a bad programmer that doesn't even check who is calling for the flash loan. The Pool blindly executes on whichever smart contract is passed in that implements the **IERC3156FlashBorrower** interface.

**Exploit**

1. Create an attacker smart contract which has the address of the Pool and the victim that implemented **IERC3156FlashBorrower**.
2. Execute a flash loan of 0 amount 10 times. The victim smart contract pays back the full amount plus the Pool fee of 1 ether. Calling this 10 times will then effectively drain the 10 ether that the victim had.
3. That's it! In conclusion, by only having the address of a smart contract that interacts with this Pool (the victim), I can drain the victim because the Pool doesn't take precautions to check who is executing the flash loan.

Here is the code to drain the victim:

```
for(var i =0; i< 10; i++) {
    await pool.connect(player).flashLoan(victim.address, ETH, 0, new TextEncoder().encode(""))
}
```

See this in the [naive-receiver.challange.js unit test](/test/naive-receiver/naive-receiver.challenge.js).

This can also be done in one transaction by wrapping the execution in a smart contract. See [NaiveAttacker.sol](contracts/naive-receiver/NaiveAttacker.sol) to see how.

Concepts:
* Create an interface to call against
* Using the **IERC3156FlashBorrower** interface

## Truster

The **TrusterLenderPool** will transfer the requested amount to the borrower and then blindly execute any encoded function through the __byte calldata__ parameter against a target smart contract using __.functionCall()__

Exploit Plan:
1. Encode the __approve()__ function and pass as the __byte calldata__ parameter. Set the __attacker__ smart contract as who to approve for.
2. Set the __target__ smart contract to be the token of the pool
3. Take out a **0** loan to not have to even bothering returning it. This will make the flash loan succeed. Alternatively, if a flash loan amount is taken out, it must be returned to the pool so the flashLoan succeeds. I did a **0** amount to just have less code and not have to do the __transfer()__ back. 
4. Since __approve()__ was called on behalf of the Pool (because we encoded it), execute a __transferFrom()__ on the ERC20 token to drain the pool

See this in the [truster.challange.js unit test](/test/truster/truster.challenge.js).

This can also be done in one transaction by wrapping everything in one smart contract. See [TrustedAttacker.sol](contracts/truster/TrustedAttacker.sol) to see how.

Concepts:
* Tricking another smart contract to call __approve()__ on itself to be drained
* Encoding a function call
* Executing an encoded function against a smart contract using __.functionCall()__

## Side Entrance

The Pool has a simple way to make a **deposit()** and a **withdrawl()** for a smart contract at anytime. When making a flash loan, the Pool will execute a function against a smart contract that has implemented the **execute()** function with no paramters. __Value__ is passed to the **execute()** function because it has the modifier of __payable__. One thing to notice about the flash loan method is that it "verifies" the flash loan is paid back if the balance held by the Pool smart contract is back to what it used. There is no check on how that balance is actually comprised of.

The Exploit:
1. Since the flash loan verify step only cares about the total balance help by the Pool, we will call the flash loan and when we receive the funds as the attacker, we will automatically **deposit()** them when our **execute()** function is called. Making the deposit will fulfil the flash loan condition of the loan being paid back. Remember that the Pool doesn't care who owns what tokens. So we essentially just robbing from the Pool itself and putting it in our name, will satisfy the Pool verification steps of the flash loan.
2. After the **deposit()** is executed in the **execute()** method, the Pool smart contract will verify the balances of the Pool. This will complete the flash loan.
3. The attacker smart contract will now call **withdraw()** since the attacker smart contract now own the tokens in the Pool map
4. Once the attcker smart contract gets the Eth, the **receive()** function is called that we have overridden. In this function we will automatically send to an outside address.

See this in the [side-entrance.challange.js unit test](/test/side-entrance/side-entrance.challenge.js).

See [SideEntranceAttacker.sol](contracts/side-entrance/SideEntranceAttacker.sol) to see how the attacker smart contract was implemented.

Concepts:
* Emit event
* Execute against a smart contract even though the smart contract doesn't inherit the intended interface
* Override **receive()** function of the smart contract
* Using __payable__ to **send()** Eth

## Rewarder

# FlashLoanerPool

The **FlashLoanerPool** is responsible for the flash loan. It will call a function against the **sender** as long as **receiveFlashLoan(uint256)** is implemented. As a verification step to end the flash loan, the flash loan function will check that the balance of the tokens are the same amount as before giving out the flash loan. Note, the verification step in the flash loan just checks the **total tokens** in the Pool and __not__ who owns what tokens. 

# TheRewarderPool
* **despoit()** - deposit the __liqudityToken__ and mint the same amount of the __accountingToken__. Finally, use **safeTransferFrom()** to remove the __liqudityToken__.
* **withdraw()** - burn the __accountingToken__ and use **safeTransfer()** to send back the __liqudityToken__ to the sender.
* **distributeRewards()** - this function will see what the current amount of __deposits__ are and the amount deposited by the current caller (aka sender) of **distributeRewards()**. A calculation is made and a mint of __rewardToken__ happens and is assigned to the sender. There is a time check to make sure that a distribution has not happened within 5 days of the last distribution. 

The Exploit:
1. Move the EVM time forward by 5 days.
2. Receive the max amount of **liquidityToken** possible in the flash loan by implementing the **receiveFlashLoan(uint256)** in the attacker smart contract and getting the token balance of the **FlashLoanerPool** for the **liquidityToken**.
3. When the flash loan is received, **deposit()** it into the **TheRewarderPool** so the **accountingToken** is minted in **TheRewarderPool**. 
4. **TheRewarderPool** doesn't care if someone **deposited** their **liquidityToken** through a flash loan or not. All that matters is that a **deposit()** is made, which mints **accountingToken**.
5. Execute **distributeRewards()** on **TheRewarderPool** which will see how much the current **sender** has deposited in relation to everyone else, to get the amount of the **rewardToken** to mint for the current **sender**.

Example of how this could work to reduce everyone's **rewardToken** to near 0:

**Reward to give out every 5 days**: 1000

**Formula to get Reward amount owed**: currentPersonAccountingTokenHeld * rewardToGiveOutEvery5Days / totalAccountingTokenHeld

| Name  | Accounting Token Held | Reward amount owed |
|-------|-----------------------|-------------------------------|
| Alice  | 20 | 0.01999950001 |
| Bob  | 5 | 0.004999875003 |
| Attacker | 1000000 | 999.9750006 |
| **Total held**| 1000025|1000|