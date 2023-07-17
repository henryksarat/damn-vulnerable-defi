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

How to start:

```
yarn start
npx hardhat test
```

How to execute one test for a quick development loop:

```
npx hardhat test --grep "Unstop"
```

## 1. Unstoppable

#### Hint 1 / 6

**UnstoppableVault.sol** implements [TokenVault (ERC4626)](https://ethereum.org/en/developers/docs/standards/tokens/erc-4626/).

#### Hint 2 / 6

Notice that some of the methods used (by the **UnstoppableVault.sol** and **unstoppable.challenge.js**) from the **ERC4626** implementation include: **deposit()**, **totalAssets()**, **totalSupply()**, and **maxFlashLoan()**.

#### Hint 3 / 6

Why is there so much focus being put on using the **deposit()** method and not a typic ERC20 **transfer()** to the vault?

#### Hint 4 / 6

In **UnstoppableVault.sol**, the _flashLoan()_ method has a check to see if **totalSupply != totalAssets**. The _totalSupply_ and _totalAssets_ will increment if you call _deposit()_. However, _totalAssets_ will ONLY increase if you execute a traditional ERC20 _transfer()_ to the UnstoppableVault smart contract.

#### Hint 5 / 6


##### Exploit Plan

Transfer Eth directly to the UnstoppableVault smart contract. Example way to do this:

```
await token.connect(player).transfer(vault.address, 1n);
```

#### Hint 6 / 6

See this in the [unstoppable.challange.js unit test](/test/unstoppable/unstoppable.challenge.js).


#### Concepts

* ERC20 transfer, safeTransferFrom, safeTransfer
* Creating a [TokenVault (ERC4626)](https://ethereum.org/en/developers/docs/standards/tokens/erc-4626/)


## 2. Naive Receiver

#### Hint 1 / 8

**NaiveReceiverLenderPool.sol** has a really high fee of 1 ether. Super high! You better be making a good return on the flash loan to be able to afford that fee.


#### Hint 2 / 8

For the **flashLoan()** in **NaiveReceiverLenderPool.sol**, there seems to be a **receiver** parameter, indicating that **any address** can be passed in, as long as the smart contract implements **IERC3156FlashBorrower**. The flash loan is called on **receiver**.

#### Hint 3 / 8

**FlashLoanReceiver.sol** is an honest receiver (aka victim) of the flash loan and implements **IERC3156FlashBorrower** interface how it is supposed to. How does **NaiveReceiverLenderPool.sol** make sure that it's customers are safe?

#### Hint 4 / 8

Unfortuntealy **NaiveReceiverLenderPool.sol** has a bad programmer that doesn't even check who is calling for the flash loan. The Pool blindly executes on whichever smart contract is passed in that implements the **IERC3156FlashBorrower** interface!

#### Hint 5 / 8

You can just take out a flash loan against a victim's address since the **Pool** does no real validation. Even a flash loan of **0** is fine since the fee for the loan is 1 ether. This can be done in the unit test in javascript this way:

```
for(var i =0; i< 10; i++) {
    await pool.connect(player).flashLoan(victim.address, ETH, 0, new TextEncoder().encode(""))
}
```

Notice that this will execute 10 transaction. So each **flashLoan()** has to succeed for the transaction to be accepted by the network. How can you do this in only one transaction?

#### Hint 6 / 8

You can do it in one transaction by making a smart contract and eecuting the 10 loops inside the smart contract. This will count as **one transaction** because the loops happened inside the smart contract itself. For the transaction to complete and be approved by the network, all the loops must succeed and the function has to execut successfully. 

#### Hint 7 / 8

##### Exploit Plan

1. Create an attacker smart contract which has the address of the Pool and the victim that implemented **IERC3156FlashBorrower**.
2. Execute a flash loan of 0 amount 10 times. The victim smart contract pays back the full amount plus the Pool fee of 1 ether. Calling this 10 times will then effectively drain the 10 ether that the victim had.
3. That's it! In conclusion, by only having the address of a smart contract that interacts with this Pool (the victim), I can drain the victim because the Pool doesn't take precautions to check who is executing the flash loan.

Here is the code to drain the victim:

```
for(var i =0; i< 10; i++) {
    await pool.connect(player).flashLoan(victim.address, ETH, 0, new TextEncoder().encode(""))
}
```

#### Hint 8 / 8
See this in the [naive-receiver.challange.js unit test](/test/naive-receiver/naive-receiver.challenge.js).

This can also be done in one transaction by wrapping the execution in a smart contract. See [NaiveAttacker.sol](contracts/naive-receiver/NaiveAttacker.sol) to see how.


#### Concepts

* Create an interface to call against
* Using the **IERC3156FlashBorrower** interface

## 3. Truster

The **TrusterLenderPool** will transfer the requested amount to the borrower and then blindly execute any encoded function through the __byte calldata__ parameter against a target smart contract using __.functionCall()__

#### Exploit Plan

1. Encode the __approve()__ function and pass as the __byte calldata__ parameter. Set the __attacker__ smart contract as who to approve for.
2. Set the __target__ smart contract to be the token of the pool
3. Take out a **0** loan to not have to even bothering returning it. This will make the flash loan succeed. Alternatively, if a flash loan amount is taken out, it must be returned to the pool so the flashLoan succeeds. I did a **0** amount to just have less code and not have to do the __transfer()__ back. 
4. Since __approve()__ was called on behalf of the Pool (because we encoded it), execute a __transferFrom()__ on the ERC20 token to drain the pool

See this in the [truster.challange.js unit test](/test/truster/truster.challenge.js).

This can also be done in one transaction by wrapping everything in one smart contract. See [TrustedAttacker.sol](contracts/truster/TrustedAttacker.sol) to see how.

#### Concepts

* Tricking another smart contract to call __approve()__ on itself to be drained
* Encoding a function call
* Executing an encoded function against a smart contract using __.functionCall()__

## 4. Side Entrance

The Pool has a simple way to make a **deposit()** and a **withdrawl()** for a smart contract at anytime. When making a flash loan, the Pool will execute a function against a smart contract that has implemented the **execute()** function with no paramters. __Value__ is passed to the **execute()** function because it has the modifier of __payable__. One thing to notice about the flash loan method is that it "verifies" the flash loan is paid back if the balance held by the Pool smart contract is back to what it used. There is no check on how that balance is actually comprised of.

#### Exploit Plan

1. Since the flash loan verify step only cares about the total balance help by the Pool, we will call the flash loan and when we receive the funds as the attacker, we will automatically **deposit()** them when our **execute()** function is called. Making the deposit will fulfil the flash loan condition of the loan being paid back. Remember that the Pool doesn't care who owns what tokens. So we essentially just robbing from the Pool itself and putting it in our name, will satisfy the Pool verification steps of the flash loan.
2. After the **deposit()** is executed in the **execute()** method, the Pool smart contract will verify the balances of the Pool. This will complete the flash loan.
3. The attacker smart contract will now call **withdraw()** since the attacker smart contract now own the tokens in the Pool map
4. Once the attcker smart contract gets the Eth, the **receive()** function is called that we have overridden. In this function we will automatically send to an outside address.

See this in the [side-entrance.challange.js unit test](/test/side-entrance/side-entrance.challenge.js).

See [SideEntranceAttacker.sol](contracts/side-entrance/SideEntranceAttacker.sol) to see how the attacker smart contract was implemented.

#### Concepts

* Emit event
* Execute against a smart contract even though the smart contract doesn't inherit the intended interface
* Override **receive()** function of the smart contract
* Using __payable__ to **send()** Eth

## 5. Rewarder

#### FlashLoanerPool

The **FlashLoanerPool** is responsible for the flash loan. It will call a function against the **sender** as long as **receiveFlashLoan(uint256)** is implemented. As a verification step to end the flash loan, the flash loan function will check that the balance of the tokens are the same amount as before giving out the flash loan. Note, the verification step in the flash loan just checks the **total tokens** in the Pool and __not__ who owns what tokens. 

#### TheRewarderPool
* **despoit()** - deposit the __liqudityToken__ and mint the same amount of the __accountingToken__. Finally, use **safeTransferFrom()** to remove the __liqudityToken__.
* **withdraw()** - burn the __accountingToken__ and use **safeTransfer()** to send back the __liqudityToken__ to the sender.
* **distributeRewards()** - this function will see what the current amount of __deposits__ are and the amount deposited by the current caller (aka sender) of **distributeRewards()**. A calculation is made and a mint of __rewardToken__ happens and is assigned to the sender. There is a time check to make sure that a distribution has not happened within 5 days of the last distribution. 

#### Exploit Plan

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

See this in the [the-rewarder.challange.js unit test](/test/the-rewarder/the-rewarder.challenge.js).

See [RewardAttack.sol](contracts/the-rewarder/RewardAttack.sol) to see how the attacker smart contract was implemented.

#### Concepts

* Use three tokens for liquidity, governance (accountingToken), and rewarding
* Use role modifiers for functions. Example roles: BURNER_ROLE, MINTER_ROLE, SNAPSHOT_ROLE
* Use OpenZeppelin's ERC20Snapshot for efficient storage of past token balances to be later queried at any point in time
* Increase EVM time

## 6. Selfie

#### SimpleGovernance.sol
* This is the Governance smart contact
* **queueAction()** -  function to add actions to be executed later. However, you can only **queueAction()** if you have MORE THAN 50% of the supply of the DVT token. The action is added with the current timestamp. This time stamp is used to check against for the __2 day cool down period__.
* **executeAction()** - function to execute a queued action if it has gone past the the __2 day cool down period__. The action that that can be executed is a method on a __target__ smart contact with the desired paramters (this was set when executing **queueAction()**).

#### SelfiePool.sol
* The Pool smart contact
* **flashLoan()** - function that accepts a receiver that must implement the **IERC3156FlashBorrower** interface, which has a **onFlashLoan()** function that will be called to send the flashLoan. Then finally, the method will call **transferFrom()** to take back the tokens. So the caller must **approve()** the tokens to be taken back by the pool.
* **emergencyExit()** - function is used to move ALL tokens from the pool to the __receiver__ address. This can only be called by the Governance smart contract (there's a __onlyGovernance__ mondifier).

#### Exploit Plan

1. Take a flash loan out for more than 50% of available tokens
2. While the flash loan is taken out, queue an action on the Governance smart contract. The **queueAction()** method on the governance smart contract checks if the attacker smart contract has more than 50% of the supply to be able to have the power to **queueAction()**.
3. Increase the EVM time by 2 days since the Governance smart contact has a __cool down period of 2 days__ before queued actions can be executed on.
4. Finally execute the action that was queued by calling **executeAction()** on the Governance smart contract.

See this in the [selfie.challange.js unit test](/test/selfie/selfie.challenge.js).

See [SelfieAttacker.sol](contracts/selfie/SelfieAttacker.sol) to see how the attacker smart contract was implemented.

#### Concepts

* Create interface
* Token approve, transfer, balanceOf
* Use **encodeWithSignature()** to encode abi with method to later using **.call()** to execute a method and parameters
* Pool calls **transfer()** so the caller to the flash loan has to **approve() on the token
* Token snap shot
* Increase EVM time
* Governance 

## 7. Compromised

#### Hint 1 / 8

##### Exchange.sol

* The exchange __completely__ relies on the oracle to provide the median price of an NFT. This is relied upon on the **buyOne()** and **sellOne()** functions.

#### Hint 2 / 8

##### TrustfulOracle.sol

* Is initilized with an array of __sources__ that act as trusted entities to dictate what the price is of a certain __symbol__
* **postPrice()** - allows the __source__ to set what the price is of a symbol
* **getMedianPrice()** - sorts all of the array prices provided by the __sources__ for a certain __symbol__ and gives the median number in the sorted array. If the array is odd, the middle number is returned, else if the array is even then the average of the two middle numbers is returned. There is no validation for rogue price setting.

#### Hint 3 / 8

Notice that there are 2 sets of hex characters returned. You should try to convert this to something readable.

```
Hex 1: 4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34 4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68 59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69 5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d 4e 44 63 7a 4e 57 45 35

Hex 2: 4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68 59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32 4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c 5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c 4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a 4e 44 42 69 59 6a 51 34
```

#### Hint 4 / 8

Convert the hex to text. The text will look like it's base64 encoded. Decode this base64. What does it look like?

#### Hint 5 / 8

The decoded base 64 is the private key. There are two of them. 

#### Hint 6 / 8

**getMedianPrice()** returns the middle number of the sorted prices from three oracles. So if you control the prices from 2 oracles you can control the median price. You can execute **postPrice()** to set the price as two oracles because you have the private keys of both of them. This will allow you to have full control of the __median price__. The __median price__ is used blindly in the **buyOne()** and **sellOne()** functions of the __exchange__.

#### Hint 7 / 8

##### Exploit Plan

1. Manually convert the hex from the exercise to text
2. The text is base64 encoded so decode it to text
3. Notice that it looks like a private key

```
Hex 1: 4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34 4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68 59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69 5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d 4e 44 63 7a 4e 57 45 35
Text: MHhjNjc4ZWYxYWE0NTZkYTY1YzZmYzU4NjFkNDQ4OTJjZGZhYzBjNmM4YzI1NjBiZjBjOWZiY2RhZTJmNDczNWE5
Base 64 decoded: 0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a9

Hex 2: 4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68 59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32 4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c 5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c 4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a 4e 44 42 69 59 6a 51 34
Text: MHgyMDgyNDJjNDBhY2RmYTllZDg4OWU2ODVjMjM1NDdhY2JlZDliZWZjNjAzNzFlOTg3NWZiY2Q3MzYzNDBiYjQ4
Base 64 decoded: 0x208242c40acdfa9ed889e685c23547acbed9befc60371e9875fbcd736340bb48
```

4. Load up both of the keys
5. As the oracles set the price to be very low
6. As the attacker, buy the NFT
7. As the oracles set the price to be high (such as the size of the exchange) to drain the exchange
8. Sell the NFT
9. As the oracles set the price back to what it was originally so no one knows that anything happened

#### Hint 8 / 8

See the final running code in [compromised.challange.js unit test](/test/compromised/compromised.challenge.js).

#### Concepts

* Oracles
* Basic Exchange buy/sell
* NFT mint/burn
* Convert hex to text
* Base64 decoding
* Go from a hex representation of a private key to loading it and using it
* Draining an Exchange