"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRightIcon, CoinsIcon, XIcon } from "lucide-react"
import { useWalletContext } from "@/hooks/use-wallet"
import { PeraWalletConnect } from "@perawallet/connect"
import algosdk from "algosdk"

const TREASURY = '5TVL4FSSJ7OL245FRMZALZQICP3CTRT262S7YUFTLK3ZBBBFVKELOEV5XM'
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
  const [eligibleCount, setEligibleCount] = useState(1)
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null)
  const [releasedMilestones, setReleasedMilestones] = useState<number[]>([])
  const [votingIdx, setVotingIdx] = useState<number | null>(null)
  const [releasingIdx, setReleasingIdx] = useState<number | null>(null)
  const [releaseModal, setReleaseModal] = useState<{ idx: number; amount: number; txId: string; allDone: boolean } | null>(null)
  const [myVotes, setMyVotes] = useState<Record<number, "for" | "against">>({})
  const [proofInputs, setProofInputs] = useState<Record<number, string>>({})
  const [submittingProof, setSubmittingProof] = useState<number | null>(null)

  const isProposer = address === proposalCreator

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
        const eligibleNum = md.members ? eligible.length : Math.max(1, (md.count || 1) - 1)
        threshold = eligibleNum > 0 ? eligibleNum : 1
        setEligibleCount(threshold)
      }

      if (tRes.ok) {
        const td = await tRes.json()
        setTreasuryBalance(td.balanceAlgo)
        setReleasedMilestones(td.released || [])
      }

      if (pRes.ok && allVotesRes.ok) {
        const p = await pRes.json()
        const allVotesData = await allVotesRes.json()
        if (p.milestones?.length) {
          const recomputed = p.milestones.map((m: any, i: number) => {
            const mv = (allVotesData.votes || []).filter((v: any) => v.milestone_idx === i)
            const dbYes = mv.filter((v: any) => v.vote === "for").length
            const dbNo = mv.filter((v: any) => v.vote === "against").length
            // Recompute status for both pending_proof and failed (in case proof was resubmitted)
            if (m.status !== "pending_proof" && m.status !== "failed") return { ...m, voteYes: dbYes, voteNo: dbNo }
            let newStatus = m.status
            if (dbNo > 0) newStatus = "failed"
            else if (dbYes >= threshold) newStatus = "completed"
            else if (m.status === "failed" && dbYes === 0 && dbNo === 0) newStatus = m.status // keep failed if no new votes yet
            return { ...m, voteYes: dbYes, voteNo: dbNo, status: newStatus }
          })
          setMilestones(recomputed)
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
    fetchMyVotes()
    fetchBackground()
    const interval = setInterval(() => { fetchBackground(); fetchMyVotes() }, 5000)
    return () => clearInterval(interval)
  }, [fetchBackground, fetchMyVotes])

  useEffect(() => { setMyVotes({}); fetchMyVotes() }, [address, fetchMyVotes])

  const handleSubmitProof = async (milestoneIdx: number) => {
    const proof = proofInputs[milestoneIdx]?.trim()
    if (!proof) return alert("Please describe your proof of completion.")
    setSubmittingProof(milestoneIdx)
    try {
      // 1. Delete old votes for this milestone so community can vote fresh
      await fetch("/api/milestone-votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, milestoneIdx }),
      })

      // 2. Update milestone status to pending_proof with new proof
      const pRes = await fetch(`/api/proposals/${proposalId}`)
      const fresh = await pRes.json()
      const updated = (fresh.milestones || []).map((m: any, i: number) =>
        i !== milestoneIdx ? m : { ...m, status: "pending_proof", proof, voteYes: 0, voteNo: 0 }
      )
      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposalId, milestones: updated }),
      })

      // 3. Update local state immediately
      setMilestones(updated)
      setMyVotes(prev => { const n = { ...prev }; delete n[milestoneIdx]; return n })
      setProofInputs(prev => ({ ...prev, [milestoneIdx]: "" }))
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    } finally {
      setSubmittingProof(null)
    }
  }

  const handleVote = async (milestoneIdx: number, vote: "for" | "against") => {
    if (!address || isProposer) return
    setVotingIdx(milestoneIdx)
    try {
      const voteRes = await fetch("/api/milestone-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, milestoneIdx, voterAddress: address, vote }),
      })
      if (!voteRes.ok) throw new Error("Failed to record vote")

      const [allVotesRes, mRes, pRes] = await Promise.all([
        fetch(`/api/milestone-votes?proposalId=${proposalId}`),
        fetch("/api/members"),
        fetch(`/api/proposals/${proposalId}`),
      ])
      const allVotesData = await allVotesRes.json()
      const fresh = await pRes.json()
      const freshMilestones = fresh.milestones || []
      const milestoneVotes = (allVotesData.votes || []).filter((v: any) => v.milestone_idx === milestoneIdx)
      const dbYes = milestoneVotes.filter((v: any) => v.vote === "for").length
      const dbNo = milestoneVotes.filter((v: any) => v.vote === "against").length

      let threshold = eligibleCount
      if (mRes.ok) {
        const md = await mRes.json()
        const eligible = md.members
          ? (md.members || []).filter((m: any) => m.address !== proposalCreator).length
          : Math.max(1, (md.count || 1) - 1)
        threshold = eligible > 0 ? eligible : 1
        setEligibleCount(threshold)
      }

      let newStatus = freshMilestones[milestoneIdx]?.status
      if (dbNo > 0) newStatus = "failed"
      else if (dbYes >= threshold) newStatus = "completed"

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

  // Connect treasury wallet via a fresh Pera session and sign the payment
  const handleRelease = async (milestoneIdx: number, amountAlgo: number) => {
    setReleasingIdx(milestoneIdx)
    try {
      // Create a fresh Pera instance so the proposer can connect the treasury account
      const treasuryPera = new PeraWalletConnect()
      let treasuryAccounts: string[] = []

      try {
        // Try reconnecting existing session first
        treasuryAccounts = await treasuryPera.reconnectSession()
      } catch {}

      // If no session or wrong account, open connect modal
      if (!treasuryAccounts.includes(TREASURY)) {
        treasuryAccounts = await treasuryPera.connect()
      }

      if (!treasuryAccounts.includes(TREASURY)) {
        treasuryPera.disconnect()
        throw new Error(
          `Please select the treasury account in Pera.\nTreasury: ${TREASURY.slice(0, 10)}...${TREASURY.slice(-6)}`
        )
      }

      // Build and sign the payment transaction from treasury → proposer
      const params = await algodClient.getTransactionParams().do()
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: TREASURY,
        receiver: proposalCreator,
        amount: Math.round(amountAlgo * 1_000_000),
        suggestedParams: params,
        note: new Uint8Array(Buffer.from(`EcoNexus milestone ${milestoneIdx + 1} release - proposal ${proposalId}`)),
      })

      const signedTxns = await treasuryPera.signTransaction([[{ txn, signers: [TREASURY] }]])
      const sendRes = await algodClient.sendRawTransaction(signedTxns[0]).do()
      const txId = sendRes.txid || sendRes.txId || String(sendRes)
      await algosdk.waitForConfirmation(algodClient, txId, 10)
      treasuryPera.disconnect()

      // Record in DB
      await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, milestoneIdx, amountAlgo, txId }),
      })

      // Update milestone statuses
      const pRes = await fetch(`/api/proposals/${proposalId}`)
      const freshP = await pRes.json()
      const finalMilestones = (freshP.milestones || []).map((m: any, i: number) => {
        if (i === milestoneIdx) return { ...m, status: 'released' }
        if (i === milestoneIdx + 1 && m.status === 'locked') return { ...m, status: 'active' }
        return m
      })
      await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalId, milestones: finalMilestones }),
      })

      setMilestones(finalMilestones)
      const nextReleased = [...releasedMilestones, milestoneIdx]
      setReleasedMilestones(nextReleased)
      setTreasuryBalance(prev => prev !== null ? prev - amountAlgo : null)
      setReleaseModal({
        idx: milestoneIdx,
        amount: amountAlgo,
        txId: typeof txId === 'string' ? txId : String(txId),
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
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
              style={{ width: `${milestones.length > 0 ? (releasedCount / milestones.length) * 100 : 0}%` }}
            />
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
            const myVote = myVotes[i]
            const canVote = isPendingProof && !isProposer && !myVote && !!address

            const statusLabel = isReleased ? "💸 Released"
              : isCompleted ? "✅ Approved"
              : isFailed ? "✗ Rejected"
              : isLocked ? "🔒 Locked"
              : isPendingProof ? `📋 Proof Submitted (${voteYes}/${eligibleCount})`
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
                  {/* Header */}
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

                  {/* STEP 1: Active — proposer submits proof */}
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
                    <p className="text-white/30 text-xs pl-8">⏳ Waiting for proposer to submit proof...</p>
                  )}

                  {/* STEP 2: Proof submitted — community votes */}
                  {isPendingProof && (
                    <div className="pl-8 space-y-2 pt-1">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                        <p className="text-yellow-400 text-xs font-medium mb-1">📋 Proof submitted:</p>
                        <p className="text-white/70 text-xs">{m.proof}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/40">
                          <span>{voteYes} of {eligibleCount} members approved</span>
                          {voteNo > 0 && <span className="text-red-400">{voteNo} rejected</span>}
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${eligibleCount > 0 ? (voteYes / eligibleCount) * 100 : 0}%` }} />
                        </div>
                      </div>
                      {canVote && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleVote(i, "for")} disabled={votingIdx === i}
                            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl h-8 text-xs">
                            {votingIdx === i ? "..." : "✓ Approve"}
                          </Button>
                          <Button size="sm" onClick={() => handleVote(i, "against")} disabled={votingIdx === i}
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl h-8 text-xs">
                            {votingIdx === i ? "..." : "✗ Reject"}
                          </Button>
                        </div>
                      )}
                      {myVote && (
                        <p className={`text-xs ${myVote === "for" ? "text-green-400/70" : "text-red-400/70"}`}>
                          ✓ You voted {myVote === "for" ? "Approve" : "Reject"}
                        </p>
                      )}
                      {isProposer && (
                        <p className="text-yellow-400/70 text-xs">
                          ⏳ Waiting for all {eligibleCount} members to approve ({voteYes}/{eligibleCount})
                        </p>
                      )}
                    </div>
                  )}

                  {/* STEP 3: All approved — Release Funds button */}
                  {isCompleted && !isReleased && (
                    <div className="pl-8 pt-2 space-y-2">
                      <p className="text-green-400 text-xs font-medium">✅ All {eligibleCount} members approved!</p>
                      {isProposer ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRelease(i, amountAlgo)}
                            disabled={releasingIdx === i}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl h-9 text-xs px-5 font-semibold shadow-lg shadow-purple-500/25"
                          >
                            {releasingIdx === i ? "⏳ Opening Pera Wallet..." : `💸 Release ${amountAlgo} ALGO`}
                          </Button>
                          <p className="text-white/30 text-xs">
                            Pera Wallet will open — select the treasury account to sign the payment
                          </p>
                        </>
                      ) : (
                        <p className="text-yellow-400/70 text-xs">⏳ Awaiting proposer to release {amountAlgo} ALGO</p>
                      )}
                    </div>
                  )}

                  {/* Rejected — proposer resubmits */}
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
                  {isFailed && !isProposer && (
                    <p className="text-red-400/50 text-xs pl-8">✗ Proof rejected. Waiting for proposer to resubmit.</p>
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

      {/* Release success modal */}
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
                <p className="text-white/60 text-sm">All {milestones.length} milestones completed. 🎉</p>
              </>
            ) : (
              <>
                <h2 className="text-white font-bold text-xl">Milestone {releaseModal.idx + 1} Funded!</h2>
                <p className="text-white/60 text-sm">
                  <span className="text-purple-300 font-semibold">{releaseModal.amount} ALGO</span> sent to proposer.
                  {releaseModal.idx + 1 < milestones.length && (
                    <span className="block mt-1 text-blue-300">Milestone {releaseModal.idx + 2} is now unlocked!</span>
                  )}
                </p>
              </>
            )}
            <p className="text-white/20 text-xs font-mono truncate">TX: {releaseModal.txId.slice(0, 24)}...</p>
            <Button onClick={() => setReleaseModal(null)} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
              {releaseModal.allDone ? "🎉 Done" : "Continue →"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
