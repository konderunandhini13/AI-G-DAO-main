"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useClimateDAO } from "@/hooks/use-climate-dao"
import { useAIReview } from "@/hooks/use-ai-review"
import { AIReviewDisplay } from "@/components/ai-review-display"
import Link from "next/link"
import { WalletGuard } from "@/components/wallet-guard"
import { useWalletContext } from "@/hooks/use-wallet"
import algosdk from 'algosdk'
import {
  ArrowLeftIcon, SparklesIcon, CoinsIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, UsersIcon, UserIcon, ShieldIcon, SendIcon
} from "lucide-react"
import { MilestoneFunding } from "@/components/milestone-funding"

const TREASURY = '5TVL4FSSJ7OL245FRMZALZQICP3CTRT262S7YUFTLK3ZBBBFVKELOEV5XM'
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

const CATEGORY_COLORS: Record<string, string> = {
  'renewable-energy':       'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'carbon-capture':         'bg-green-500/20 text-green-400 border-green-500/50',
  'reforestation':          'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  'ocean-cleanup':          'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'waste-management':       'bg-orange-500/20 text-orange-400 border-orange-500/50',
  'sustainable-agriculture':'bg-lime-500/20 text-lime-400 border-lime-500/50',
  'water-conservation':     'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  'transportation':         'bg-purple-500/20 text-purple-400 border-purple-500/50',
}

export default function ProposalDetailPage() {
  const params = useParams()
  const proposalId = params?.id ? Number(params.id) : null
  const { getProposal } = useClimateDAO()
  const { address, signTransaction } = useWalletContext()
  const { isAnalyzing, reviewResult, analyzeProposalData } = useAIReview()
  const [proposal, setProposal] = useState<any>(null)
  const [aiReview, setAiReview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reputation, setReputation] = useState<any>(null)
  const [milestoneVoting, setMilestoneVoting] = useState<Record<number, 'for' | 'against'>>({})  
  const [milestoneVotingId, setMilestoneVotingId] = useState<number | null>(null)
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null)
  const [releasedMilestones, setReleasedMilestones] = useState<number[]>([])
  const [releasingIdx, setReleasingIdx] = useState<number | null>(null)

  // Load persisted milestone votes for this wallet+proposal from localStorage
  useEffect(() => {
    if (!address || !proposalId) return
    try {
      const stored = localStorage.getItem(`milestone_votes_${proposalId}_${address}`)
      if (stored) setMilestoneVoting(JSON.parse(stored))
    } catch {}
  }, [address, proposalId])
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [draftMilestones, setDraftMilestones] = useState([
    { title: '', description: '', percent: 0, status: 'pending', voteYes: 0, voteNo: 0 },
    { title: '', description: '', percent: 0, status: 'pending', voteYes: 0, voteNo: 0 },
    { title: '', description: '', percent: 0, status: 'pending', voteYes: 0, voteNo: 0 },
  ])
  const [savingMilestones, setSavingMilestones] = useState(false)

  useEffect(() => {
    if (reviewResult) setAiReview(reviewResult)
  }, [reviewResult])

  useEffect(() => {
    if (!proposalId) return
    const load = async () => {
      setLoading(true)
      try {
        let p = await getProposal(proposalId)
        if (p?.aiReview) {
          setAiReview(p.aiReview)
        } else {
          try {
            const stored = localStorage.getItem(`proposal_ai_${proposalId}`)
            if (stored) setAiReview(JSON.parse(stored))
          } catch {}
        }
        // Fix any milestones whose votes already meet threshold but status wasn't updated
        if (p?.milestones && p.milestones.length > 0) {
          let needsPatch = false
          const fixed = p.milestones.map((m: any) => {
            const total = (m.voteYes || 0) + (m.voteNo || 0)
            if (m.status === 'pending' && total >= 1) {
              needsPatch = true
              return { ...m, status: (m.voteYes || 0) / total > 0.5 ? 'completed' : 'failed' }
            }
            return m
          })
          if (needsPatch) {
            await fetch('/api/proposals', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: p.id, milestones: fixed }),
            })
            p = { ...p, milestones: fixed }
          }
        }
        setProposal(p)
        // Auto-pass proposal if majority of members voted yes
        try {
          const mRes = await fetch('/api/members')
          if (mRes.ok) {
            const md = await mRes.json()
            const totalMembers = md.count || 1
            const majority = Math.floor(totalMembers / 2) + 1
            if (p && p.status === 'active' && p.voteYes >= majority && p.voteYes > p.voteNo) {
              await fetch('/api/proposals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'passed' }) })
              p = { ...p, status: 'passed' }
              setProposal(p)
            }
          }
        } catch {}
        // Load treasury balance + released milestones — poll every 10s
        try {
          const fetchTreasury = async () => {
            const t = await fetch(`/api/treasury?proposalId=${proposalId}`)
            if (t.ok) {
              const td = await t.json()
              setTreasuryBalance(td.balanceAlgo)
              setReleasedMilestones(td.released || [])
            }
          }
          await fetchTreasury()
          const treasuryInterval = setInterval(fetchTreasury, 10000)
          // Store interval id on window so cleanup works across re-renders
          ;(window as any).__treasuryInterval = treasuryInterval
        } catch {}
        // Load reputation for proposer
        if (p?.creator) {
          try {
            const r = await fetch(`/api/reputation?wallet=${encodeURIComponent(p.creator)}`)
            if (r.ok) setReputation(await r.json())
          } catch {}
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      if ((window as any).__treasuryInterval) {
        clearInterval((window as any).__treasuryInterval)
      }
    }
  }, [proposalId])

  const handleMilestoneVote = async (milestoneIdx: number, vote: 'for' | 'against') => {
    if (!proposal || !address) return
    setMilestoneVotingId(milestoneIdx)
    try {
      // Always fetch fresh data from DB before voting to avoid overwriting other wallets' votes
      const fresh = await getProposal(proposal.id)
      const freshMilestones = fresh?.milestones || proposal.milestones
      const updatedMilestones = freshMilestones.map((m: any, i: number) => {
        if (i !== milestoneIdx) return m
        const newVoteYes = vote === 'for' ? (m.voteYes || 0) + 1 : (m.voteYes || 0)
        const newVoteNo = vote === 'against' ? (m.voteNo || 0) + 1 : (m.voteNo || 0)
        const total = newVoteYes + newVoteNo
        const newStatus = total >= 1 ? (newVoteYes / total > 0.5 ? 'completed' : 'failed') : m.status
        return { ...m, voteYes: newVoteYes, voteNo: newVoteNo, status: newStatus }
      })
      await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposal.id, milestones: updatedMilestones }),
      })
      setProposal((prev: any) => ({ ...prev, milestones: updatedMilestones }))
      const updated = { ...milestoneVoting, [milestoneIdx]: vote }
      setMilestoneVoting(updated)
      localStorage.setItem(`milestone_votes_${proposal.id}_${address}`, JSON.stringify(updated))
    } finally {
      setMilestoneVotingId(null)
    }
  }

  const handleReleaseFunds = async (milestoneIdx: number, amountAlgo: number) => {
    if (!proposal || !address) return
    if (address !== TREASURY) {
      alert(`❌ Please connect the treasury wallet in Pera to release funds.\n\nTreasury: ${TREASURY.slice(0,8)}...${TREASURY.slice(-6)}`)
      return
    }
    setReleasingIdx(milestoneIdx)
    try {
      const params = await algodClient.getTransactionParams().do()
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: TREASURY,
        receiver: proposal.creator,
        amount: Math.round(amountAlgo * 1_000_000),
        suggestedParams: params,
        note: new Uint8Array(Buffer.from(`EcoNexus milestone ${milestoneIdx + 1} release`)),
      })
      const signed = await signTransaction(txn)
      const sendRes = await algodClient.sendRawTransaction(signed).do()
      const txId = sendRes.txid || sendRes.txId || sendRes
      await algosdk.waitForConfirmation(algodClient, txId, 10)
      await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.id, milestoneIdx, amountAlgo, txId }),
      })
      setReleasedMilestones(prev => [...prev, milestoneIdx])
      setTreasuryBalance(prev => prev !== null ? prev - amountAlgo : null)
      alert(`✅ ${amountAlgo} ALGO released to proposer! TX: ${txId}`)
    } catch (err: any) {
      alert(`❌ Release failed: ${err.message}`)
    } finally {
      setReleasingIdx(null)
    }
  }

  const handleSaveMilestones = async () => {
    if (!proposal) return
    const totalPercent = draftMilestones.reduce((s, m) => s + m.percent, 0)
    if (totalPercent !== 100) { alert('Percentages must add up to 100%'); return }
    if (draftMilestones.some(m => !m.description.trim())) { alert('Please describe all 3 milestone stages'); return }
    setSavingMilestones(true)
    try {
      const milestones = draftMilestones.map((m, i) => ({
        id: i + 1,
        title: m.description,
        description: m.description,
        fundingPercent: m.percent,
        status: i === 0 ? 'active' : 'locked',
        voteYes: 0,
        voteNo: 0,
      }))
      const res = await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposal.id, milestones }),
      })
      if (!res.ok) throw new Error('Failed to save milestones')
      // Re-fetch from DB to confirm saved correctly
      const verify = await fetch(`/api/proposals/${proposal.id}`)
      const verified = await verify.json()
      setProposal(verified)
      setShowMilestoneForm(false)
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    } finally {
      setSavingMilestones(false)
    }
  }

  if (!proposalId) return null

  const totalVotes = proposal ? proposal.voteYes + proposal.voteNo : 0
  const yesPercent = totalVotes > 0 ? (proposal.voteYes / totalVotes) * 100 : 0
  const timeLeft = proposal ? Math.ceil((proposal.endTime - Date.now()) / (24 * 60 * 60 * 1000)) : 0

  return (
    <WalletGuard requireBalance={0}>
      <div className="relative flex flex-col min-h-[100dvh] text-white overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
          <Link href="/vote" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">Back to Votes</span>
          </Link>
          <span className="font-bold text-base">Proposal Details</span>
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <SparklesIcon className="w-4 h-4" />
            <span className="hidden sm:inline">AI Analysis</span>
          </div>
        </header>

        <main className="relative z-10 flex-1 px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-5">

            {loading ? (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/50 text-sm">Loading proposal...</p>
              </div>
            ) : !proposal ? (
              <Card className="bg-white/5 border-white/10 rounded-2xl">
                <CardContent className="py-12 text-center text-white/50">Proposal not found.</CardContent>
              </Card>
            ) : (
              <>
                {/* Title + Badges */}
                <div className="space-y-3">
                  <h1 className="text-2xl font-bold text-white leading-snug">{proposal.title}</h1>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={CATEGORY_COLORS[proposal.category] || 'bg-gray-500/20 text-gray-400'}>
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
                  </div>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: CoinsIcon,       color: 'text-purple-400', val: `$${proposal.fundingAmount.toLocaleString()}`, label: 'Funding' },
                    { icon: UsersIcon,       color: 'text-blue-400',   val: totalVotes,                                    label: 'Total Votes' },
                    { icon: CheckCircleIcon, color: 'text-green-400',  val: `${yesPercent.toFixed(0)}%`,                  label: 'Yes Votes' },
                    { icon: ClockIcon,       color: 'text-yellow-400', val: proposal.status === 'active' ? `${timeLeft}d` : '—', label: 'Time Left' },
                  ].map(({ icon: Icon, color, val, label }) => (
                    <Card key={label} className="bg-white/5 border-white/10 rounded-2xl">
                      <CardContent className="p-3 text-center">
                        <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                        <div className="text-lg font-bold text-white">{val}</div>
                        <div className="text-xs text-white/50">{label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Vote bar */}
                <Card className="bg-white/5 border-white/10 rounded-2xl">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm text-white/60">
                      <span>✓ Yes — {proposal.voteYes} votes ({yesPercent.toFixed(0)}%)</span>
                      <span>✗ No — {proposal.voteNo} votes ({(100 - yesPercent).toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          proposal.status === 'passed' ? 'bg-green-500' :
                          proposal.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${yesPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 text-center">
                      {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · needs 2 to decide
                    </p>
                  </CardContent>
                </Card>

                {/* Passed banner */}
                {proposal.status === 'passed' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <CoinsIcon className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                      <p className="text-green-400 font-semibold text-sm">Proposal Approved by Majority!</p>
                      <p className="text-green-300/70 text-xs">${proposal.fundingAmount.toLocaleString()} approved. Funding released in milestones.</p>
                    </div>
                  </div>
                )}

                {/* Reputation badge */}
                {reputation && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <ShieldIcon className={`w-5 h-5 shrink-0 ${
                      reputation.reputation_score >= 75 ? 'text-green-400' :
                      reputation.reputation_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-white/80 text-sm font-medium">Proposer Reputation</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`text-xs font-bold ${
                          reputation.reputation_score >= 75 ? 'text-green-400' :
                          reputation.reputation_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{reputation.reputation_score}/100</span>
                        <span className="text-white/40 text-xs">{reputation.milestones_completed} milestones completed</span>
                        <span className="text-white/40 text-xs">{reputation.proposals_submitted} proposals submitted</span>
                        <span className="text-white/40 text-xs">Max: {reputation.max_funding_algo} ALGO</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Treasury balance */}
                {proposal.status === 'passed' && treasuryBalance !== null && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <CoinsIcon className="w-5 h-5 text-purple-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-purple-300 font-semibold text-sm">DAO Treasury</p>
                      <p className="text-purple-200/70 text-xs font-mono">{TREASURY ? `${TREASURY.slice(0,8)}...${TREASURY.slice(-6)}` : 'DAO Treasury'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-300 font-bold text-sm">{treasuryBalance.toFixed(2)} ALGO</p>
                      <p className="text-purple-400/60 text-xs">available</p>
                    </div>
                  </div>
                )}

                {/* ── MILESTONE FUNDING (sequential unlock) ── */}
                {proposal.status === 'passed' && (
                  <>
                    {/* Proposer hasn't defined milestones yet */}
                    {(!proposal.milestones || proposal.milestones.length === 0) && address === proposal.creator && !showMilestoneForm && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-3">
                        <p className="text-yellow-300 text-sm font-medium">🎉 Your proposal was approved!</p>
                        <p className="text-white/60 text-xs">Define 3 milestones. Each one unlocks only after the previous is completed and funds released.</p>
                        <Button onClick={() => setShowMilestoneForm(true)} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded-xl text-sm">
                          📋 Define Milestones
                        </Button>
                      </div>
                    )}

                    {(!proposal.milestones || proposal.milestones.length === 0) && address !== proposal.creator && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <p className="text-white/50 text-sm text-center">⏳ Waiting for proposer to define funding milestones...</p>
                      </div>
                    )}

                    {/* Milestone definition form */}
                    {showMilestoneForm && (
                      <Card className="bg-white/5 border border-yellow-500/20 rounded-2xl">
                        <CardContent className="p-4 space-y-4">
                          <p className="text-white/70 text-xs">Split your ${proposal.fundingAmount.toLocaleString()} into 3 stages. Enter the % for each stage — must total 100%.</p>
                          {draftMilestones.map((m, i) => {
                            const amt = Math.round((proposal.fundingAmount * m.percent) / 100)
                            return (
                              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    i === 0 ? 'bg-blue-500/30 text-blue-300' : i === 1 ? 'bg-purple-500/30 text-purple-300' : 'bg-green-500/30 text-green-300'
                                  }`}>{i+1}</span>
                                  <span className="text-white/60 text-xs">Stage {i+1}{m.percent > 0 ? ` — ${m.percent}% ($${Math.round((proposal.fundingAmount * m.percent) / 100).toLocaleString()})` : ''}</span>
                                  <input type="number" min={1} max={98}
                                    value={m.percent === 0 ? '' : m.percent}
                                    placeholder="0"
                                    onChange={e => setDraftMilestones(prev => prev.map((x,j) => j===i ? {...x, percent: Number(e.target.value) || 0} : x))}
                                    className="ml-auto w-14 bg-white/10 border border-white/20 text-white text-xs rounded-lg px-2 py-1 text-center"
                                  />
                                  <span className="text-white/40 text-xs">%</span>
                                </div>
                                <textarea placeholder={['Describe what will be done in Stage 1 (e.g. Purchase equipment, obtain permits, site preparation...)','Describe what will be done in Stage 2 (e.g. Installation, construction, setup complete...)','Describe what will be done in Stage 3 (e.g. System operational, testing, final delivery...)'][i]}
                                  value={m.description}
                                  onChange={e => setDraftMilestones(prev => prev.map((x,j) => j===i ? {...x, title: e.target.value, description: e.target.value} : x))}
                                  rows={3}
                                  className="w-full bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-white/30"
                                />
                              </div>
                            )
                          })}
                          {/* Live total indicator */}
                          {draftMilestones.reduce((s, m) => s + (m.percent || 0), 0) === 100 && (
                            <div className="flex items-center justify-between text-xs px-2 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                              <span>Total allocation</span>
                              <span className="font-bold">100% ✓ Ready to submit</span>
                            </div>
                          )}
                          {draftMilestones.reduce((s, m) => s + (m.percent || 0), 0) > 100 && (
                            <div className="flex items-center justify-between text-xs px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                              <span>Total allocation</span>
                              <span className="font-bold">{draftMilestones.reduce((s, m) => s + (m.percent || 0), 0)}% — exceeds 100%</span>
                            </div>
                          )}
                          {draftMilestones.reduce((s, m) => s + (m.percent || 0), 0) < 100 && (
                            <div className="flex items-center justify-between text-xs px-2 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                              <span>Total allocation</span>
                              <span className="font-bold">{draftMilestones.reduce((s, m) => s + (m.percent || 0), 0)}% — {100 - draftMilestones.reduce((s, m) => s + (m.percent || 0), 0)}% remaining</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button variant="ghost" onClick={() => setShowMilestoneForm(false)} className="flex-1 text-white/50 hover:text-white border border-white/10 rounded-xl text-sm">Cancel</Button>
                            <Button onClick={handleSaveMilestones} disabled={savingMilestones} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm">
                              {savingMilestones ? 'Saving...' : '✓ Submit Milestones'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Sequential milestone funding — shown once milestones are defined */}
                    {proposal.milestones && proposal.milestones.length > 0 && (
                      <MilestoneFunding
                        proposalId={proposal.id}
                        proposalCreator={proposal.creator}
                        totalFunding={proposal.fundingAmount}
                        initialMilestones={proposal.milestones}
                      />
                    )}
                  </>
                )}

                {/* Description */}
                <Card className="bg-white/5 border-white/10 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base">Project Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{proposal.description}</p>
                  </CardContent>
                </Card>

                {/* Submitter */}
                <div className="flex items-center gap-2 text-white/40 text-xs px-1">
                  <UserIcon className="w-3 h-3" />
                  <span className="font-mono truncate">Submitted by: {proposal.creator}</span>
                </div>

                {/* AI Analysis */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-white font-semibold">AI Analysis</h2>
                  </div>

                  {aiReview ? (
                    <AIReviewDisplay review={aiReview} />
                  ) : (
                    <Card className="bg-white/5 border-white/10 rounded-2xl">
                      <CardContent className="py-8 text-center space-y-3">
                        <SparklesIcon className="w-10 h-10 text-white/20 mx-auto" />
                        <p className="text-white/50 text-sm">No AI analysis available for this proposal yet.</p>
                        <Button
                          onClick={() => analyzeProposalData({
                            title: proposal.title,
                            description: proposal.description,
                            category: proposal.category || 'general',
                            fundingAmount: String(proposal.fundingAmount || 0),
                            expectedImpact: proposal.expectedImpact || 'To be determined',
                            location: proposal.location || 'Global',
                          }, proposalId)}
                          disabled={isAnalyzing}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        >
                          {isAnalyzing ? 'Analyzing...' : '🤖 Run AI Analysis'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Back to vote */}
                <Link href="/vote">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl mt-2">
                    ← Back to Community Votes
                  </Button>
                </Link>
              </>
            )}
          </div>
        </main>
      </div>
    </WalletGuard>
  )
}
