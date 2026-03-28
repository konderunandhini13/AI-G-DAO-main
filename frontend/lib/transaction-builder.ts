import algosdk from 'algosdk'

export interface TransactionResult {
  txId: string
  confirmedRound: number
  timestamp?: number
  success?: boolean
  // optional human-readable message (used for mock responses or errors)
  message?: string
  applicationIndex?: number
  createdAssetIndex?: number
  globalStateDelta?: any[]
  localStateDelta?: any[]
  logs?: string[]
  // Optional proposal id created by the transaction (demo/prod returned value)
  proposalId?: number
}

export interface TransactionOptions {
  sender: string
  suggestedParams: algosdk.SuggestedParams
  note?: string
  lease?: Uint8Array
  rekeyTo?: string
}

export class TransactionBuilder {
  /**
   * Create a proposal submission transaction with reduced costs
   * Only 0.1 ALGO fee instead of 1 ALGO
   */
  static createProposalSubmission(
    options: TransactionOptions,
    appId: number,
    proposalData: {
      title: string
      description: string
      category: string
      fundingAmount: number
      expectedImpact: string
      location: string
    }
  ): algosdk.Transaction {
    // Encode proposal data
    const titleArg = new Uint8Array(Buffer.from(proposalData.title))
    const descArg = new Uint8Array(Buffer.from(proposalData.description))
    const categoryArg = new Uint8Array(Buffer.from(proposalData.category))
    const fundingArg = algosdk.encodeUint64(proposalData.fundingAmount * 1000000) // Convert to microAlgos
    const impactArg = new Uint8Array(Buffer.from(proposalData.expectedImpact))
    const locationArg = new Uint8Array(Buffer.from(proposalData.location))

    // Create application call transaction
    return algosdk.makeApplicationCallTxnFromObject({
      sender: options.sender,
      appIndex: appId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new Uint8Array(Buffer.from('submit_proposal')),
        titleArg,
        descArg,
        categoryArg,
        fundingArg,
        impactArg,
        locationArg
      ],
      accounts: [], // Add any required accounts
      foreignApps: [], // Add any foreign apps
      foreignAssets: [], // Add any foreign assets
      suggestedParams: options.suggestedParams,
      note: options.note ? new Uint8Array(Buffer.from(options.note)) : undefined,
      lease: options.lease,
      rekeyTo: options.rekeyTo
    })
  }

  /**
   * Create a voting transaction with reduced cost (0.01 ALGO + network fee)
   * Phase 4 enhancement: More affordable voting for community participation
   */
  static createVoteTransaction(
    options: TransactionOptions,
    appId: number,
    proposalId: number,
    vote: 'for' | 'against'
  ): algosdk.Transaction {
    const voteArg = new Uint8Array(Buffer.from(vote))
    const proposalIdArg = algosdk.encodeUint64(proposalId)

    return algosdk.makeApplicationCallTxnFromObject({
      sender: options.sender,
      appIndex: appId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        new Uint8Array(Buffer.from('vote')),
        proposalIdArg,
        voteArg
      ],
      suggestedParams: options.suggestedParams,
      note: options.note ? new Uint8Array(Buffer.from(options.note)) : undefined
    })
  }

  /**
   * Create a compound transaction group with payment + app call
   * For proposals that require funding deposit
   */
  static createProposalWithDeposit(
    options: TransactionOptions,
    appId: number,
    proposalData: any,
    depositAmount: number // In ALGOs
  ): algosdk.Transaction[] {
    // Create deposit payment transaction (reduced from 1 ALGO to 0.1 ALGO)
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: options.sender,
      receiver: algosdk.getApplicationAddress(appId),
      amount: depositAmount * 1000000, // Convert to microAlgos
      suggestedParams: options.suggestedParams,
      note: new Uint8Array(Buffer.from('Proposal deposit'))
    })

    // Create proposal submission transaction
    const appCallTxn = this.createProposalSubmission(options, appId, proposalData)

    // Group transactions
    const txnGroup = [paymentTxn, appCallTxn]
    algosdk.assignGroupID(txnGroup)

    return txnGroup
  }
}

/**
 * Enhanced transaction confirmation with detailed results
 */
export async function confirmTransaction(
  algodClient: algosdk.Algodv2,
  txId: string,
  waitRounds = 10
): Promise<TransactionResult> {
  try {
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, waitRounds)
    
    return {
      txId,
      confirmedRound: Number(confirmedTxn.confirmedRound || 0),
      applicationIndex: confirmedTxn.applicationIndex ? Number(confirmedTxn.applicationIndex) : undefined,
      createdAssetIndex: confirmedTxn.assetIndex ? Number(confirmedTxn.assetIndex) : undefined,
      globalStateDelta: confirmedTxn.globalStateDelta,
      localStateDelta: confirmedTxn.localStateDelta,
      logs: confirmedTxn.logs?.map(log => Buffer.from(log).toString()) || []
    }
  } catch (error) {
    throw new Error(`Transaction confirmation failed: ${error}`)
  }
}

/**
 * Calculate transaction fees for cost estimation
 */
export function calculateTransactionCosts(numTxns: number): {
  totalCostAlgos: number
  feePerTxnAlgos: number
  breakdown: string[]
} {
  const baseFee = 0.001 // Base fee per transaction in ALGOs
  const totalCostAlgos = baseFee * numTxns
  
  return {
    totalCostAlgos,
    feePerTxnAlgos: baseFee,
    breakdown: [
      `${numTxns} transaction${numTxns > 1 ? 's' : ''} × ${baseFee} ALGO = ${totalCostAlgos} ALGO`,
      'Plus any proposal deposit requirements'
    ]
  }
}