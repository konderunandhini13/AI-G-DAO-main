'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWalletContext } from '@/hooks/use-wallet';
import { useClimateDAO } from '@/hooks/use-climate-dao';
import { 
  ExternalLinkIcon, 
  VoteIcon, 
  FileTextIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'vote' | 'proposal_submission' | 'proposal_outcome';
  proposalId: number;
  proposalTitle: string;
  txId: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  cost: number;
  details: {
    vote?: 'for' | 'against';
    outcome?: 'passed' | 'rejected' | 'expired';
    fundingAmount?: number;
  };
}

export function TransactionHistory() {
  const { address, isConnected } = useWalletContext();
  const { getUserVotingHistory } = useClimateDAO();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'votes' | 'proposals'>('all');

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch voting history
        const votingHistory = await getUserVotingHistory();
        
        // Convert voting records to transactions
        const voteTransactions: Transaction[] = votingHistory.map(vote => ({
          id: `vote-${vote.txId}`,
          type: 'vote' as const,
          proposalId: vote.proposalId,
          proposalTitle: vote.proposalTitle,
          txId: vote.txId,
          timestamp: vote.timestamp,
          status: 'confirmed' as const,
          cost: 0.01, // Standard voting cost
          details: {
            vote: vote.vote
          }
        }));

        // TODO: Add proposal submission history
        // TODO: Add proposal outcome notifications
        
        setTransactions(voteTransactions);
      } catch (error) {
        console.error('Failed to fetch transaction history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionHistory();
  }, [isConnected, address, getUserVotingHistory]);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'votes') return tx.type === 'vote';
    if (filter === 'proposals') return tx.type === 'proposal_submission' || tx.type === 'proposal_outcome';
    return true;
  });

  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'vote':
        return transaction.details.vote === 'for' 
          ? <CheckCircleIcon className="w-5 h-5 text-green-400" />
          : <XCircleIcon className="w-5 h-5 text-red-400" />;
      case 'proposal_submission':
        return <FileTextIcon className="w-5 h-5 text-blue-400" />;
      case 'proposal_outcome':
        return transaction.details.outcome === 'passed'
          ? <TrendingUpIcon className="w-5 h-5 text-green-400" />
          : <TrendingDownIcon className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Failed</Badge>;
    }
  };

  const getTransactionDescription = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'vote':
        return `Voted ${transaction.details.vote?.toUpperCase()} on proposal`;
      case 'proposal_submission':
        return 'Submitted new proposal';
      case 'proposal_outcome':
        return `Proposal ${transaction.details.outcome}`;
      default:
        return 'Unknown transaction';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - (timestamp * 1000); // Convert Unix timestamp to milliseconds
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than an hour ago';
    }
  };

  if (!isConnected) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="text-center py-8">
          <VoteIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">Connect your wallet to view transaction history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Transaction History
        </CardTitle>
        
        {/* Filter buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent'
            }
          >
            All
          </Button>
          <Button
            variant={filter === 'votes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('votes')}
            className={filter === 'votes' 
              ? 'bg-blue-500 text-white' 
              : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent'
            }
          >
            Votes
          </Button>
          <Button
            variant={filter === 'proposals' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('proposals')}
            className={filter === 'proposals' 
              ? 'bg-blue-500 text-white' 
              : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent'
            }
          >
            Proposals
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Loading transaction history...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      {getTransactionIcon(transaction)}
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">{transaction.proposalTitle}</h4>
                      <p className="text-white/60 text-xs mt-1">{getTransactionDescription(transaction)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(transaction.status)}
                        {transaction.type === 'vote' && transaction.details.vote && (
                          <Badge className={
                            transaction.details.vote === 'for' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                              : 'bg-red-500/20 text-red-400 border-red-500/50'
                          }>
                            {transaction.details.vote.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-white/60">{formatTimeAgo(transaction.timestamp)}</div>
                    <div className="text-white/40 text-xs">Cost: {transaction.cost.toFixed(3)} ALGO</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs text-white/40">Proposal #{transaction.proposalId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => window.open(`https://lora.algokit.io/testnet/transaction/${transaction.txId}`, '_blank')}
                  >
                    <ExternalLinkIcon className="w-3 h-3 mr-1" />
                    View TX
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredTransactions.length >= 5 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                  Load More Transactions
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <VoteIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-2">No transactions found</p>
            <p className="text-white/40 text-sm">
              {filter === 'all' && 'Your transaction history will appear here'}
              {filter === 'votes' && 'Your voting history will appear here after you vote on proposals'}
              {filter === 'proposals' && 'Your proposal submissions will appear here'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}