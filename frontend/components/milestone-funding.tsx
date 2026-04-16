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
  const [releaseModal, setReleaseModal] = useState<{ idx: number; amount: number; txId: string } | null>(null)
  const [climateCreditsModal, setClimateCreditsModal] = useState(false)
  const [myVotes, setMyVotes] = useState<Record<number, "for" | "against">>({})
  const [proofInputs, setProofInputs] = useState<Record<number, string>>({})
  const [proofFiles, setProofFiles] = useState<Record<number, { url: string; name: string; type: string }[]>>({})
  const [usageInputs, setUsageInputs] = useState<Record<number, string>>({})
  const [usageFiles, setUsageFiles] = useState<Record<number, { url: string; name: string; type: string }[]>>({})
  const [uploadingProofIdx, setUploadingProofIdx] = useState<number | null>(null)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [submittingProof, setSubmittingProof] = useState<number | null>(null)
  const [submittingUsage, setSubmittingUsage] = useState<number | null>(null)

  const isProposer = address === proposalCreator

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialMilestones?.length && !initialized) {
      setMilestones(initialMilestones)
      setInitialized(true)
    }
  }, [initialMilestones, initialized])

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
            // Normalize old "pending" to "active"
            if (m.status === "pending") return { ...m, voteYes: dbYes, voteNo: dbNo, status: "active" }
            // Only recompute vote-driven statuses
            if (!["pending_proof", "failed", "pending_usage_proof"].includes(m.status))
              return { ...m, voteYes: dbYes, voteNo: dbNo }
            let newStatus = m.status
            if (m.status === "pending_usage_proof") {
              if (dbNo > 0) newStatus = "released"
              else if (dbYes >= threshold) newStatus = "usage_approved"
            } else {
              if (dbNo > 0) newStatus = "failed"
              else if (dbYes >= threshold) newStatus = "completed"
            }
            return { ...m, voteYes: dbYes, voteNo: dbNo, status: newStatus }
          })
          const withUnlocks = recomputed.map((m: any, i: number) => {
            if (i > 0 && recomputed[i - 1].status === "usage_approved" && m.status === "locked")
              return { ...m, status: "active" }
            return m
          })
          // Always use DB as source of truth
          setMilestones(withUnlocks)
          const changed = withUnlocks.some((m: any, i: number) => m.status !== p.milestones[i].status)
          if (changed) {
            fetch("/api/proposals", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: proposalId, milestones: withUnlocks }),
            })
          }
          // Show climate credits if last milestone just became usage_approved
          const lastIdx = withUnlocks.length - 1
          if (withUnlocks[lastIdx]?.status === "usage_approved" && p.milestones[lastIdx]?.status !== "usage_approved") {
            setTimeout(() => setClimateCreditsModal(true), 800)
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

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || 'Upload failed')
    return { url: data.url, name: data.name, type: data.type }
  }

  const handleUploadFile = async (milestoneIdx: number, file: File) => {
    setUploadingIdx(milestoneIdx)
    try {
      const f = await uploadFile(file)
      setUsageFiles(prev => ({ ...prev, [milestoneIdx]: [...(prev[milestoneIdx] || []), f] }))
    } catch (err: any) { alert(`Upload failed: ${err.message}`) }
    finally { setUploadingIdx(null) }
  }

  const handleUploadProofFile = async (milestoneIdx: number, file: File) => {
    setUploadingProofIdx(milestoneIdx)
    try {
      const f = await uploadFile(file)
      setProofFiles(prev => ({ ...prev, [milestoneIdx]: [...(prev[milestoneIdx] || []), f] }))
    } catch (err: any) { alert(`Upload failed: ${err.message}`) }
    finally { setUploadingProofIdx(null) }
  }

  const handleSubmitUsageProof = async (milestoneIdx: number) => {
    const usage = usageInputs[milestoneIdx]?.trim()
    const files = usageFiles[milestoneIdx] || []
    if (!usage && files.length === 0) return alert("Please add a description or upload at least one file.")
    setSubmittingUsage(milestoneIdx)
    try {
      await fetch("/api/milestone-votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, milestoneIdx }),
      })
      const pRes = await fetch(`/api/proposals/${proposalId}`)
      const fresh = await pRes.json()
      // Strip base64 data from file URLs before saving to DB — only keep path/name/type
      const safeFiles = files.map(f => ({
        url: f.url.startsWith('data:') ? '' : f.url,
        name: f.name,
        type: f.type
      })).filter(f => f.url)
      const updated = (fresh.milestones || []).map((m: any, i: number) =>
        i !== milestoneIdx ? m : { ...m, status: "pending_usage_proof", usageProof: usage || '', usageFiles: safeFiles, voteYes: 0, voteNo: 0 }
      )
      const patchRes = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposalId, milestones: updated }),
      })
      if (!patchRes.ok) {
        const errData = await patchRes.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${patchRes.status}`)
      }
      const verifyRes = await fetch(`/api/proposals/${proposalId}`)
      const verified = await verifyRes.json()
      setMilestones(verified.milestones || updated)
      setMyVotes(prev => { const n = { ...prev }; delete n[milestoneIdx]; return n })
      setUsageInputs(prev => ({ ...prev, [milestoneIdx]: "" }))
      setUsageFiles(prev => ({ ...prev, [milestoneIdx]: [] }))
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    } finally {
      setSubmittingUsage(null)
    }
  }

  const handleSubmitProof = async (milestoneIdx: number) => {
    const proof = proofInputs[milestoneIdx]?.trim()
    const files = proofFiles[milestoneIdx] || []
    if (!proof && files.length === 0) return alert("Please describe your proof or upload at least one file.")
    setSubmittingProof(milestoneIdx)
    try {
      await fetch("/api/milestone-votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, milestoneIdx }),
      })
      const pRes = await fetch(`/api/proposals/${proposalId}`)
      const fresh = await pRes.json()
      const safeFiles = files.map(f => ({
        url: f.url.startsWith('data:') ? '' : f.url,
        name: f.name,
        type: f.type
      })).filter(f => f.url)
      const updated = (fresh.milestones || []).map((m: any, i: number) =>
        i !== milestoneIdx ? m : { ...m, status: "pending_proof", proof: proof || '', proofFiles: safeFiles, voteYes: 0, voteNo: 0 }
      )
      const patchRes = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposalId, milestones: updated }),
      })
      if (!patchRes.ok) {
        const errData = await patchRes.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${patchRes.status}`)
      }
      const verifyRes = await fetch(`/api/proposals/${proposalId}`)
      const verified = await verifyRes.json()
      setMilestones(verified.milestones || updated)
      setMyVotes(prev => { const n = { ...prev }; delete n[milestoneIdx]; return n })
      setProofInputs(prev => ({ ...prev, [milestoneIdx]: "" }))
      setProofFiles(prev => ({ ...prev, [milestoneIdx]: [] }))
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
      const currentStatus = freshMilestones[milestoneIdx]?.status
      if (currentStatus === "pending_usage_proof") {
        if (dbNo > 0) newStatus = "released" // revert to released so proposer can resubmit
        else if (dbYes >= threshold) newStatus = "usage_approved"
      } else {
        if (dbNo > 0) newStatus = "failed"
        else if (dbYes >= threshold) newStatus = "completed"
      }

      const updated = freshMilestones.map((m: any, i: number) => {
        if (i === milestoneIdx) return { ...m, voteYes: dbYes, voteNo: dbNo, status: newStatus }
        if (newStatus === "usage_approved" && i === milestoneIdx + 1 && m.status === "locked") return { ...m, status: "active" }
        return m
      })
      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposalId, milestones: updated }),
      })
      setMilestones(updated)
      setMyVotes(prev => ({ ...prev, [milestoneIdx]: vote }))
      // Show climate credits popup when last milestone usage is approved
      const isLastMilestone = milestoneIdx === freshMilestones.length - 1
      if (newStatus === "usage_approved" && isLastMilestone) {
        setTimeout(() => setClimateCreditsModal(true), 800)
      }
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

      // Update milestone statuses — next milestone stays locked until usage proof is approved
      const pRes = await fetch(`/api/proposals/${proposalId}`)
      const freshP = await pRes.json()
      const finalMilestones = (freshP.milestones || []).map((m: any, i: number) => {
        if (i === milestoneIdx) return { ...m, status: 'released' }
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
      })
    } catch (err: any) {
      alert(`Release failed: ${err.message}`)
    } finally {
      setReleasingIdx(null)
    }
  }

  // Shared file viewer — images inline, video player, PDF/doc as clickable link
  const FileViewer = ({ files }: { files: any[] }) => (
    <div className="space-y-2 pt-1">
      {files.map((f: any, fi: number) => (
        <div key={fi} className="rounded-xl overflow-hidden border border-white/10">
          {f.type?.startsWith('image') ? (
            <img src={f.url} alt={f.name} className="w-full max-h-56 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(f.url, '_blank')} />
          ) : f.type?.startsWith('video') ? (
            <video src={f.url} controls className="w-full max-h-56 bg-black" />
          ) : (
            <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white/5 px-3 py-2.5 hover:bg-white/10 transition-colors">
              <span className="text-xl">📄</span>
              <span className="text-blue-400 text-xs hover:underline truncate">{f.name}</span>
              <span className="text-white/30 text-xs ml-auto">click to open ↗</span>
            </a>
          )}
        </div>
      ))}
    </div>
  )

  if (!milestones.length) return null

  const doneCount = milestones.filter(m => m.status === "usage_approved").length
  const allDone = doneCount === milestones.length

  return (
    <>
      <Card className="bg-white/5 border-white/10 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <CoinsIcon className="w-4 h-4 text-purple-400" />
              Funding Milestones
            </CardTitle>
            <span className="text-white/40 text-xs">{doneCount}/{milestones.length} completed</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
              style={{ width: `${milestones.length > 0 ? (doneCount / milestones.length) * 100 : 0}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-5">
          {milestones.map((m: any, i: number) => {
            const pct = m.fundingPercent ?? m.percent ?? 0
            const amountAlgo = parseFloat((totalFunding * pct / 100).toFixed(4))
            const isReleased = m.status === "released"
            const isCompleted = m.status === "completed"
            const isFailed = m.status === "failed"
            const isLocked = m.status === "locked"
            const isActive = m.status === "active"
            const isPendingProof = m.status === "pending_proof"
            const isPendingUsage = m.status === "pending_usage_proof"
            const usageApproved = m.status === "usage_approved"
            const voteYes = m.voteYes || 0
            const voteNo = m.voteNo || 0
            const myVote = myVotes[i]
            const canVote = isPendingProof && !isProposer && !myVote && !!address

            const statusLabel = usageApproved ? "✅ Usage Verified"
              : isPendingUsage ? `🧾 Usage Proof (${voteYes}/${eligibleCount})`
              : isReleased ? "💸 Released"
              : isCompleted ? "✅ Approved"
              : isFailed ? "✗ Rejected"
              : isLocked ? "🔒 Locked"
              : isPendingProof ? `📋 Proof Submitted (${voteYes}/${eligibleCount})`
              : "⏳ Active"

            const statusColor = usageApproved ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
              : isPendingUsage ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
              : isReleased ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
              : isCompleted ? "bg-green-500/20 text-green-400 border-green-500/30"
              : isFailed ? "bg-red-500/20 text-red-400 border-red-500/30"
              : isLocked ? "bg-white/5 text-white/30 border-white/10"
              : isPendingProof ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              : "bg-blue-500/20 text-blue-400 border-blue-500/30"

            const cardBg = usageApproved ? "bg-teal-500/5 border-teal-500/20"
              : isPendingUsage ? "bg-orange-500/5 border-orange-500/20"
              : isReleased ? "bg-purple-500/5 border-purple-500/20"
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
                        placeholder="Describe what you completed (optional if uploading files)..."
                        value={proofInputs[i] || ""}
                        onChange={e => setProofInputs(prev => ({ ...prev, [i]: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-white/30"
                      />
                      <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <div className="bg-white/10 hover:bg-white/15 border border-white/20 text-white/70 text-xs px-3 py-1.5 rounded-lg transition-colors">
                          {uploadingProofIdx === i ? "⏳ Uploading..." : "📎 Attach files (photos, videos, PDFs)"}
                        </div>
                        <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" multiple className="hidden"
                          disabled={uploadingProofIdx === i}
                          onChange={async e => {
                            for (const file of Array.from(e.target.files || [])) await handleUploadProofFile(i, file)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {(proofFiles[i] || []).length > 0 && (
                        <div className="space-y-1">
                          {(proofFiles[i] || []).map((f, fi) => (
                            <div key={fi} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                              <span className="text-xs">{f.type.startsWith('image') ? '🖼️' : f.type.startsWith('video') ? '🎥' : '📄'}</span>
                              <span className="text-white/60 text-xs truncate flex-1">{f.name}</span>
                              <button onClick={() => setProofFiles(prev => ({ ...prev, [i]: prev[i].filter((_, j) => j !== fi) }))} className="text-white/30 hover:text-red-400 text-xs">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button size="sm" onClick={() => handleSubmitProof(i)} disabled={submittingProof === i || uploadingProofIdx === i}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 text-xs px-4">
                        {submittingProof === i ? "Submitting..." : "📤 Submit Proof"}
                      </Button>
                    </div>
                  )}
                  {isActive && !isProposer && (
                    <p className="text-white/30 text-xs pl-8">⏳ Waiting for proposer to submit proof...</p>
                  )}

                  {/* STEP 2: Proof submitted — community sees proof + votes */}
                  {isPendingProof && (
                    <div className="pl-8 space-y-2 pt-1">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 space-y-2">
                        <p className="text-yellow-400 text-xs font-medium">📋 Completion proof submitted:</p>
                        {m.proof ? (
                          <p className="text-white/70 text-xs whitespace-pre-wrap">{m.proof}</p>
                        ) : null}
                        {(m.proofFiles || []).length > 0
                          ? <FileViewer files={m.proofFiles} />
                          : !m.proof && <p className="text-white/40 text-xs italic">No description provided — see files above</p>
                        }
                        {!m.proof && (m.proofFiles || []).length === 0 && (
                          <p className="text-white/40 text-xs italic">Proof submitted — awaiting review</p>
                        )}
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
                    <p className="text-xs text-white/30 pl-8">🔒 Unlocks after Milestone {i} usage is verified</p>
                  )}
                  {/* STEP 4: Released — proposer submits fund usage report */}
                  {isReleased && isProposer && (
                    <div className="pl-8 space-y-2 pt-1">
                      <p className="text-purple-300 text-xs font-medium">💸 {amountAlgo} ALGO released. Submit proof of how funds were used:</p>
                      <textarea
                        placeholder="Describe how funds were spent (optional if uploading files)..."
                        value={usageInputs[i] || ""}
                        onChange={e => setUsageInputs(prev => ({ ...prev, [i]: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-white/30"
                      />
                      {/* File upload */}
                      <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <div className="bg-white/10 hover:bg-white/15 border border-white/20 text-white/70 text-xs px-3 py-1.5 rounded-lg transition-colors">
                          {uploadingIdx === i ? "⏳ Uploading..." : "📎 Attach files (photos, videos, PDFs)"}
                        </div>
                        <input
                          type="file"
                          accept="image/*,video/*,.pdf,.doc,.docx"
                          multiple
                          className="hidden"
                          disabled={uploadingIdx === i}
                          onChange={async e => {
                            const files = Array.from(e.target.files || [])
                            for (const file of files) await handleUploadFile(i, file)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {/* Uploaded files preview */}
                      {(usageFiles[i] || []).length > 0 && (
                        <div className="space-y-1">
                          {(usageFiles[i] || []).map((f, fi) => (
                            <div key={fi} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                              <span className="text-xs">{f.type.startsWith('image') ? '🖼️' : f.type.startsWith('video') ? '🎥' : '📄'}</span>
                              <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs truncate hover:underline flex-1">{f.name}</a>
                              <button onClick={() => setUsageFiles(prev => ({ ...prev, [i]: prev[i].filter((_, j) => j !== fi) }))} className="text-white/30 hover:text-red-400 text-xs">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button size="sm" onClick={() => handleSubmitUsageProof(i)} disabled={submittingUsage === i || uploadingIdx === i}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-8 text-xs px-4">
                        {submittingUsage === i ? "Submitting..." : "🧾 Submit Fund Usage Report"}
                      </Button>
                    </div>
                  )}
                  {isReleased && !isProposer && (
                    <p className="text-purple-400/60 text-xs pl-8">💸 {amountAlgo} ALGO released. Waiting for proposer to submit fund usage report...</p>
                  )}

                  {/* STEP 5: Usage proof submitted — community votes */}
                  {isPendingUsage && (
                    <div className="pl-8 space-y-2 pt-1">
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 space-y-2">
                        <p className="text-orange-400 text-xs font-medium mb-1">🧾 Fund usage report:</p>
                        {m.usageProof && <p className="text-white/70 text-xs whitespace-pre-wrap">{m.usageProof.replace(/\[.*?\]\(.*?\)/g, '').trim()}</p>}
                        {(m.usageFiles || []).length > 0 && <FileViewer files={m.usageFiles} />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/40">
                          <span>{voteYes} of {eligibleCount} members verified</span>
                          {voteNo > 0 && <span className="text-red-400">{voteNo} disputed</span>}
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${eligibleCount > 0 ? (voteYes / eligibleCount) * 100 : 0}%` }} />
                        </div>
                      </div>
                      {!isProposer && !myVote && !!address && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleVote(i, "for")} disabled={votingIdx === i}
                            className="flex-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 rounded-xl h-8 text-xs">
                            {votingIdx === i ? "..." : "✓ Verify Usage"}
                          </Button>
                          <Button size="sm" onClick={() => handleVote(i, "against")} disabled={votingIdx === i}
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl h-8 text-xs">
                            {votingIdx === i ? "..." : "✗ Dispute"}
                          </Button>
                        </div>
                      )}
                      {myVote && (
                        <p className={`text-xs ${myVote === "for" ? "text-teal-400/70" : "text-red-400/70"}`}>
                          ✓ You {myVote === "for" ? "verified" : "disputed"} this usage report
                        </p>
                      )}
                      {isProposer && (
                        <p className="text-orange-400/70 text-xs">⏳ Waiting for members to verify fund usage ({voteYes}/{eligibleCount})</p>
                      )}
                    </div>
                  )}

                  {usageApproved && (
                    <p className="text-xs text-teal-400/70 pl-8">
                      {i + 1 < milestones.length
                        ? `✅ Fund usage verified. Milestone ${i + 2} is now unlocked.`
                        : "✅ Fund usage verified. All milestones complete — project done!"}
                    </p>
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

      {/* Fund release modal */}
      {releaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReleaseModal(null)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <span className="text-3xl">💸</span>
            </div>
            <h2 className="text-white font-bold text-xl">Milestone {releaseModal.idx + 1} Funded!</h2>
            <p className="text-white/60 text-sm">
              <span className="text-purple-300 font-semibold">{releaseModal.amount} ALGO</span> sent to proposer.
              <span className="block mt-1 text-orange-300">Now submit your fund usage report to unlock the next milestone.</span>
            </p>
            <p className="text-white/20 text-xs font-mono truncate">TX: {releaseModal.txId.slice(0, 24)}...</p>
            <Button onClick={() => setReleaseModal(null)} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl">Continue →</Button>
          </div>
        </div>
      )}

      {/* Climate Credits popup — shown only after last milestone usage is approved */}
      {climateCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setClimateCreditsModal(false)} />
          <div className="relative bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
              <span className="text-4xl">🌿</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-white font-bold text-2xl">Project Complete!</h2>
              <p className="text-emerald-400 font-semibold text-sm">All 3 milestones verified ✅</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-emerald-300 font-bold text-lg">🌟 Climate Credits Earned</p>
              <p className="text-white/70 text-sm">This project has successfully completed all milestones and fund usage has been verified by the community.</p>
              <p className="text-emerald-400 text-xs mt-2">Climate credits have been accrued for this project and will be added to the DAO treasury to fund future climate initiatives.</p>
            </div>
            <Button onClick={() => setClimateCreditsModal(false)} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold">
              🎉 Awesome!
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
