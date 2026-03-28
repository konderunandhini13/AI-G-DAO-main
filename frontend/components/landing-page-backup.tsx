"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BotIcon, CoinsIcon, HandshakeIcon, LeafIcon, LightbulbIcon, VoteIcon, ArrowRightIcon, CheckCircleIcon, StarIcon } from "lucide-react"
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

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <LeafIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-teal-400 font-bold text-3xl tracking-wide drop-shadow-lg">EcoNexus</div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/connect-wallet">
            <Button variant="outline" className="border-teal-500/50 text-teal-400 hover:bg-teal-500/10 bg-transparent">
              Connect Wallet
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="flex items-center justify-center min-h-[70vh] px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Algorand Badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-full text-sm text-teal-400 backdrop-blur-sm">
                <LeafIcon className="w-4 h-4" />
                <span>Powered by Algorand's carbon-negative blockchain</span>
              </div>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                AI-Governed DAO for <span className="climate-glow">Climate</span> Impact
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Revolutionizing green project funding with hybrid intelligence on Algorand. 
                AI-powered impact assessment meets human wisdom for climate action.
              </p>
            </div>
            
            <div className="flex justify-center items-center">
              <Link href="/connect-wallet">
                <StarBorder 
                  color="#14b8a6" 
                  speed="3s"
                  thickness={4}
                  className="transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex items-center gap-2 text-lg font-semibold px-2 py-1">
                    Join the DAO
                    <ArrowRightIcon className="w-5 h-5" />
                  </div>
                </StarBorder>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works - Simplified */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Hybrid Decision-Making Model
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                AI precision meets community wisdom for impactful climate action
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <LightbulbIcon className="w-8 h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Submit</h3>
                  <p className="text-gray-300 text-sm">Organizations submit green project proposals</p>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <BotIcon className="w-8 h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">AI Analysis</h3>
                  <p className="text-gray-300 text-sm">AI evaluates environmental impact score</p>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <VoteIcon className="w-8 h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Vote</h3>
                  <p className="text-gray-300 text-sm">Community reviews and votes on proposals</p>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
                  <HandshakeIcon className="w-8 h-8 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Fund</h3>
                  <p className="text-gray-300 text-sm">Smart contracts release funding automatically</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Why EcoNexus?</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Transparent, efficient, and impactful climate action through innovation
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-black/30 border-teal-500/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BotIcon className="w-6 h-6 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">AI-Powered Vetting</h3>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Intelligent scoring ensures only the most impactful climate projects receive funding
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/30 border-teal-500/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <VoteIcon className="w-6 h-6 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Decentralized Governance</h3>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Global community collectively decides the future of climate finance
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/30 border-teal-500/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <LeafIcon className="w-6 h-6 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Real Impact</h3>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Direct funding for verified projects with measurable CO₂ reduction
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/30 border-teal-500/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Image
                      src="/algorand_logo_mark.png"
                      alt="Algorand"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                      style={{ filter: "brightness(0) invert(1) sepia(1) saturate(10000%) hue-rotate(170deg)" }}
                    />
                    <h3 className="text-lg font-semibold text-white">Algorand Powered</h3>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Secure, scalable, and environmentally friendly blockchain infrastructure
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/30 border-teal-500/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CoinsIcon className="w-6 h-6 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Tokenized Credits</h3>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Transparent management of verified carbon credits with easy transfer
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black/30 border-teal-500/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircleIcon className="w-6 h-6 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Hybrid Innovation</h3>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Unique decision-making model setting new standards for environmental initiatives
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-black/20 backdrop-blur-sm border border-teal-500/20 rounded-2xl p-12">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Shape Climate's Future?</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join our community of innovators funding verified climate projects through intelligent governance
              </p>
              <Link href="/connect-wallet">
                <Button size="lg" className="px-8 py-4 text-lg bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105">
                  Get Started Now
                  <ArrowRightIcon className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} EcoNexus.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes moving-gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-moving-gradient {
          background: linear-gradient(270deg, #000000, #000080, #000000);
          background-size: 400% 400%;
          animation: moving-gradient 15s ease infinite;
        }

        @keyframes blink-glow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(0, 255, 255, 0.3), 0 0 10px rgba(0, 255, 255, 0.3), 0 0 15px rgba(0, 255, 255, 0.3);
          }
          50% {
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.8), 0 0 25px rgba(0, 255, 255, 0.8), 0 0 35px rgba(0, 255, 255, 0.8);
          }
        }
        .climate-glow {
          animation: blink-glow 3s infinite alternate;
          color: #00FFFF;
        }
      `}</style>
    </div>
  )
}
