# LucraAI Web3 Integration

This directory contains the web3 integration for LucraAI, including smart contracts, ABIs, utilities, and configuration for interacting with the Base network.

## Directory Structure

```
web3/
├── contracts/       # Smart contracts
├── abis/           # Contract ABIs
├── utils/          # Utility functions
├── config/         # Network configuration
└── README.md       # This file
```

## Networks

LucraAI supports the following networks:

- **Base Mainnet**: Production network for Base
- **Base Sepolia**: Testnet for Base

## Features

- Smart Wallet capabilities
- Base Name resolution
- Transaction functionality
- Wallet connection and management

## Getting Started

1. Configure your environment variables in `.env` file
2. Use the provided utilities to interact with the Base network
3. Connect your wallet using the wallet connection hooks

## Smart Wallet

The Smart Wallet implementation uses Coinbase's onchainkit and agentkit libraries to provide a seamless wallet experience. It supports:

- Account abstraction
- Transaction batching
- Gas sponsorship
- Social recovery

## Base Name Resolution

The Base Name resolution utilities allow you to resolve human-readable names to Ethereum addresses and vice versa.

## Transaction Functionality

The transaction utilities provide a simple interface for sending, receiving, and tracking transactions on the Base network.
