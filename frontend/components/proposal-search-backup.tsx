'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FavoriteButton } from '@/components/favorite-button';
import { 
  SearchIcon, 
  XIcon, 
  ClockIcon,
  TrendingUpIcon,
  FilterIcon,
  SparklesIcon
} from 'lucide-react';
import { ProposalSearchEngine, SearchResult } from '@/lib/proposal-search';
import { getCategoryById } from '@/lib/proposal-categories';

interface ProposalSearchProps {
  proposals: any[];
  onSearchResults: (results: SearchResult[]) => void;
  onSearchTermChange: (term: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ProposalSearch({
  proposals,
  onSearchResults,
  onSearchTermChange,
  placeholder = "Search proposals by title, category, creator...",
  autoFocus = false
}: ProposalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const searchEngine = ProposalSearchEngine.getInstance();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('econexus_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        setIsSearching(true);
        const results = searchEngine.search(proposals, searchTerm);
        onSearchResults(results);
        onSearchTermChange(searchTerm);
        
        // Get suggestions
        const newSuggestions = searchEngine.getSuggestions(proposals, searchTerm);
        setSuggestions(newSuggestions);
        setIsSearching(false);
      } else {
        onSearchResults([]);
        onSearchTermChange('');
        setSuggestions([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, proposals, onSearchResults, onSearchTermChange]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSearchSubmit = (term: string = searchTerm) => {
    if (term.trim()) {
      // Add to recent searches
      const newRecentSearches = [
        term.trim(),
        ...recentSearches.filter(s => s !== term.trim())
      ].slice(0, 5); // Keep only 5 recent searches
      
      setRecentSearches(newRecentSearches);
      localStorage.setItem('econexus_recent_searches', JSON.stringify(newRecentSearches));
      
      setShowSuggestions(false);
      searchRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    handleSearchSubmit(suggestion);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearchResults([]);
    onSearchTermChange('');
    setShowSuggestions(false);
    searchRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('econexus_recent_searches');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Mobile-optimized Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white/40" />
        </div>
        
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setShowSuggestions(searchTerm.length > 0 || recentSearches.length > 0)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit();
            } else if (e.key === 'Escape') {
              setShowSuggestions(false);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200 text-sm sm:text-base"
        />
        
        <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center">
          {isSearching ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          ) : searchTerm ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 touch-manipulation"
            >
              <XIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Mobile-optimized Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 mt-2 bg-white/5 backdrop-blur-xl border-white/10 rounded-xl sm:rounded-2xl shadow-2xl z-50 max-h-72 sm:max-h-96 overflow-hidden">
          <CardContent className="p-0">
            
            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 sm:p-4 border-b border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <SparklesIcon className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-xs sm:text-sm font-medium">Suggestions</span>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 text-sm touch-manipulation"
                    >
                      <div className="flex items-center gap-2">
                        <SearchIcon className="w-3 h-3 text-white/40" />
                        {suggestion}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && !searchTerm && (
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-white/60" />
                    <span className="text-white/60 text-xs sm:text-sm font-medium">Recent Searches</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-white/40 hover:text-white/60 text-xs h-6 px-2 touch-manipulation"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 text-sm touch-manipulation"
                    >
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-3 h-3 text-white/40" />
                        {search}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No suggestions */}
            {suggestions.length === 0 && searchTerm && (
              <div className="p-3 sm:p-4 text-center text-white/60 text-xs sm:text-sm">
                No suggestions found
              </div>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SearchResultsProps {
  results: SearchResult[];
  searchTerm: string;
  onVote: (proposalId: number, vote: 'for' | 'against') => void;
  votingProposalId: string | null;
}

export function SearchResults({ results, searchTerm, onVote, votingProposalId }: SearchResultsProps) {
  const searchEngine = ProposalSearchEngine.getInstance();

  if (results.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-center">
        <SearchIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">No proposals found</h3>
        <p className="text-white/60 text-sm">
          Try adjusting your search terms or browsing by category
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">Search Results</span>
          <Badge className="bg-white/20 backdrop-blur-sm text-white">
            {results.length} found
          </Badge>
        </div>
        <div className="text-white/60 text-sm">
          for "{searchTerm}"
        </div>
      </div>

      <div className="space-y-4">
        {results.map((result) => {
          const category = getCategoryById(result.category);
          const timeLeft = Math.ceil((result.endTime - Date.now()) / (24 * 60 * 60 * 1000));
          const timeText = timeLeft > 0 ? `${timeLeft}d left` : 'Expired';
          const totalVotes = result.voteYes + result.voteNo;
          const yesPercentage = totalVotes > 0 ? Math.round((result.voteYes / totalVotes) * 100) : 0;

          return (
            <Card key={result.id} className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300">
              <CardContent className="p-6">
                <div className="space-y-4">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 
                          className="text-white font-medium text-lg"
                          dangerouslySetInnerHTML={{ 
                            __html: searchEngine.highlightMatches(result.title, searchTerm) 
                          }}
                        />
                        {category && (
                          <Badge className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs">
                            {category.icon} {category.name}
                          </Badge>
                        )}
                        <Badge className="bg-white/20 backdrop-blur-sm text-white text-xs">
                          Score: {result.relevanceScore}
                        </Badge>
                      </div>
                      
                      <p 
                        className="text-white/70 text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: searchEngine.highlightMatches(
                            result.description.slice(0, 150) + (result.description.length > 150 ? '...' : ''), 
                            searchTerm
                          ) 
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <FavoriteButton
                        proposalId={result.id.toString()}
                        size="sm"
                        variant="ghost"
                      />
                      <Badge className={`${timeLeft > 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} rounded-full`}>
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {timeText}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-white/60">
                        Funding: ${result.fundingAmount.toLocaleString()}
                      </span>
                      <span className="text-white/60">
                        Votes: {yesPercentage}% yes ({totalVotes} total)
                      </span>
                      {result.aiScore && (
                        <div className="flex items-center gap-1 text-green-400">
                          <TrendingUpIcon className="w-4 h-4" />
                          AI Score: {result.aiScore}/10
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Matched Fields */}
                  {result.matchedFields.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">Matched:</span>
                      {result.matchedFields.map((field) => (
                        <Badge key={field} className="bg-white/10 text-white/60 text-xs px-2 py-1">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Voting Buttons */}
                  {result.status === 'active' && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button 
                        size="sm" 
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl"
                        onClick={() => onVote(result.id, 'for')}
                        disabled={votingProposalId === result.id.toString()}
                      >
                        {votingProposalId === result.id.toString() ? 'Voting...' : 'Vote Yes'}
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl"
                        onClick={() => onVote(result.id, 'against')}
                        disabled={votingProposalId === result.id.toString()}
                      >
                        {votingProposalId === result.id.toString() ? 'Voting...' : 'Vote No'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}