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
      
      // Auto-redirect to dashboard after successful connection
      setLoading(true, "Redirecting to dashboard...")
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000) // Give user a moment to see success message
    } catch (err) {
      console.error('Failed to connect wallet:', err)
    } finally {
      // Keep loading state for redirect
      if (!isConnected) {
        setLoading(false)
      }
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const handleEnterDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="relative flex flex-col min-h-[100dvh] text-white overflow-hidden">
      {/* Blue Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"></div>
      </div>

      {/* Header with Back Button */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <Link href="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
            <LeafIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-blue-400 font-bold text-lg">EcoNexus</div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white">Connect Your Algorand Wallet</h1>
            <p className="text-blue-300 text-lg">
              Connect your Pera Wallet to participate in EcoNexus on Algorand blockchain
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-sm text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Algorand Network • Carbon Negative</span>
            </div>
          </div>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <WalletIcon className="w-8 h-8 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-white">Pera Wallet (Algorand)</CardTitle>
              <CardDescription className="text-white/70">
                The official wallet for Algorand blockchain. EcoNexus does not support MetaMask or Ethereum wallets.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                  <p className="text-red-400 text-sm">{error}</p>
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
                    variant="outline" 
                    size="sm" 
                    onClick={clearError}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {isConnected && address ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2 text-green-400">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-semibold">Pera Wallet Connected!</span>
                  </div>

                  {loading ? (
                    <div className="text-center py-4">
                      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-blue-400 text-sm">Redirecting to dashboard...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-xs text-white/60 mb-1">Connected Address:</p>
                        <p className="text-sm text-blue-400 font-mono break-all">{address}</p>
                        <p className="text-xs text-white/60 mt-2">Balance: {balance.toFixed(2)} ALGO</p>
                        {balance < 1 && (
                          <div className="mt-3">
                            <a
                              href="https://dispenser.testnet.aws.algodev.network/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-all duration-200"
                            >
                              <ExternalLinkIcon className="w-4 h-4 mr-1" />
                              Get TestNet ALGOs
                            </a>
                            <div className="text-xs text-yellow-300 mt-2">
                              Minimum 1 ALGO required to vote or submit proposals.<br />
                              Use the TestNet dispenser to fund your wallet.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Button
                          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                          onClick={handleEnterDashboard}
                        >
                          Enter DAO Dashboard
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 py-3 rounded-lg transition-all duration-300 bg-transparent"
                          onClick={handleDisconnect}
                        >
                          Disconnect Wallet
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <Button
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleConnectWallet}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      "Connect Algorand Wallet (Pera)"
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <p className="text-xs text-white/60">
                      By connecting, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center space-y-3">
            <p className="text-sm text-white/60">Don't have an Algorand wallet?</p>
            <a
              href="https://perawallet.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium underline underline-offset-2"
            >
              Download Pera Wallet
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
              <p className="text-xs text-white/70 leading-relaxed">
                <strong>Need TestNet ALGOs?</strong><br/>
                Visit the <a href="https://testnet.algoexplorer.io/dispenser" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Algorand TestNet Dispenser</a> to get free test tokens for trying the DAO.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
              <p className="text-xs text-yellow-400 leading-relaxed">
                <strong>⚠️ Important:</strong> EcoNexus uses Algorand blockchain, not Ethereum. MetaMask will not work with this platform. Please use Pera Wallet for Algorand.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
