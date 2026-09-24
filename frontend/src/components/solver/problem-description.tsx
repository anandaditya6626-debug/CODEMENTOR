'use client';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Problem } from '@/types';
import { getDifficultyBgColor } from '@/lib/utils';
import { ChevronDown, ChevronRight, Lightbulb, Clock, Cpu } from 'lucide-react';

interface ProblemDescriptionProps {
  problem?: Problem;
}

export function ProblemDescription({ problem }: ProblemDescriptionProps) {
  const [revealedHints, setRevealedHints] = useState<number[]>([]);

  if (!problem) {
    return <div className="p-6 text-zinc-500">Loading problem...</div>;
  }

  const toggleHint = (index: number) => {
    setRevealedHints(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="p-6 space-y-6 text-sm">
      {/* Title & Difficulty */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-white">{problem.title}</h2>
          <Badge className={`text-xs ${getDifficultyBgColor(problem.difficulty)}`}>
            {problem.difficulty}
          </Badge>
        </div>
        {problem.topics && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {problem.topics.map(topic => (
              <Badge key={topic.id} variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                {topic.icon} {topic.name}
              </Badge>
            ))}
            {problem.pattern_tags?.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs text-indigo-400 border-indigo-500/30 bg-indigo-500/5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="prose prose-invert prose-sm max-w-none">
        <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {problem.description.split('\n').map((line, i) => {
            if (line.startsWith('## ')) {
              return <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{line.replace('## ', '')}</h3>;
            }
            if (line.startsWith('```')) return null;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="mb-1">{line}</p>;
          })}
        </div>
      </div>

      {/* Examples */}
      {problem.examples && problem.examples.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white">Examples</h3>
          {problem.examples.map((example, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
              <div className="text-xs text-zinc-500 font-medium">Example {i + 1}</div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-zinc-500 text-xs">Input: </span>
                  <code className="text-indigo-300 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                    {example.input}
                  </code>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs">Output: </span>
                  <code className="text-emerald-300 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                    {example.output}
                  </code>
                </div>
                {example.explanation && (
                  <div className="mt-2 text-xs text-zinc-400 bg-zinc-800/50 rounded p-2 border-l-2 border-indigo-500">
                    <span className="font-medium text-zinc-300">Explanation: </span>
                    {example.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {problem.constraints && problem.constraints.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-white mb-3">Constraints</h3>
          <ul className="space-y-1.5">
            {problem.constraints.map((constraint, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-400 text-xs">
                <span className="text-zinc-600 mt-0.5">•</span>
                <code className="font-mono">{constraint}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Complexity */}
      {(problem.expected_time_complexity || problem.expected_space_complexity) && (
        <div className="flex gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          {problem.expected_time_complexity && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500">Expected Time:</span>
              <code className="text-indigo-400 font-mono">{problem.expected_time_complexity}</code>
            </div>
          )}
          {problem.expected_space_complexity && (
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500">Expected Space:</span>
              <code className="text-indigo-400 font-mono">{problem.expected_space_complexity}</code>
            </div>
          )}
        </div>
      )}

      {/* Hints */}
      {problem.hints && problem.hints.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Hints
          </h3>
          <div className="space-y-2">
            {problem.hints.map((hint, i) => (
              <button
                key={i}
                onClick={() => toggleHint(i)}
                className="w-full text-left"
              >
                <div className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  revealedHints.includes(i)
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}>
                  {revealedHints.includes(i) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-zinc-400">Hint {i + 1}</span>
                  {revealedHints.includes(i) && (
                    <span className="text-xs text-zinc-300 ml-2">{hint}</span>
                  )}
                  {!revealedHints.includes(i) && (
                    <span className="text-xs text-zinc-600 ml-2">Click to reveal</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
