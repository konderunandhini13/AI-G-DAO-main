import algosdk from 'algosdk';
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils';

// Algorand network configuration
export const ALGORAND_CONFIG = {
  // Use TestNet for development
  server: 'https://testnet-api.algonode.cloud',
  indexerServer: 'https://testnet-idx.algonode.cloud',
  port: '',
  token: '',
  network: 'testnet' as const,
};

// Initialize Algorand client
export const algorandClient = AlgorandClient.fromConfig({
  algodConfig: {
    server: ALGORAND_CONFIG.server,
    port: ALGORAND_CONFIG.port,
    token: ALGORAND_CONFIG.token,
  },
  indexerConfig: {
    server: ALGORAND_CONFIG.indexerServer,
    port: ALGORAND_CONFIG.port,
    token: ALGORAND_CONFIG.token,
  },
});

// Contract App IDs (read from environment variables)
export const CONTRACT_IDS = {
  CLIMATE_DAO: parseInt(process.env.NEXT_PUBLIC_CLIMATE_DAO_APP_ID || '0'),
  IMPACT_ANALYTICS: parseInt(process.env.NEXT_PUBLIC_IMPACT_ANALYTICS_APP_ID || '0'),
  VOTING_SYSTEM: parseInt(process.env.NEXT_PUBLIC_VOTING_SYSTEM_APP_ID || '0'),
};

// Create Algod client for direct SDK usage
export const algodClient = new algosdk.Algodv2(
  ALGORAND_CONFIG.token,
  ALGORAND_CONFIG.server,
  ALGORAND_CONFIG.port
);

// Create Indexer client
export const indexerClient = new algosdk.Indexer(
  ALGORAND_CONFIG.token,
  ALGORAND_CONFIG.indexerServer,
  ALGORAND_CONFIG.port
);

// Helper function to get suggested transaction parameters
export async function getSuggestedParams() {
  return await algodClient.getTransactionParams().do();
}

// Helper function to wait for transaction confirmation
export async function waitForConfirmation(txId: string) {
  const response = await algosdk.waitForConfirmation(algodClient, txId, 3);
  return response;
}

// Helper function to compile contract (for deployment)
export async function compileContract(source: string) {
  const response = await algodClient.compile(source).do();
  return response;
}
