"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRightIcon, CoinsIcon } from "lucide-react"
import { useWalletContext } from "@/hooks/use-wallet"
import algosdk from "algosdk"

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_WALLET!
const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "")

interface MilestoneFundingProps {
  proposalId: number
  proposalCreator: string
  totalFunding: number
  initialMilestones?: any[]
}

export function MilestoneFunding({ proposalId, proposalCreator, totalFunding, initialMilestones }: MilestoneFundingProps) {
  const { address, signTransaction } = useWalletContext()
  const [milestones, setMilestones] = useState<any[]>(initialMilestones || [])
  const [memberCount, setMemberCount] = useState(0)
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null)
  const [releasedMilestones, setReleasedMilestones] = useState<number[]>([])
  const [votingIdx, setVotingIdx] = useState<number | null>(null)
  const [releasingIdx, setReleasingIdx] = useState<number | null>(null)
  const [releaseModal, setReleaseModal] = useState<{ idx: number; amount: number; txId: string; allDone: boolean } | null>(null)
  const [myVotes, setMyVotes] = useState<Record<number, "for" | "against">>({})
  const [proofInputs, setProofInputs] = useState<Record<number, string>>({})
  const [submittingProof, setSubmittingProof] = useState<number | null>(null)


  const isProposer = address === proposalCreator
  const voteThreshold = memberCount > 1 ? memberCount - 1 : 1 // all non-proposer members must vote

  useEffect(() => {
    if (initialMilestones?.length) setMilestones(initialMilestones)
  }, [initialMilestones])

  const fetchMyVotes = useCallback(async () => {
    if (!address || !proposalId) return
    try {
      const res = await fetch(`/api/milestone-votes?proposalId=${proposalId}&voterAddress=${encodeURIComponent(address)}`)
      if (res.ok) {
        const data = await res.json()
        const map: Record<number, "for" | "against"> = {}
        for (const row of data.votes || []) map[row.milestone_idx] = row.vote
        setMyVotes(map)
      }
    } catch {}
  }, [address, proposalId])

  const fetchBackground = useCallback(async () => {
    try {
      const [mRes, tRes, pRes, allVotesRes] = await Promise.all([
        fetch("/api/members"),
        fetch(`/api/treasury?proposalId=${proposalId}`),
        fetch(`/api/proposals/${proposalId}`),
        fetch(`/api/milestone-votes?proposalId=${proposalId}`),
      ])

      let threshold = 1
      if (mRes.ok) {
        const md = await mRes.json()
        const eligible = (md.members || []).filter((m: any) => m.address !== proposalCreator)
        threshold = eligible.length > 0 ? eligible.length : 1
        setMemberCount(md.count || (md.members || []).length || 0)
      }
      if (tRes.ok) { const td = await tRes.json(); setTreasuryBalance(td.balanceAlgo); setReleasedMilestones(td.released || []) }

      if (pRes.ok && allVotesRes.ok) {
        const p = await pRes.json()
        const allVotesData = await allVotesRes.json()
        if (p.milestones?.length) {
          // Recompute voteYes/voteNo/status from DB votes (source of truth)
          const recomputed = p.milestones.map((m: any, i: number) => {
            const mv = (allVotesData.votes || []).filter((v: any) => v.milestone_idx === i)
            const dbYes = mv.filter((v: any) => v.vote === "for").length
            const dbNo = mv.filter((v: any) => v.vote === "against").length
            const dbTotal = dbYes + dbNo
            // Only recompute status for pending_proof milestones
            if (m.status !== "pending_proof") return { ...m, voteYes: dbYes, voteNo: dbNo }
            const newStatus = dbNo > 0 ? "failed" : dbTotal >= threshold ? "completed" : "pending_proof"
            return { ...m, voteYes: dbYes, voteNo: dbNo, status: newStatus }
          })
          setMilestones(recomputed)
          // If any milestone status changed, persist it to DB
          const changed = recomputed.some((m: any, i: number) => m.status !== p.milestones[i].status)
          if (changed) {
            fetch("/api/proposals", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: proposalId, milestones: recomputed }),
            })
          }
        }
      }
    } catch {}
  }, [proposalId, proposalCreator])

  useEffect(() => {
    fetchMyVotes(); fetchBackground()
    const interval = setInterval(() => { fetchBackground(); fetchMyVotes() }, 5000)
    return () => clearInterval(interval)
  }, [fetchBackground, fetchMyVotes])

  useEffect(() => { setMyVotes({}); fetchMyVotes() }, [address, fetchMyVotes])

  // Proposer submits proof after completing milestone work
  const handleSubmitProof = async (milestoneIdx: number) => {
    const proof = proofInputs[milestoneIdx]?.trim()
    if (!proof) return alert("Please describe your proof of completion.")
    setSubmittingProof(milestoneIdx)
    try {
      const pRes = await fetch(`/api/proposals/${proposalId}`)
      const fresh = await pRes.json()
      const updated = (fresh.milestones || []).map((m: any, i: number) => {
        if (i !== milestoneIdx) return m
        return { ...m, status: "pending_proof", proof }
      })
      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposalId, milestones: updated }),
      })
      setMilestones(updated)
      setProofInputs(prev => ({ ...prev, [milestoneIdx]: "" }))
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    } finally {
      setSubmittingProof(null)
    }
  }

  // Community votes to approve/reject proof
  const handleVote = async (milestoneIdx: number, vote: "for" | "against") => {
    if (!address || isProposer) return
    setVotingIdx(milestoneIdx)
    try {
      // 1. Save vote to DB first
      const voteRes = await fetch("/api/milestone-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, milestoneIdx, voterAddress: address, vote }),
      })
      if (!voteRes.ok) throw new Error("Failed to record vote")

      // 2. Fetch fresh milestone votes count + member count from DB
      const [allVotesRes, mRes, pRes] = await Promise.all([
        fetch(`/api/milestone-votes?proposalId=${proposalId}`),
        fetch("/api/members"),
        fetch(`/api/proposals/${proposalId}`),
      ])
      const allVotesData = await allVotesRes.json()
      const fresh = await pRes.json()
      const freshMilestones = fresh.milestones || []

      // Count votes for this milestone from DB (source of truth)
      const milestoneVotes = (allVotesData.votes || []).filter((v: any) => v.milestone_idx === milestoneIdx)
      const dbYes = milestoneVotes.filter((v: any) => v.vote === "for").length
      const dbNo = milestoneVotes.filter((v: any) => v.vote === "against").length
      const dbTotal = dbYes + dbNo

      let threshold = 1
      if (mRes.ok) {
        const md = await mRes.json()
        const eligible = (md.members || []).filter((m: any) => m.address !== proposalCreator)
        threshold = eligible.length > 0 ? eligible.length : 1
      }

      const allVoted = dbTotal >= threshold
      // any reject = failed immediately; all voted + all yes = completed
      const newStatus = dbNo > 0 ? "failed" : allVoted && dbNo === 0 ? "completed" : freshMilestones[milestoneIdx]?.status

      const updated = freshMilestones.map((m: any, i: number) =>
        i !== milestoneIdx ? m : { ...m, voteYes: dbYes, voteNo: dbNo, status: newStatus }
      )

      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposalId, milestones: updated }),
      })
      setMilestones(updated)
      setMyVotes(prev => ({ ...prev, [milestoneIdx]: vote }))
    } catch (err: any) {
      alert(`Vote failed: ${err.message}`)
    } finally {
      setVotingIdx(null)
    }
  }

  // Proposer releases funds after community approves proof
  const handleRelease = async (milestoneIdx: number, amountAlgo: number) => {
    if (!address || !signTransaction) return
    setReleasingIdx(milestoneIdx)
    try {
      const params = await algodClient.getTransactionParams().do()
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: TREASURY,
        receiver: proposalCreator,
        amount: Math.round(amountAlgo * 1_000_000),
        suggestedParams: params,
        note: new Uint8Array(Buffer.from(`EcoNexus milestone ${milestoneIdx + 1} release`)),
      })
      const signed = await signTransaction(txn)
      const sendRes = await algodClient.sendRawTransaction(signed).do()
      const txId = sendRes.txid || sendRes.txId || String(sendRes)
      await algosdk.waitForConfirmation(algodClient, txId, 10)

      await fetch("/api/treasury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, milestoneIdx, amountAlgo, txId }),
      })
      const pRes = await fetch(`/api/proposals/${proposalId}`)
      const freshP = await pRes.json()
      const finalMilestones = (freshP.milestones || []).map((m: any, i: number) => {
        if (i === milestoneIdx) return { ...m, status: "released" }
        if (i === milestoneIdx + 1 && m.status === "locked") return { ...m, status: "active" }
        return m
      })
      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposalId, milestones: finalMilestones }),
      })
      setMilestones(finalMilestones)
      const nextReleased = [...releasedMilestones, milestoneIdx]
      setReleasedMilestones(nextReleased)
      setTreasuryBalance(prev => prev !== null ? prev - amountAlgo : null)
      setReleaseModal({
        idx: milestoneIdx, amount: amountAlgo,
        txId: typeof txId === "string" ? txId : String(txId),
        allDone: nextReleased.length >= milestones.length,
      })
    } catch (err: any) {
      alert(`Release failed: ${err.message}`)
    } finally {
      setReleasingIdx(null)
    }
  }

  if (!milestones.length) return null

  const releasedCount = milestones.filter(m => m.status === "released").length

  return (
    <>
      <Card className="bg-white/5 border-white/10 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <CoinsIcon className="w-4 h-4 text-purple-400" />
              Funding Milestones
            </CardTitle>
            <span className="text-white/40 text-xs">{releasedCount}/{milestones.length} released</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
              style={{ width: `${milestones.length > 0 ? (releasedCount / milestones.length) * 100 : 0}%` }} />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-5">
          {milestones.map((m: any, i: number) => {
            const pct = m.fundingPercent ?? m.percent ?? 0
            const amountAlgo = parseFloat((totalFunding * pct / 100).toFixed(4))
            const isReleased = m.status === "released" || releasedMilestones.includes(i)
            const isCompleted = m.status === "completed"
            const isFailed = m.status === "failed"
            const isLocked = m.status === "locked"
            const isActive = m.status === "active" || m.status === "pending"
            const isPendingProof = m.status === "pending_proof"
            const voteYes = m.voteYes || 0
            const voteNo = m.voteNo || 0
            const totalVotes = voteYes + voteNo
            const myVote = myVotes[i]
            // Community votes on proof — only when proof submitted
            const canVote = isPendingProof && !isProposer && !myVote && !!address

            const statusLabel = isReleased ? "💸 Released"
              : isCompleted ? "✅ Approved"
              : isFailed ? "✗ Rejected"
              : isLocked ? "🔒 Locked"
              : isPendingProof ? "📋 Proof Submitted"
              : "⏳ Active"

            const statusColor = isReleased ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
              : isCompleted ? "bg-green-500/20 text-green-400 border-green-500/30"
              : isFailed ? "bg-red-500/20 text-red-400 border-red-500/30"
              : isLocked ? "bg-white/5 text-white/30 border-white/10"
              : isPendingProof ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              : "bg-blue-500/20 text-blue-400 border-blue-500/30"

            const cardBg = isReleased ? "bg-purple-500/5 border-purple-500/20"
              : isCompleted ? "bg-green-500/5 border-green-500/20"
              : isFailed ? "bg-red-500/5 border-red-500/20"
              : isLocked ? "bg-white/5 border-white/5 opacity-50"
              : isPendingProof ? "bg-yellow-500/5 border-yellow-500/20"
              : "bg-white/5 border-white/10"

            return (
              <div key={i}>
                <div className={`rounded-2xl border p-4 space-y-2 transition-all ${cardBg}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-blue-500/30 text-blue-300" :
                        i === 1 ? "bg-purple-500/30 text-purple-300" :
                        "bg-green-500/30 text-green-300"
                      }`}>{i + 1}</span>
                      <span className="text-white font-medium text-sm">{m.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/40 text-xs">{amountAlgo} ALGO ({pct}%)</span>
                      <Badge className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
                    </div>
                  </div>

                  {m.description && <p className="text-white/50 text-xs pl-8">{m.description}</p>}

                  {/* STEP 1: Active — proposer completes work, then submits proof */}
                  {isActive && isProposer && (
                    <div className="pl-8 space-y-2 pt-1">
                      <p className="text-blue-300 text-xs font-medium">📝 Complete this milestone then submit your proof:</p>
                      <textarea
                        placeholder="Describe what you completed (links, photos, invoices, reports...)"
                        value={proofInputs[i] || ""}
                        onChange={e => setProofInputs(prev => ({ ...prev, [i]: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-white/30"
                      />
                      <Button size="sm" onClick={() => handleSubmitProof(i)} disabled={submittingProof === i}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 text-xs px-4">
                        {submittingProof === i ? "Submitting..." : "📤 Submit Proof"}
                      </Button>
                    </div>
                  )}

                  {isActive && !isProposer && (
                    <p className="text-white/30 text-xs pl-8">⏳ Waiting for proposer to complete work and submit proof...</p>
                  )}

                  {/* STEP 2: Proof submitted — community votes to approve/reject */}
                  {isPendingProof && (
                    <div className="pl-8 space-y-2 pt-1">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                        <p className="text-yellow-400 text-xs font-medium mb-1">📋 Proof submitted by proposer:</p>
                        <p className="text-white/70 text-xs">{m.proof}</p>
                      </div>
                      {canVote && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleVote(i, "for")} disabled={votingIdx === i}
                            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl h-8 text-xs">
                            {votingIdx === i ? "..." : "✓ Approve & Release"}
                          </Button>
                          <Button size="sm" onClick={() => handleVote(i, "against")} disabled={votingIdx === i}
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl h-8 text-xs">
                            {votingIdx === i ? "..." : "✗ Reject"}
                          </Button>
                        </div>
                      )}
                      {myVote && (
                        <p className={`text-xs ${myVote === "for" ? "text-green-400/70" : "text-red-400/70"}`}>
                          ✓ You voted {myVote === "for" ? "Approve" : "Reject"} — {totalVotes}/{voteThreshold} members voted
                        </p>
                      )}
                      {!myVote && !isProposer && !!address && (
                        <p className="text-white/30 text-xs">{totalVotes}/{voteThreshold} members voted · all must approve</p>
                      )}
                      {isProposer && (
                        <p className="text-yellow-400/70 text-xs">⏳ Waiting for all community members to approve ({totalVotes}/{voteThreshold})</p>
                      )}
                    </div>
                  )}

                  {/* STEP 3: Approved — proposer releases funds */}
                  {isCompleted && !isReleased && (
                    <div className="pl-8 pt-1 space-y-1">
                      {isProposer ? (
                        <>
                          <Button size="sm" onClick={() => handleRelease(i, amountAlgo)} disabled={releasingIdx === i}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-8 text-xs px-4">
                            {releasingIdx === i ? "⏳ Confirm in Pera..." : `💸 Release ${amountAlgo} ALGO`}
                          </Button>
                          <p className="text-white/30 text-xs">Treasury wallet will be prompted in Pera</p>
                        </>
                      ) : (
                        <p className="text-yellow-400/70 text-xs">⏳ Awaiting proposer to release {amountAlgo} ALGO</p>
                      )}
                    </div>
                  )}

                  {isFailed && isProposer && (
                    <div className="pl-8 space-y-2 pt-1">
                      <p className="text-red-400/70 text-xs">✗ Proof rejected. Submit updated proof:</p>
                      <textarea
                        placeholder="Update your proof with more details..."
                        value={proofInputs[i] || ""}
                        onChange={e => setProofInputs(prev => ({ ...prev, [i]: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-red-500/20 text-white placeholder-white/30 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none"
                      />
                      <Button size="sm" onClick={() => handleSubmitProof(i)} disabled={submittingProof === i}
                        className="bg-red-600/50 hover:bg-red-600 text-white rounded-xl h-8 text-xs px-4">
                        {submittingProof === i ? "Submitting..." : "📤 Resubmit Proof"}
                      </Button>
                    </div>
                  )}

                  {isLocked && (
                    <p className="text-xs text-white/30 pl-8">🔒 Unlocks after Milestone {i} funds are released</p>
                  )}

                  {isReleased && (
                    <p className="text-xs text-purple-400/70 pl-8">💸 {amountAlgo} ALGO released to proposer</p>
                  )}
                </div>

                {i < milestones.length - 1 && (
                  <div className="flex justify-center my-1">
                    <ChevronRightIcon className="w-4 h-4 text-white/20 rotate-90" />
                  </div>
                )}
              </div>
            )
          })}

          {treasuryBalance !== null && (
            <div className="flex justify-between text-xs text-white/40 px-1 pt-1 border-t border-white/5">
              <span>Treasury balance</span>
              <span className="text-purple-300 font-medium">{treasuryBalance.toFixed(2)} ALGO</span>
            </div>
          )}
        </CardContent>
      </Card>

      {releaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReleaseModal(null)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <span className="text-3xl">{releaseModal.allDone ? "🎉" : "💸"}</span>
            </div>
            {releaseModal.allDone ? (
              <>
                <h2 className="text-white font-bold text-xl">All Funds Released!</h2>
                <p className="text-white/60 text-sm">All {milestones.length} milestones completed.</p>
              </>
            ) : (
              <>
                <h2 className="text-white font-bold text-xl">Milestone {releaseModal.idx + 1} Funded!</h2>
                <p className="text-white/60 text-sm">
                  <span className="text-purple-300 font-semibold">{releaseModal.amount} ALGO</span> released on-chain.
                </p>
              </>
            )}
            <p className="text-white/20 text-xs font-mono truncate">TX: {releaseModal.txId.slice(0, 24)}...</p>
            <Button onClick={() => setReleaseModal(null)} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
              {releaseModal.allDone ? "🎉 Done" : "Continue"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
