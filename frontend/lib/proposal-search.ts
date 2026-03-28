'use client';

export interface SearchResult {
  id: number;
  title: string;
  description: string;
  category: string;
  creator: string;
  fundingAmount: number;
  status: string;
  endTime: number;
  voteYes: number;
  voteNo: number;
  aiScore?: number;
  creationTime: number;
  relevanceScore: number;
  matchedFields: string[];
}

/**
 * Advanced search utilities for proposal data
 */
export class ProposalSearchEngine {
  private static instance: ProposalSearchEngine;
  
  static getInstance(): ProposalSearchEngine {
    if (!ProposalSearchEngine.instance) {
      ProposalSearchEngine.instance = new ProposalSearchEngine();
    }
    return ProposalSearchEngine.instance;
  }

  /**
   * Perform fuzzy search across proposals
   */
  search(proposals: any[], query: string): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    proposals.forEach(proposal => {
      const score = this.calculateRelevanceScore(proposal, searchTerm);
      if (score > 0) {
        results.push({
          ...proposal,
          relevanceScore: score,
          matchedFields: this.getMatchedFields(proposal, searchTerm)
        });
      }
    });

    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score for a proposal
   */
  private calculateRelevanceScore(proposal: any, searchTerm: string): number {
    let score = 0;
    const words = searchTerm.split(' ').filter(word => word.length > 0);

    // Title matches (highest weight)
    words.forEach(word => {
      if (proposal.title?.toLowerCase().includes(word)) {
        score += 10;
        // Exact match bonus
        if (proposal.title?.toLowerCase() === searchTerm) {
          score += 20;
        }
        // Start of title bonus
        if (proposal.title?.toLowerCase().startsWith(word)) {
          score += 5;
        }
      }
    });

    // Description matches
    words.forEach(word => {
      if (proposal.description?.toLowerCase().includes(word)) {
        score += 5;
      }
    });

    // Category matches
    words.forEach(word => {
      if (proposal.category?.toLowerCase().includes(word)) {
        score += 8;
      }
    });

    // Creator matches
    words.forEach(word => {
      if (proposal.creator?.toLowerCase().includes(word)) {
        score += 3;
      }
    });

    // Funding amount matches (for numbers)
    if (!isNaN(Number(searchTerm))) {
      const searchAmount = Number(searchTerm);
      if (proposal.fundingAmount === searchAmount) {
        score += 15;
      } else if (Math.abs(proposal.fundingAmount - searchAmount) < searchAmount * 0.1) {
        score += 5;
      }
    }

    // Status matches
    words.forEach(word => {
      if (proposal.status?.toLowerCase().includes(word)) {
        score += 6;
      }
    });

    return score;
  }

  /**
   * Get which fields matched the search term
   */
  private getMatchedFields(proposal: any, searchTerm: string): string[] {
    const matched: string[] = [];
    const words = searchTerm.split(' ').filter(word => word.length > 0);

    words.forEach(word => {
      if (proposal.title?.toLowerCase().includes(word)) {
        matched.push('title');
      }
      if (proposal.description?.toLowerCase().includes(word)) {
        matched.push('description');
      }
      if (proposal.category?.toLowerCase().includes(word)) {
        matched.push('category');
      }
      if (proposal.creator?.toLowerCase().includes(word)) {
        matched.push('creator');
      }
      if (proposal.status?.toLowerCase().includes(word)) {
        matched.push('status');
      }
    });

    return [...new Set(matched)]; // Remove duplicates
  }

  /**
   * Get search suggestions based on existing proposals
   */
  getSuggestions(proposals: any[], query: string, limit = 5): string[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const suggestions = new Set<string>();

    proposals.forEach(proposal => {
      // Title suggestions
      if (proposal.title?.toLowerCase().includes(searchTerm)) {
        suggestions.add(proposal.title);
      }

      // Category suggestions
      if (proposal.category?.toLowerCase().includes(searchTerm)) {
        suggestions.add(proposal.category.replace('-', ' '));
      }

      // Extract words from title for partial matches
      const titleWords = proposal.title?.toLowerCase().split(' ') || [];
      titleWords.forEach((word: string) => {
        if (word.startsWith(searchTerm) && word.length > searchTerm.length) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions)
      .slice(0, limit)
      .sort((a, b) => a.length - b.length); // Prefer shorter suggestions
  }

  /**
   * Highlight search terms in text
   */
  highlightMatches(text: string, searchTerm: string): string {
    if (!searchTerm || !text) return text;

    const words = searchTerm.split(' ').filter(word => word.length > 0);
    let highlighted = text;

    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>');
    });

    return highlighted;
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(proposals: any[], searches: string[]): {
    popularTerms: { term: string; count: number }[];
    searchableFields: string[];
    totalSearchableItems: number;
  } {
    const termCounts: Record<string, number> = {};
    
    searches.forEach(search => {
      const words = search.toLowerCase().split(' ').filter(word => word.length > 2);
      words.forEach(word => {
        termCounts[word] = (termCounts[word] || 0) + 1;
      });
    });

    const popularTerms = Object.entries(termCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      popularTerms,
      searchableFields: ['title', 'description', 'category', 'creator', 'status'],
      totalSearchableItems: proposals.length
    };
  }
}

/**
 * Debounce utility for search input
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Add React import for useDebounce
import React from 'react';