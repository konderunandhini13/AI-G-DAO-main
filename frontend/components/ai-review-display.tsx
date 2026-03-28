'use client';

import { AIReviewResult, getScoreColor, getCategoryBadgeColor } from '@/lib/gemini';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircleIcon, AlertTriangleIcon, LightbulbIcon } from 'lucide-react';

interface AIReviewDisplayProps {
  review: AIReviewResult;
}

export function AIReviewDisplay({ review }: AIReviewDisplayProps) {
  return (
    <Card className="bg-black/80 border-yellow-500/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            🤖 AI Analysis Results
          </CardTitle>
          <Badge className={getCategoryBadgeColor(review.category)}>
            {review.category.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-yellow-400 font-medium">Overall Score</span>
            <span className={`font-bold text-lg ${getScoreColor(review.score)}`}>
              {review.score}/100
            </span>
          </div>
          <Progress value={review.score} className="h-2" />
        </div>

        {/* Individual Scores */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(review.environmentalScore)}`}>
              {review.environmentalScore}
            </div>
            <div className="text-sm text-gray-300">Environmental</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(review.feasibilityScore)}`}>
              {review.feasibilityScore}
            </div>
            <div className="text-sm text-gray-300">Feasibility</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(review.innovationScore)}`}>
              {review.innovationScore}
            </div>
            <div className="text-sm text-gray-300">Innovation</div>
          </div>
        </div>

        {/* Strengths */}
        {review.strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-green-400 font-medium flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {review.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-gray-300 pl-4">
                  • {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {review.concerns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-orange-400 font-medium flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4" />
              Concerns
            </h4>
            <ul className="space-y-1">
              {review.concerns.map((concern, index) => (
                <li key={index} className="text-sm text-gray-300 pl-4">
                  • {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {review.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-yellow-300 font-medium flex items-center gap-2">
              <LightbulbIcon className="w-4 h-4" />
              Suggestions
            </h4>
            <ul className="space-y-1">
              {review.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-300 pl-4">
                  • {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Novelty Status */}
        <div className={`${review.isNovel ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'} border rounded-lg p-4`}>
          <h4 className={`${review.isNovel ? 'text-green-400' : 'text-yellow-400'} font-medium flex items-center gap-2`}>
            {review.isNovel ? '✨ Novel Project' : '📋 Similar Projects Exist'}
          </h4>
          <p className="text-sm text-gray-300 mt-2">
            {review.isNovel 
              ? 'This appears to be a unique and innovative approach to climate action!'
              : 'Similar real-world projects already exist. See details below for how to differentiate your proposal.'}
          </p>
        </div>

        {/* Existing Real-World Projects */}
        {review.existingProjects && review.existingProjects.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-3">
            <h4 className="text-orange-400 font-medium flex items-center gap-2">
              🏢 Existing Real-World Projects
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              These projects are already working on similar ideas. Learn from them!
            </p>
            <div className="space-y-3">
              {review.existingProjects.map((project, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="font-medium text-white">{project.name}</div>
                  <div className="text-sm text-gray-300">{project.description}</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-orange-400">Similarity: {project.similarity}</span>
                    <span className="text-green-400">Status: {project.successRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Innovative Add-ons */}
        {review.innovativeAddons && review.innovativeAddons.length > 0 && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-3">
            <h4 className="text-cyan-400 font-medium flex items-center gap-2">
              💡 Innovative Add-ons to Make Your Proposal Unique
            </h4>
            <p className="text-xs text-gray-400 mb-2">
              Consider adding these innovations to differentiate from existing projects:
            </p>
            <ul className="space-y-2">
              {review.innovativeAddons.map((addon, index) => (
                <li key={index} className="text-sm text-gray-300 bg-white/5 p-3 rounded">
                  <span className="text-cyan-400 font-medium">💎</span> {addon}
                </li>
              ))}
            </ul>
          </div>
        )}


      </CardContent>
    </Card>
  );
}
