'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoteIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ExternalLinkIcon, LoaderIcon } from 'lucide-react';
import { useWalletContext } from '@/hooks/use-wallet';
import { useClimateDAO } from '@/hooks/use-climate-dao';
import { VotingRecord } from '@/lib/blockchain-queries';

export function VotingHistory() {
  const { address, isConnected } = useWalletContext();
  const { getUserVotingHistory } = useClimateDAO();
  const [voteHistory, setVoteHistory] = useState<VotingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotingHistory = async () => {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch real voting history from blockchain
        const history = await getUserVotingHistory();
        setVoteHistory(history);
      } catch (error) {
        console.error('Failed to fetch voting history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVotingHistory();
  }, [isConnected, address, getUserVotingHistory]);

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (!isConnected) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-3">
            <VoteIcon className="w-6 h-6 text-blue-400" />
            Voting History
          </CardTitle>
          <CardDescription className="text-white/60">
            Connect your wallet to view your voting history
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <VoteIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Please connect your wallet to view voting history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white text-xl flex items-center gap-3">
          <VoteIcon className="w-6 h-6 text-blue-400" />
          My Voting History
        </CardTitle>
        <CardDescription className="text-white/60">
          Your recent votes on DAO proposals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Loading voting history...</p>
          </div>
        ) : voteHistory.length > 0 ? (
          <div className="space-y-4">
            {voteHistory.map((vote) => (
              <div key={vote.txId} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {vote.vote === 'for' ? (
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <XCircleIcon className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-medium text-sm">{vote.proposalTitle}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={
                          vote.vote === 'for' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }>
                          Voted {vote.vote.toUpperCase()}
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                          Confirmed
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-white/60">{formatTimeAgo(vote.timestamp * 1000)}</div>
                    <div className="text-white/40 text-xs">Cost: 0.01 ALGO</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs text-white/40">Proposal #{vote.proposalId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => window.open(`https://lora.algokit.io/testnet/transaction/${vote.txId}`, '_blank')}
                  >
                    <ExternalLinkIcon className="w-3 h-3 mr-1" />
                    View TX
                  </Button>
                </div>
              </div>
            ))}
            
            {voteHistory.length >= 3 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                  View All Votes
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <VoteIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-2">No votes cast yet</p>
            <p className="text-white/40 text-sm">Your voting history will appear here after you vote on proposals</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}