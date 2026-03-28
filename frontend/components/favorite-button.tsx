/**
 * Favorites Button Component
 * Heart icon button for adding/removing proposals from favorites
 */

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { favoritesManager } from "@/lib/proposal-favorites"
import { cn } from "@/lib/utils"

interface FavoriteButtonProps {
  proposalId: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "ghost" | "outline"
  className?: string
  showCount?: boolean
  onToggle?: (proposalId: string, isFavorite: boolean) => void
}

export function FavoriteButton({ 
  proposalId, 
  size = "sm", 
  variant = "ghost",
  className,
  showCount = false,
  onToggle
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Load initial state
  useEffect(() => {
    setIsFavorite(favoritesManager.isFavorite(proposalId))
    if (showCount) {
      setFavoritesCount(favoritesManager.getFavoritesCount())
    }
  }, [proposalId, showCount])

  // Subscribe to favorites changes
  useEffect(() => {
    const unsubscribe = favoritesManager.subscribe((favorites) => {
      setIsFavorite(favorites.includes(proposalId))
      if (showCount) {
        setFavoritesCount(favorites.length)
      }
    })

    return unsubscribe
  }, [proposalId, showCount])

  const handleToggle = () => {
    if (!proposalId) return

    // Trigger animation
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)

    // Toggle favorite
    const newIsFavorite = favoritesManager.toggleFavorite(proposalId)
    
    // Call callback if provided
    onToggle?.(proposalId, newIsFavorite)
  }

  const getIconSize = () => {
    switch (size) {
      case "sm": return "w-4 h-4"
      case "lg": return "w-6 h-6"
      default: return "w-5 h-5"
    }
  }

  const getButtonSize = () => {
    switch (size) {
      case "sm": return "h-8 w-8"
      case "lg": return "h-12 w-12"
      default: return "h-10 w-10"
    }
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleToggle}
      className={cn(
        getButtonSize(),
        "relative overflow-hidden transition-all duration-200",
        isFavorite 
          ? "text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20" 
          : "text-white/60 hover:text-red-400 hover:bg-red-500/10",
        isAnimating && "scale-110",
        className
      )}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart 
        className={cn(
          getIconSize(),
          "transition-all duration-200",
          isFavorite ? "fill-current" : "fill-none",
          isAnimating && "animate-pulse"
        )} 
      />
      
      {/* Ripple effect on click */}
      {isAnimating && (
        <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
      )}
      
      {/* Show count badge if enabled */}
      {showCount && favoritesCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {favoritesCount > 99 ? "99+" : favoritesCount}
        </div>
      )}
    </Button>
  )
}

/**
 * Compact favorite icon for use in lists
 */
export function FavoriteIcon({ 
  proposalId, 
  className 
}: { 
  proposalId: string
  className?: string 
}) {
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    setIsFavorite(favoritesManager.isFavorite(proposalId))
    
    const unsubscribe = favoritesManager.subscribe((favorites) => {
      setIsFavorite(favorites.includes(proposalId))
    })

    return unsubscribe
  }, [proposalId])

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    favoritesManager.toggleFavorite(proposalId)
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "p-1 rounded-full transition-all duration-200",
        isFavorite 
          ? "text-red-500 hover:text-red-600" 
          : "text-white/40 hover:text-red-400",
        className
      )}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart 
        className={cn(
          "w-4 h-4 transition-all duration-200",
          isFavorite ? "fill-current" : "fill-none"
        )} 
      />
    </button>
  )
}