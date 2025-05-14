/**
 * Test file for AgentKit integration
 * Run with: node web3/test/agentKit.test.js
 */

const { createTransactionAgent, processTransactionRequest, extractTransactionDetails } = require('../utils/agentKit');

// Mock wallet address for testing
const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

/**
 * Test the extractTransactionDetails function
 */
async function testExtractTransactionDetails() {
  console.log('Testing extractTransactionDetails...');
  
  // Test send transaction
  const sendMessage = 'send 0.1 ETH to 0x9876543210987654321098765432109876543210';
  const sendResult = await extractTransactionDetails(sendMessage);
  console.log('Send transaction result:', sendResult);
  
  // Test split transaction
  const splitMessage = 'split 0.5 ETH between alice.base, bob.base, and charlie.base';
  const splitResult = await extractTransactionDetails(splitMessage);
  console.log('Split transaction result:', splitResult);
  
  // Test non-transaction message
  const nonTxMessage = 'What is the current price of ETH?';
  const nonTxResult = await extractTransactionDetails(nonTxMessage);
  console.log('Non-transaction result:', nonTxResult);
}

/**
 * Test the createTransactionAgent function
 */
async function testCreateTransactionAgent() {
  console.log('\nTesting createTransactionAgent...');
  
  try {
    // Create an agent
    const agent = createTransactionAgent({
      useTestnet: true,
      walletAddress: TEST_WALLET_ADDRESS,
    });
    
    console.log('Agent created successfully:', agent.name);
    console.log('Agent capabilities:', Object.keys(agent.capabilities));
  } catch (error) {
    console.error('Error creating agent:', error);
  }
}

/**
 * Test the processTransactionRequest function
 */
async function testProcessTransactionRequest() {
  console.log('\nTesting processTransactionRequest...');
  
  try {
    // Process a transaction request
    const message = 'send 0.01 ETH to vitalik.base';
    const result = await processTransactionRequest({
      message,
      useTestnet: true,
      walletAddress: TEST_WALLET_ADDRESS,
    });
    
    console.log('Transaction request processed successfully:', result);
  } catch (error) {
    console.error('Error processing transaction request:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testExtractTransactionDetails();
    await testCreateTransactionAgent();
    await testProcessTransactionRequest();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();
