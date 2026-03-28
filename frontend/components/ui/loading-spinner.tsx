"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  }

  return (
    <div className={cn("animate-spin rounded-full border-2 border-white/20 border-t-white", sizeClasses[size], className)} />
  )
}

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-400 animate-spin"></div>
            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="text-white/80 text-sm font-medium">{message}</div>
        {/* Animated dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  )
}

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
}

export function LazyWrapper({ children, fallback, delay = 100 }: LazyWrapperProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!isLoaded) {
    return fallback || <LoadingSpinner className="mx-auto my-8" />
  }

  return <>{children}</>
}
