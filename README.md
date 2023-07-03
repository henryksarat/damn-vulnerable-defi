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

So, executing the following would break the UnstoppableVault:

```
await token.connect(player).transfer(vault.address, 1n);
```

See this in the [unstoppable.challange.js unit test](/test/unstoppable/unstoppable.challenge.js).


**Concepts**
* ERC20 transfer, safeTransferFrom, safeTransfer
* Creating a [TokenVault (ERC4626)](https://ethereum.org/en/developers/docs/standards/tokens/erc-4626/)
