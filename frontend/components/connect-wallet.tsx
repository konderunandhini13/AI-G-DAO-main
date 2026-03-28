"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WalletIcon, ArrowLeftIcon, CheckCircleIcon, ExternalLinkIcon, LeafIcon } from "lucide-react"
import Link from "next/link"
import { useWalletContext } from "@/hooks/use-wallet"
import { useRouter } from "next/navigation"
import { useLoading } from "@/hooks/use-loading"

export function WalletConnectPage() {
  const { isConnected, address, balance, connect, disconnect, loading, error, clearError } = useWalletContext()
  const { setLoading } = useLoading()
  const router = useRouter()

  const handleConnectWallet = async () => {
    try {
      clearError()
      setLoading(true, "Connecting to Pera Wallet...")
      await connect()
      
      // Redirect back to where user came from, or dashboard
      const redirectTo = localStorage.getItem('redirect_after_connect') || '/dashboard'
      localStorage.removeItem('redirect_after_connect')
      setLoading(true, "Redirecting...")
      setTimeout(() => {
        router.push(redirectTo)
      }, 1000)
    } catch (err) {
      console.error('Failed to connect wallet:', err)
    } finally {
      if (!isConnected) {
        setLoading(false)
      }
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const handleEnterDashboard = () => {
    const redirectTo = localStorage.getItem('redirect_after_connect') || '/dashboard'
    localStorage.removeItem('redirect_after_connect')
    router.push(redirectTo)
  }

  return (
    <div className="relative flex flex-col min-h-[100dvh] text-white overflow-hidden">
      {/* Blue Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"></div>
      </div>

      {/* Mobile-optimized Header with Back Button */}
      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <Link href="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors touch-manipulation">
          <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm font-medium">Back to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
            <LeafIcon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="text-blue-400 font-bold text-base sm:text-lg">EcoNexus</div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="text-center space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">Connect Your Algorand Wallet</h1>
            <p className="text-blue-300 text-sm sm:text-lg">
              Connect your Pera Wallet to participate in EcoNexus on Algorand blockchain
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-xs sm:text-sm text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Algorand Network • Carbon Negative</span>
            </div>
          </div>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl">
            <CardHeader className="text-center space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <WalletIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl text-white">Pera Wallet (Algorand)</CardTitle>
              <CardDescription className="text-white/70 text-sm sm:text-base">
                The official wallet for Algorand blockchain. EcoNexus does not support MetaMask or Ethereum wallets.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4 space-y-3">
                  <p className="text-red-400 text-xs sm:text-sm">{error}</p>
                  {error.includes('MetaMask') && (
                    <div className="text-xs text-white/60 space-y-1">
                      <p><strong>Why can't I use MetaMask?</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>EcoNexus is built on Algorand blockchain (carbon-negative)</li>
                        <li>MetaMask only supports Ethereum-compatible networks</li>
                        <li>You need Pera Wallet for Algorand interactions</li>
                        <li>Visit <a href="https://perawallet.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">perawallet.app</a> to download</li>
                      </ul>
                    </div>
                  )}
                  {error.includes('install Pera Wallet') && (
                    <div className="text-xs text-white/60 space-y-1">
                      <p>To install Pera Wallet:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Visit <a href="https://perawallet.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">perawallet.app</a></li>
                        <li>Download the browser extension or mobile app</li>
                        <li>Create or import your wallet</li>
                        <li>Refresh this page and try again</li>
                      </ul>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearError}
                    className="bg-white/5 border border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm h-8 sm:h-9 touch-manipulation"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {isConnected && address ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2 text-green-400">
                    <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-semibold text-sm sm:text-base">Pera Wallet Connected!</span>
                  </div>

                  {loading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-blue-400 text-xs sm:text-sm">Redirecting to dashboard...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 sm:p-4">
                        <p className="text-xs text-white/60 mb-1">Connected Address:</p>
                        <p className="text-xs sm:text-sm text-blue-400 font-mono break-all">{address}</p>
                        <p className="text-xs text-white/60 mt-2">Balance: {balance.toFixed(2)} ALGO</p>
                        {balance < 1 && (
                          <div className="mt-3">
                            <a
                              href="https://dispenser.testnet.aws.algodev.network/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline touch-manipulation"
                            >
                              Get testnet ALGO
                              <ExternalLinkIcon className="w-3 h-3" />
                            </a>
                            <p className="text-xs text-white/60 mt-1">
                              You need ALGO for transaction fees
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Button 
                          onClick={handleEnterDashboard}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium text-sm sm:text-base h-10 sm:h-12 rounded-xl touch-manipulation"
                        >
                          Enter Dashboard
                        </Button>
                        
                        <Button 
                          onClick={handleDisconnect}
                          variant="ghost"
                          className="w-full bg-white/5 border border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm h-8 sm:h-9 rounded-xl touch-manipulation"
                        >
                          Disconnect Wallet
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-white/80 text-sm sm:text-base">
                      Connect your Pera Wallet to get started
                    </p>
                    <div className="text-xs text-white/60 space-y-1">
                      <p>Don't have Pera Wallet?</p>
                      <a
                        href="https://perawallet.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline touch-manipulation"
                      >
                        Download from perawallet.app
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <Button 
                    onClick={handleConnectWallet}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 text-sm sm:text-base h-10 sm:h-12 rounded-xl touch-manipulation"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      'Connect Pera Wallet'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile-optimized Features Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <LeafIcon className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-white font-medium text-xs sm:text-sm">Carbon Negative</p>
              <p className="text-white/60 text-xs">Algorand blockchain</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-white font-medium text-xs sm:text-sm">Secure Voting</p>
              <p className="text-white/60 text-xs">Blockchain verified</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <CheckCircleIcon className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-white font-medium text-xs sm:text-sm">Transparent</p>
              <p className="text-white/60 text-xs">All votes public</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}