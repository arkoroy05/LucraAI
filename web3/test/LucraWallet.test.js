/**
 * Tests for the LucraWallet contract
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LucraWallet", function () {
  let lucraWallet;
  let owner;
  let authorized;
  let guardian;
  let recipient;
  let erc20Token;
  
  const ONE_DAY = 86400; // 1 day in seconds
  const DEFAULT_DAILY_LIMIT = ethers.utils.parseEther("1"); // 1 ETH
  
  beforeEach(async function () {
    // Get signers
    [owner, authorized, guardian, recipient, ...others] = await ethers.getSigners();
    
    // Deploy the LucraWallet contract
    const LucraWallet = await ethers.getContractFactory("LucraWallet");
    lucraWallet = await LucraWallet.deploy(ONE_DAY, DEFAULT_DAILY_LIMIT);
    await lucraWallet.deployed();
    
    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    erc20Token = await MockERC20.deploy("Mock Token", "MTK", 18);
    await erc20Token.deployed();
    
    // Mint some tokens to the wallet
    await erc20Token.mint(lucraWallet.address, ethers.utils.parseEther("10"));
    
    // Send some ETH to the wallet
    await owner.sendTransaction({
      to: lucraWallet.address,
      value: ethers.utils.parseEther("10"),
    });
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await lucraWallet.owner()).to.equal(owner.address);
    });
    
    it("Should set the correct guardian delay", async function () {
      expect(await lucraWallet.guardianDelay()).to.equal(ONE_DAY);
    });
    
    it("Should set the correct default daily limit", async function () {
      expect(await lucraWallet.defaultDailyLimit()).to.equal(DEFAULT_DAILY_LIMIT);
    });
  });
  
  describe("Authorization", function () {
    it("Should allow owner to add authorized addresses", async function () {
      await lucraWallet.addAuthorizedAddress(authorized.address, ethers.utils.parseEther("0.5"));
      expect(await lucraWallet.authorizedAddresses(authorized.address)).to.be.true;
      expect(await lucraWallet.dailyLimits(authorized.address)).to.equal(ethers.utils.parseEther("0.5"));
    });
    
    it("Should allow owner to remove authorized addresses", async function () {
      await lucraWallet.addAuthorizedAddress(authorized.address, ethers.utils.parseEther("0.5"));
      await lucraWallet.removeAuthorizedAddress(authorized.address);
      expect(await lucraWallet.authorizedAddresses(authorized.address)).to.be.false;
    });
    
    it("Should not allow non-owners to add authorized addresses", async function () {
      await expect(
        lucraWallet.connect(authorized).addAuthorizedAddress(others[0].address, ethers.utils.parseEther("0.5"))
      ).to.be.revertedWith("LucraWallet: caller is not the owner");
    });
  });
  
  describe("Transactions", function () {
    beforeEach(async function () {
      // Add authorized user with a daily limit
      await lucraWallet.addAuthorizedAddress(authorized.address, ethers.utils.parseEther("0.5"));
    });
    
    it("Should allow owner to send ETH without limit", async function () {
      const initialBalance = await ethers.provider.getBalance(recipient.address);
      await lucraWallet.sendEther(recipient.address, ethers.utils.parseEther("2"), "Test payment");
      
      const finalBalance = await ethers.provider.getBalance(recipient.address);
      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("2"));
    });
    
    it("Should allow authorized users to send ETH within daily limit", async function () {
      const initialBalance = await ethers.provider.getBalance(recipient.address);
      await lucraWallet.connect(authorized).sendEther(recipient.address, ethers.utils.parseEther("0.3"), "Test payment");
      
      const finalBalance = await ethers.provider.getBalance(recipient.address);
      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("0.3"));
    });
    
    it("Should not allow authorized users to exceed daily limit", async function () {
      await lucraWallet.connect(authorized).sendEther(recipient.address, ethers.utils.parseEther("0.3"), "First payment");
      
      await expect(
        lucraWallet.connect(authorized).sendEther(recipient.address, ethers.utils.parseEther("0.3"), "Second payment")
      ).to.be.revertedWith("LucraWallet: daily limit exceeded");
    });
    
    it("Should reset daily limit after 24 hours", async function () {
      await lucraWallet.connect(authorized).sendEther(recipient.address, ethers.utils.parseEther("0.3"), "Day 1 payment");
      
      // Advance time by 24 hours
      await time.increase(ONE_DAY + 1);
      
      // Should be able to send again
      await lucraWallet.connect(authorized).sendEther(recipient.address, ethers.utils.parseEther("0.3"), "Day 2 payment");
      
      // Check daily spent was reset
      expect(await lucraWallet.dailySpent(authorized.address)).to.equal(ethers.utils.parseEther("0.3"));
    });
    
    it("Should allow sending ERC20 tokens", async function () {
      const amount = ethers.utils.parseEther("1");
      await lucraWallet.sendERC20(erc20Token.address, recipient.address, amount, "Token payment");
      
      expect(await erc20Token.balanceOf(recipient.address)).to.equal(amount);
    });
    
    it("Should allow batch sending of ETH", async function () {
      const recipients = [others[0].address, others[1].address, others[2].address];
      const amounts = [
        ethers.utils.parseEther("0.1"),
        ethers.utils.parseEther("0.2"),
        ethers.utils.parseEther("0.3")
      ];
      
      const initialBalances = await Promise.all(
        recipients.map(addr => ethers.provider.getBalance(addr))
      );
      
      await lucraWallet.batchSendEther(recipients, amounts, "Batch payment");
      
      const finalBalances = await Promise.all(
        recipients.map(addr => ethers.provider.getBalance(addr))
      );
      
      for (let i = 0; i < recipients.length; i++) {
        expect(finalBalances[i].sub(initialBalances[i])).to.equal(amounts[i]);
      }
    });
  });
  
  describe("Guardian System", function () {
    beforeEach(async function () {
      // Add a guardian
      await lucraWallet.addGuardian(guardian.address);
    });
    
    it("Should allow adding guardians", async function () {
      expect(await lucraWallet.guardians(guardian.address)).to.be.true;
      expect(await lucraWallet.guardianList(0)).to.equal(guardian.address);
    });
    
    it("Should allow removing guardians", async function () {
      await lucraWallet.removeGuardian(guardian.address);
      expect(await lucraWallet.guardians(guardian.address)).to.be.false;
    });
    
    it("Should allow freezing the wallet", async function () {
      await lucraWallet.freezeWallet();
      expect(await lucraWallet.frozen()).to.be.true;
    });
    
    it("Should not allow transactions when frozen", async function () {
      await lucraWallet.freezeWallet();
      
      await expect(
        lucraWallet.sendEther(recipient.address, ethers.utils.parseEther("0.1"), "Test payment")
      ).to.be.revertedWith("LucraWallet: wallet is frozen");
    });
    
    it("Should allow owner to unfreeze the wallet", async function () {
      await lucraWallet.freezeWallet();
      await lucraWallet.unfreezeWallet();
      expect(await lucraWallet.frozen()).to.be.false;
    });
    
    it("Should allow guardian to recover wallet after delay", async function () {
      // Record last activity
      const lastActivity = await lucraWallet.lastActivity();
      
      // Freeze the wallet
      await lucraWallet.freezeWallet();
      
      // Advance time beyond the guardian delay
      await time.increase(ONE_DAY + 1);
      
      // Recover the wallet
      await lucraWallet.connect(guardian).recoverWallet(others[0].address);
      
      // Check new owner
      expect(await lucraWallet.owner()).to.equal(others[0].address);
      
      // Check wallet is unfrozen
      expect(await lucraWallet.frozen()).to.be.false;
    });
  });
  
  describe("Ownership", function () {
    it("Should allow transferring ownership", async function () {
      // Initiate ownership transfer
      await lucraWallet.transferOwnership(others[0].address);
      expect(await lucraWallet.pendingOwner()).to.equal(others[0].address);
      
      // Accept ownership
      await lucraWallet.connect(others[0]).acceptOwnership();
      expect(await lucraWallet.owner()).to.equal(others[0].address);
      expect(await lucraWallet.pendingOwner()).to.equal(ethers.constants.AddressZero);
    });
  });
});

// Mock ERC20 token for testing
const MockERC20 = artifacts.require("MockERC20");
contract("MockERC20", function () {
  // Tests for the mock token would go here
});
