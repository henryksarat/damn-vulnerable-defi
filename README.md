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

Unstoppable

In UnstoppableVault.sol, the "flashLoan" method has a check to see if totalSupply != totalAssets. The "totalSupply" and "totalAssets" will increment if you call "deposit". However, "totalAssets" will ONLY increase if you do a traditional ERC20 "transfer" to the UnstoppableVault smart contract.

So doing the following would break the UnstoppableVault:

await token.connect(player).transfer(vault.address, 1n);

[See in the unit test]

Concepts:
* ERC20 transfer, safeTransferFrom, safeTransfer
* Creating a TokenVault (ERC4626)
