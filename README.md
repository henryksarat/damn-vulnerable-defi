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


**Naive Receiver**

**FlashLoanReceiver.sol** is an honest receiver (aka victim) of the flash loan and implements **IERC3156FlashBorrower** interface how it is supposed to. However, the Pool (**NaiveReceiverLenderPool.sol**) has a bad programmer that doesn't even check who is calling for the flash loan. The Pool blindly executes on whichever smart contract is passed in that implements the **IERC3156FlashBorrower** interface.

**Exploit**

1. Create an attacker smart contract which has the address of the Pool and the victim that implemented **IERC3156FlashBorrower**.
2. Execute a flash loan of 0 amount 10 times. The victim smart contract pays back the full amount plus the Pool fee of 1 ether. Calling this 10 times will then effectively drain the 10 ether that the victim had.
3. That's it! In conclusion, by only having the address of a smart contract that interacts with this Pool (the victim), I can drain the victim because the Pool doesn't take precautions to check who is executing the flash loan.

Here is the code to drain the victim:

for(var i =0; i< 10; i++) {
    await pool.connect(player).flashLoan(victim.address, ETH, 0, new TextEncoder().encode(""))
}

See this in the [naive-receiver.challange.js unit test](/test/naive-receiver/naive-receiver.challenge.js).

Concepts:
* Create an interface to call against
* Using the **IERC3156FlashBorrower** interface