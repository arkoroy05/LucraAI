# LucraWallet Smart Contract

The LucraWallet is an advanced smart contract wallet designed for LucraAI, providing secure and flexible management of cryptocurrency assets with enhanced security features.

## Features

### Core Functionality
- **ETH Management**: Send and receive ETH with transaction memos
- **ERC20 Support**: Full support for ERC20 token transfers
- **Batch Transactions**: Execute multiple transfers in a single transaction to save gas

### Security Features
- **Multi-User Authorization**: Allow multiple addresses to use the wallet with customizable permissions
- **Daily Spending Limits**: Set daily transaction limits for authorized users
- **Guardian System**: Social recovery mechanism with trusted guardians
- **Wallet Freezing**: Emergency freeze functionality to prevent unauthorized access
- **Ownership Transfer**: Two-step ownership transfer process for enhanced security
- **Reentrancy Protection**: Protection against reentrancy attacks

### Advanced Features
- **Transaction Memos**: Add notes to transactions for better record-keeping
- **Activity Tracking**: Track wallet activity for security monitoring
- **Wallet Recovery**: Recover wallet access through a guardian system
- **Customizable Delays**: Set custom time delays for security operations

## Usage

### Deployment

To deploy the LucraWallet contract:

```solidity
// Deploy with a 1-day guardian delay and 1 ETH default daily limit
LucraWallet wallet = new LucraWallet(1 days, 1 ether);
```

### Basic Operations

**Sending ETH**:
```solidity
// Send 0.1 ETH to a recipient with a memo
wallet.sendEther(recipientAddress, 0.1 ether, "Payment for services");
```

**Sending ERC20 Tokens**:
```solidity
// Send 100 USDC to a recipient with a memo
wallet.sendERC20(usdcTokenAddress, recipientAddress, 100 * 10**6, "USDC payment");
```

**Batch Sending ETH**:
```solidity
// Send ETH to multiple recipients in one transaction
address payable[] memory recipients = new address payable[](3);
recipients[0] = payable(address1);
recipients[1] = payable(address2);
recipients[2] = payable(address3);

uint256[] memory amounts = new uint256[](3);
amounts[0] = 0.1 ether;
amounts[1] = 0.2 ether;
amounts[2] = 0.3 ether;

wallet.batchSendEther(recipients, amounts, "Batch payment");
```

### User Management

**Adding Authorized Users**:
```solidity
// Add an authorized user with a 0.5 ETH daily limit
wallet.addAuthorizedAddress(userAddress, 0.5 ether);
```

**Removing Authorized Users**:
```solidity
// Remove an authorized user
wallet.removeAuthorizedAddress(userAddress);
```

**Setting Daily Limits**:
```solidity
// Update the daily limit for an authorized user
wallet.setDailyLimit(userAddress, 1 ether);
```

### Guardian System

**Adding Guardians**:
```solidity
// Add a trusted guardian
wallet.addGuardian(guardianAddress);
```

**Setting Guardian Parameters**:
```solidity
// Set the number of guardians required for recovery
wallet.setGuardiansRequired(2);

// Set the guardian delay period
wallet.setGuardianDelay(2 days);
```

**Emergency Actions**:
```solidity
// Freeze the wallet in case of emergency
wallet.freezeWallet();

// Unfreeze the wallet (owner only)
wallet.unfreezeWallet();

// Recover the wallet (guardian only, after delay)
wallet.recoverWallet(newOwnerAddress);
```

### Ownership Management

**Transferring Ownership**:
```solidity
// Initiate ownership transfer
wallet.transferOwnership(newOwnerAddress);

// Accept ownership (called by the new owner)
// Must be called from the new owner's address
wallet.acceptOwnership();
```

## Security Considerations

1. **Guardian Selection**: Choose trusted guardians who won't collude against you
2. **Daily Limits**: Set appropriate daily limits for authorized users
3. **Guardian Delay**: Set a reasonable guardian delay that balances security and usability
4. **Regular Activity**: Maintain regular wallet activity to prevent unauthorized recovery
5. **Secure Key Management**: Keep private keys secure and consider using hardware wallets

## License

This contract is licensed under the MIT License.
