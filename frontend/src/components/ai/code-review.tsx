'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CodeReview as CodeReviewType } from '@/lib/ai-api';

interface CodeReviewProps {
  review: CodeReviewType;
}

export function CodeReviewDisplay({ review }: CodeReviewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getColorForScore = (score: number) => {
    if (score < 41) return 'bg-red-500';
    if (score < 71) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColorForScore = (score: number) => {
    if (score < 41) return 'text-red-400';
    if (score < 71) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const renderMetric = (title: string, key: keyof CodeReviewType, metric: { score: number; explanation: string }) => {
    const isExpanded = expanded[key];
    
    return (
      <div className="mb-4" key={key}>
        <div className="flex justify-between items-center mb-1 cursor-pointer" onClick={() => toggleExpand(key as string)}>
          <span className="text-sm font-medium text-zinc-200">{title}</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${getTextColorForScore(metric.score)}`}>{metric.score}/100</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </div>
        </div>
        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColorForScore(metric.score)}`} 
            style={{ width: `${metric.score}%` }}
          />
        </div>
        {isExpanded && (
          <div className="mt-2 text-sm text-zinc-400 p-3 bg-zinc-800/50 rounded-md border border-zinc-700/50">
            {metric.explanation}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 p-5">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            CodeMentor Analysis
          </h3>
          <p className="text-xs text-zinc-500 mt-1">AI-generated quality analysis</p>
        </div>
        
        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 border-zinc-800 relative">
          <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
            <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
            <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="4" fill="transparent" 
              className={getTextColorForScore(review.overall)}
              strokeDasharray={`${(review.overall / 100) * 163} 163`} 
            />
          </svg>
          <span className={`text-lg font-bold ${getTextColorForScore(review.overall)} relative z-10`}>{review.overall}</span>
        </div>
      </div>

      <div className="mb-6 text-sm text-zinc-300">
        {review.summary}
      </div>

      <div className="space-y-1 mb-6">
        {renderMetric('Readability', 'readability', review.readability)}
        {renderMetric('Efficiency', 'efficiency', review.efficiency)}
        {renderMetric('Structure', 'structure', review.structure)}
        {renderMetric('Edge Cases', 'edge_cases', review.edge_cases)}
      </div>

      {review.suggestions && review.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-zinc-200 mb-3">Suggestions for Improvement</h4>
          <ul className="space-y-2">
            {review.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-zinc-400">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
