// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title LucraWallet
 * @dev An enhanced smart contract wallet for LucraAI with security features and ERC20 support
 * @author LucraAI Team
 */
contract LucraWallet is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    // State variables
    address public owner;
    address public pendingOwner;
    mapping(address => bool) public authorizedAddresses;
    mapping(address => uint256) public dailyLimits;
    mapping(address => uint256) public dailySpent;
    mapping(address => uint256) public lastResetTime;
    uint256 public defaultDailyLimit;
    uint256 public guardianDelay;
    mapping(address => bool) public guardians;
    uint256 public guardiansRequired;
    uint256 public constant MAX_GUARDIANS = 10;
    address[] public guardianList;
    bool public frozen;
    uint256 public lastActivity;

    // Events
    event Received(address indexed sender, uint256 amount, string memo);
    event Sent(address indexed recipient, uint256 amount, string memo);
    event ERC20Sent(address indexed token, address indexed recipient, uint256 amount, string memo);
    event AuthorizedAddressAdded(address indexed authorizedAddress, uint256 dailyLimit);
    event AuthorizedAddressRemoved(address indexed authorizedAddress);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event WalletFrozen(address indexed by);
    event WalletUnfrozen(address indexed by);
    event DailyLimitChanged(address indexed user, uint256 newLimit);
    event DefaultDailyLimitChanged(uint256 newLimit);
    event GuardianDelayChanged(uint256 newDelay);
    event GuardiansRequiredChanged(uint256 newRequired);
    event FallbackCalled(address indexed sender, uint256 value, bytes data);

    /**
     * @dev Constructor sets the owner of the wallet and initializes default values
     * @param _guardianDelay Time delay in seconds before guardians can recover the wallet
     * @param _defaultDailyLimit Default daily spending limit in wei
     */
    constructor(uint256 _guardianDelay, uint256 _defaultDailyLimit) {
        owner = msg.sender;
        guardianDelay = _guardianDelay > 0 ? _guardianDelay : 1 days;
        defaultDailyLimit = _defaultDailyLimit;
        guardiansRequired = 1;
        lastActivity = block.timestamp;
    }

    /**
     * @dev Modifier to check if the caller is the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "LucraWallet: caller is not the owner");
        _;
    }

    /**
     * @dev Modifier to check if the caller is authorized
     */
    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedAddresses[msg.sender], "LucraWallet: not authorized");
        _;
    }

    /**
     * @dev Modifier to check if the caller is a guardian
     */
    modifier onlyGuardian() {
        require(guardians[msg.sender], "LucraWallet: caller is not a guardian");
        _;
    }

    /**
     * @dev Modifier to check if the wallet is not frozen
     */
    modifier notFrozen() {
        require(!frozen, "LucraWallet: wallet is frozen");
        _;
    }

    /**
     * @dev Modifier to check and reset daily limits
     */
    modifier checkAndResetDailyLimit() {
        if (block.timestamp >= lastResetTime[msg.sender] + 1 days) {
            dailySpent[msg.sender] = 0;
            lastResetTime[msg.sender] = block.timestamp;
        }
        _;
    }

    /**
     * @dev Modifier to update the last activity timestamp
     */
    modifier updateActivity() {
        lastActivity = block.timestamp;
        _;
    }

    /**
     * @dev Function to receive Ether
     */
    receive() external payable {
        emit Received(msg.sender, msg.value, "");
    }

    /**
     * @dev Fallback function to handle calls to undefined functions
     */
    fallback() external payable {
        emit FallbackCalled(msg.sender, msg.value, msg.data);
    }

    /**
     * @dev Function to send Ether with improved security
     * @param recipient Address to send Ether to
     * @param amount Amount of Ether to send
     * @param memo Optional memo for the transaction
     */
    function sendEther(
        address payable recipient,
        uint256 amount,
        string memory memo
    )
        external
        onlyAuthorized
        notFrozen
        nonReentrant
        checkAndResetDailyLimit
        updateActivity
    {
        require(recipient != address(0), "LucraWallet: invalid recipient");
        require(address(this).balance >= amount, "LucraWallet: insufficient balance");

        // Check daily limit for authorized users (not owner)
        if (msg.sender != owner) {
            uint256 limit = dailyLimits[msg.sender] > 0 ? dailyLimits[msg.sender] : defaultDailyLimit;
            require(dailySpent[msg.sender] + amount <= limit, "LucraWallet: daily limit exceeded");
            dailySpent[msg.sender] += amount;
        }

        // Use call instead of transfer to avoid gas limit issues
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "LucraWallet: transfer failed");

        emit Sent(recipient, amount, memo);
    }

    /**
     * @dev Function to send ERC20 tokens
     * @param token Address of the ERC20 token
     * @param recipient Address to send tokens to
     * @param amount Amount of tokens to send
     * @param memo Optional memo for the transaction
     */
    function sendERC20(
        address token,
        address recipient,
        uint256 amount,
        string memory memo
    )
        external
        onlyAuthorized
        notFrozen
        nonReentrant
        checkAndResetDailyLimit
        updateActivity
    {
        require(token != address(0), "LucraWallet: invalid token address");
        require(recipient != address(0), "LucraWallet: invalid recipient");

        // Check daily limit for authorized users (not owner)
        if (msg.sender != owner) {
            uint256 limit = dailyLimits[msg.sender] > 0 ? dailyLimits[msg.sender] : defaultDailyLimit;
            require(dailySpent[msg.sender] + amount <= limit, "LucraWallet: daily limit exceeded");
            dailySpent[msg.sender] += amount;
        }

        // Use SafeERC20 to handle non-standard ERC20 tokens
        IERC20(token).safeTransfer(recipient, amount);

        emit ERC20Sent(token, recipient, amount, memo);
    }

    /**
     * @dev Function to add an authorized address with a daily limit
     * @param authorizedAddress Address to authorize
     * @param dailyLimit Daily spending limit for this address (0 to use default)
     */
    function addAuthorizedAddress(
        address authorizedAddress,
        uint256 dailyLimit
    )
        external
        onlyOwner
        updateActivity
    {
        require(authorizedAddress != address(0), "LucraWallet: invalid address");
        require(!authorizedAddresses[authorizedAddress], "LucraWallet: already authorized");

        authorizedAddresses[authorizedAddress] = true;
        if (dailyLimit > 0) {
            dailyLimits[authorizedAddress] = dailyLimit;
        }

        emit AuthorizedAddressAdded(authorizedAddress, dailyLimit);
    }

    /**
     * @dev Function to remove an authorized address
     * @param authorizedAddress Address to remove authorization from
     */
    function removeAuthorizedAddress(address authorizedAddress)
        external
        onlyOwner
        updateActivity
    {
        require(authorizedAddresses[authorizedAddress], "LucraWallet: not authorized");

        authorizedAddresses[authorizedAddress] = false;
        dailyLimits[authorizedAddress] = 0;

        emit AuthorizedAddressRemoved(authorizedAddress);
    }

    /**
     * @dev Function to set the daily limit for an authorized address
     * @param authorizedAddress Address to set limit for
     * @param dailyLimit New daily limit
     */
    function setDailyLimit(address authorizedAddress, uint256 dailyLimit)
        external
        onlyOwner
    {
        require(authorizedAddresses[authorizedAddress], "LucraWallet: not authorized");

        dailyLimits[authorizedAddress] = dailyLimit;

        emit DailyLimitChanged(authorizedAddress, dailyLimit);
    }

    /**
     * @dev Function to set the default daily limit
     * @param newDefaultLimit New default daily limit
     */
    function setDefaultDailyLimit(uint256 newDefaultLimit)
        external
        onlyOwner
    {
        defaultDailyLimit = newDefaultLimit;

        emit DefaultDailyLimitChanged(newDefaultLimit);
    }

    /**
     * @dev Function to get the balance of the wallet
     * @return Balance of the wallet in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Function to get the balance of an ERC20 token
     * @param token Address of the ERC20 token
     * @return Balance of the token
     */
    function getERC20Balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Function to check if an address is authorized
     * @param authorizedAddress Address to check
     * @return True if the address is authorized
     */
    function isAuthorized(address authorizedAddress) external view returns (bool) {
        return authorizedAddress == owner || authorizedAddresses[authorizedAddress];
    }

    /**
     * @dev Initiates transfer of ownership
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner)
        external
        onlyOwner
        updateActivity
    {
        require(newOwner != address(0), "LucraWallet: new owner is the zero address");
        require(newOwner != owner, "LucraWallet: new owner is the current owner");

        pendingOwner = newOwner;

        emit OwnershipTransferStarted(owner, newOwner);
    }

    /**
     * @dev Accepts transfer of ownership
     */
    function acceptOwnership()
        external
        updateActivity
    {
        require(msg.sender == pendingOwner, "LucraWallet: caller is not the pending owner");

        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);

        emit OwnershipTransferred(oldOwner, owner);
    }

    /**
     * @dev Adds a guardian to the wallet
     * @param guardian Address of the guardian to add
     */
    function addGuardian(address guardian)
        external
        onlyOwner
        updateActivity
    {
        require(guardian != address(0), "LucraWallet: invalid guardian address");
        require(!guardians[guardian], "LucraWallet: already a guardian");
        require(guardianList.length < MAX_GUARDIANS, "LucraWallet: max guardians reached");

        guardians[guardian] = true;
        guardianList.push(guardian);

        emit GuardianAdded(guardian);
    }

    /**
     * @dev Removes a guardian from the wallet
     * @param guardian Address of the guardian to remove
     */
    function removeGuardian(address guardian)
        external
        onlyOwner
        updateActivity
    {
        require(guardians[guardian], "LucraWallet: not a guardian");

        guardians[guardian] = false;

        // Remove from the list
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardianList[i] == guardian) {
                guardianList[i] = guardianList[guardianList.length - 1];
                guardianList.pop();
                break;
            }
        }

        // Ensure guardiansRequired doesn't exceed the number of guardians
        if (guardiansRequired > guardianList.length) {
            guardiansRequired = guardianList.length > 0 ? guardianList.length : 1;
        }

        emit GuardianRemoved(guardian);
    }

    /**
     * @dev Sets the number of guardians required for recovery
     * @param required Number of guardians required
     */
    function setGuardiansRequired(uint256 required)
        external
        onlyOwner
    {
        require(required > 0, "LucraWallet: required must be greater than 0");
        require(required <= guardianList.length, "LucraWallet: required exceeds guardian count");

        guardiansRequired = required;

        emit GuardiansRequiredChanged(required);
    }

    /**
     * @dev Sets the guardian delay period
     * @param delay New delay in seconds
     */
    function setGuardianDelay(uint256 delay)
        external
        onlyOwner
    {
        require(delay > 0, "LucraWallet: delay must be greater than 0");

        guardianDelay = delay;

        emit GuardianDelayChanged(delay);
    }

    /**
     * @dev Freezes the wallet in case of emergency
     * Can be called by guardians if the wallet has been inactive
     */
    function freezeWallet()
        external
    {
        bool isGuardian = guardians[msg.sender];
        bool isInactive = block.timestamp > lastActivity + guardianDelay;

        require(
            msg.sender == owner || (isGuardian && isInactive),
            "LucraWallet: caller is not authorized to freeze"
        );

        frozen = true;

        emit WalletFrozen(msg.sender);
    }

    /**
     * @dev Unfreezes the wallet
     * Can only be called by the owner
     */
    function unfreezeWallet()
        external
        onlyOwner
        updateActivity
    {
        frozen = false;

        emit WalletUnfrozen(msg.sender);
    }

    /**
     * @dev Recovers the wallet by changing the owner
     * Requires multiple guardians to approve
     * @param newOwner Address of the new owner
     */
    function recoverWallet(address newOwner)
        external
        onlyGuardian
    {
        require(frozen, "LucraWallet: wallet must be frozen first");
        require(block.timestamp > lastActivity + guardianDelay, "LucraWallet: guardian delay not passed");
        require(newOwner != address(0), "LucraWallet: new owner is the zero address");

        // Implementation would require a multi-signature approach
        // This is a simplified version for demonstration

        address oldOwner = owner;
        owner = newOwner;
        frozen = false;
        lastActivity = block.timestamp;

        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * @dev Executes a batch of transactions to save gas
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send
     * @param memo Memo for the batch transaction
     */
    function batchSendEther(
        address payable[] calldata recipients,
        uint256[] calldata amounts,
        string memory memo
    )
        external
        onlyAuthorized
        notFrozen
        nonReentrant
        updateActivity
    {
        require(recipients.length == amounts.length, "LucraWallet: arrays length mismatch");
        require(recipients.length > 0, "LucraWallet: empty arrays");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        require(address(this).balance >= totalAmount, "LucraWallet: insufficient balance");

        // Check daily limit for authorized users (not owner)
        if (msg.sender != owner) {
            uint256 limit = dailyLimits[msg.sender] > 0 ? dailyLimits[msg.sender] : defaultDailyLimit;
            require(dailySpent[msg.sender] + totalAmount <= limit, "LucraWallet: daily limit exceeded");
            dailySpent[msg.sender] += totalAmount;
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "LucraWallet: invalid recipient");

            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "LucraWallet: transfer failed");

            emit Sent(recipients[i], amounts[i], memo);
        }
    }
}
