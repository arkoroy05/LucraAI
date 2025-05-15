import { resolveBaseName } from './baseNameResolver';

const formatEther = (value) => {
  const valueAsNumber = Number(value) || 0;
  return (valueAsNumber / 1e18).toString();
};

const parseEther = (value) => {
  const valueAsNumber = Number(value) || 0;
  return BigInt(Math.floor(valueAsNumber * 1e18));
};

const base = {
  id: 8453,
  name: 'Base Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
};

const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }
};

const createPublicClient = (options) => {
  const { chain, rpcUrl } = options;
  return {
    getBalance: async ({ address }) => {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'eth_getBalance',
            params: [address, 'latest'],
          }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
        const balanceHex = data.result;
        const balance = BigInt(balanceHex);
        return balance;
      } catch (error) {
        return BigInt('100000000000000000');
      }
    }
  };
};

const baseClient = createPublicClient({
  chain: base,
  rpcUrl: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
});
const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
});

class AgentKit {
  constructor(config) {
    this.name = config.name || 'LucraAI Agent';
    this.description = config.description || 'A mock AgentKit agent';
    this.instructions = config.instructions || '';
    this.capabilities = config.capabilities || {};
  }
  async process(message) {
    const details = await extractTransactionDetails(message);
    if (details) {
      return {
        type: 'transaction',
        details,
        agentResponse: {
          response: `I'll process your request to ${details.type} ${details.amount} ${details.token || 'ETH'}.`,
        },
      };
    }
    return {
      type: 'message',
      agentResponse: {
        response: 'I couldn\'t process your request as a transaction.',
      },
    };
  }
}

export function createTransactionAgent({ useTestnet = false, walletAddress }) {
  const client = useTestnet ? baseSepoliaClient : baseClient;
  const chain = useTestnet ? baseSepolia : base;
  const agent = new AgentKit({
    name: 'LucraAI Transaction Agent',
    description: 'An agent that helps with cryptocurrency transactions on Base',
    instructions: `You are LucraAI's transaction agent. You help users send, receive, and track cryptocurrency transactions on the Base network.\nYou can handle the following tasks:\n- Send ETH to an address or Base Name\n- Split payments between multiple recipients\n- Check transaction status\n- Provide transaction history\n- Resolve Base Names to addresses\n\nAlways verify transaction details before executing them.`,
    capabilities: {
      sendTransaction: {
        enabled: true,
        handler: async ({ to, amount, token = 'ETH' }) => {
          try {
            const resolvedTo = await resolveBaseName(to, useTestnet);
            if (!resolvedTo) throw new Error(`Could not resolve recipient address: ${to}`);
            const value = parseEther(amount.toString());
            return { to: resolvedTo, value, token, chain: chain.name, walletAddress };
          } catch (error) {
            throw error;
          }
        },
      },
      resolveBaseName: {
        enabled: true,
        handler: async ({ name }) => {
          try {
            const address = await resolveBaseName(name, useTestnet);
            return { name, address, resolved: !!address };
          } catch (error) {
            throw error;
          }
        },
      },
      getBalance: {
        enabled: true,
        handler: async () => {
          try {
            return await client.getBalance({ address: walletAddress });
          } catch (error) {
            throw error;
          }
        },
      },
    },
  });
  return agent;
}

export async function processTransactionRequest({ message, useTestnet = false, walletAddress }) {
  const agent = createTransactionAgent({ useTestnet, walletAddress });
  return agent.process(message);
}

export function isTransactionRequest(message) {
  const transactionKeywords = [
    'send',
    'transfer',
    'pay',
    'split',
    'eth',
    'ether',
    'transaction',
  ];
  const lowerMessage = message.toLowerCase();
  return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
}

export async function extractTransactionDetails(message) {
  // Dummy extraction logic for demo
  if (message.toLowerCase().includes('send')) {
    return {
      type: 'send',
      amount: 0.1,
      token: 'ETH',
      recipients: ['alice.base'],
      note: 'Demo transaction',
    };
  }
  if (message.toLowerCase().includes('split')) {
    return {
      type: 'split',
      amount: 0.2,
      token: 'ETH',
      recipients: ['alice.base', 'bob.base'],
      note: 'Demo split',
    };
  }
  return null;
} 