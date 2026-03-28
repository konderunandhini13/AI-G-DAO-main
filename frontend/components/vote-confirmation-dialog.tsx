'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VoteIcon, CheckCircleIcon, XCircleIcon, CoinsIcon, ClockIcon, AlertTriangleIcon } from 'lucide-react';
import { useClimateDAO } from '@/hooks/use-climate-dao';
import { useNotifications } from '@/hooks/use-notifications';
import { ProposalVotes, VotingState } from '@/lib/blockchain-queries';

interface VoteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proposal: {
    id: number;
    title: string;
    description: string;
    aiScore?: number;
    voteYes: number;
    voteNo: number;
    fundingAmount: number;
    endTime: number;
    status: string;
  };
  voteType: 'for' | 'against';
  isLoading: boolean;
}

export function VoteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  proposal,
  voteType,
  isLoading
}: VoteConfirmationDialogProps) {
  const { getProposalVotes, getUserVotingState, voteOnProposal } = useClimateDAO();
  const { notifyTransactionSuccess, notifyTransactionFailure } = useNotifications();
  const [realTimeVotes, setRealTimeVotes] = useState<ProposalVotes | null>(null);
  const [votingState, setVotingState] = useState<VotingState>({ hasVoted: false });
  const [loadingVoteData, setLoadingVoteData] = useState(true);

  useEffect(() => {
    const fetchVotingData = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingVoteData(true);
        const [votes, userState] = await Promise.all([
          getProposalVotes(proposal.id),
          getUserVotingState(proposal.id)
        ]);
        
        if (votes) setRealTimeVotes(votes);
        setVotingState(userState);
      } catch (error) {
        console.error('Error fetching voting data:', error);
      } finally {
        setLoadingVoteData(false);
      }
    };

    fetchVotingData();
  }, [isOpen, proposal.id, getProposalVotes, getUserVotingState]);

  // Use real-time data if available, otherwise fall back to proposal data
  const currentVotes = realTimeVotes || {
    yesVotes: proposal.voteYes,
    noVotes: proposal.voteNo,
    totalVotes: proposal.voteYes + proposal.voteNo,
    yesPercentage: proposal.voteYes + proposal.voteNo > 0 ? (proposal.voteYes / (proposal.voteYes + proposal.voteNo)) * 100 : 0,
    isVotingActive: proposal.status === 'active' && proposal.endTime > Date.now()
  };
  
  // Calculate current and projected results
  const currentYesPercentage = currentVotes.yesPercentage || 0;
  const projectedYes = voteType === 'for' ? currentVotes.yesVotes + 1 : currentVotes.yesVotes;
  const projectedNo = voteType === 'against' ? currentVotes.noVotes + 1 : currentVotes.noVotes;
  const projectedTotal = projectedYes + projectedNo;
  const projectedYesPercentage = projectedTotal > 0 ? (projectedYes / projectedTotal) * 100 : 0;

  // Check if voting is still valid
  const isVotingClosed = !currentVotes.isVotingActive;
  const hasUserVoted = votingState.hasVoted;
  const canVote = !isVotingClosed && !hasUserVoted;
  
  const votingCost = 0.01; // Reduced from 0.001 ALGO

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            {voteType === 'for' ? (
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                <XCircleIcon className="w-6 h-6 text-red-400" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">
                Confirm Your Vote: <span className={voteType === 'for' ? 'text-green-400' : 'text-red-400'}>
                  {voteType === 'for' ? 'YES' : 'NO'}
                </span>
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Review the proposal details before casting your vote
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Proposal Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-lg">{proposal.title}</h3>
            <p className="text-slate-300 text-sm line-clamp-3">{proposal.description}</p>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CoinsIcon className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">Funding: ${proposal.fundingAmount.toLocaleString()}</span>
              </div>
              {proposal.aiScore && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                  AI Score: {proposal.aiScore}/10
                </Badge>
              )}
            </div>
          </div>

          {/* Current vs Projected Results */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="font-medium text-sm text-slate-300 mb-2">Current Results</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Yes: {proposal.voteYes}</span>
                  <span className="text-red-400">No: {proposal.voteNo}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {currentYesPercentage.toFixed(1)}% approval
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4 border border-blue-500/30">
              <h4 className="font-medium text-sm text-blue-400 mb-2">After Your Vote</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Yes: {projectedYes}</span>
                  <span className="text-red-400">No: {projectedNo}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {projectedYesPercentage.toFixed(1)}% approval
                  <span className={`ml-2 ${projectedYesPercentage > currentYesPercentage ? 'text-green-400' : 
                                    projectedYesPercentage < currentYesPercentage ? 'text-red-400' : 'text-slate-400'}`}>
                    ({projectedYesPercentage > currentYesPercentage ? '+' : ''}
                    {(projectedYesPercentage - currentYesPercentage).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Cost */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <VoteIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Transaction Details</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>• Voting cost: {votingCost} ALGO (reduced fees)</div>
              <div>• Network fee: ~0.001 ALGO</div>
              <div>• Total cost: ~{(votingCost + 0.001).toFixed(3)} ALGO (~$0.02)</div>
              <div className="text-blue-400 mt-2">• Vote recorded permanently on Algorand blockchain</div>
              {realTimeVotes && (
                <div className="text-green-400">• Real-time vote counts displayed</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || !canVote}
            className={`${voteType === 'for' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'} text-white disabled:bg-slate-600 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Submitting Vote...
              </div>
            ) : !canVote ? (
              hasUserVoted ? 'Already Voted' : 'Voting Closed'
            ) : (
              <>Confirm {voteType === 'for' ? 'YES' : 'NO'} Vote</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}