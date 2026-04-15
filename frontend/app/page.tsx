"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LandingPage } from "@/components/landing-page"
import { useWalletContext } from "@/hooks/use-wallet"

export default function HomePage() {
  const { isConnected, loading } = useWalletContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isConnected) {
      router.replace('/dashboard')
    }
  }, [isConnected, loading, router])

  if (loading || isConnected) return null

  return <LandingPage />
}
