"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  PlusIcon, 
  VoteIcon, 
  FileTextIcon, 
  BrainCircuitIcon, 
  WalletIcon,
  TrendingUpIcon,
  Users2Icon,
  CoinsIcon,
  CheckCircleIcon,
  ClockIcon,
  MenuIcon,
  XIcon,
  SparklesIcon,
  SettingsIcon,
  LeafIcon,
  Search,
  LogOutIcon
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useWalletContext } from "@/hooks/use-wallet"
import { useClimateDAO } from "@/hooks/use-climate-dao"
import { StatsSkeleton, CardSkeleton } from "@/components/ui/skeleton"
import { WalletInfo } from "@/components/wallet-guard"
import { TransactionNotification } from "@/components/transaction-notification"
import { ProposalFilters } from "@/components/proposal-filters"
import { ProposalSearch, SearchResults } from "@/components/proposal-search"
import { FavoriteButton } from "@/components/favorite-button"
import { filterProposalsByCategories, getCategoryById } from "@/lib/proposal-categories"
import { ProposalSearchEngine, SearchResult } from "@/lib/proposal-search"
import { favoritesManager } from "@/lib/proposal-favorites"
import dynamic from "next/dynamic"
import { memberTracker } from '@/lib/member-tracker'
import { useSettings } from '@/hooks/use-settings'

// Lazy load heavy components to improve initial page load
const VotingHistory = dynamic(() => import("@/components/voting-history").then(mod => ({ default: mod.VotingHistory })), {
  loading: () => <CardSkeleton />
})
const UserProposalsTracker = dynamic(() => import("@/components/user-proposals-tracker").then(mod => ({ default: mod.UserProposalsTracker })), {
  loading: () => <CardSkeleton />
})
const TransactionHistory = dynamic(() => import("@/components/transaction-history").then(mod => ({ default: mod.TransactionHistory })), {
  loading: () => <CardSkeleton />
})
const NotificationsPanel = dynamic(() => import("@/components/notifications-panel").then(mod => ({ default: mod.NotificationsPanel })), {
  loading: () => <CardSkeleton />
})

export function DashboardPage() {
  const { isConnected, address, balance, disconnect } = useWalletContext()
  const router = useRouter()
  const { theme, t, setTheme } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { getProposals, getTotalProposals, getBlockchainStats, voteOnProposal, deleteProposal } = useClimateDAO()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [activeProposals, setActiveProposals] = useState<any[]>([])
  const [userProposals, setUserProposals] = useState<any[]>([])
  const [showMyProposals, setShowMyProposals] = useState(false)
  const [totalProposalsCount, setTotalProposalsCount] = useState(0)
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null)
  const TREASURY_ADDR = '5TVL4FSSJ7OL245FRMZALZQICP3CTRT262S7YUFTLK3ZBBBFVKELOEV5XM'
  
  // NEW: Filtering state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passed' | 'rejected' | 'expired'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // NEW: Search state
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSearching, setIsSearching] = useState<boolean>(false)
  
  // NEW: Favorites state
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false)
  const [favorites, setFavorites] = useState<string[]>([])
  
  // Transaction notification state
  const [transactionNotification, setTransactionNotification] = useState<{
    isOpen: boolean;
    txId: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    txId: '',
    message: '',
    type: 'success'
  })
  const [blockchainStats, setBlockchainStats] = useState({
    totalProposals: 0,
    totalMembers: typeof window !== 'undefined' ? memberTracker.getCachedCount() : 0,
    activeProposals: 0,
    userProposalCount: 0,
    userVoteCount: 0
  })

  // NEW: Filtered proposals using useMemo for performance
  const filteredProposals = useMemo(() => {
    let filtered = [...proposals];
    
    // Apply search filter first
    if (searchTerm.trim()) {
      const searchEngine = ProposalSearchEngine.getInstance();
      const searchResults = searchEngine.search(proposals, searchTerm);
      filtered = searchResults; // SearchResult objects are already enhanced proposals
    }
    
    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = favoritesManager.filterFavoriteProposals(filtered);
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filterProposalsByCategories(filtered, selectedCategories);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === statusFilter);
    }
    
    return filtered;
  }, [proposals, selectedCategories, statusFilter, searchTerm, showFavoritesOnly]);

  const filteredActiveProposals = useMemo(() => {
    let filtered = [...activeProposals];
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filterProposalsByCategories(filtered, selectedCategories);
    }
    
    return filtered;
  }, [activeProposals, selectedCategories]);

  // Listen for real-time member count updates (fires when wallet connects)
  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent).detail?.count;
      if (count) setBlockchainStats(prev => ({ ...prev, totalMembers: count }));
    };
    window.addEventListener('member-count-updated', handler);

    // Also fetch live count on mount
    fetch('/api/members')
      .then(r => r.json())
      .then(data => {
        if (data.count > 0)
          setBlockchainStats(prev => ({ ...prev, totalMembers: data.count }));
      })
      .catch(() => {});

    return () => window.removeEventListener('member-count-updated', handler);
  }, [])

  // Validate wallet connection and address format for Algorand
  useEffect(() => {
    if (isConnected && address) {
      // Validate Algorand address format (should be 58 characters)
      if (address.length !== 58) {
        console.warn('Invalid Algorand address format detected')
        disconnect() // Force disconnect if not a valid Algorand address
      }
    }
  }, [isConnected, address, disconnect])

  // Remove artificial loading delay for better performance
  useEffect(() => {
    setIsLoading(false)
  }, [])

  // Load and subscribe to favorites changes
  useEffect(() => {
    // Load initial favorites
    setFavorites(favoritesManager.getFavorites())
    
    // Subscribe to changes
    const unsubscribe = favoritesManager.subscribe((updatedFavorites) => {
      setFavorites(updatedFavorites)
    })
    
    return unsubscribe
  }, [])

  // Fetch proposals data and listen for community updates
  useEffect(() => {
    const fetchProposalData = async () => {
      try {
        setIsLoading(true)

        // Get all proposals
        const allProposals = await getProposals()
        setProposals(allProposals)
        
        const activeProposals = allProposals.filter(p => p.status === 'active')
        setActiveProposals(activeProposals)
        
        if (address) {
          const userProposals = allProposals.filter(p => p.creator === address)
          setUserProposals(userProposals)
        }
        
        setTotalProposalsCount(allProposals.length)
        
        const stats = await getBlockchainStats()
        setBlockchainStats(stats)
      } catch (error) {
        console.error('Failed to fetch proposal data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposalData()

    const handleCommunityProposalUpdate = () => {
      fetchProposalData()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'climate_dao_proposals') {
        fetchProposalData()
      }
    }

    window.addEventListener('climate_dao_proposals_updated', handleCommunityProposalUpdate)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('climate_dao_proposals_updated', handleCommunityProposalUpdate)
      window.removeEventListener('storage', handleStorage)
    }
  }, [isConnected, address])

  // Set initial time on client side only - no constant updates for performance
  useEffect(() => {
    setCurrentTime(new Date())
  }, [])

  // Fetch treasury balance live from Algorand, refresh every 30s
  useEffect(() => {
    const fetchTreasury = async () => {
      try {
        const res = await fetch('/api/treasury')
        if (res.ok) {
          const data = await res.json()
          setTreasuryBalance(data.balanceAlgo)
        }
      } catch {}
    }
    fetchTreasury()
    const interval = setInterval(fetchTreasury, 10000)
    return () => clearInterval(interval)
  }, [])


  const handleDeleteProposal = async (proposalId: number) => {
    if (!confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      return
    }

    try {
      await deleteProposal(proposalId)
      
      // Refresh proposals after deletion
      const allProposals = await getProposals()
      setProposals(allProposals)
      const activeProposals = allProposals.filter(p => p.status === 'active')
      setActiveProposals(activeProposals)
      
      if (address) {
        const userProposals = allProposals.filter(p => p.creator === address)
        setUserProposals(userProposals)
      }
      
      setTransactionNotification({
        isOpen: true,
        txId: '',
        message: 'Proposal deleted successfully',
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to delete proposal:', error)
      setTransactionNotification({
        isOpen: true,
        txId: '',
        message: error instanceof Error ? error.message : 'Failed to delete proposal',
        type: 'error'
      })
    }
  }

  // Handle voting on proposals - Enhanced with notification system
  const handleVote = async (proposalId: number, voteType: 'for' | 'against') => {
    if (!isConnected) {
      setTransactionNotification({
        isOpen: true,
        txId: '',
        message: 'Please connect your wallet to vote',
        type: 'error'
      })
      return
    }

    try {
      setVotingProposalId(proposalId.toString())
      console.log('🗳️ Starting vote process:', { proposalId, voteType, address })
      
      const result = await voteOnProposal(proposalId, voteType)
      console.log('🎉 Vote result:', result)
      
      // If the result explicitly indicates a non-success (e.g. duplicate vote), show a friendly notification
      if ((result as any).success === false && (result as any).message) {
        setTransactionNotification({
          isOpen: true,
          txId: '',
          message: (result as any).message,
          type: 'warning'
        })
        return
      }

      // If we get a result with txId, the vote was successful
      if (result.txId) {
        // Refresh proposals data after successful vote
        const allProposals = await getProposals()
        setProposals(allProposals)
        const activeProposals = allProposals.filter(p => p.status === 'active')
        setActiveProposals(activeProposals)
        
        // Show success notification with copyable transaction ID
        setTransactionNotification({
          isOpen: true,
          txId: result.txId,
          message: `Your "${voteType}" vote has been successfully recorded on the Algorand blockchain!`,
          type: 'success'
        })
      } else {
        throw new Error('No transaction ID returned - vote may have failed')
      }
    } catch (error) {
      console.error(' Voting error details:', error)
      
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Show error notification
      setTransactionNotification({
        isOpen: true,
        txId: '',
        message: `Vote failed: ${errorMessage}`,
        type: 'error'
      })
    } finally {
      setVotingProposalId(null)
    }
  }

  const quickActions = [
    {
      title: "Submit Proposal",
      description: "Share your climate project idea",
      icon: PlusIcon,
      href: "/submit-proposal",
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/25"
    },
    {
      title: "AI Review",
      description: "Get AI analysis for proposals", 
      icon: BrainCircuitIcon,
      href: "/proposal-review",
      gradient: "from-purple-500 to-pink-500",
      shadow: "shadow-purple-500/25"
    },
    {
      title: "Vote on Proposals",
      description: "Participate in DAO governance",
      icon: VoteIcon,
      href: "/vote",
      gradient: "from-green-500 to-emerald-500", 
      shadow: "shadow-green-500/25"
    },
    {
      title: "DAO Treasury",
      description: treasuryBalance !== null ? `${treasuryBalance.toFixed(2)} ALGO available` : 'Loading...',
      icon: CoinsIcon,
      href: `/treasury`,
      gradient: "from-orange-500 to-yellow-500",
      shadow: "shadow-orange-500/25",
      external: false,
    },
  ]

  const stats = [
    { 
      label: "Active Proposals", 
      value: filteredActiveProposals.length.toString(), 
      change: filteredActiveProposals.length > 0 ? "+12%" : "0%", 
      icon: FileTextIcon, 
      color: "blue" 
    },
    { 
      label: "Total Proposals", 
      value: filteredProposals.length.toString(), 
      change: filteredProposals.length > 0 ? "+8%" : "0%", 
      icon: VoteIcon, 
      color: "green" 
    },
    { 
      label: "Climate Credits", 
      value: "2,456", // This will be from blockchain when credits are implemented
      change: "+15%", 
      icon: CoinsIcon, 
      color: "yellow" 
    },
    { 
      label: "Community Members", 
      value: blockchainStats.totalMembers.toString(), 
      change: blockchainStats.totalMembers > 0 ? "+5%" : "0%", 
      icon: Users2Icon, 
      color: "purple" 
    }
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-40 right-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/4 right-1/4 w-40 h-40 bg-pink-500/5 rounded-full blur-2xl animate-bounce"></div>
      </div>

      {/* Floating Navigation */}
      <nav className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl px-3 sm:px-6 sm:top-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 sm:py-4 shadow-2xl hover:bg-white/15 transition-all duration-300">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/25">
                <LeafIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base sm:text-lg">EcoNexus</h1>
                <p className="text-white/60 text-xs hidden sm:block">Climate DAO Platform</p>
              </div>
            </div>

            {/* Mobile-first Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden sm:block">
                <WalletInfo />
              </div>
              <NotificationsPanel />
              <div className="relative">
                <Button
                  variant="ghost" size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2"
                  onClick={() => setSettingsOpen(o => !o)}
                >
                  <SettingsIcon className="w-4 h-4" />
                </Button>

                {settingsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setSettingsOpen(false); setLangOpen(false); }} />
                    <div className="absolute right-0 top-10 z-50 w-60 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">

                      {/* Wallet header */}
                      {isConnected && (
                        <div className="px-4 py-3 border-b border-white/10">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="text-white/80 text-xs font-medium">Connected</span>
                          </div>
                          <p className="text-white/40 text-xs font-mono truncate">{address?.slice(0,10)}...{address?.slice(-6)}</p>
                          <p className="text-white/60 text-xs mt-0.5">{balance.toFixed(3)} ALGO</p>
                        </div>
                      )}

                      <div className="py-2 px-3">
                        {/* Theme toggle */}
                        <div className="flex items-center justify-between py-2">
                          <span className="text-white/70 text-sm flex items-center gap-2">
                            {theme === 'dark' ? '🌙' : '☀️'} Theme
                          </span>
                          <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              theme === 'light' ? 'bg-blue-500' : 'bg-white/20'
                            }`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              theme === 'light' ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Disconnect */}
                      <div className="border-t border-white/10 py-1.5">
                        <button
                          onClick={() => { setSettingsOpen(false); disconnect(); router.push('/connect-wallet'); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOutIcon className="w-4 h-4" />
                          Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Mobile wallet info */}
              <div className="sm:hidden">
                {isConnected ? (
                  <div className="flex items-center gap-2 px-2 py-1 bg-white/10 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-white text-xs">{balance.toFixed(1)}</span>
                  </div>
                ) : (
                  <Link href="/connect-wallet">
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-3 py-1">
                      Connect
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-20 sm:pt-32 pb-20 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          
          {/* Mobile-optimized Welcome */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-xs sm:text-sm text-white/80 mb-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
             Take One step Towards a Greener Future
            </div>
          </div>

          {/* Stats Grid */}
          {isLoading ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <Card key={index} className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-2xl flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                      </div>
                      <span className="text-green-400 text-sm font-medium bg-green-500/10 px-2 py-1 rounded-full">
                        {stat.change}
                      </span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                      <p className="text-white/60 text-sm">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Actions Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} showHeader={false} lines={2} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {quickActions.map((action, index) => (
                action.external ? (
                  <a key={index} href={action.href} target="_blank" rel="noopener noreferrer" className="group">
                    <Card className={`bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl hover:bg-white/10 transition-all duration-500 group-hover:scale-105 ${action.shadow} hover:shadow-2xl`}>
                      <CardContent className="p-8 text-center space-y-4">
                        <div className={`w-20 h-20 bg-gradient-to-br ${action.gradient} rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                          <action.icon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg mb-1">{action.title}</h3>
                          <p className="text-white/60 text-sm leading-relaxed">{action.description}</p>
                          <p className="text-white/30 text-xs font-mono mt-2 truncate">{TREASURY_ADDR.slice(0,10)}...{TREASURY_ADDR.slice(-6)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ) : (
                  <Link key={index} href={action.href} className="group">
                    <Card className={`bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl hover:bg-white/10 transition-all duration-500 group-hover:scale-105 ${action.shadow} hover:shadow-2xl`}>
                      <CardContent className="p-8 text-center space-y-6">
                        <div className={`w-20 h-20 bg-gradient-to-br ${action.gradient} rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                          <action.icon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg mb-2">{action.title}</h3>
                          <p className="text-white/60 text-sm leading-relaxed">{action.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              ))}
            </div>
          )}

          {/* Search Interface */}
          <div className="mb-8">
            <ProposalSearch
              proposals={proposals}
              onSearchResults={(results) => {
                // Search results are handled by filteredProposals useMemo
              }}
              onSearchTermChange={setSearchTerm}
            />
          </div>

          {/* Proposal Filters */}
          <ProposalFilters
            proposals={proposals}
            activeProposals={activeProposals}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showFavoritesOnly={showFavoritesOnly}
            onFavoritesToggle={setShowFavoritesOnly}
          />

          {/* Search Results Section */}
          {searchTerm.trim() && (
            <div className="mb-8">
              <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white text-xl font-semibold flex items-center gap-3">
                    <Search className="w-5 h-5 text-cyan-400" />
                    Search Results for "{searchTerm}"
                  </h2>
                  <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 rounded-full">
                    {filteredProposals.length} found
                  </Badge>
                </div>
                
                {filteredProposals.length > 0 ? (
                  <SearchResults 
                    results={(() => {
                      const searchEngine = ProposalSearchEngine.getInstance();
                      return searchEngine.search(proposals, searchTerm);
                    })()} 
                    searchTerm={searchTerm}
                    onVote={handleVote}
                    votingProposalId={votingProposalId}
                  />
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white/60 text-lg">No proposals found matching "{searchTerm}"</p>
                    <p className="text-white/40 text-sm mt-2">Try adjusting your search terms or filters</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dashboard Content Grid - Mobile-first */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
            
            {/* My Proposals Card - Enhanced with Real Data */}
            <UserProposalsTracker />

            {/* Active Votes Card */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl hover:bg-white/10 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                      <VoteIcon className="w-5 h-5 text-white" />
                    </div>
                    Active Votes
                  </CardTitle>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 rounded-full text-xs">
                    {filteredActiveProposals.length} Pending
                  </Badge>
                </div>
                <CardDescription className="text-white/60 text-sm">
                  Proposals awaiting your vote
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Active Proposals */}
                {filteredActiveProposals.length > 0 ? (
                  filteredActiveProposals.slice(0, 3).map((proposal) => {
                    const timeLeft = Math.ceil((proposal.endTime - Date.now()) / (24 * 60 * 60 * 1000));
                    const timeText = timeLeft > 0 ? `${timeLeft}d left` : 'Expired';
                    const totalVotes = proposal.voteYes + proposal.voteNo;
                    const yesPercentage = totalVotes > 0 ? Math.round((proposal.voteYes / totalVotes) * 100) : 0;
                    
                    return (
                      <div key={proposal.id} className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                        {/* Mobile-optimized Header Row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h4 className="text-white font-medium text-sm sm:text-base line-clamp-2 sm:line-clamp-1">{proposal.title}</h4>
                              {(() => {
                                const category = getCategoryById(proposal.category);
                                return category ? (
                                  <Badge className="bg-white/10 text-white text-xs px-2 py-1 shrink-0 self-start sm:self-auto">
                                    <span className="hidden sm:inline">{category.icon} </span>
                                    {category.name}
                                  </Badge>
                                ) : null;
                              })()}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 ml-3">
                            <FavoriteButton
                              proposalId={proposal.id.toString()}
                              size="sm"
                              variant="ghost"
                            />
                            <Badge className={`${timeLeft > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'} text-xs px-2 py-1 whitespace-nowrap`}>
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {timeText}
                            </Badge>
                          </div>
                        </div>

                        {/* Mobile-optimized Stats Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm mb-3 sm:mb-4 gap-2 sm:gap-0">
                          <span className="text-white/60">
                            ${proposal.fundingAmount.toLocaleString()}
                          </span>
                          <span className="text-white/60">
                            {yesPercentage}% yes ({totalVotes} votes)
                          </span>
                          {proposal.aiScore && (
                            <div className="flex items-center gap-1 text-green-400">
                              <TrendingUpIcon className="w-3 h-3" />
                              <span className="text-xs">{proposal.aiScore}/10</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <Button 
                            size="sm" 
                            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl h-9 sm:h-8 text-xs touch-manipulation"
                            onClick={() => handleVote(proposal.id, 'for')}
                            disabled={votingProposalId === proposal.id}
                          >
                            {votingProposalId === proposal.id ? 'Voting...' : '✓ Yes'}
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl h-9 sm:h-8 text-xs touch-manipulation"
                            onClick={() => handleVote(proposal.id, 'against')}
                            disabled={votingProposalId === proposal.id}
                          >
                            {votingProposalId === proposal.id ? 'Voting...' : '✗ No'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <VoteIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 mb-2">No active proposals to vote on</p>
                    <p className="text-white/40 text-sm">New proposals will appear here when submitted</p>
                  </div>
                )}
                
                {filteredActiveProposals.length > 3 && (
                  <div className="text-center pt-4">
                    <Link href="/vote">
                      <Button size="sm" className="bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20">
                        View All {filteredActiveProposals.length} Active Proposals
                      </Button>
                    </Link>
                  </div>
                )}

                {/* View All Votes */}
                <Link href="/vote">
                  <Button className="w-full bg-white/5 border border-white/20 text-white hover:bg-white/10 rounded-2xl py-3">
                    View All Active Votes
                  </Button>
                </Link>
              </CardContent>
            </Card>

          </div>

          {/* Voting History - Full Width */}
          <VotingHistory />

          {/* Transaction History - Full Width */}
          <TransactionHistory />

          {/* My Proposals */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl hover:bg-white/10 transition-all duration-300">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <FileTextIcon className="w-6 h-6 text-white" />
                  </div>
                  My Proposals
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 rounded-full">
                    {userProposals.length} Total
                  </Badge>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowMyProposals(!showMyProposals)}
                  className="bg-white/5 border border-white/20 text-white hover:bg-white/10"
                >
                  {showMyProposals ? 'Show All' : 'Show Mine'}
                </Button>
              </div>
              <CardDescription className="text-white/60 text-base">
                Proposals you have submitted to the DAO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* My Proposals Items */}
              {userProposals.length > 0 ? (
                userProposals.slice(0, 3).map((proposal) => {
                  const hasVotes = proposal.voteYes + proposal.voteNo > 0;
                  
                  return (
                    <div key={proposal.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className={`w-12 h-12 bg-${proposal.status === 'active' ? 'green' : proposal.status === 'passed' ? 'blue' : 'gray'}-500/20 rounded-2xl flex items-center justify-center`}>
                        <FileTextIcon className={`w-6 h-6 text-${proposal.status === 'active' ? 'green' : proposal.status === 'passed' ? 'blue' : 'gray'}-400`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-base">{proposal.title}</p>
                        <p className="text-white/60 text-sm">Status: {proposal.status}</p>
                        <p className="text-white/40 text-sm">
                          Funding: ${proposal.fundingAmount.toLocaleString()} | 
                          Votes: {proposal.voteYes + proposal.voteNo} total
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-white/40 text-sm">
                            {proposal.status === 'active' ? 'Active' : 'Completed'}
                          </span>
                          {proposal.aiScore && (
                            <p className="text-white/60 text-xs">AI Score: {proposal.aiScore}/10</p>
                          )}
                        </div>
                        {!hasVotes && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProposal(proposal.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete proposal (only if no votes)"
                          >
                            <XIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <FileTextIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 mb-2">No proposals submitted yet</p>
                  <p className="text-white/40 text-sm">Submit your first climate proposal to get started</p>
                  <Link href="/submit-proposal">
                    <Button className="mt-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white">
                      Submit Proposal
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Normal Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-md mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-white/40 text-xs">
              Powered by Algorand & AI • &copy; {new Date().getFullYear()} EcoNexus
            </p>
          </div>
        </div>
      </footer>

      {/* Transaction Notification */}
      <TransactionNotification
        isOpen={transactionNotification.isOpen}
        onClose={() => setTransactionNotification(prev => ({ ...prev, isOpen: false }))}
        txId={transactionNotification.txId}
        message={transactionNotification.message}
        type={transactionNotification.type}
      />
    </div>
  )
}
