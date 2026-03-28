'use client';

import algosdk from 'algosdk';
import { algodClient, CONTRACT_IDS } from '@/lib/algorand';
import { memberTracker } from '@/lib/member-tracker';


export interface BlockchainProposal {
  id: number;
  title: string;
  description: string;
  creator: string;
  fundingAmount: number;
  voteYes: number;
  voteNo: number;
  status: 'active' | 'passed' | 'rejected' | 'expired';
  endTime: number;
  category: string;
  aiScore?: number;
  creationTime: number;
  preservedBy?: string[]; // addresses for whom this proposal should be preserved
}

export interface BlockchainStats {
  totalProposals: number;
  totalMembers: number;
  activeProposals: number;
  userProposalCount: number;
  userVoteCount: number;
}

export interface VotingRecord {
  proposalId: number;
  proposalTitle: string;
  vote: 'for' | 'against';
  timestamp: number;
  txId: string;
  confirmedRound: number;
}

export interface VotingState {
  hasVoted: boolean;
  userVote?: 'for' | 'against';
  votingRecord?: VotingRecord;
}

export interface ProposalVotes {
  proposalId: number;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  yesPercentage: number;
  noPercentage: number;
  votingDeadline: number;
  isVotingActive: boolean;
}

export interface ImpactMetrics {
  totalCO2Reduced: number;
  cleanEnergyGenerated: number;
  wasteRecycled: number;
  treesPlanted: number;
  waterSaved: number;
  temperatureImpact: number;
  totalFundingDeployed: number;
  projectsCompleted: number;
}

export interface ProjectImpact {
  id: number;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'planning';
  impactScore: number;
  co2Reduced: number;
  energyGenerated: number;
  funding: number;
  startDate: string;
  category: string;
}

/**
 * Blockchain query service for reading real data from Climate DAO smart contract
 */
export class ClimateDAOQueryService {
  private appId: number;

  constructor() {
    this.appId = CONTRACT_IDS.CLIMATE_DAO;
  }

  /**
   * Check if the contract is deployed and accessible
   */
  private async isContractDeployed(): Promise<boolean> {
    try {
      await algodClient.getApplicationByID(this.appId).do();
      return true;
    } catch (error: any) {
      // Contract doesn't exist or network error
      if (error.status === 404 || error.message?.includes('does not exist')) {
        console.log('Contract not deployed, using mock data');
        return false;
      }
      console.error('Error checking contract deployment:', error);
      return false;
    }
  }

  /**
   * Get global state from the smart contract
   */
  private async getGlobalState(): Promise<Record<string, any>> {
    try {
      // Check if contract is deployed first
      if (!(await this.isContractDeployed())) {
        return {};
      }

      const appInfo = await algodClient.getApplicationByID(this.appId).do();
      const globalState: Record<string, any> = {};
      
      if (appInfo.params.globalState) {
        appInfo.params.globalState.forEach((item: any) => {
          const key = Buffer.from(item.key, 'base64').toString();
          let value;
          
          if (item.value.type === 1) {
            // Bytes
            value = Buffer.from(item.value.bytes, 'base64');
          } else if (item.value.type === 2) {
            // Uint
            value = item.value.uint;
          }
          
          globalState[key] = value;
        });
      }
      
      return globalState;
    } catch (error) {
      console.error('Error reading global state:', error);
      return {};
    }
  }

  /**
   * Read a box value from the smart contract
   */
  private async readBox(key: string): Promise<Uint8Array | null> {
    try {
      // Check if contract is deployed first
      if (!(await this.isContractDeployed())) {
        return null;
      }

      const boxKey = new Uint8Array(Buffer.from(key, 'utf8'));
      const boxValue = await algodClient.getApplicationBoxByName(this.appId, boxKey).do();
      return new Uint8Array(boxValue.value);
    } catch (error: any) {
      // Handle box not found errors gracefully
      if (error.status === 404 || error.message?.includes('box not found')) {
        console.log(`Box ${key} not found, returning null`);
        return null;
      }
      console.error(`Error reading box ${key}:`, error);
      return null;
    }
  }

  /**
   * Check if user can submit a proposal (rate limiting)
   */
  private canUserSubmitProposal(userAddress: string): { canSubmit: boolean; reason?: string } {
    // Development-friendly limits for testing
    const LIMITS = {
      maxPerUser: 50,           // Increased for testing
      maxPerDay: 20,            // Increased for testing  
      minTimeBetween: 60000,    // Reduced to 1 minute for testing (60000 ms)
    };

    try {
      const existingProposals = this.getStoredProposals();
      const userProposals = existingProposals.filter(p => p.creator === userAddress);
      
      // Check total proposal limit
      if (userProposals.length >= LIMITS.maxPerUser) {
        return { canSubmit: false, reason: `Maximum ${LIMITS.maxPerUser} proposals per user reached` };
      }

      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      // Check daily limit
      const todayProposals = userProposals.filter(p => p.creationTime > oneDayAgo);
      if (todayProposals.length >= LIMITS.maxPerDay) {
        return { canSubmit: false, reason: `Maximum ${LIMITS.maxPerDay} proposals per day reached` };
      }

      // Check time between proposals
      if (userProposals.length > 0) {
        const lastProposal = userProposals.sort((a, b) => b.creationTime - a.creationTime)[0];
        const timeSinceLastProposal = now - lastProposal.creationTime;
        
        if (timeSinceLastProposal < LIMITS.minTimeBetween) {
          const minutesLeft = Math.ceil((LIMITS.minTimeBetween - timeSinceLastProposal) / 60000);
          const secondsLeft = Math.ceil((LIMITS.minTimeBetween - timeSinceLastProposal) / 1000);
          
          if (minutesLeft < 1) {
            return { canSubmit: false, reason: `Please wait ${secondsLeft} seconds before submitting another proposal` };
          } else {
            return { canSubmit: false, reason: `Please wait ${minutesLeft} minute(s) before submitting another proposal` };
          }
        }
      }

      return { canSubmit: true };
    } catch (error) {
      console.error('Error checking proposal limits:', error);
      return { canSubmit: true }; // Allow on error to avoid blocking users
    }
  }

  /**
   * Store a new proposal on-chain in a box
   */
  private dispatchProposalEvent(eventName: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName));
    }
  }

  async storeProposal(proposal: {
    id: number;
    title: string;
    description: string;
    creator: string;
    fundingAmount: number;
    category: string;
    endTime: number;
    aiScore?: number;
  }): Promise<boolean> {
    try {
      const rateCheck = this.canUserSubmitProposal(proposal.creator);
      if (!rateCheck.canSubmit) throw new Error(rateCheck.reason || 'Proposal submission limit reached');

      const proposalData: BlockchainProposal = {
        id: proposal.id,
        title: proposal.title,
        description: proposal.description,
        creator: proposal.creator,
        fundingAmount: proposal.fundingAmount,
        voteYes: 0,
        voteNo: 0,
        status: 'active',
        endTime: proposal.endTime,
        category: proposal.category,
        aiScore: proposal.aiScore || 0,
        creationTime: Date.now(),
      };

      // Save to Neon DB via API (shared across all users)
      try {
        const res = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposalData),
        });
        if (!res.ok) console.error('Neon proposals insert error:', await res.text());
      } catch (err) {
        console.error('Neon proposals insert failed:', err);
      }

      // Also cache locally
      const existing = this.getStoredProposals();
      localStorage.setItem('climate_dao_proposals', JSON.stringify([...existing, proposalData]));
      this.dispatchProposalEvent('climate_dao_proposals_updated');
      return true;
    } catch (error) {
      console.error('Error storing proposal:', error);
      throw error;
    }
  }

  getStoredProposals(): BlockchainProposal[] {
    try {
      const stored = localStorage.getItem('climate_dao_proposals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private mapSupabaseRow(row: any): BlockchainProposal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      creator: row.creator,
      fundingAmount: row.funding_amount,
      voteYes: row.vote_yes,
      voteNo: row.vote_no,
      status: row.status,
      endTime: row.end_time,
      category: row.category,
      aiScore: row.ai_score,
      creationTime: row.creation_time,
    };
  }

  async storeVote(proposalId: number, vote: 'for' | 'against', userAddress: string, txId: string): Promise<boolean> {
    try {
      // Save vote to Neon DB via API
      try {
        await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId, voterAddress: userAddress, vote, txId }),
        });
        await fetch('/api/proposals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: proposalId, vote }),
        });
      } catch (err) {
        console.error('Neon vote insert failed:', err);
      }

      // Update local cache
      const proposals = this.getStoredProposals();
      const idx = proposals.findIndex(p => p.id === proposalId);
      const proposalTitle = idx >= 0 ? proposals[idx].title : `Proposal #${proposalId}`;

      if (idx >= 0) {
        if (vote === 'for') proposals[idx].voteYes += 1;
        else proposals[idx].voteNo += 1;
        localStorage.setItem('climate_dao_proposals', JSON.stringify(proposals));
      }

      const votingRecord: VotingRecord = {
        proposalId,
        proposalTitle,
        vote,
        timestamp: Math.floor(Date.now() / 1000),
        txId,
        confirmedRound: 1,
      };
      const userVotesKey = `user_votes_${userAddress}`;
      const existing = localStorage.getItem(userVotesKey);
      const userVotes = existing ? JSON.parse(existing) : [];
      userVotes.push(votingRecord);
      localStorage.setItem(userVotesKey, JSON.stringify(userVotes));

      this.dispatchProposalEvent('climate_dao_proposals_updated');
      return true;
    } catch (error) {
      console.error('Error storing vote:', error);
      return false;
    }
  }
  private decodeProposalData(data: Uint8Array, proposalId: number): BlockchainProposal | null {
    try {
      // This is a simplified decoder - in real implementation, use proper ARC4 decoding
      // For now, return null until proper contract integration
      return null;
    } catch (error) {
      console.error('Error decoding proposal data:', error);
      return null;
    }
  }

  /**
   * Get total number of proposals from contract
   */
  async getTotalProposals(): Promise<number> {
    try {
      // Check if contract is deployed first
      if (!(await this.isContractDeployed())) {
        // Return 0 when contract isn't deployed
        return 0;
      }

      const globalState = await this.getGlobalState();
      return globalState.total_proposals || 0;
    } catch (error) {
      console.error('Error getting total proposals:', error);
      // Return 0 on error
      return 0;
    }
  }

  /**
   * Get total number of DAO members
   */
  async getTotalMembers(): Promise<number> {
    try {
      return await memberTracker.getMemberCount();
    } catch (error) {
      console.error('Error getting total members:', error);
      return 0;
    }
  }

  async getProposal(proposalId: number): Promise<any | null> {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`);
      if (response.ok) {
        const proposal = await response.json();
        if (proposal && proposal.id) {
          return proposal;
        }
      }
    } catch (error) {
      console.error(`Error fetching proposal from API ${proposalId}:`, error);
    }

    // fallback to localStorage
    return this.getStoredProposals().find(p => p.id === proposalId) || null;
  }

  async getProposals(filter?: {
    status?: 'active' | 'passed' | 'rejected' | 'expired';
    creator?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<BlockchainProposal[]> {
    try {
      const response = await fetch('/api/proposals');
      if (response.ok) {
        let proposals = (await response.json()) as BlockchainProposal[];

        if (filter?.status) proposals = proposals.filter(p => p.status === filter.status);
        if (filter?.creator) proposals = proposals.filter(p => p.creator === filter.creator);
        if (filter?.category) proposals = proposals.filter(p => p.category === filter.category);
        if (filter?.offset) proposals = proposals.slice(filter.offset);
        if (filter?.limit) proposals = proposals.slice(0, filter.limit);

        localStorage.setItem('climate_dao_proposals', JSON.stringify(proposals));
        return proposals;
      }
    } catch (error) {
      console.error('Error fetching proposals from API:', error);
    }

    // fallback to localStorage
    let proposals = this.getStoredProposals();
    if (filter?.status) proposals = proposals.filter(p => p.status === filter.status);
    if (filter?.creator) proposals = proposals.filter(p => p.creator === filter.creator);
    if (filter?.category) proposals = proposals.filter(p => p.category === filter.category);
    if (filter?.offset) proposals = proposals.slice(filter.offset);
    if (filter?.limit) proposals = proposals.slice(0, filter.limit);
    return proposals;
  }

  /**
   * Get user's proposal count
   */
  async getUserProposalCount(userAddress: string): Promise<number> {
    try {
      // Get all proposals and count those created by the user
      const allProposals = await this.getProposals();
      return allProposals.filter(p => p.creator === userAddress).length;
    } catch (error) {
      console.error('Error getting user proposal count:', error);
      return 0;
    }
  }

  /**
   * Get user's vote count
   */
  async getUserVoteCount(userAddress: string): Promise<number> {
    try {
      // In real implementation, call get_user_vote_count method
      // For now, return mock data
      return 3;
    } catch (error) {
      console.error('Error getting user vote count:', error);
      return 0;
    }
  }

  /**
   * Get user's proposal submission limits and current usage
   */
  getUserProposalLimits(userAddress: string): {
    maxPerUser: number;
    maxPerDay: number;
    currentTotal: number;
    currentToday: number;
    canSubmitNext: Date;
    remainingToday: number;
    remainingTotal: number;
  } {
    const LIMITS = {
      maxPerUser: 10,
      maxPerDay: 3,
      minTimeBetween: 1800000, // 30 minutes
    };

    try {
      const existingProposals = this.getStoredProposals();
      const userProposals = existingProposals.filter(p => p.creator === userAddress);
      
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      const todayProposals = userProposals.filter(p => p.creationTime > oneDayAgo);
      
      let canSubmitNext = new Date(now);
      if (userProposals.length > 0) {
        const lastProposal = userProposals.sort((a, b) => b.creationTime - a.creationTime)[0];
        const nextAllowedTime = lastProposal.creationTime + LIMITS.minTimeBetween;
        if (nextAllowedTime > now) {
          canSubmitNext = new Date(nextAllowedTime);
        }
      }

      return {
        maxPerUser: LIMITS.maxPerUser,
        maxPerDay: LIMITS.maxPerDay,
        currentTotal: userProposals.length,
        currentToday: todayProposals.length,
        canSubmitNext,
        remainingToday: Math.max(0, LIMITS.maxPerDay - todayProposals.length),
        remainingTotal: Math.max(0, LIMITS.maxPerUser - userProposals.length),
      };
    } catch (error) {
      console.error('Error getting user proposal limits:', error);
      return {
        maxPerUser: LIMITS.maxPerUser,
        maxPerDay: LIMITS.maxPerDay,
        currentTotal: 0,
        currentToday: 0,
        canSubmitNext: new Date(),
        remainingToday: LIMITS.maxPerDay,
        remainingTotal: LIMITS.maxPerUser,
      };
    }
  }

  /**
   * Clean up expired proposals that have been expired for more than specified days
   * @param daysToKeep Number of days to keep expired proposals (default: 7 days)
   */
  async cleanupExpiredProposals(daysToKeep: number = 7): Promise<{ removedCount: number; keptCount: number }> {
    try {
      const proposals = this.getStoredProposals();
      const now = Date.now();
      const updated = proposals.map(p =>
        p.status === 'active' && p.endTime < now ? { ...p, status: 'expired' as const } : p
      );
      localStorage.setItem('climate_dao_proposals', JSON.stringify(updated));
      return { removedCount: 0, keptCount: updated.length };
    } catch {
      return { removedCount: 0, keptCount: 0 };
    }
  }

  /**
   * Clean up vote data associated with a removed proposal
   */
  private cleanupProposalVoteData(proposalId: number): void {
    try {
      // Remove only aggregated proposal-specific vote storage
      // Keep individual user vote history intact so users can always see their past votings
      localStorage.removeItem(`proposal_votes_${proposalId}`);
      // NOTE: Do not remove `user_votes_{address}` entries or per-user vote records; preserve voting history
      
    } catch (error) {
      console.error(`Error cleaning up vote data for proposal ${proposalId}:`, error);
    }
  }

  /**
   * Enforce aggressive storage limits for 200KB localStorage constraint
   * Performs comprehensive cleanup when approaching storage limits
   */
  async enforceStorageLimits(): Promise<{
    cleaned: boolean;
    oldSize?: number;
    newSize?: number;
    proposalsKept?: number;
    proposalsRemoved?: number;
    currentSize?: number;
    proposalsCount?: number;
  }> {
    const STORAGE_LIMITS = {
      maxProposals: 30,        // Reduced for 200KB limit
      maxVotes: 50,           // Limit vote records
      cleanupThreshold: 180,   // Cleanup at 180KB (90% of 200KB)
    };
    
    try {
      // Get current storage data
      const proposals = this.getStoredProposals();
      const votes = JSON.parse(localStorage.getItem('climate_dao_votes') || '[]');
      const userHistory = JSON.parse(localStorage.getItem('climate_dao_user_history') || '[]');
      
      // Calculate storage usage (approximate)
      const proposalsSize = JSON.stringify(proposals).length;
      const votesSize = JSON.stringify(votes).length;
      const historySize = JSON.stringify(userHistory).length;
      const totalSize = proposalsSize + votesSize + historySize;
      
      console.log(`📊 Storage usage: ${Math.round(totalSize/1024)}KB / 200KB`);
      
      // If approaching limit, perform aggressive cleanup
      if (totalSize > STORAGE_LIMITS.cleanupThreshold * 1024) {
        console.log('⚠️  Storage limit reached, performing aggressive cleanup...');
        
        // 1. Keep all proposals (never delete — they must persist across disconnect/reconnect)
        const recentProposals = proposals
          .filter(p => p.creationTime)
          .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
        
        // 2. Compress vote data - keep only essential info
        const compressedVotes = votes
          .slice(-STORAGE_LIMITS.maxVotes) // Keep latest votes only
          .map((vote: any) => ({
            proposalId: vote.proposalId,
            vote: vote.vote,
            timestamp: vote.timestamp || Date.now(),
            voter: vote.voter
          }));
        
        // 3. Limit user history
        const compressedHistory = userHistory
          .slice(-20) // Keep only last 20 user actions
          .map((action: any) => ({
            type: action.type,
            proposalId: action.proposalId,
            timestamp: action.timestamp || Date.now()
          }));
        
        // Update storage with compressed data
        localStorage.setItem('climate_dao_proposals', JSON.stringify(recentProposals));
        localStorage.setItem('climate_dao_votes', JSON.stringify(compressedVotes));
        localStorage.setItem('climate_dao_user_history', JSON.stringify(compressedHistory));
        
        // Calculate new size
        const newSize = JSON.stringify({
          proposals: recentProposals,
          votes: compressedVotes,
          history: compressedHistory
        }).length;
        
        console.log(`✅ Storage optimized: ${Math.round(newSize/1024)}KB (saved ${Math.round((totalSize - newSize)/1024)}KB)`);
        
        return {
          cleaned: true,
          oldSize: Math.round(totalSize/1024),
          newSize: Math.round(newSize/1024),
          proposalsKept: recentProposals.length,
          proposalsRemoved: proposals.length - recentProposals.length
        };
      }
      
      return {
        cleaned: false,
        currentSize: Math.round(totalSize/1024),
        proposalsCount: proposals.length
      };
      
    } catch (error) {
      console.error('❌ Storage enforcement failed:', error);
      return {
        cleaned: false,
        currentSize: 0,
        proposalsCount: 0
      };
    }
  }

  /**
   * Get blockchain statistics
   */
  async getStats(userAddress?: string): Promise<BlockchainStats> {
    try {
      const [totalMembers, allProposals] = await Promise.all([
        this.getTotalMembers(),
        this.getProposals()
      ]);

      const activeProposals = allProposals.filter(p => p.status === 'active').length;

      let userProposalCount = 0;
      let userVoteCount = 0;

      if (userAddress) {
        userProposalCount = allProposals.filter(p => p.creator === userAddress).length;
        userVoteCount = await this.getUserVoteCount(userAddress);
      }

      return {
        totalProposals: allProposals.length,
        totalMembers,
        activeProposals,
        userProposalCount,
        userVoteCount
      };
    } catch (error) {
      console.error('Error getting blockchain stats:', error);
      // Return cached member count instead of 0 to avoid wiping the displayed count
      return {
        totalProposals: 0,
        totalMembers: memberTracker.getCachedCount(),
        activeProposals: 0,
        userProposalCount: 0,
        userVoteCount: 0
      };
    }
  }

  /**
   * Calculate impact metrics from blockchain data
   */
  async getImpactMetrics(): Promise<ImpactMetrics> {
    try {
      const allProposals = await this.getProposals();
      
      // Calculate real impact based on completed/active proposals
      const completedProposals = allProposals.filter(p => p.status === 'passed' || p.status === 'active');
      
      let totalFundingDeployed = 0;
      let totalCO2Reduced = 0;
      let cleanEnergyGenerated = 0;
      let wasteRecycled = 0;
      let treesPlanted = 0;
      let waterSaved = 0;
      
      completedProposals.forEach(proposal => {
        totalFundingDeployed += proposal.fundingAmount;
        
        // Calculate impact based on project type and funding
        switch (proposal.category) {
          case 'renewable-energy':
          case 'clean-energy':
            // Estimate CO2 reduction and energy generation based on funding
            const energyImpact = proposal.fundingAmount * 0.00003; // GWh per dollar
            cleanEnergyGenerated += energyImpact;
            totalCO2Reduced += energyImpact * 0.4; // tons CO2 per GWh
            break;
            
          case 'reforestation':
            // Trees planted based on funding (approx $5 per tree)
            const treeCount = Math.floor(proposal.fundingAmount / 5);
            treesPlanted += treeCount;
            totalCO2Reduced += treeCount * 0.048; // tons CO2 per tree per year
            break;
            
          case 'ocean-cleanup':
            // Waste recycling based on cleanup projects
            wasteRecycled += proposal.fundingAmount * 0.001; // tons per dollar
            totalCO2Reduced += proposal.fundingAmount * 0.0005; // CO2 impact
            break;
            
          case 'carbon-capture':
            // Direct CO2 reduction
            totalCO2Reduced += proposal.fundingAmount * 0.0001; // tons per dollar
            break;
            
          default:
            // General environmental impact
            totalCO2Reduced += proposal.fundingAmount * 0.00002; // conservative estimate
        }
      });
      
      // Water saved calculation (conservative estimate)
      waterSaved = totalFundingDeployed * 0.000001; // ML per dollar
      
      // Temperature impact (very conservative estimate)
      const temperatureImpact = totalCO2Reduced * 0.0000001; // °C per ton CO2
      
      return {
        totalCO2Reduced: Math.round(totalCO2Reduced),
        cleanEnergyGenerated: Math.round(cleanEnergyGenerated * 100) / 100,
        wasteRecycled: Math.round(wasteRecycled),
        treesPlanted: Math.round(treesPlanted),
        waterSaved: Math.round(waterSaved * 100) / 100,
        temperatureImpact: Math.round(temperatureImpact * 10000) / 10000,
        totalFundingDeployed: Math.round(totalFundingDeployed),
        projectsCompleted: completedProposals.length
      };
    } catch (error) {
      console.error('Error calculating impact metrics:', error);
      
      // Return zero values when blockchain isn't available
      return {
        totalCO2Reduced: 0,
        cleanEnergyGenerated: 0,
        wasteRecycled: 0,
        treesPlanted: 0,
        waterSaved: 0,
        temperatureImpact: 0,
        totalFundingDeployed: 0,
        projectsCompleted: 0
      };
    }
  }

  /**
   * Get project impact data based on proposals
   */
  async getProjectImpacts(): Promise<ProjectImpact[]> {
    try {
      const allProposals = await this.getProposals();
      
      return allProposals.map(proposal => ({
        id: proposal.id,
        name: proposal.title,
        location: this.getLocationFromTitle(proposal.title),
        status: this.mapProposalStatusToProjectStatus(proposal.status),
        impactScore: proposal.aiScore || Math.floor(Math.random() * 30) + 70,
        co2Reduced: this.calculateCO2Impact(proposal),
        energyGenerated: this.calculateEnergyImpact(proposal),
        funding: proposal.fundingAmount,
        startDate: new Date(proposal.creationTime).toISOString().split('T')[0],
        category: proposal.category
      }));
    } catch (error) {
      console.error('Error getting project impacts:', error);
      
      // Return empty array when blockchain isn't available
      return [];
    }
  }

  /**
   * Map proposal status to project status (helper method)
   */
  private mapProposalStatusToProjectStatus(status: 'active' | 'passed' | 'rejected' | 'expired'): 'active' | 'completed' | 'planning' {
    switch (status) {
      case 'active':
        return 'active';
      case 'passed':
        return 'completed';
      case 'rejected':
      case 'expired':
        return 'planning'; // Show as planning for rejected/expired
      default:
        return 'planning';
    }
  }

  /**
   * Extract location from proposal title (helper method)
   */
  private getLocationFromTitle(title: string): string {
    const locations: { [key: string]: string } = {
      'Kenya': 'Nairobi, Kenya',
      'Pacific': 'Pacific Ocean',
      'São Paulo': 'São Paulo, Brazil',
      'Chile': 'Santiago, Chile',
      'Iceland': 'Reykjavik, Iceland'
    };
    
    for (const [key, location] of Object.entries(locations)) {
      if (title.includes(key)) {
        return location;
      }
    }
    
    return 'Global';
  }

  /**
   * Calculate CO2 impact based on proposal (helper method)
   */
  private calculateCO2Impact(proposal: BlockchainProposal): number {
    switch (proposal.category) {
      case 'renewable-energy':
      case 'clean-energy':
        return Math.floor(proposal.fundingAmount * 0.03); // tons per dollar
      case 'reforestation':
        return Math.floor(proposal.fundingAmount * 0.01); // conservative estimate
      case 'ocean-cleanup':
        return Math.floor(proposal.fundingAmount * 0.005);
      case 'carbon-capture':
        return Math.floor(proposal.fundingAmount * 0.05);
      default:
        return Math.floor(proposal.fundingAmount * 0.005);
    }
  }

  /**
   * Calculate energy impact based on proposal (helper method)
   */
  private calculateEnergyImpact(proposal: BlockchainProposal): number {
    if (proposal.category === 'renewable-energy' || proposal.category === 'clean-energy') {
      return Math.round((proposal.fundingAmount * 0.00003) * 100) / 100; // GWh
    }
    return 0;
  }

  /**
   * Check if user has voted on a specific proposal
   */
  async getUserVotingState(proposalId: number, userAddress: string): Promise<VotingState> {
    try {
      // In real implementation, check if user has voted by querying the contract
      // For now, simulate the check
      
      // Check if user has voted on this proposal by looking for vote records
      const votingRecords = await this.getUserVotingHistory(userAddress);
      const existingVote = votingRecords.find(record => record.proposalId === proposalId);
      
      return {
        hasVoted: !!existingVote,
        userVote: existingVote?.vote,
        votingRecord: existingVote
      };
    } catch (error) {
      console.error('Error checking voting state:', error);
      return { hasVoted: false };
    }
  }

  async getUserVotingHistory(userAddress: string): Promise<VotingRecord[]> {
    try {
      if (!userAddress) return [];
      const res = await fetch(`/api/votes?voter=${encodeURIComponent(userAddress)}`);
      if (res.ok) {
        const records: VotingRecord[] = await res.json();
        localStorage.setItem(`user_votes_${userAddress}`, JSON.stringify(records));
        return records;
      }
    } catch {}
    const stored = localStorage.getItem(`user_votes_${userAddress}`);
    if (!stored) return [];
    return (JSON.parse(stored) as VotingRecord[]).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get real-time vote counts for a proposal
   */
  async getProposalVotes(proposalId: number): Promise<ProposalVotes> {
    try {
      // In real implementation, read vote data from contract box storage
      const boxKey = `votes_${proposalId}`;
      const voteData = await this.readBox(boxKey);
      
      // Get proposal for voting deadline
      const proposal = await this.getProposal(proposalId);
      
      if (!proposal) {
        throw new Error('Proposal not found');
      }
      
      let yesVotes = proposal.voteYes || 0;
      let noVotes = proposal.voteNo || 0;
      
      // If we have real vote data, decode it
      if (voteData) {
        // In real implementation, decode the vote data from contract
        // For now, use the proposal's vote counts
      }
      
      const totalVotes = yesVotes + noVotes;
      const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
      const noPercentage = totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0;
      const isVotingActive = proposal.status === 'active' && proposal.endTime > Date.now();
      
      return {
        proposalId,
        yesVotes,
        noVotes,
        totalVotes,
        yesPercentage,
        noPercentage,
        votingDeadline: proposal.endTime,
        isVotingActive
      };
    } catch (error) {
      console.error('Error fetching proposal votes:', error);
      
      // Return fallback data
      const proposal = await this.getProposal(proposalId);
      if (proposal) {
        const totalVotes = proposal.voteYes + proposal.voteNo;
        return {
          proposalId,
          yesVotes: proposal.voteYes,
          noVotes: proposal.voteNo,
          totalVotes,
          yesPercentage: totalVotes > 0 ? Math.round((proposal.voteYes / totalVotes) * 100) : 0,
          noPercentage: totalVotes > 0 ? Math.round((proposal.voteNo / totalVotes) * 100) : 0,
          votingDeadline: proposal.endTime,
          isVotingActive: proposal.status === 'active' && proposal.endTime > Date.now()
        };
      }
      
      return {
        proposalId,
        yesVotes: 0,
        noVotes: 0,
        totalVotes: 0,
        yesPercentage: 0,
        noPercentage: 0,
        votingDeadline: Date.now(),
        isVotingActive: false
      };
    }
  }

  /**
   * Get voting states for multiple proposals for a user
   */
  async getBatchVotingStates(proposalIds: number[], userAddress: string): Promise<Map<number, VotingState>> {
    try {
      const votingStates = new Map<number, VotingState>();
      
      // Get user's voting history once
      const votingHistory = await this.getUserVotingHistory(userAddress);
      
      // Check each proposal
      for (const proposalId of proposalIds) {
        const existingVote = votingHistory.find(record => record.proposalId === proposalId);
        votingStates.set(proposalId, {
          hasVoted: !!existingVote,
          userVote: existingVote?.vote,
          votingRecord: existingVote
        });
      }
      
      return votingStates;
    } catch (error) {
      console.error('Error fetching batch voting states:', error);
      return new Map();
    }
  }

  /**
   * Delete a proposal from blockchain and localStorage
   * Only the proposal creator can delete their own proposal
   */
  async deleteProposal(proposalId: number, userAddress: string): Promise<boolean> {
    try {
      // Delete from Neon DB (shared across all users)
      const res = await fetch(`/api/proposals?id=${proposalId}&creator=${encodeURIComponent(userAddress)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete proposal');
      }

      // Also remove from local cache
      const proposals = this.getStoredProposals().filter(p => p.id !== proposalId);
      localStorage.setItem('climate_dao_proposals', JSON.stringify(proposals));
      localStorage.removeItem(`proposal_ai_${proposalId}`);

      this.dispatchProposalEvent('climate_dao_proposals_updated');
      return true;
    } catch (error) {
      console.error('Error deleting proposal:', error);
      throw error;
    }
  }

  /**
   * Update a proposal in localStorage
   * Only the proposal creator can update their own proposal
   */
  async updateProposal(proposalData: {
    id: number;
    title: string;
    description: string;
    fundingAmount: number;
    expectedImpact: string;
    category: string;
    location: string;
  }, userAddress: string): Promise<boolean> {
    try {
      // Get stored proposals
      const storedProposals = localStorage.getItem('climate_dao_proposals');
      if (!storedProposals) {
        throw new Error('No proposals found');
      }
      
      const proposals: BlockchainProposal[] = JSON.parse(storedProposals);
      
      // Find the proposal
      const proposalIndex = proposals.findIndex(p => p.id === proposalData.id);
      if (proposalIndex === -1) {
        throw new Error('Proposal not found');
      }
      
      const proposal = proposals[proposalIndex];
      
      // Check if user is the creator
      if (proposal.creator !== userAddress) {
        throw new Error('Only the proposal creator can update this proposal');
      }
      
      // Check if proposal has votes - prevent updating if voted on
      if (proposal.voteYes > 0 || proposal.voteNo > 0) {
        throw new Error('Cannot update proposal that has received votes');
      }
      
      // Update the proposal
      proposals[proposalIndex] = {
        ...proposal,
        title: proposalData.title,
        description: proposalData.description,
        fundingAmount: proposalData.fundingAmount,
        category: proposalData.category,
        // Store additional fields in a custom way since BlockchainProposal interface is limited
        // We'll extend the object with extra properties
        ...(proposalData.expectedImpact && { expectedImpact: proposalData.expectedImpact }),
        ...(proposalData.location && { location: proposalData.location }),
      };
      
      // Update localStorage
      localStorage.setItem('climate_dao_proposals', JSON.stringify(proposals));

      // Notify others that proposals changed
      this.dispatchProposalEvent('climate_dao_proposals_updated');
      
      console.log(`Proposal ${proposalData.id} updated successfully`);
      return true;
      
    } catch (error) {
      console.error('Error updating proposal:', error);
      throw error;
    }
  }

  /**
   * DEVELOPMENT ONLY: Clear all proposal data from localStorage
   */
  clearAllProposals(): void {
    try {
      localStorage.removeItem('climate_dao_proposals');
      
      // Also clear individual proposal keys
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('proposal_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🗑️ All proposal data cleared from localStorage');
    } catch (error) {
      console.error('Error clearing proposals:', error);
    }
  }

  /**
   * DEVELOPMENT ONLY: Clear all voting data from localStorage
   */
  clearAllVotes(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('vote_') || key.startsWith('user_votes_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🗑️ All voting data cleared from localStorage');
    } catch (error) {
      console.error('Error clearing votes:', error);
    }
  }

  /**
   * DEVELOPMENT ONLY: Clear ALL app data from localStorage
   */
  clearAllData(): void {
    try {
      // First, clear all localStorage completely
      localStorage.clear();
      
      // Then specifically target our keys in case some remain
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('climate_dao_') || 
            key.startsWith('proposal_') || 
            key.startsWith('vote_') || 
            key.startsWith('user_votes_') ||
            key.startsWith('favorites_') ||
            key.startsWith('categories_') ||
            key.startsWith('search_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🗑️ ALL localStorage data cleared completely');
      console.log('🔄 Refresh the page to see clean state');
    } catch (error) {
      console.error('Error clearing app data:', error);
    }
  }

  /**
   * DEVELOPMENT ONLY: Nuclear option - clear everything and prevent auto-restore
   */
  nukeAllData(): void {
    try {
      // Clear localStorage completely
      localStorage.clear();
      
      // Set a flag to prevent auto-restore
      localStorage.setItem('DEVELOPMENT_CLEARED', 'true');
      
      console.log('💥 NUCLEAR CLEAR: All data destroyed');
      console.log('🚫 Auto-restore disabled');
      console.log('🔄 REFRESH THE PAGE NOW to see clean state');
    } catch (error) {
      console.error('Error in nuclear clear:', error);
    }
  }
}

// Singleton instance
export const climateDAOQuery = new ClimateDAOQueryService();

// DEVELOPMENT ONLY: Expose clearing functions globally in browser
if (typeof window !== 'undefined') {
  (window as any).devTools = {
    clearProposals: () => climateDAOQuery.clearAllProposals(),
    clearVotes: () => climateDAOQuery.clearAllVotes(),
    clearAllData: () => climateDAOQuery.clearAllData(),
    nukeAllData: () => climateDAOQuery.nukeAllData(),
    getProposals: () => climateDAOQuery.getStoredProposals(),
    getStats: () => climateDAOQuery.getStats('dummy-address')
  };
  
  console.log('🛠️ DevTools available: window.devTools');
  console.log('  - clearProposals(): Clear all proposals');
  console.log('  - clearVotes(): Clear all votes');
  console.log('  - clearAllData(): Clear everything');
  console.log('  - nukeAllData(): NUCLEAR CLEAR (prevents auto-restore)');
  console.log('  - getProposals(): View all proposals');
  console.log('  - getStats(): View statistics');
}