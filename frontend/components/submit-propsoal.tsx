"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeftIcon, UploadIcon, FileTextIcon, DollarSignIcon, CalendarIcon, LeafIcon } from "lucide-react"
import Link from "next/link"
import { useWalletContext } from "@/hooks/use-wallet"
import { useClimateDAO } from "@/hooks/use-climate-dao"
import { useRouter } from "next/navigation"
import { useLoading } from "@/hooks/use-loading"
import dynamic from "next/dynamic"
import { TransactionResult } from "@/lib/transaction-builder"
import { checkDuplicateProposal } from "@/lib/duplicate-detection"
import { climateDAOQuery } from "@/lib/blockchain-queries"
import { LocationPicker } from "@/components/location-picker"

// Lazy load transaction components to improve initial page load
const TransactionStatus = dynamic(() => import("@/components/transaction-status").then(mod => ({ default: mod.TransactionStatus })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-xl h-32"></div>
})
const TransactionCostEstimate = dynamic(() => import("@/components/transaction-status").then(mod => ({ default: mod.TransactionCostEstimate })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-xl h-16"></div>
})

export function SubmitProposalPage() {
  const { isConnected, address } = useWalletContext()
  const { submitProposal, loading, error } = useClimateDAO()
  const { setLoading } = useLoading()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    projectTitle: "",
    description: "",
    fundingAmount: "",
    duration: "",
    expectedImpact: "",
    category: "",
    location: "",
    lat: 0,
    lng: 0,
  })

  // Transaction state
  const [transactionState, setTransactionState] = useState<{
    status: 'idle' | 'pending' | 'confirmed' | 'failed'
    txId?: string
    result?: TransactionResult
    error?: string
  }>({ status: 'idle' })

  // Reset form on successful transaction
  useEffect(() => {
    if (transactionState.status === 'confirmed') {
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          projectTitle: "",
          description: "",
          fundingAmount: "",
          duration: "",
          expectedImpact: "",
          category: "",
          location: "",
          lat: 0,
          lng: 0,
        })
        setTransactionState({ status: 'idle' })
      }, 3000)
    }
  }, [transactionState.status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected) {
      alert("Please connect your wallet first!")
      router.push('/connect-wallet')
      return
    }

    // Check for duplicate proposals before submission
    try {
      const existingProposals = climateDAOQuery.getStoredProposals()
      console.log('=== DUPLICATE CHECK START ===')
      console.log('Checking duplicates against', existingProposals.length, 'proposals')
      console.log('New proposal title:', formData.projectTitle)
      console.log('Existing titles:', existingProposals.map(p => p.title))
      
      if (existingProposals.length > 0) {
        const duplicateCheck = await checkDuplicateProposal(
          formData.projectTitle,
          formData.description,
          existingProposals
        )
        console.log('Duplicate check result:', duplicateCheck)
        console.log('Is duplicate?', duplicateCheck.isDuplicate)
        console.log('Similar proposals:', duplicateCheck.similar)

        if (duplicateCheck.isDuplicate || duplicateCheck.similar.length > 0) {
          const similarTitles = duplicateCheck.similar.map(p => `• ${p.title} (${p.similarity}% similar)\n  Reason: ${p.reason}`).join('\n\n')
          alert(`⚠️ DUPLICATE PROPOSAL DETECTED\n\nThis proposal is too similar to existing ones!\n\nSimilar proposals:\n${similarTitles}\n\nPlease modify your proposal to make it unique.`)
          console.log('=== DUPLICATE CHECK: BLOCKED SUBMISSION ===')
          return
        }
      }
      console.log('=== DUPLICATE CHECK: PASSED ===')
    } catch (err) {
      console.error('Duplicate check failed:', err)
      // Continue with submission if duplicate check fails
    }

    // Reset transaction state
    setTransactionState({ status: 'pending' })
    setLoading(true, "Submitting your proposal to the blockchain...")

    try {
      const fundingAmountNum = parseInt(formData.fundingAmount) || 0

      // Save draft to sessionStorage BEFORE submitting so review page gets it
      const draftData = {
        title: formData.projectTitle,
        description: formData.description,
        category: formData.category,
        fundingAmount: fundingAmountNum,
        expectedImpact: formData.expectedImpact,
        location: formData.location,
        lat: formData.lat,
        lng: formData.lng,
      }

      // Submit proposal to blockchain
      const result = await submitProposal({
        title: formData.projectTitle,
        description: formData.description,
        fundingAmount: fundingAmountNum,
        expectedImpact: formData.expectedImpact,
        category: formData.category,
        location: formData.location,
      })

      // Now save draft with proposalId and txId
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('proposalDraft', JSON.stringify({
            ...draftData,
            txId: result.txId,
            proposalId: (result as any).proposalId || undefined
          }))
        }
      } catch (err) {
        console.warn('Failed to store proposal draft:', err)
      }

      // Update transaction state
      setTransactionState({ status: 'confirmed', txId: result.txId, result })

      // Reset form
      setFormData({
        projectTitle: "", description: "", fundingAmount: "",
        duration: "", expectedImpact: "", category: "",
        location: "", lat: 0, lng: 0,
      })

      // Redirect immediately to AI review
      router.push('/proposal-review')

    } catch (err) {
      console.error('Failed to submit proposal:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      
      // Update transaction state with error
      setTransactionState({
        status: 'failed',
        error: errorMessage
      })
    } finally {
      // Always ensure loading is turned off
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const closeTransactionStatus = () => {
    setTransactionState({ status: 'idle' })
  }

  return (
    <div className="relative flex flex-col min-h-[100dvh] text-black overflow-hidden">
      {/* Blue/Black Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-black"></div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Mobile-optimized Header */}
      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors touch-manipulation">
          <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm font-medium">Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
            <LeafIcon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="text-blue-400 font-bold text-base sm:text-lg">EcoNexus</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-4 py-6 pb-16">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          
          {/* Page Title */}
          <div className="text-center space-y-2 sm:space-y-4">
            <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">Submit Project Proposal</h1>

          </div>

          {/* Transaction Status */}
          {transactionState.status !== 'idle' && (
            <TransactionStatus
              status={transactionState.status}
              txId={transactionState.txId}
              result={transactionState.result}
              error={transactionState.error}
              onClose={closeTransactionStatus}
            />
          )}

          {/* Proposal Form */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-2xl">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                <FileTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                Project Details
              </CardTitle>
              <CardDescription className="text-white/70 text-sm">
                Provide comprehensive information about your climate impact project
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                
                {/* Project Title */}
                <div className="space-y-2">
                  <Label htmlFor="projectTitle" className="text-white font-medium text-sm">
                    Project Title *
                  </Label>
                  <Input
                    id="projectTitle"
                    type="text"
                    placeholder="e.g., Solar Power Installation for Rural Community"
                    value={formData.projectTitle}
                    onChange={(e) => handleInputChange("projectTitle", e.target.value)}
                    required
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-white/40 focus:ring-white/20 rounded-xl text-sm sm:text-base h-10 sm:h-12"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-white font-medium text-sm">
                    Category *
                  </Label>
                  <div className="relative">
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/20 text-white rounded-xl px-3 py-2 sm:px-4 sm:py-3 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 text-sm sm:text-base h-10 sm:h-12 touch-manipulation appearance-none"
                      style={{ color: formData.category ? 'white' : 'rgba(255, 255, 255, 0.4)' }}
                    >
                      <option value="" disabled className="bg-slate-800 text-white/60">Select category</option>
                      <option value="renewable-energy" className="bg-slate-800 text-white">Renewable Energy</option>
                      <option value="reforestation" className="bg-slate-800 text-white">Reforestation</option>
                      <option value="water-conservation" className="bg-slate-800 text-white">Water Conservation</option>
                      <option value="waste-management" className="bg-slate-800 text-white">Waste Management</option>
                      <option value="sustainable-agriculture" className="bg-slate-800 text-white">Sustainable Agriculture</option>
                      <option value="carbon-capture" className="bg-slate-800 text-white">Carbon Capture</option>
                      <option value="climate-education" className="bg-slate-800 text-white">Climate Education</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Location — full width with map */}
                <div className="space-y-2">
                  <Label className="text-white font-medium text-sm">Location *</Label>
                  <LocationPicker
                    value={formData.location}
                    onChange={(location, lat, lng) => setFormData(prev => ({ ...prev, location, lat, lng }))}
                  />
                </div>

                {/* Project Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white font-medium text-sm">
                    Project Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your project in detail, including objectives, methodology, and timeline..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    required
                    rows={4}
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-white/40 focus:ring-white/20 rounded-xl text-sm sm:text-base resize-none"
                  />
                  <p className="text-white/60 text-xs">
                    {formData.description.length}/1000 characters
                  </p>
                </div>

                {/* Expected Impact */}
                <div className="space-y-2">
                  <Label htmlFor="expectedImpact" className="text-white font-medium text-sm">
                    Expected Climate Impact *
                  </Label>
                  <Textarea
                    id="expectedImpact"
                    placeholder="Quantify the expected environmental benefits (e.g., CO2 reduction, people impacted, area covered)..."
                    value={formData.expectedImpact}
                    onChange={(e) => handleInputChange("expectedImpact", e.target.value)}
                    required
                    rows={3}
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-white/40 focus:ring-white/20 rounded-xl text-sm sm:text-base resize-none"
                  />
                </div>

                {/* Funding Amount & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fundingAmount" className="text-white font-medium text-sm">
                      Funding Requested (USD) *
                    </Label>
                    <div className="relative">
                      <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        id="fundingAmount"
                        type="number"
                        placeholder="50000"
                        value={formData.fundingAmount}
                        onChange={(e) => handleInputChange("fundingAmount", e.target.value)}
                        required
                        min="1"
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-white/40 focus:ring-white/20 rounded-xl text-sm sm:text-base h-10 sm:h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-white font-medium text-sm">
                      Project Duration
                    </Label>
                    <div className="relative">
                      <select
                        id="duration"
                        value={formData.duration}
                        onChange={(e) => handleInputChange("duration", e.target.value)}
                        className="w-full pl-4 pr-10 bg-white/5 border border-white/20 text-white rounded-xl px-3 py-2 sm:px-4 sm:py-3 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 text-sm sm:text-base h-10 sm:h-12 touch-manipulation appearance-none"
                        style={{ color: formData.duration ? 'white' : 'rgba(255, 255, 255, 0.4)' }}
                      >
                        <option value="" disabled className="bg-slate-800 text-white/60">Select duration</option>
                        <option value="3-months" className="bg-slate-800 text-white">3 months</option>
                        <option value="6-months" className="bg-slate-800 text-white">6 months</option>
                        <option value="1-year" className="bg-slate-800 text-white">1 year</option>
                        <option value="2-years" className="bg-slate-800 text-white">2 years</option>
                        <option value="3-years+" className="bg-slate-800 text-white">3+ years</option>
                      </select>
                      <CalendarIcon className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Cost Estimate */}
                <TransactionCostEstimate 
                  numTransactions={1}
                  className="bg-white/5 border-white/10 rounded-xl p-3 sm:p-4"
                />

                {/* Submit Button */}
                <div className="pt-4">
                  {!isConnected ? (
                    <div className="space-y-3">
                      <p className="text-center text-red-400 text-sm">
                        Please connect your wallet to submit a proposal
                      </p>
                      <Button
                        type="button"
                        onClick={() => router.push('/connect-wallet')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 sm:h-12 rounded-xl text-sm sm:text-base touch-manipulation"
                      >
                        Connect Wallet
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      disabled={loading || transactionState.status === 'pending'}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium h-10 sm:h-12 rounded-xl text-sm sm:text-base touch-manipulation"
                    >
                      {loading || transactionState.status === 'pending' ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Submitting to Blockchain...</span>
                        </div>
                      ) : (
                        <>
                          <UploadIcon className="w-4 h-4 mr-2" />
                          Submit Proposal
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Required Fields Note */}
                <p className="text-white/60 text-xs text-center">
                  * Required fields
                </p>

              </form>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-white text-base sm:text-lg">💡 Proposal Tips</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ul className="space-y-2 text-white/70 text-xs sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Be specific about your project's environmental impact and measurable outcomes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Include realistic funding requests with clear budget breakdown in description</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Proposals undergo community voting - engagement with voters increases success rate</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>All transactions are recorded on Algorand blockchain for transparency</span>
                </li>
              </ul>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}