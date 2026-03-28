"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2Icon, 
  ClockIcon, 
  ExternalLinkIcon, 
  AlertCircleIcon,
  CopyIcon,
  XCircleIcon 
} from "lucide-react"
import { TransactionResult } from "@/lib/transaction-builder"

interface TransactionStatusProps {
  txId?: string
  result?: TransactionResult
  status: 'pending' | 'confirmed' | 'failed'
  error?: string
  onClose?: () => void
  estimatedTime?: number // seconds
}

export function TransactionStatus({ 
  txId, 
  result, 
  status, 
  error, 
  onClose,
  estimatedTime = 5 
}: TransactionStatusProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <ClockIcon className="w-6 h-6 text-yellow-400 animate-pulse" />,
          title: 'Transaction Pending',
          description: 'Your transaction is being processed...',
          color: 'border-yellow-500/30 bg-yellow-500/10',
          badgeColor: 'bg-yellow-500/20 text-yellow-400'
        }
      case 'confirmed':
        return {
          icon: <CheckCircle2Icon className="w-6 h-6 text-green-400" />,
          title: 'Transaction Confirmed!',
          description: 'Your transaction has been successfully processed',
          color: 'border-green-500/30 bg-green-500/10',
          badgeColor: 'bg-green-500/20 text-green-400'
        }
      case 'failed':
        return {
          icon: <XCircleIcon className="w-6 h-6 text-red-400" />,
          title: 'Transaction Failed',
          description: error || 'Your transaction could not be processed',
          color: 'border-red-500/30 bg-red-500/10',
          badgeColor: 'bg-red-500/20 text-red-400'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Card className={`${config.color} backdrop-blur-xl border rounded-3xl`}>
      <CardHeader className="text-center">
        <div className="flex flex-col items-center space-y-4">
          {config.icon}
          <div>
            <CardTitle className="text-xl text-white">{config.title}</CardTitle>
            <CardDescription className="text-white/70 mt-2">
              {config.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge className={`${config.badgeColor} border-0 px-3 py-1 rounded-full`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        {/* Progress for pending transactions */}
        {status === 'pending' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/70">
              <span>Estimated time:</span>
              <span>{estimatedTime}s</span>
            </div>
            <Progress value={33} className="h-2 bg-white/10" />
          </div>
        )}

        {/* Transaction ID */}
        {txId && (
          <div className="space-y-2">
            <label className="text-sm text-white/70">Transaction ID:</label>
            <div className="flex items-center gap-2 bg-black/20 rounded-lg p-3">
              <code className="text-sm text-blue-400 font-mono break-all flex-1">
                {txId}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(txId)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-2"
              >
                <CopyIcon className="w-4 h-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-400">Copied to clipboard!</p>
            )}
          </div>
        )}

        {/* Transaction Details */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/70">Block:</span>
                <p className="text-white font-mono">{result.confirmedRound}</p>
              </div>
              {result.applicationIndex && (
                <div>
                  <span className="text-white/70">App Index:</span>
                  <p className="text-white font-mono">{result.applicationIndex}</p>
                </div>
              )}
            </div>

            {result.logs && result.logs.length > 0 && (
              <div>
                <span className="text-white/70 text-sm">Logs:</span>
                <div className="bg-black/20 rounded-lg p-3 mt-2 max-h-24 overflow-y-auto">
                  {result.logs.map((log, index) => (
                    <div key={index} className="text-xs text-white/80 font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {txId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://lora.algokit.io/testnet/transaction/${txId}`, '_blank')}
              className="flex-1 border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              <ExternalLinkIcon className="w-4 h-4 mr-2" />
              View on Lora
            </Button>
          )}
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              Close
            </Button>
          )}
        </div>

        {/* Error Details */}
        {status === 'failed' && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-400">
                <p className="font-medium">Error Details:</p>
                <p className="mt-1 text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TransactionCostEstimateProps {
  numTransactions: number
  depositAmount?: number
  className?: string
}

export function TransactionCostEstimate({ 
  numTransactions, 
  depositAmount = 0,
  className = ""
}: TransactionCostEstimateProps) {
  const baseFee = 0.001 // ALGO per transaction
  const totalFees = baseFee * numTransactions
  const totalCost = totalFees + depositAmount

  return (
    <div className={`bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-medium text-blue-400 mb-2">Transaction Cost Estimate</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-white/70">
          <span>Network fees ({numTransactions} txn{numTransactions > 1 ? 's' : ''}):</span>
          <span>{totalFees.toFixed(3)} ALGO</span>
        </div>
        {depositAmount > 0 && (
          <div className="flex justify-between text-white/70">
            <span>Deposit:</span>
            <span>{depositAmount.toFixed(3)} ALGO</span>
          </div>
        )}
        <div className="border-t border-white/20 pt-2 flex justify-between text-white font-medium">
          <span>Total Cost:</span>
          <span>{totalCost.toFixed(3)} ALGO</span>
        </div>
      </div>
      <p className="text-xs text-white/60 mt-2">
        💡 Reduced costs: Traditional systems charge 1+ ALGO, we only require {totalCost.toFixed(3)} ALGO
      </p>
    </div>
  )
}