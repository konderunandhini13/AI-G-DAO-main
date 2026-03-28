import { SubmitProposalPage } from "@/components/submit-propsoal"
import { WalletGuard } from "@/components/wallet-guard"

export default function SubmitProposal() {
  return (
    <WalletGuard requireBalance={0.2} showBalanceWarning={true}>
      <SubmitProposalPage />
    </WalletGuard>
  )
}
