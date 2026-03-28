'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  VoteIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
  LeafIcon, WalletIcon, ArrowLeftIcon, CoinsIcon, UsersIcon
} from 'lucide-react';
import { useWalletContext } from '@/hooks/use-wallet';
import { useClimateDAO } from '@/hooks/use-climate-dao';
import { climateDAOQuery } from '@/lib/blockchain-queries';
import Link from 'next/link';
import { WalletGuard } from '@/components/wallet-guard';

interface Proposal {
  id: number;
  title: string;
  description: string;
  category: string;
  aiScore?: number;
  voteYes: number;
  voteNo: number;
  status: 'active' | 'passed' | 'rejected' | 'expired';
  fundingAmount: number;
  endTime: number;
  creator: string;
}

// Voting thresholds
const MIN_VOTES_TO_DECIDE = 3;
const PASS_THRESHOLD = 50; // >50% yes = passed

function evaluateProposalStatus(proposal: Proposal): 'active' | 'passed' | 'rejected' | 'expired' {
  const totalVotes = proposal.voteYes + proposal.voteNo;
  const yesPercent = totalVotes > 0 ? (proposal.voteYes / totalVotes) * 100 : 0;
  const isExpired = proposal.endTime < Date.now();

  if (totalVotes >= MIN_VOTES_TO_DECIDE) {
    if (yesPercent > PASS_THRESHOLD) return 'passed';
    if (yesPercent <= PASS_THRESHOLD) return 'rejected';
  }
  if (isExpired) return 'expired';
  return 'active';
}

const CATEGORY_COLORS: Record<string, string> = {
  'renewable-energy':      'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'carbon-capture':        'bg-green-500/20 text-green-400 border-green-500/50',
  'reforestation':         'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  'ocean-cleanup':         'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'waste-management':      'bg-orange-500/20 text-orange-400 border-orange-500/50',
  'sustainable-agriculture':'bg-lime-500/20 text-lime-400 border-lime-500/50',
  'water-conservation':    'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  'transportation':        'bg-purple-500/20 text-purple-400 border-purple-500/50',
};

type FilterTab = 'all' | 'active' | 'passed' | 'rejected' | 'expired';

export default function VotePage() {
  const { isConnected, address, balance } = useWalletContext();
  const { getProposals, voteOnProposal } = useClimateDAO();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotes, setUserVotes] = useState<Record<number, 'for' | 'against'>>({});
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [fundingPopup, setFundingPopup] = useState<{ status: 'passed' | 'rejected'; amount: number; title: string } | null>(null);

  const loadProposals = useCallback(async () => {
    try {
      const all = await getProposals();

      // Auto-evaluate and persist updated statuses
      const updated = all.map(p => {
        const newStatus = evaluateProposalStatus(p as Proposal);
        return newStatus !== p.status ? { ...p, status: newStatus } : p;
      });

      // Persist status changes to DB and localStorage
      const statusChanged = updated.filter((u: any, i: number) => u.status !== (all as any)[i]?.status);
      await Promise.all(statusChanged.map((p: any) =>
        fetch('/api/proposals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, status: p.status }),
        })
      ));
      const stored = JSON.parse(localStorage.getItem('climate_dao_proposals') || '[]');
      const merged = stored.map((s: any) => {
        const found = updated.find((u: any) => u.id === s.id);
        return found ? { ...s, status: found.status } : s;
      });
      localStorage.setItem('climate_dao_proposals', JSON.stringify(merged));

      setProposals(updated as Proposal[]);
    } catch (err) {
      console.error('Failed to load proposals:', err);
    } finally {
      setLoading(false);
    }
  }, [getProposals]);

  const loadUserVotes = useCallback(async () => {
    if (!address) return;
    try {
      const history = await climateDAOQuery.getUserVotingHistory(address);
      const map: Record<number, 'for' | 'against'> = {};
      history.forEach(r => { map[r.proposalId] = r.vote; });
      setUserVotes(map);
    } catch {}
  }, [address]);

  useEffect(() => {
    loadProposals();
    loadUserVotes();

    const handleCommunityProposalUpdate = () => {
      loadProposals();
      loadUserVotes();
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'climate_dao_proposals') {
        loadProposals();
        loadUserVotes();
      }
    }

    window.addEventListener('climate_dao_proposals_updated', handleCommunityProposalUpdate)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('climate_dao_proposals_updated', handleCommunityProposalUpdate)
      window.removeEventListener('storage', handleStorage)
    }
  }, [isConnected, address]);

  const handleVote = async (proposal: Proposal, vote: 'for' | 'against') => {
    if (!address) return;
    setVotingId(proposal.id);
    setErrorMsg(null);
    setSuccessId(null);

    try {
      const result = await voteOnProposal(proposal.id, vote);

      if ((result as any).success === false) {
        setErrorMsg((result as any).message || 'Vote failed');
        return;
      }

      setSuccessId(proposal.id);
      setUserVotes(prev => ({ ...prev, [proposal.id]: vote }));

      // Refresh proposals to get updated vote counts + status
      const prevStatus = proposal.status;
      await loadProposals();

      // Check if this vote caused a status change
      setProposals(current => {
        const updated = current.find(p => p.id === proposal.id);
        if (updated && prevStatus === 'active' && (updated.status === 'passed' || updated.status === 'rejected')) {
          setFundingPopup({ status: updated.status, amount: updated.fundingAmount, title: updated.title });
        }
        return current;
      });

      setTimeout(() => setSuccessId(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Vote failed');
    } finally {
      setVotingId(null);
    }
  };

  const filtered = proposals.filter(p => filter === 'all' || p.status === filter);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: proposals.length },
    { key: 'active',   label: 'Active',   count: proposals.filter(p => p.status === 'active').length },
    { key: 'passed',   label: 'Passed',   count: proposals.filter(p => p.status === 'passed').length },
    { key: 'rejected', label: 'Rejected', count: proposals.filter(p => p.status === 'rejected').length },
    { key: 'expired',  label: 'Expired',  count: proposals.filter(p => p.status === 'expired').length },
  ];

  return (
    <>
      {/* Funding popup */}
      {fundingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setFundingPopup(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative z-10 rounded-2xl border p-8 max-w-sm w-full text-center shadow-2xl ${
              fundingPopup.status === 'passed'
                ? 'bg-gradient-to-br from-green-900/90 to-slate-900/90 border-green-500/40'
                : 'bg-gradient-to-br from-red-900/90 to-slate-900/90 border-red-500/40'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">{fundingPopup.status === 'passed' ? '🎉' : '❌'}</div>
            <h2 className={`text-2xl font-bold mb-2 ${
              fundingPopup.status === 'passed' ? 'text-green-400' : 'text-red-400'
            }`}>
              {fundingPopup.status === 'passed' ? 'Funding Released!' : 'Funding Failed'}
            </h2>
            <p className="text-white/70 text-sm mb-1 font-medium">{fundingPopup.title}</p>
            <p className={`text-lg font-semibold mb-5 ${
              fundingPopup.status === 'passed' ? 'text-green-300' : 'text-red-300'
            }`}>
              {fundingPopup.status === 'passed'
                ? `$${fundingPopup.amount.toLocaleString()} approved & released`
                : `$${fundingPopup.amount.toLocaleString()} funding rejected`}
            </p>
            <p className="text-white/40 text-xs mb-5">
              {fundingPopup.status === 'passed'
                ? 'The community has approved this proposal. Funds are now released for the project.'
                : 'The community has voted against this proposal. Funding will not be released.'}
            </p>
            <button
              onClick={() => setFundingPopup(null)}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                fundingPopup.status === 'passed'
                  ? 'bg-green-500 hover:bg-green-400 text-white'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              }`}
            >
              Got it
            </button>
          </div>
        </div>
      )}
      <div className="relative flex flex-col min-h-[100dvh] text-white overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-white/20" />
            <VoteIcon className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-lg">Community Proposals</span>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <WalletIcon className="w-4 h-4 text-green-400" />
              <span>{balance.toFixed(2)} ALGO</span>
              <span className="hidden sm:inline text-white/40">·</span>
              <span className="hidden sm:inline font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          )}
        </header>

        <main className="relative z-10 flex-1 px-4 sm:px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: VoteIcon,        color: 'text-blue-400',   val: proposals.filter(p => p.status === 'active').length,   label: 'Active' },
                { icon: CheckCircleIcon, color: 'text-green-400',  val: proposals.filter(p => p.status === 'passed').length,   label: 'Passed' },
                { icon: XCircleIcon,     color: 'text-red-400',    val: proposals.filter(p => p.status === 'rejected').length, label: 'Rejected' },
                { icon: CoinsIcon,       color: 'text-purple-400', val: `$${proposals.filter(p => p.status === 'passed').reduce((s, p) => s + p.fundingAmount, 0).toLocaleString()}`, label: 'Funds Released' },
              ].map(({ icon: Icon, color, val, label }) => (
                <Card key={label} className="bg-white/5 border-white/10 rounded-2xl">
                  <CardContent className="p-4 text-center">
                    <Icon className={`w-6 h-6 ${color} mx-auto mb-1`} />
                    <div className="text-xl font-bold text-white">{val}</div>
                    <div className="text-xs text-white/50">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Info banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3 flex items-start gap-3">
              <UsersIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200">
                All community proposals are listed below. Any connected member can vote.
                A proposal <strong>passes</strong> when it receives {MIN_VOTES_TO_DECIDE}+ votes with &gt;{PASS_THRESHOLD}% in favour — funding is then released automatically.
              </p>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 flex justify-between items-center">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filter === t.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs opacity-70">({t.count})</span>
                </button>
              ))}
            </div>

            {/* Proposals */}
            {loading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/50 text-sm">Loading proposals...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <VoteIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No {filter !== 'all' ? filter : ''} proposals yet.</p>
                {filter === 'all' && (
                  <Link href="/submit-proposal" className="mt-4 inline-block">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-3">Submit a Proposal</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(proposal => {
                  const totalVotes = proposal.voteYes + proposal.voteNo;
                  const yesPercent = totalVotes > 0 ? (proposal.voteYes / totalVotes) * 100 : 0;
                  const timeLeft = Math.ceil((proposal.endTime - Date.now()) / (24 * 60 * 60 * 1000));
                  const isVoting = votingId === proposal.id;
                  const myVote = userVotes[proposal.id];
                  const isMyProposal = proposal.creator === address;
                  const canVote = proposal.status === 'active' && !myVote && !isMyProposal;
                  const justVoted = successId === proposal.id;

                  return (
                    <Card key={proposal.id} className={`backdrop-blur-xl border rounded-2xl transition-all duration-300 ${
                      proposal.status === 'passed'
                        ? 'bg-green-500/5 border-green-500/30'
                        : proposal.status === 'rejected'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/8'
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 flex-1 min-w-0">
                            <CardTitle className="text-white text-base sm:text-lg leading-snug">
                              {proposal.title}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={CATEGORY_COLORS[proposal.category] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'}>
                                {proposal.category.replace(/-/g, ' ')}
                              </Badge>
                              <Badge className={
                                proposal.status === 'active'   ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                proposal.status === 'passed'   ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                'bg-gray-500/20 text-gray-400 border-gray-500/30'
                              }>
                                {proposal.status.toUpperCase()}
                              </Badge>
                              {myVote && (
                                <Badge className={myVote === 'for'
                                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                                }>
                                  ✓ You voted {myVote === 'for' ? 'YES' : 'NO'}
                                </Badge>
                              )}
                              {isMyProposal && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                  Your Proposal
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <div className="text-white font-semibold text-sm">
                              ${proposal.fundingAmount.toLocaleString()}
                            </div>
                            {proposal.status === 'active' && (
                              <div className={`text-xs flex items-center gap-1 justify-end ${timeLeft > 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                                <ClockIcon className="w-3 h-3" />
                                {timeLeft > 0 ? `${timeLeft}d left` : 'Ending soon'}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <p className="text-white/70 text-sm leading-relaxed">
                          {proposal.description}
                        </p>

                        {/* Vote bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-white/50">
                            <span>✓ Yes — {proposal.voteYes} ({yesPercent.toFixed(0)}%)</span>
                            <span>✗ No — {proposal.voteNo} ({(100 - yesPercent).toFixed(0)}%)</span>
                          </div>
                          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                                proposal.status === 'passed' ? 'bg-green-500' :
                                proposal.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${yesPercent}%` }}
                            />
                          </div>
                          <div className="text-center text-xs text-white/40">
                            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · needs {MIN_VOTES_TO_DECIDE} to decide
                          </div>
                        </div>

                        {/* Funds released banner */}
                        {proposal.status === 'passed' && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                            <CoinsIcon className="w-5 h-5 text-green-400 shrink-0" />
                            <div>
                              <p className="text-green-400 font-semibold text-sm">Funding Released!</p>
                              <p className="text-green-300/70 text-xs">
                                ${proposal.fundingAmount.toLocaleString()} has been approved and released for this project.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Vote success */}
                        {justVoted && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 text-sm">Your vote has been recorded!</span>
                          </div>
                        )}

                        {/* Vote buttons */}
                        {canVote && (
                          <div className="flex gap-3 pt-1">
                            <Button
                              onClick={() => handleVote(proposal, 'for')}
                              disabled={isVoting}
                              className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl h-10"
                            >
                              {isVoting ? (
                                <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                              ) : '✓ Vote Yes'}
                            </Button>
                            <Button
                              onClick={() => handleVote(proposal, 'against')}
                              disabled={isVoting}
                              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl h-10"
                            >
                              {isVoting ? (
                                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                              ) : '✗ Vote No'}
                            </Button>
                          </div>
                        )}

                        {/* Can't vote reasons */}
                        {!canVote && proposal.status === 'active' && !myVote && isMyProposal && (
                          <p className="text-xs text-white/30 text-center pt-1">You cannot vote on your own proposal</p>
                        )}

                        <div className="text-xs text-white/25 pt-1 font-mono truncate">
                          Submitted by: {proposal.creator}
                        </div>

                        {/* View full details + AI analysis */}
                        <Link href={`/proposal/${proposal.id}`}>
                          <Button className="w-full mt-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-xl h-9 text-sm">
                            🔍 View Full Details & AI Analysis
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <footer className="relative z-10 text-center py-4 text-white/30 text-xs border-t border-white/10">
          © {new Date().getFullYear()} EcoNexus · Decentralized climate governance
        </footer>
      </div>
    </>
  );
}
