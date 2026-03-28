import { DashboardPage } from "@/components/dashboard-page"
import { WalletGuard } from "@/components/wallet-guard"

export default function Dashboard() {
  return (
    <WalletGuard requireBalance={0.1}>
      <DashboardPage />
    </WalletGuard>
  )
}
