'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Boxes,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  GitBranch,
  Layers,
  Database,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { replayApi, ExecutionStep, TraceResponse } from '@/lib/replay-api';

interface VisualLogicProps {
  code: string;
  language: string;
  onClose: () => void;
  onHighlightLine?: (line: number | null) => void;
}

type ViewTab = 'flowchart' | 'memory' | 'branches';

interface CodeBlock {
  id: string;
  type: 'function' | 'loop' | 'condition' | 'assignment' | 'return' | 'statement';
  line: number;
  rawText: string;
  conditionText?: string;
  loopTarget?: string;
  indent: number;
}

export function VisualLogic({
  code,
  language,
  onClose,
  onHighlightLine,
}: VisualLogicProps) {
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<TraceResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<ViewTab>('flowchart');
  const [loadError, setLoadError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPython = language.toLowerCase() === 'python';

  // Load trace on mount or code change
  useEffect(() => {
    if (!isPython) return;

    let isMounted = true;
    const fetchTrace = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const resp = await replayApi.trace(code, language);
        if (isMounted) {
          setTraceData(resp.data);
          setCurrentStepIndex(0);
        }
      } catch (err: any) {
        if (isMounted) {
          setLoadError(
            err.response?.data?.detail || err.message || 'Failed to generate visual logic trace.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrace();
    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [code, language, isPython]);

  const steps = traceData?.steps || [];
  const totalSteps = steps.length;
  const currentStep: ExecutionStep | undefined = steps[currentStepIndex];

  // Notify parent of highlighted line
  useEffect(() => {
    if (currentStep) {
      onHighlightLine?.(currentStep.line);
    } else {
      onHighlightLine?.(null);
    }
  }, [currentStep, onHighlightLine]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      onHighlightLine?.(null);
    };
  }, [onHighlightLine]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, totalSteps]);

  // Parse structural code blocks from python code
  const codeBlocks = useMemo<CodeBlock[]>(() => {
    const lines = code.split('\n');
    const blocks: CodeBlock[] = [];

    lines.forEach((lineStr, idx) => {
      const lineNum = idx + 1;
      const trimmed = lineStr.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const indent = lineStr.search(/\S/);

      if (/^def\s+/.test(trimmed)) {
        blocks.push({
          id: `block-${lineNum}`,
          type: 'function',
          line: lineNum,
          rawText: trimmed,
          indent,
        });
      } else if (/^(for|while)\b/.test(trimmed)) {
        blocks.push({
          id: `block-${lineNum}`,
          type: 'loop',
          line: lineNum,
          rawText: trimmed,
          indent,
        });
      } else if (/^(if|elif|else)\b/.test(trimmed)) {
        blocks.push({
          id: `block-${lineNum}`,
          type: 'condition',
          line: lineNum,
          rawText: trimmed,
          conditionText: trimmed.replace(/^(if|elif|else)\s*/, '').replace(/:$/, ''),
          indent,
        });
      } else if (/^return\b/.test(trimmed)) {
        blocks.push({
          id: `block-${lineNum}`,
          type: 'return',
          line: lineNum,
          rawText: trimmed,
          indent,
        });
      } else if (trimmed.includes('=') && !trimmed.startsWith('==')) {
        blocks.push({
          id: `block-${lineNum}`,
          type: 'assignment',
          line: lineNum,
          rawText: trimmed,
          indent,
        });
      } else {
        blocks.push({
          id: `block-${lineNum}`,
          type: 'statement',
          line: lineNum,
          rawText: trimmed,
          indent,
        });
      }
    });

    return blocks;
  }, [code]);

  // Track loop visit counts and branches from steps
  const blockStats = useMemo(() => {
    const visits: Record<number, number> = {};
    steps.slice(0, currentStepIndex + 1).forEach((step) => {
      visits[step.line] = (visits[step.line] || 0) + 1;
    });
    return { visits };
  }, [steps, currentStepIndex]);

  // Previous step for diffing
  const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  const changedVars = useMemo(() => {
    if (!currentStep) return new Set<string>();
    const set = new Set<string>();
    const curr = currentStep.variables;
    const prev = previousStep?.variables || {};
    for (const [k, v] of Object.entries(curr)) {
      if (prev[k] !== v) set.add(k);
    }
    return set;
  }, [currentStep, previousStep]);

  // Non-Python fallback
  if (!isPython) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#0b0c0f] text-center font-sans">
        <div className="w-12 h-12 rounded-full bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">Visual Logic Mode — Python Only</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          Dynamic AST flowcharting and runtime state introspection currently supports Python. Multi-language support is coming soon.
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="mt-4 text-xs text-zinc-300 hover:text-white bg-[#181b22] border border-[#242833]"
        >
          Exit Visual Logic
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#0b0c0f] text-center font-sans">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-white">Constructing Visual Logic Graph...</p>
        <p className="text-xs text-zinc-400 mt-1">
          Simulating execution path to generate control-flow diagrams and state snapshots.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#0b0c0f] text-center font-sans">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
        <p className="text-sm font-semibold text-white">Visual Logic Generation Error</p>
        <p className="text-xs text-rose-300 font-mono mt-1 max-w-md bg-[#141720] p-3 rounded border border-rose-900/50 whitespace-pre-wrap">
          {loadError}
        </p>
        <Button
          size="sm"
          onClick={onClose}
          className="mt-4 text-xs bg-[#181b22] hover:bg-[#202530] text-white border border-[#242833]"
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0c0f] font-sans text-xs select-none">
      {/* Top Header / Control Bar */}
      <div className="h-10 px-3 bg-[#12101b] border-b border-[#242833] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-white text-xs">Visual Logic</span>
          {totalSteps > 0 && (
            <span className="text-[11px] font-mono text-purple-300 bg-[#251b3a] border border-[#482e70] px-1.5 py-0.5 rounded">
              Step {currentStepIndex + 1} / {totalSteps}
            </span>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-[#181524] p-0.5 rounded border border-[#2e2645]">
          <button
            type="button"
            onClick={() => setActiveTab('flowchart')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-medium',
              activeTab === 'flowchart'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <GitBranch className="w-3 h-3" />
            <span>Flowchart</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-medium',
              activeTab === 'memory'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Database className="w-3 h-3" />
            <span>Data Structures</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-medium',
              activeTab === 'branches'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Layers className="w-3 h-3" />
            <span>Branch Matrix</span>
          </button>
        </div>

        {/* Step Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            title="Restart"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.max(0, prev - 1));
            }}
            disabled={currentStepIndex <= 0}
            title="Step Back"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
            className="h-7 px-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-sm gap-1"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Animate</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
            }}
            disabled={currentStepIndex >= totalSteps - 1}
            title="Step Forward"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0 ml-1 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrubber Range */}
      {totalSteps > 1 && (
        <div className="px-4 py-1.5 bg-[#0e0c15] border-b border-[#242833] flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500">Step 1</span>
          <input
            type="range"
            min="0"
            max={totalSteps - 1}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(parseInt(e.target.value, 10));
            }}
            className="flex-1 h-1 bg-[#241e3a] rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span className="text-[10px] font-mono text-zinc-500">Step {totalSteps}</span>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0b0c0f]">
        {/* VIEW 1: FLOWCHART */}
        {activeTab === 'flowchart' && (
          <div className="max-w-2xl mx-auto space-y-2 py-2">
            {/* Start Node */}
            <div className="flex flex-col items-center">
              <div className="px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-mono text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>START PROGRAM</span>
              </div>
              <ArrowDown className="w-4 h-4 text-zinc-600 my-1" />
            </div>

            {/* Code Blocks in Sequence */}
            {codeBlocks.map((block, idx) => {
              const isActive = currentStep?.line === block.line;
              const visitCount = blockStats.visits[block.line] || 0;

              return (
                <div key={block.id} className="flex flex-col items-center">
                  <div
                    onClick={() => {
                      // Find first step that matches this line
                      const matchingStepIdx = steps.findIndex((s) => s.line === block.line);
                      if (matchingStepIdx !== -1) {
                        setIsPlaying(false);
                        setCurrentStepIndex(matchingStepIdx);
                      }
                    }}
                    className={cn(
                      'w-full max-w-lg p-3 rounded-lg border transition-all cursor-pointer relative',
                      isActive
                        ? 'bg-[#1e1735] border-purple-500 ring-2 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                        : visitCount > 0
                        ? 'bg-[#12131a] border-[#292e40] hover:border-zinc-500'
                        : 'bg-[#0e1015]/60 border-[#1f232d] opacity-50 hover:opacity-80'
                    )}
                  >
                    {/* Header: Type Badge, Line, Visit counter */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-[10px] uppercase font-bold px-1.5 py-0.5 rounded',
                            block.type === 'function' && 'bg-blue-950/80 text-blue-300 border border-blue-800',
                            block.type === 'loop' && 'bg-amber-950/80 text-amber-300 border border-amber-800',
                            block.type === 'condition' && 'bg-cyan-950/80 text-cyan-300 border border-cyan-800',
                            block.type === 'return' && 'bg-emerald-950/80 text-emerald-300 border border-emerald-800',
                            block.type === 'assignment' && 'bg-zinc-800 text-zinc-300 border border-zinc-700',
                            block.type === 'statement' && 'bg-zinc-800 text-zinc-400'
                          )}
                        >
                          {block.type}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          Line {block.line}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {visitCount > 0 && (
                          <span className="text-[10px] font-mono text-zinc-400 bg-[#181b22] px-1.5 py-0.5 rounded border border-[#242833]">
                            Executed {visitCount}x
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] font-bold text-purple-300 uppercase px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-600 animate-pulse">
                            Active Step
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Code Snippet */}
                    <div className="font-mono text-xs text-zinc-200 bg-[#0b0c0f] p-2 rounded border border-[#1e2330]">
                      {block.rawText}
                    </div>

                    {/* If Active: Show active variables right in the block */}
                    {isActive && currentStep && Object.keys(currentStep.variables).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-purple-900/40">
                        <span className="text-[10px] font-semibold text-purple-300 uppercase block mb-1">
                          Variables at this moment:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(currentStep.variables).map(([k, v]) => (
                            <span
                              key={k}
                              className={cn(
                                'text-[11px] font-mono px-2 py-0.5 rounded border',
                                changedVars.has(k)
                                  ? 'bg-purple-950/90 text-purple-200 border-purple-500 ring-1 ring-purple-500'
                                  : 'bg-[#181b22] text-zinc-300 border-[#242833]'
                              )}
                            >
                              <strong className="text-white">{k}</strong> = {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {idx < codeBlocks.length - 1 && (
                    <ArrowDown className="w-4 h-4 text-zinc-600 my-1" />
                  )}
                </div>
              );
            })}

            {/* End Node */}
            <div className="flex flex-col items-center">
              <ArrowDown className="w-4 h-4 text-zinc-600 my-1" />
              <div className="px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 font-mono text-xs font-semibold">
                END OF EXECUTION
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DATA STRUCTURES & MEMORY */}
        {activeTab === 'memory' && (
          <div className="max-w-4xl mx-auto space-y-4 py-2">
            <div className="flex items-center justify-between border-b border-[#242833] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-semibold text-white">Runtime Variable State</h4>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Step {currentStepIndex + 1} &bull; Line {currentStep?.line}
              </span>
            </div>

            {currentStep && Object.keys(currentStep.variables).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(currentStep.variables).map(([name, valStr]) => {
                  const wasChanged = changedVars.has(name);
                  // Check if value looks like a Python list
                  const isList = valStr.startsWith('[') && valStr.endsWith(']');
                  let listItems: string[] = [];
                  if (isList) {
                    try {
                      const trimmed = valStr.slice(1, -1).trim();
                      if (trimmed.length > 0) {
                        listItems = trimmed.split(',').map((s) => s.trim());
                      }
                    } catch {
                      listItems = [];
                    }
                  }

                  // Check if value looks like a Python dict
                  const isDict = valStr.startsWith('{') && valStr.endsWith('}');

                  return (
                    <div
                      key={name}
                      className={cn(
                        'p-3.5 rounded-lg border font-mono transition-all',
                        wasChanged
                          ? 'bg-[#181524] border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                          : 'bg-[#13151b] border-[#242833]'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181b22] text-zinc-400 border border-[#242833]">
                            {isList ? 'list' : isDict ? 'dict' : typeof valStr}
                          </span>
                        </div>
                        {wasChanged && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700">
                            Modified
                          </span>
                        )}
                      </div>

                      {/* List Visualization: Contiguous Memory Blocks */}
                      {isList && listItems.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {listItems.map((item, itemIdx) => (
                              <div
                                key={itemIdx}
                                className="flex flex-col items-center bg-[#0b0c0f] border border-[#242833] rounded px-3 py-1.5 min-w-[48px]"
                              >
                                <span className="text-[9px] text-zinc-500 mb-0.5">[{itemIdx}]</span>
                                <span className="text-xs font-bold text-emerald-400">{item}</span>
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] text-zinc-500">Length: {listItems.length} items</span>
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-zinc-200 select-text bg-[#0b0c0f] p-2 rounded border border-[#242833]">
                          {valStr}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-600 text-xs">
                <Database className="w-8 h-8 mb-2 opacity-30" />
                <span>No user variables in scope at this step.</span>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: BRANCH & LOOP MATRIX */}
        {activeTab === 'branches' && (
          <div className="max-w-3xl mx-auto space-y-4 py-2">
            <div className="flex items-center justify-between border-b border-[#242833] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-semibold text-white">Loops & Conditional Decisions</h4>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Analysis Summary</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Loops Card */}
              <div className="bg-[#13151b] border border-[#242833] rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white text-xs border-b border-[#242833] pb-2">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Detected Loops</span>
                </div>
                {codeBlocks.filter((b) => b.type === 'loop').length > 0 ? (
                  <div className="space-y-2">
                    {codeBlocks
                      .filter((b) => b.type === 'loop')
                      .map((loop) => {
                        const count = blockStats.visits[loop.line] || 0;
                        return (
                          <div
                            key={loop.id}
                            className="p-2.5 bg-[#0b0c0f] rounded border border-[#242833] space-y-1 font-mono text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Line {loop.line}</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800 text-[10px]">
                                {count} iterations executed
                              </span>
                            </div>
                            <div className="text-zinc-200 truncate">{loop.rawText}</div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-zinc-500 text-xs">
                    No loops found in current code.
                  </div>
                )}
              </div>

              {/* Conditionals Card */}
              <div className="bg-[#13151b] border border-[#242833] rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white text-xs border-b border-[#242833] pb-2">
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Conditional Branches</span>
                </div>
                {codeBlocks.filter((b) => b.type === 'condition').length > 0 ? (
                  <div className="space-y-2">
                    {codeBlocks
                      .filter((b) => b.type === 'condition')
                      .map((cond) => {
                        const count = blockStats.visits[cond.line] || 0;
                        return (
                          <div
                            key={cond.id}
                            className="p-2.5 bg-[#0b0c0f] rounded border border-[#242833] space-y-1 font-mono text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Line {cond.line}</span>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] border',
                                  count > 0
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                )}
                              >
                                {count > 0 ? `Branch taken ${count}x` : 'Branch not visited'}
                              </span>
                            </div>
                            <div className="text-zinc-200 truncate">{cond.rawText}</div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-zinc-500 text-xs">
                    No conditional branches found in current code.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
