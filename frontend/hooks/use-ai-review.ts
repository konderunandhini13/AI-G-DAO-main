'use client';

import { useState } from 'react';
import { analyzeProposal, AIReviewResult } from '@/lib/gemini';
import { checkDuplicateProposal } from '@/lib/duplicate-detection';
import { climateDAOQuery } from '@/lib/blockchain-queries';

export function useAIReview() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeProposalData = async (proposalData: {
    title: string;
    description: string;
    category: string;
    fundingAmount: string;
    expectedImpact: string;
    location: string;
  }, proposalId?: number) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // First check for duplicates
      const existingProposals = climateDAOQuery.getStoredProposals();
      const duplicateCheck = await checkDuplicateProposal(
        proposalData.title,
        proposalData.description,
        existingProposals
      );

      // Then analyze the proposal
      const result = await analyzeProposal(
        proposalData.title,
        proposalData.description,
        proposalData.category,
        proposalData.fundingAmount,
        proposalData.expectedImpact,
        proposalData.location
      );

      // Merge duplicate detection results
      const finalResult = {
        ...result,
        isDuplicate: duplicateCheck.isDuplicate,
        similarProposals: duplicateCheck.similar,
        modifications: duplicateCheck.suggestions
      };

      setReviewResult(finalResult);

      // Persist analysis to localStorage when a proposalId is provided
      if (proposalId) {
        try {
          localStorage.setItem(`proposal_ai_${proposalId}`, JSON.stringify(finalResult));

          // Update stored proposals aiScore (scale 0-100 -> 0-10)
          const stored = localStorage.getItem('climate_dao_proposals');
          if (stored) {
            const proposals = JSON.parse(stored);
            const idx = proposals.findIndex((p: any) => p.id === proposalId);
            if (idx >= 0) {
              proposals[idx].aiScore = Math.round(finalResult.score / 10);
              localStorage.setItem('climate_dao_proposals', JSON.stringify(proposals));
            }
          }
        } catch (err) {
          console.warn('Failed to persist AI analysis for proposal', proposalId, err);
        }
      }

      return finalResult;
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearReview = () => {
    setReviewResult(null);
    setError(null);
  };

  return {
    isAnalyzing,
    reviewResult,
    error,
    analyzeProposalData,
    clearReview
  };
}
