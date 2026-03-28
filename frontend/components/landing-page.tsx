"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BotIcon, CoinsIcon, HandshakeIcon, LeafIcon, LightbulbIcon, VoteIcon, ArrowRightIcon, CheckCircleIcon, StarIcon, GithubIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import StarBorder from "@/components/ui/star-border"

export function LandingPage() {
  return (
    <div className="relative flex flex-col min-h-[100dvh] text-white overflow-hidden">
      {/* Moving Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 animate-moving-gradient"></div>
      </div>

      {/* Mobile-optimized Header */}
      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <LeafIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="text-teal-400 font-bold text-xl sm:text-3xl tracking-wide drop-shadow-lg">EcoNexus</div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/connect-wallet">
            <Button variant="ghost" className="bg-white/5 border border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm px-3 sm:px-4 py-2 h-8 sm:h-10 touch-manipulation">
              Connect Wallet
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Mobile-optimized Hero Section */}
        <section className="flex items-center justify-center min-h-[60vh] sm:min-h-[70vh] px-4 py-8">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            {/* Algorand Badge */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 bg-teal-500/10 border border-teal-500/30 rounded-full text-xs sm:text-sm text-teal-400 backdrop-blur-sm">
                <LeafIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Powered by Algorand's carbon-negative blockchain</span>
              </div>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight">
                AI-Governed DAO for <span className="climate-glow">Climate</span> Impact
              </h1>
              <p className="text-base sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Revolutionizing green project funding with hybrid intelligence on Algorand. 
                AI-powered impact assessment meets human wisdom for climate action.
              </p>
            </div>
            
            <div className="flex justify-center items-center pt-4">
              <Link href="/connect-wallet">
                <StarBorder 
                  color="#14b8a6" 
                  speed="3s"
                  thickness={4}
                  className="transition-all duration-300 transform hover:scale-105 touch-manipulation"
                >
                  <div className="flex items-center gap-2 text-base sm:text-lg font-semibold px-2 py-1">
                    Join the DAO
                    <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </StarBorder>
              </Link>
            </div>
          </div>
        </section>

        {/* Mobile-optimized How It Works */}
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
                Hybrid Decision-Making Model
              </h2>
              <p className="text-sm sm:text-xl text-gray-300 max-w-2xl mx-auto">
                AI precision meets community wisdom for impactful climate action
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <LightbulbIcon className="w-6 h-6 sm:w-8 sm:h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">Submit</h3>
                  <p className="text-gray-300 text-xs sm:text-sm">Organizations submit green project proposals</p>
                </div>
              </div>

              <div className="text-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <BotIcon className="w-6 h-6 sm:w-8 sm:h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">AI Analysis</h3>
                  <p className="text-gray-300 text-xs sm:text-sm">AI evaluates environmental impact score</p>
                </div>
              </div>

              <div className="text-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <VoteIcon className="w-6 h-6 sm:w-8 sm:h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">Vote</h3>
                  <p className="text-gray-300 text-xs sm:text-sm">Community reviews and votes on proposals</p>
                </div>
              </div>

              <div className="text-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <HandshakeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-xl font-semibold text-white mb-1 sm:mb-2">Fund</h3>
                  <p className="text-gray-300 text-xs sm:text-sm">Smart contracts release funding automatically</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile-optimized Key Features */}
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">Why EcoNexus?</h2>
              <p className="text-sm sm:text-xl text-gray-300 max-w-2xl mx-auto">
                Transparent, efficient, and impactful climate action through innovation
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all duration-300">
                <CardHeader className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                    <BotIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                  </div>
                  <CardTitle className="text-white text-base sm:text-lg">AI-Powered Assessment</CardTitle>
                  <CardDescription className="text-white/70 text-sm">
                    Advanced AI evaluates project environmental impact objectively
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all duration-300">
                <CardHeader className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                    <VoteIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                  <CardTitle className="text-white text-base sm:text-lg">Transparent Voting</CardTitle>
                  <CardDescription className="text-white/70 text-sm">
                    All votes recorded on blockchain for complete transparency
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all duration-300">
                <CardHeader className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                    <LeafIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white text-base sm:text-lg">Carbon Negative</CardTitle>
                  <CardDescription className="text-white/70 text-sm">
                    Built on Algorand's environmentally sustainable blockchain
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all duration-300">
                <CardHeader className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                    <HandshakeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                  </div>
                  <CardTitle className="text-white text-base sm:text-lg">Smart Contracts</CardTitle>
                  <CardDescription className="text-white/70 text-sm">
                    Automated funding release based on milestone achievements
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all duration-300">
                <CardHeader className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                    <CoinsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  </div>
                  <CardTitle className="text-white text-base sm:text-lg">Global Impact</CardTitle>
                  <CardDescription className="text-white/70 text-sm">
                    Fund climate projects worldwide with minimal barriers
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all duration-300">
                <CardHeader className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
                  </div>
                  <CardTitle className="text-white text-base sm:text-lg">Community Driven</CardTitle>
                  <CardDescription className="text-white/70 text-sm">
                    Democratic governance with token-based voting rights
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Mobile-optimized Call to Action */}
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-4xl font-bold text-white">Ready to Make an Impact?</h2>
            <p className="text-sm sm:text-xl text-gray-300 max-w-2xl mx-auto">
              Join the EcoNexus community and start funding climate projects that matter
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4">
              <Link href="/connect-wallet">
                <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 sm:px-8 py-3 rounded-xl text-sm sm:text-base h-12 sm:h-14 touch-manipulation">
                  Connect Wallet & Start Voting
                </Button>
              </Link>
              <Link href="/submit-proposal">
                <Button variant="ghost" className="w-full sm:w-auto bg-white/5 border border-white/20 text-white hover:bg-white/10 font-medium px-6 sm:px-8 py-3 rounded-xl text-sm sm:text-base h-12 sm:h-14 touch-manipulation">
                  Submit Your Project
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile-optimized Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
                  <LeafIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-teal-400 font-bold text-lg">EcoNexus</span>
              </div>
              <p className="text-white/60 text-xs sm:text-sm">
                AI-governed climate action DAO on Algorand blockchain
              </p>
            </div>
            
            <div className="text-center">
              <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <Link href="/dashboard" className="block text-white/60 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/submit-proposal" className="block text-white/60 hover:text-white transition-colors">
                  Submit Proposal
                </Link>
                <Link href="/submission-guidelines" className="block text-white/60 hover:text-white transition-colors">
                  Guidelines
                </Link>
              </div>
            </div>
            
            <div className="text-center sm:text-right">
              <h4 className="text-white font-semibold mb-3 text-sm">Connect</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a 
                  href="https://algorand.foundation/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-white/60 hover:text-white transition-colors"
                >
                  Algorand
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center">
            <p className="text-white/40 text-xs">
              © 2024 EcoNexus.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}