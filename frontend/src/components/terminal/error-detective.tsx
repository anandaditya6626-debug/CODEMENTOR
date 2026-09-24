'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Flame,
  HelpCircle,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { completionApi, ErrorExplainResponse } from '@/lib/completion-api';
import { parseExecutionError } from '@/lib/error-parser';

interface ErrorDetectiveProps {
  currentCode: string;
  language: string;
  errorOutput: string;
  onApplyFix: (newCode: string) => void;
  onUndoFix?: () => void;
  canUndo?: boolean;
  onRunAgain?: () => void;
  onJumpToLine?: (line: number) => void;
  executionStatus?: 'idle' | 'completed' | 'failed';
}

export function ErrorDetective({
  currentCode,
  language,
  errorOutput,
  onApplyFix,
  onUndoFix,
  canUndo = false,
  onRunAgain,
  onJumpToLine,
  executionStatus = 'idle',
}: ErrorDetectiveProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ErrorExplainResponse | null>(null);
  const [manualError, setManualError] = useState('');
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTraceback, setShowTraceback] = useState(false);
  const hasAutoAnalyzed = useRef(false);

  const activeError = errorOutput?.trim() || manualError.trim();

  // Determine if the suggested fix is actually useful (different from current code and non-empty)
  const fixIsUseful = useMemo(() => {
    if (!analysisResult?.fixed_code) return false;
    return analysisResult.fixed_code.trim() !== currentCode.trim();
  }, [analysisResult?.fixed_code, currentCode]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setApplied(false);

    try {
      if (activeError) {
        // Extract line number if present in error message
        let errorLine: number | undefined = undefined;
        const lineMatch = activeError.match(/line (\d+)/i) || activeError.match(/:(\d+):/);
        if (lineMatch) {
          errorLine = parseInt(lineMatch[1], 10);
        }

        const res = await completionApi.explainError({
          code: currentCode,
          language,
          error: activeError,
          line: errorLine,
        });

        setAnalysisResult(res.data);
      } else if (language === 'python') {
        // Check for logical bugs (e.g. accumulator overwrite in loop)
        const logicalRes = await completionApi.checkLogicalErrors({
          code: currentCode,
          language,
        });
        if (logicalRes.data.has_issues && logicalRes.data.issues.length > 0) {
          setAnalysisResult(logicalRes.data.issues[0]);
        } else {
          setAnalysisResult(null);
        }
      } else {
        setAnalysisResult(null);
      }
    } catch (err: any) {
      // Client-side fallback using smart parser
      const parsed = parseExecutionError(activeError, language, currentCode);
      if (parsed) {
        setAnalysisResult({
          error_type: parsed.errorType,
          line: parsed.line,
          symbol: parsed.symbol,
          problem: parsed.problem || parsed.message,
          why_it_happened: parsed.why_it_happened || parsed.explanation,
          how_to_fix: parsed.how_to_fix || parsed.suggestion,
          code_snippet: parsed.code_snippet,
          diff_preview: parsed.diff_preview,
          explanation: parsed.explanation,
          cause: parsed.why_it_happened || parsed.explanation,
          fix: parsed.how_to_fix || parsed.suggestion,
          fixed_code: parsed.suggestedFix || '',
          confidence: 'medium',
        });
      } else {
        setAnalysisResult({
          problem: 'Execution error occurred.',
          explanation: 'The program encountered a runtime or syntax error during execution.',
          cause: activeError.slice(0, 300),
          fix: 'Check the error message above and verify variable names, syntax, and types.',
          fixed_code: '',
          confidence: 'low',
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze when error arrives or changes
  useEffect(() => {
    if (activeError && !isAnalyzing) {
      handleAnalyze();
    } else if (!activeError && language === 'python' && executionStatus === 'completed') {
      // Check for logical issues even on clean exit
      handleAnalyze();
    }
  }, [errorOutput, executionStatus]);

  const handleApply = () => {
    if (!analysisResult?.fixed_code || !fixIsUseful) return;
    onApplyFix(analysisResult.fixed_code);
    setApplied(true);
  };

  const handleCopyFixed = async () => {
    if (!analysisResult?.fixed_code) return;
    try {
      await navigator.clipboard.writeText(analysisResult.fixed_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isCleanSuccess = !activeError && executionStatus === 'completed' && (!analysisResult || !analysisResult.is_logical);

  return (
    <div className="h-full flex flex-col p-4 bg-[#0b0c0f] overflow-y-auto select-text font-sans">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#242833] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-7 h-7 rounded-md border flex items-center justify-center shadow-sm',
            analysisResult?.is_logical
              ? 'bg-amber-950/80 border-amber-800/60 text-amber-400'
              : activeError
              ? 'bg-rose-950/80 border-rose-800/60 text-rose-400'
              : 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400'
          )}>
            {analysisResult?.is_logical ? (
              <AlertTriangle className="w-4 h-4" />
            ) : activeError ? (
              <Bug className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">Error Detective</span>
              <span className={cn(
                'text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border',
                analysisResult?.is_logical
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                  : activeError
                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/40'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
              )}>
                {analysisResult?.is_logical ? 'Logical Inspector' : activeError ? 'Smart Debugger' : 'Verified Clean'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Deep root cause analysis, plain-English explanation, and safe one-click fixes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUndo && onUndoFix && (
            <Button
              size="sm"
              onClick={onUndoFix}
              variant="outline"
              className="h-7 px-2.5 text-xs bg-[#181b22] hover:bg-[#20242e] text-zinc-300 border-[#242833] gap-1"
              title="Undo applied fix"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Undo Fix</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="h-7 px-3 text-xs bg-[#a3e635] hover:bg-[#bef264] text-black font-semibold gap-1.5 shadow-sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Investigating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{analysisResult ? 'Re-analyze' : 'Analyze Code'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pt-4 space-y-4">
        {/* Loading State */}
        {isAnalyzing && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#a3e635] border-t-transparent animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Investigating Error & Code Logic...</p>
              <p className="text-xs text-zinc-400 max-w-sm">
                Parsing traceback, inspecting AST scope symbols, and generating precision fixes.
              </p>
            </div>
          </div>
        )}

        {/* 1. Clean Success State */}
        {!isAnalyzing && isCleanSuccess && (
          <div className="bg-[#0f1914] border border-emerald-800/50 rounded-lg p-5 text-center space-y-2.5 animate-in fade-in-50">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-emerald-300">All Tests Passed & No Errors Detected</h3>
            <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
              Your code ran to completion without crashing or triggering suspicious logical patterns.
            </p>
          </div>
        )}

        {/* 2. Error Diagnostic Card */}
        {!isAnalyzing && analysisResult && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Error Classification & Problem Banner */}
            <div className={cn(
              'border rounded-lg p-4 flex flex-col gap-2.5 shadow-sm',
              analysisResult.is_logical
                ? 'bg-gradient-to-br from-amber-950/40 via-[#181512] to-[#0f1117] border-amber-900/60'
                : 'bg-gradient-to-br from-rose-950/40 via-[#191116] to-[#0f1117] border-rose-900/60'
            )}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-[11px] font-bold font-mono px-2 py-0.5 rounded border uppercase',
                    analysisResult.is_logical
                      ? 'bg-amber-900/70 text-amber-200 border-amber-700/60'
                      : 'bg-rose-900/70 text-rose-200 border-rose-700/60'
                  )}>
                    {analysisResult.error_type || (analysisResult.is_logical ? 'Logical Warning' : 'Runtime Error')}
                  </span>

                  {analysisResult.line && (
                    <button
                      type="button"
                      onClick={() => onJumpToLine?.(analysisResult.line!)}
                      className="px-2 py-0.5 rounded bg-[#181b22] hover:bg-[#222733] text-zinc-300 font-mono text-[11px] border border-[#242833] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Jump to this line in editor"
                    >
                      <span>📍 Line {analysisResult.line}</span>
                    </button>
                  )}

                  {analysisResult.symbol && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono text-[11px] border border-zinc-700/50">
                      Symbol: <strong className="text-white">{analysisResult.symbol}</strong>
                    </span>
                  )}
                </div>

                <span className={cn(
                  'text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold border',
                  analysisResult.confidence === 'high'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                    : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                )}>
                  {analysisResult.confidence} confidence
                </span>
              </div>

              {/* Bold Problem Statement */}
              <div>
                <h4 className="text-sm font-semibold text-white leading-snug">
                  {analysisResult.problem || analysisResult.explanation}
                </h4>
              </div>

              {/* Erroneous Code Snippet */}
              {analysisResult.code_snippet && (
                <div className="mt-1 p-2 bg-[#0b0c0f] rounded border border-[#242833] font-mono text-xs text-zinc-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 select-none text-[11px]">{analysisResult.line}:</span>
                    <span className="text-rose-300">{analysisResult.code_snippet}</span>
                  </div>
                  {onJumpToLine && analysisResult.line && (
                    <button
                      type="button"
                      onClick={() => onJumpToLine(analysisResult.line!)}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      View in editor &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Why This Happened Section */}
            <div className="bg-[#141720] border border-[#242833] rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                <Flame className="w-3.5 h-3.5" />
                <span>Why This Happened</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                {analysisResult.why_it_happened || analysisResult.cause}
              </p>
            </div>

            {/* How to Fix Section */}
            <div className="bg-[#141720] border border-[#242833] rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#a3e635] uppercase tracking-wider font-mono">
                <Wand2 className="w-3.5 h-3.5" />
                <span>How to Fix</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                {analysisResult.how_to_fix || analysisResult.fix}
              </p>
            </div>

            {/* Code Diff Preview & One-Click Apply */}
            {analysisResult.fixed_code && fixIsUseful && (
              <div className="bg-[#141720] border border-[#242833] rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Suggested Code Correction</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyFixed}
                      className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                    >
                      {copied ? <Check className="w-3 h-3 text-[#a3e635]" /> : <Copy className="w-3 h-3" />}
                      <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleApply}
                      className={cn(
                        'h-6 px-3 text-xs font-semibold transition-all shadow-sm',
                        applied
                          ? 'bg-emerald-500 text-black'
                          : 'bg-[#a3e635] hover:bg-[#bef264] text-black'
                      )}
                    >
                      {applied ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          <span>Applied!</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3 mr-1" />
                          <span>Apply Fix</span>
                        </>
                      )}
                    </Button>

                    {canUndo && onUndoFix && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onUndoFix}
                        className="h-6 px-2 text-xs bg-[#181b22] hover:bg-[#20242e] text-zinc-300 border-[#242833]"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        <span>Undo</span>
                      </Button>
                    )}

                    {onRunAgain && (
                      <Button
                        size="sm"
                        onClick={onRunAgain}
                        className="h-6 px-2.5 text-xs font-medium bg-[#1e2330] hover:bg-[#252b3b] text-white border border-[#3b4252]"
                      >
                        <Play className="w-3 h-3 mr-1 text-[#a3e635]" />
                        <span>Run Again</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Visual Line Diff */}
                {analysisResult.diff_preview && (
                  <div className="bg-[#0b0c0f] rounded border border-[#242833] p-2.5 font-mono text-xs space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 bg-rose-950/30 px-2 py-1 rounded">
                      <span className="font-bold select-none">-</span>
                      <span>{analysisResult.diff_preview.original_line}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded">
                      <span className="font-bold select-none">+</span>
                      <span>{analysisResult.diff_preview.fixed_line}</span>
                    </div>
                  </div>
                )}

                {/* Full Fixed Code View */}
                <div className="relative">
                  <pre className="text-xs font-mono text-zinc-200 bg-[#0b0c0f] p-3 rounded-md border border-[#242833] overflow-x-auto max-h-52 leading-relaxed">
                    {analysisResult.fixed_code}
                  </pre>
                </div>
              </div>
            )}

            {/* Expandable Full Traceback Accordion */}
            {activeError && (
              <div className="border border-[#242833] rounded-lg overflow-hidden bg-[#101217]">
                <button
                  type="button"
                  onClick={() => setShowTraceback(!showTraceback)}
                  className="w-full flex items-center justify-between p-2.5 text-xs text-zinc-400 hover:text-white transition-colors bg-[#141720]"
                >
                  <div className="flex items-center gap-1.5 font-mono">
                    <Bug className="w-3 h-3 text-zinc-500" />
                    <span>Raw Error Traceback</span>
                  </div>
                  {showTraceback ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showTraceback && (
                  <pre className="p-3 text-[11px] font-mono text-rose-300/90 whitespace-pre-wrap max-h-48 overflow-y-auto bg-[#0b0c0f] border-t border-[#242833]">
                    {activeError}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Initial Empty State */}
        {!isAnalyzing && !analysisResult && !isCleanSuccess && (
          <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-500">
            <Bug className="w-10 h-10 mb-2.5 opacity-25 text-rose-400" />
            <p className="text-zinc-300 text-sm font-medium">Ready to Diagnose Errors</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Run your code with the &ldquo;Run&rdquo; button. If an error occurs or suspicious logic is detected, detailed root cause analysis will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
