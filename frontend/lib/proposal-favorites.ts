/**
 * Proposal Favorites Management
 * Handles localStorage operations for user's favorite proposals
 */

const FAVORITES_STORAGE_KEY = 'econexus_favorites'

export interface FavoritesData {
  proposals: string[] // Array of proposal IDs
  lastUpdated: number
}

export class ProposalFavoritesManager {
  private static instance: ProposalFavoritesManager
  private favorites: Set<string> = new Set()
  private listeners: ((favorites: string[]) => void)[] = []

  private constructor() {
    this.loadFavorites()
  }

  static getInstance(): ProposalFavoritesManager {
    if (!ProposalFavoritesManager.instance) {
      ProposalFavoritesManager.instance = new ProposalFavoritesManager()
    }
    return ProposalFavoritesManager.instance
  }

  /**
   * Load favorites from localStorage
   */
  private loadFavorites(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
      if (stored) {
        const data: FavoritesData = JSON.parse(stored)
        this.favorites = new Set(data.proposals || [])
      }
    } catch (error) {
      console.warn('Failed to load favorites from localStorage:', error)
      this.favorites = new Set()
    }
  }

  /**
   * Save favorites to localStorage
   */
  private saveFavorites(): void {
    if (typeof window === 'undefined') return

    try {
      const data: FavoritesData = {
        proposals: Array.from(this.favorites),
        lastUpdated: Date.now()
      }
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(data))
      this.notifyListeners()
    } catch (error) {
      console.warn('Failed to save favorites to localStorage:', error)
    }
  }

  /**
   * Add a proposal to favorites
   */
  addFavorite(proposalId: string): void {
    if (!proposalId) return
    this.favorites.add(proposalId)
    this.saveFavorites()
  }

  /**
   * Remove a proposal from favorites
   */
  removeFavorite(proposalId: string): void {
    if (!proposalId) return
    this.favorites.delete(proposalId)
    this.saveFavorites()
  }

  /**
   * Toggle favorite status of a proposal
   */
  toggleFavorite(proposalId: string): boolean {
    if (!proposalId) return false
    
    if (this.favorites.has(proposalId)) {
      this.removeFavorite(proposalId)
      return false
    } else {
      this.addFavorite(proposalId)
      return true
    }
  }

  /**
   * Check if a proposal is favorited
   */
  isFavorite(proposalId: string): boolean {
    return this.favorites.has(proposalId)
  }

  /**
   * Get all favorite proposal IDs
   */
  getFavorites(): string[] {
    return Array.from(this.favorites)
  }

  /**
   * Get count of favorites
   */
  getFavoritesCount(): number {
    return this.favorites.size
  }

  /**
   * Clear all favorites
   */
  clearFavorites(): void {
    this.favorites.clear()
    this.saveFavorites()
  }

  /**
   * Filter proposals to only show favorites
   */
  filterFavoriteProposals(proposals: any[]): any[] {
    return proposals.filter(proposal => this.isFavorite(proposal.id))
  }

  /**
   * Subscribe to favorites changes
   */
  subscribe(listener: (favorites: string[]) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const favoritesList = this.getFavorites()
    this.listeners.forEach(listener => {
      try {
        listener(favoritesList)
      } catch (error) {
        console.warn('Error in favorites listener:', error)
      }
    })
  }

  /**
   * Get favorites statistics
   */
  getStats(): {
    totalFavorites: number
    lastUpdated: number | null
  } {
    let lastUpdated: number | null = null
    
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
        if (stored) {
          const data: FavoritesData = JSON.parse(stored)
          lastUpdated = data.lastUpdated || null
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return {
      totalFavorites: this.getFavoritesCount(),
      lastUpdated
    }
  }
}

// Convenience functions for easier usage
export const favoritesManager = ProposalFavoritesManager.getInstance()

export const useFavorites = () => {
  return {
    addFavorite: (id: string) => favoritesManager.addFavorite(id),
    removeFavorite: (id: string) => favoritesManager.removeFavorite(id),
    toggleFavorite: (id: string) => favoritesManager.toggleFavorite(id),
    isFavorite: (id: string) => favoritesManager.isFavorite(id),
    getFavorites: () => favoritesManager.getFavorites(),
    getFavoritesCount: () => favoritesManager.getFavoritesCount(),
    filterFavoriteProposals: (proposals: any[]) => favoritesManager.filterFavoriteProposals(proposals),
    clearFavorites: () => favoritesManager.clearFavorites(),
    subscribe: (listener: (favorites: string[]) => void) => favoritesManager.subscribe(listener),
    getStats: () => favoritesManager.getStats()
  }
}