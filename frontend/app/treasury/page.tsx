"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WalletGuard } from "@/components/wallet-guard"
import Link from "next/link"
import { ArrowLeftIcon, CoinsIcon, RefreshCwIcon, ExternalLinkIcon, ShieldIcon, TrendingDownIcon, ClockIcon, CheckCircleIcon } from "lucide-react"

const TREASURY = '5TVL4FSSJ7OL245FRMZALZQICP3CTRT262S7YUFTLK3ZBBBFVKELOEV5XM'

export default function TreasuryPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [releases, setReleases] = useState<any[]>([])
  const [totalReleased, setTotalReleased] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      // Fetch balance + all releases
      const [treasuryRes, releasesRes] = await Promise.all([
        fetch('/api/treasury'),
        fetch('/api/treasury/releases'),
      ])
      if (treasuryRes.ok) {
        const td = await treasuryRes.json()
        setBalance(td.balanceAlgo)
      }
      if (releasesRes.ok) {
        const rd = await releasesRes.json()
        setReleases(rd.releases || [])
        setTotalReleased(rd.totalReleased || 0)
      }
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(), 10000)
    return () => clearInterval(interval)
  }, [])

  const copyAddress = () => {
    navigator.clipboard.writeText(TREASURY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <WalletGuard requireBalance={0}>
      <div className="relative flex flex-col min-h-[100dvh] text-white overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>
          <span className="font-bold text-base">DAO Treasury</span>
          <Button
            size="sm" variant="ghost"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="text-white/60 hover:text-white p-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </header>

        <main className="relative z-10 flex-1 px-4 sm:px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {loading ? (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/50 text-sm">Loading treasury...</p>
              </div>
            ) : (
              <>
                {/* Main balance card */}
                <Card className="bg-gradient-to-br from-purple-500/20 to-orange-500/10 border-purple-500/30 rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <CoinsIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white/60 text-xs">DAO Treasury Balance</p>
                        <p className="text-3xl font-bold text-white">
                          {balance !== null ? `${balance.toFixed(4)} ALGO` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                      <p className="text-white/40 text-xs">Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <p className="text-white/80 text-xs font-mono break-all flex-1">{TREASURY}</p>
                        <button
                          onClick={copyAddress}
                          className="shrink-0 text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                        >
                          {copied ? '✓' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Explorer link */}
                    <a
                      href={`https://testnet.algoexplorer.io/address/${TREASURY}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <ExternalLinkIcon className="w-3 h-3" />
                      View on Algorand Explorer
                    </a>
                  </CardContent>
                </Card>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Released', value: `${totalReleased.toFixed(2)} ALGO`, icon: TrendingDownIcon, color: 'text-red-400', bg: 'bg-red-500/10' },
                    { label: 'Milestones Funded', value: releases.length.toString(), icon: CheckCircleIcon, color: 'text-green-400', bg: 'bg-green-500/10' },
                    { label: 'Network', value: 'TestNet', icon: ShieldIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label} className="bg-white/5 border-white/10 rounded-2xl">
                      <CardContent className="p-3 text-center">
                        <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <p className="text-white font-bold text-sm">{value}</p>
                        <p className="text-white/40 text-xs">{label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* How it works */}
                <Card className="bg-white/5 border-white/10 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <ShieldIcon className="w-4 h-4 text-purple-400" />
                      How Treasury Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      '💡 Community votes to approve proposals',
                      '📋 Proposer defines 3 funding milestones',
                      '✅ Community votes to approve each milestone',
                      '💸 ALGO released from treasury to proposer per milestone',
                      '🔒 Funds only released after community approval',
                    ].map((step, i) => (
                      <p key={i} className="text-white/60 text-xs">{step}</p>
                    ))}
                  </CardContent>
                </Card>

                {/* Release history */}
                <Card className="bg-white/5 border-white/10 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-yellow-400" />
                      Release History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {releases.length === 0 ? (
                      <p className="text-white/40 text-xs text-center py-4">No releases yet</p>
                    ) : (
                      <div className="space-y-2">
                        {releases.map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                            <div>
                              <p className="text-white/80 text-xs">Proposal #{r.proposal_id} · Milestone {r.milestone_idx + 1}</p>
                              <p className="text-white/40 text-xs font-mono">{r.tx_id?.slice(0, 12)}...</p>
                            </div>
                            <div className="text-right">
                              <p className="text-red-400 text-xs font-bold">-{r.amount_algo} ALGO</p>
                              <p className="text-white/30 text-xs">{new Date(r.released_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </>
            )}
          </div>
        </main>
      </div>
    </WalletGuard>
  )
}
