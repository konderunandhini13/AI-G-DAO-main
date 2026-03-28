'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileTextIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { useWalletContext } from '@/hooks/use-wallet';
import { useClimateDAO } from '@/hooks/use-climate-dao';
import { BlockchainProposal } from '@/lib/blockchain-queries';
import Link from 'next/link';

export function UserProposalsTracker() {
  const { address, isConnected } = useWalletContext();
  const { getProposals } = useClimateDAO();
  const [userProposals, setUserProposals] = useState<BlockchainProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProposals = async () => {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch proposals created by the current user
        const proposals = await getProposals({ creator: address });
        setUserProposals(proposals);
      } catch (error) {
        console.error('Failed to fetch user proposals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProposals();

    const handleCommunityProposalUpdate = () => {
      fetchUserProposals();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'climate_dao_proposals') {
        fetchUserProposals();
      }
    };

    window.addEventListener('climate_dao_proposals_updated', handleCommunityProposalUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('climate_dao_proposals_updated', handleCommunityProposalUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isConnected, address, getProposals]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <ClockIcon className="w-4 h-4 text-yellow-400" />;
      case 'passed':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4 text-red-400" />;
      case 'expired':
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
      default:
        return <FileTextIcon className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'passed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'expired':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const formatTimeLeft = (endTime: number) => {
    const now = Date.now();
    const diff = endTime - now;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));

    if (diff <= 0) return 'Expired';
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Soon';
  };

  if (!isConnected) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-3">
            <FileTextIcon className="w-6 h-6 text-blue-400" />
            My Proposals
          </CardTitle>
          <CardDescription className="text-white/60">
            Connect your wallet to track your submitted proposals
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileTextIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Please connect your wallet to view your proposals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white text-xl flex items-center gap-3">
          <FileTextIcon className="w-6 h-6 text-blue-400" />
          My Proposals
          {userProposals.length > 0 && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              {userProposals.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-white/60">
          Track the status of your submitted climate project proposals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Loading your proposals...</p>
          </div>
        ) : userProposals.length > 0 ? (
          <div className="space-y-4">
            {userProposals.map((proposal) => {
              const totalVotes = proposal.voteYes + proposal.voteNo;
              const yesPercentage = totalVotes > 0 ? Math.round((proposal.voteYes / totalVotes) * 100) : 0;
              
              return (
                <Link key={proposal.id} href={`/proposal/${proposal.id}`} className="block">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                          {getStatusIcon(proposal.status)}
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm">{proposal.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(proposal.status)}>
                              {proposal.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-white/60">
                          Created {formatTimeAgo(proposal.creationTime)}
                        </div>
                        {proposal.status === 'active' && (
                          <div className="text-yellow-400 text-xs">
                            {formatTimeLeft(proposal.endTime)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div className="text-white/60">
                        Funding: ${proposal.fundingAmount.toLocaleString()}
                      </div>
                      <div className="text-white/60">
                        Votes: {yesPercentage}% yes ({totalVotes} total)
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-xs text-white/40">
                        Proposal #{proposal.id} • {proposal.category}
                      </span>
                      {/* Buttons removed for clean interface */}
                    </div>
                  </div>
                </Link>
              );
            })}
            
            {userProposals.length >= 3 && (
              <div className="text-center pt-4">
                <Button size="sm" className="bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20">
                  View All My Proposals
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileTextIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-2">No proposals submitted yet</p>
            <p className="text-white/40 text-sm mb-6">Start making a difference by submitting your first climate project proposal</p>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 rounded-xl px-6 py-2 text-sm">
              Submit Your First Proposal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}