'use client';
import React from 'react';
import { CheckCircle2, XCircle, Clock, Cpu, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface TestResult {
  test_case_id?: string;
  status: string;
  passed?: boolean;
  stdout?: string;
  stderr?: string;
  expected_output?: string;
  actual_output?: string;
  time?: string;
  memory?: number;
  compile_output?: string;
  error?: string;
}

interface TestResultsProps {
  results: TestResult[];
}

export function TestResults({ results }: TestResultsProps) {
  const [expandedCases, setExpandedCases] = useState<Set<number>>(new Set());

  if (!results || results.length === 0) {
    return (
      <div className="text-zinc-600 text-sm text-center py-8">
        No test results yet. Run your code to see results.
      </div>
    );
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  const toggleCase = (index: number) => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${
        allPassed 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : 'bg-red-500/5 border-red-500/20'
      }`}>
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm font-medium ${allPassed ? 'text-emerald-400' : 'text-red-400'}`}>
            {passed}/{total} test cases passed
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${allPassed ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${(passed / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Individual Test Cases */}
      <div className="space-y-1.5">
        {results.map((result, index) => {
          const isExpanded = expandedCases.has(index);
          const isPassed = result.passed;

          return (
            <div key={index} className="border border-zinc-800 rounded-lg overflow-hidden">
              {/* Case Header */}
              <button
                onClick={() => toggleCase(index)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-xs font-medium text-zinc-300">
                    Case {index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  {result.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {result.time}
                    </span>
                  )}
                  {result.memory && (
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> {Math.round(result.memory / 1024)} KB
                    </span>
                  )}
                  <span className={`font-medium ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPassed ? 'Passed' : result.status === 'time_limit_exceeded' ? 'TLE' : 
                     result.status === 'runtime_error' ? 'RE' : 'Failed'}
                  </span>
                </div>
              </button>

              {/* Case Details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-zinc-800/50 pt-2">
                  {result.expected_output && (
                    <div>
                      <span className="text-xs text-zinc-500 block mb-1">Expected Output</span>
                      <code className="text-xs font-mono text-emerald-300 bg-zinc-800 rounded px-2 py-1 block whitespace-pre-wrap">
                        {result.expected_output}
                      </code>
                    </div>
                  )}
                  {result.stdout && (
                    <div>
                      <span className="text-xs text-zinc-500 block mb-1">Your Output</span>
                      <code className={`text-xs font-mono bg-zinc-800 rounded px-2 py-1 block whitespace-pre-wrap ${
                        isPassed ? 'text-emerald-300' : 'text-red-300'
                      }`}>
                        {result.stdout}
                      </code>
                    </div>
                  )}
                  {result.stderr && (
                    <div>
                      <span className="text-xs text-zinc-500 block mb-1">Error</span>
                      <code className="text-xs font-mono text-red-400 bg-red-500/5 rounded px-2 py-1 block whitespace-pre-wrap border border-red-500/10">
                        {result.stderr}
                      </code>
                    </div>
                  )}
                  {result.compile_output && (
                    <div>
                      <span className="text-xs text-zinc-500 block mb-1">Compilation</span>
                      <code className="text-xs font-mono text-amber-400 bg-zinc-800 rounded px-2 py-1 block whitespace-pre-wrap">
                        {result.compile_output}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
