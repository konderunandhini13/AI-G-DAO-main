'use client';

import { useState, useCallback } from 'react';
import algosdk from 'algosdk';
import { algodClient, getSuggestedParams, waitForConfirmation, CONTRACT_IDS } from '@/lib/algorand';
import { TransactionBuilder, confirmTransaction, calculateTransactionCosts, TransactionResult } from '@/lib/transaction-builder';
import { useWalletContext } from './use-wallet';
import { climateDAOQuery, BlockchainProposal, BlockchainStats } from '@/lib/blockchain-queries';

export function useClimateDAO() {
  const { address, signTransaction, isConnected } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinDAO = async (membershipFee: number) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const suggestedParams = await getSuggestedParams();
      
      // Create payment transaction for membership fee
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: algosdk.getApplicationAddress(CONTRACT_IDS.CLIMATE_DAO),
        amount: membershipFee * 1000000, // Convert to microAlgos
        suggestedParams,
      });

      // Create application call transaction
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: address,
        appIndex: CONTRACT_IDS.CLIMATE_DAO,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [new Uint8Array(Buffer.from('join_dao'))],
        foreignAssets: [], // Add DAO token ID here when available
        suggestedParams,
      });

      // Group transactions
      const txnGroup = [paymentTxn, appCallTxn];
      algosdk.assignGroupID(txnGroup);

      // Sign transactions
      const signedPayment = await signTransaction(paymentTxn);
      const signedAppCall = await signTransaction(appCallTxn);

      // Submit transactions
      const response = await algodClient.sendRawTransaction([signedPayment, signedAppCall]).do();
      const txId = response.txid;
      
      // Wait for confirmation
      await waitForConfirmation(txId);
      
      return txId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit a proposal to the blockchain with reduced ALGO costs
   * Only requires 0.1 ALGO deposit instead of 1 ALGO
   * Now includes DEMO mode for development/testing
   */
  const submitProposal = async (proposalData: {
    title: string
    description: string
    category: string
    fundingAmount: number
    expectedImpact: string
    location: string
  }): Promise<TransactionResult> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting proposal submission...');
      
      // Generate unique proposal ID
      const proposalId = Date.now();
      const endTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      // Store proposal data on blockchain/localStorage
      console.log('Storing proposal data...');
      const stored = await climateDAOQuery.storeProposal({
        id: proposalId,
        title: proposalData.title,
        description: proposalData.description,
        creator: address,
        fundingAmount: proposalData.fundingAmount,
        category: proposalData.category,
        endTime,
        aiScore: Math.random() * 10 // Simulate AI score for now
      });
      
      if (!stored) {
        throw new Error('Failed to store proposal data. Please try again.');
      }
      
      console.log('Proposal data stored successfully!');
      
      // DEMO MODE: Skip blockchain transactions for now
      // This allows the app to work without requiring a fully deployed smart contract
      const DEMO_MODE = true; // Set to false when smart contract is deployed
      
      if (DEMO_MODE) {
        console.log('🎯 DEMO MODE: Simulating blockchain transaction...');
        
        // Generate a mock transaction ID
        const mockTxId = `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simulate a delay for transaction processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ DEMO MODE: Proposal submitted successfully with mock txId:', mockTxId);
        
        return {
          txId: mockTxId,
          confirmedRound: Date.now(),
          applicationIndex: CONTRACT_IDS.CLIMATE_DAO,
          timestamp: Date.now(),
          success: true,
          proposalId: proposalId,
          message: 'Proposal submitted successfully (Demo Mode)'
        } as TransactionResult;
      }
      
      // PRODUCTION MODE: Real blockchain transactions
      const suggestedParams = await getSuggestedParams();
      const depositAmount = 0.1; // ALGO
      const costs = calculateTransactionCosts(2); // Payment + App call
      
      console.log('Transaction costs:', costs);
      console.log('Creating transaction group...');
      
      // Create transaction group with reduced deposit
      const txnGroup = TransactionBuilder.createProposalWithDeposit(
        { sender: address, suggestedParams },
        CONTRACT_IDS.CLIMATE_DAO,
        proposalData,
        depositAmount
      );

      console.log('Transaction group created, signing...');
      
      // Sign all transactions in group
      const signedTxns = [];
      for (const txn of txnGroup) {
        const signedTxn = await signTransaction(txn);
        signedTxns.push(signedTxn);
      }

      console.log('Transactions signed, submitting to blockchain...');
      
      // Submit transaction group
      const response = await algodClient.sendRawTransaction(signedTxns).do();
      const txId = response.txid;
      
      console.log('Proposal submitted with txId:', txId);
      
      // Wait for confirmation with detailed results
      const result = await confirmTransaction(algodClient, txId);
      
      console.log('Proposal confirmed:', result);
      
      // Attach the proposalId we generated locally so callers can link analysis to the proposal
      return {
        ...result,
        proposalId: proposalId
      } as TransactionResult; 
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Proposal submission failed';
      console.error('Proposal submission error:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vote on a proposal with real blockchain transactions
   * Includes double-voting prevention and testnet compatibility
   */
  const voteOnProposal = async (proposalId: number, vote: 'for' | 'against'): Promise<TransactionResult> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🗳️ Starting vote:', vote, 'on proposal', proposalId);
      
      // Check if user has already voted on this proposal
      const votingState = await climateDAOQuery.getUserVotingState(proposalId, address);
      if (votingState.hasVoted) {
        const message = `You have already voted "${votingState.userVote}" on this proposal`;
        console.log('⚠️ Duplicate vote attempt:', message);
        setError(message);
        return {
          txId: '',
          confirmedRound: 0,
          timestamp: Date.now(),
          success: false,
          message
        } as TransactionResult;
      }

      // Get proposal to validate
      const proposal = await climateDAOQuery.getProposal(proposalId);
      if (!proposal) {
        const allProposals = await climateDAOQuery.getProposals();
        console.log('🔍 Available proposal IDs:', allProposals.map(p => p.id));
        throw new Error(`Proposal ${proposalId} not found`);
      }

      if (proposal.status !== 'active') {
        throw new Error('Voting is no longer active for this proposal');
      }

      // PRODUCTION MODE: Real blockchain transactions
      console.log('🚀 Creating real blockchain voting transaction...');
      
      const suggestedParams = await getSuggestedParams();
      
      // Check if contract is deployed
      if (!CONTRACT_IDS.CLIMATE_DAO || CONTRACT_IDS.CLIMATE_DAO === 0) {
        console.warn('⚠️ Smart contract not deployed, falling back to demo mode');
        
        // Fallback to demo mode for development
        const mockTxId = 'DEMO_VOTE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await climateDAOQuery.storeVote(proposalId, vote, address, mockTxId);
        
        return {
          txId: mockTxId,
          confirmedRound: Date.now(),
          timestamp: Date.now(),
          success: true,
          message: `Vote "${vote}" recorded (Demo Mode - Contract Not Deployed)`
        } as TransactionResult;
      }
      
      // Create voting transaction with minimal cost (just network fee ~0.001 ALGO)
      const voteTxn = TransactionBuilder.createVoteTransaction(
        { sender: address, suggestedParams },
        CONTRACT_IDS.CLIMATE_DAO,
        proposalId,
        vote
      );

      console.log('Signing voting transaction...');
      
      // Sign the transaction
      const signedTxn = await signTransaction(voteTxn);

      console.log('Submitting vote to Algorand testnet...');
      
      // Submit transaction
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      
      console.log('Vote transaction submitted with txId:', txId);
      console.log('🔗 View on Lora:', `https://lora.algokit.io/testnet/transaction/${txId}`);
      
      // Wait for confirmation
      const result = await confirmTransaction(algodClient, txId);
      
      console.log('Vote confirmed on blockchain:', result);
      
      // Store vote in localStorage for UI updates
      await climateDAOQuery.storeVote(proposalId, vote, address, txId);
      
      console.log(`✅ Vote "${vote}" recorded successfully with real txId:`, txId);
      
      return {
        ...result,
        success: true,
        message: `Vote "${vote}" recorded on Algorand testnet`,
        txId: txId
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Voting failed';
      console.error('❌ Voting error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Read-only methods
  const getMemberTokens = async (memberAddress?: string) => {
    try {
      const targetAddress = memberAddress || address;
      if (!targetAddress) return 0;

      // This would call the get_member_tokens method
      // For now, returning 0 until contract integration
      return 0;
    } catch (err) {
      console.error('Failed to get member tokens:', err);
      return 0;
    }
  };

  const getTotalProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real total proposals count from blockchain
      const total = await climateDAOQuery.getTotalProposals();
      return total;
    } catch (err) {
      console.error('Error fetching total proposals:', err);
      setError('Failed to fetch total proposals');
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get proposal details from blockchain by ID
   */
  const getProposal = useCallback(async (proposalId: number): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);
      const proposal = await climateDAOQuery.getProposal(proposalId);
      return proposal;
    } catch (err) {
      console.error('Error fetching proposal:', err);
      setError('Failed to fetch proposal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all proposals with optional filtering
   */
  const getProposals = useCallback(async (filters?: {
    status?: 'active' | 'passed' | 'rejected' | 'expired';
    category?: string;
    creator?: string;
    limit?: number;
  }): Promise<BlockchainProposal[]> => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real proposals from blockchain with filtering
      const proposals = await climateDAOQuery.getProposals(filters);
      return proposals;
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Failed to fetch proposals');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get blockchain statistics for dashboard
   */
  const getBlockchainStats = useCallback(async (): Promise<BlockchainStats> => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real blockchain statistics
      const stats = await climateDAOQuery.getStats(address || undefined);
      return stats;
    } catch (err) {
      console.error('Error fetching blockchain stats:', err);
      setError('Failed to fetch blockchain stats');
      return {
        totalProposals: 0,
        totalMembers: 0,
        activeProposals: 0,
        userProposalCount: 0,
        userVoteCount: 0
      };
    } finally {
      setLoading(false);
    }
  }, [address]);

  /**
   * Get real-time voting data for a proposal
   */
  const getProposalVotes = useCallback(async (proposalId: number) => {
    try {
      setLoading(true);
      return await climateDAOQuery.getProposalVotes(proposalId);
    } catch (err) {
      console.error('Error fetching proposal votes:', err);
      setError('Failed to fetch voting data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if user has voted on a proposal
   */
  const getUserVotingState = useCallback(async (proposalId: number) => {
    if (!address) return { hasVoted: false };
    
    try {
      return await climateDAOQuery.getUserVotingState(proposalId, address);
    } catch (err) {
      console.error('Error checking voting state:', err);
      return { hasVoted: false };
    }
  }, [address]);

  /**
   * Get user's complete voting history
   */
  const getUserVotingHistory = useCallback(async () => {
    if (!address) return [];
    
    try {
      setLoading(true);
      return await climateDAOQuery.getUserVotingHistory(address);
    } catch (err) {
      console.error('Error fetching voting history:', err);
      setError('Failed to fetch voting history');
      return [];
    } finally {
      setLoading(false);
    }
  }, [address]);

  /**
   * Get voting states for multiple proposals
   */
  const getBatchVotingStates = useCallback(async (proposalIds: number[]) => {
    if (!address) return new Map();
    
    try {
      return await climateDAOQuery.getBatchVotingStates(proposalIds, address);
    } catch (err) {
      console.error('Error fetching batch voting states:', err);
      return new Map();
    }
  }, [address]);

  /**
   * Delete a proposal - only creator can delete their own proposal
   */
  const deleteProposal = async (proposalId: number): Promise<boolean> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await climateDAOQuery.deleteProposal(proposalId, address);
      console.log('Proposal deleted successfully:', proposalId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete proposal';
      console.error('Delete proposal error:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a proposal - only creator can update their own proposal
   */
  const updateProposal = async (proposalData: {
    id: number;
    title: string;
    description: string;
    fundingAmount: number;
    expectedImpact: string;
    category: string;
    location: string;
  }): Promise<boolean> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await climateDAOQuery.updateProposal(proposalData, address);
      console.log('Proposal updated successfully:', proposalData.id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update proposal';
      console.error('Update proposal error:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clean up expired proposals after specified days
   */
  const cleanupExpiredProposals = useCallback(async (daysToKeep: number = 7) => {
    try {
      return await climateDAOQuery.cleanupExpiredProposals(daysToKeep);
    } catch (error) {
      console.error('Error cleaning up expired proposals:', error);
      setError('Failed to cleanup expired proposals');
      return { removedCount: 0, keptCount: 0 };
    }
  }, []);

  /**
   * Enforce aggressive storage limits for 200KB constraint
   */
  const enforceStorageLimits = useCallback(async () => {
    try {
      return await climateDAOQuery.enforceStorageLimits();
    } catch (error) {
      console.error('Error enforcing storage limits:', error);
      setError('Failed to enforce storage limits');
      return {
        cleaned: false,
        currentSize: 0,
        proposalsCount: 0
      };
    }
  }, []);

  /**
   * Get user's proposal submission limits
   */
  const getUserProposalLimits = useCallback((userAddress: string) => {
    try {
      return climateDAOQuery.getUserProposalLimits(userAddress);
    } catch (error) {
      console.error('Error getting user proposal limits:', error);
      setError('Failed to get proposal limits');
      return {
        maxPerUser: 10,
        maxPerDay: 3,
        currentTotal: 0,
        currentToday: 0,
        canSubmitNext: new Date(),
        remainingToday: 3,
        remainingTotal: 10,
      };
    }
  }, []);

  return {
    joinDAO,
    submitProposal,
    voteOnProposal,
    deleteProposal,
    updateProposal,
    getMemberTokens,
    getTotalProposals,
    getProposal,
    getProposals,
    getBlockchainStats,
    getProposalVotes,
    getUserVotingState,
    getUserVotingHistory,
    getBatchVotingStates,
    cleanupExpiredProposals,
    enforceStorageLimits,
    getUserProposalLimits,
    loading,
    error,
  };
}
