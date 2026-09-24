'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sliders,
  Variable,
  Terminal,
  Activity,
  AlertCircle,
  Loader2,
  X,
  FastForward,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { replayApi, ExecutionStep, TraceResponse } from '@/lib/replay-api';

interface CodeReplayProps {
  code: string;
  language: string;
  onClose: () => void;
  onHighlightLine?: (line: number | null) => void;
}

export function CodeReplay({
  code,
  language,
  onClose,
  onHighlightLine,
}: CodeReplayProps) {
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<TraceResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step
  const [loadError, setLoadError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isPython = language.toLowerCase() === 'python';

  // Fetch execution trace on mount
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
            err.response?.data?.detail || err.message || 'Failed to generate code replay trace.'
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

  // Clean up highlight when closing
  useEffect(() => {
    return () => {
      onHighlightLine?.(null);
    };
  }, [onHighlightLine]);

  // Handle Play / Pause timer
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

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setCurrentStepIndex(parseInt(e.target.value, 10));
  };

  // Find which variables changed compared to previous step
  const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  const changedVars = useMemo(() => {
    if (!currentStep) return new Set<string>();
    const changed = new Set<string>();
    const currVars = currentStep.variables;
    const prevVars = previousStep?.variables || {};

    for (const [k, v] of Object.entries(currVars)) {
      if (prevVars[k] !== v) {
        changed.add(k);
      }
    }
    return changed;
  }, [currentStep, previousStep]);

  if (!isPython) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#0b0c0f] text-center font-sans">
        <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">Code Replay — Python Only</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          Execution instrumentation currently supports Python via runtime AST tracing. Support for other languages is in active development.
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="mt-4 text-xs text-zinc-300 hover:text-white bg-[#181b22] border border-[#242833]"
        >
          Exit Replay
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#0b0c0f] text-center font-sans">
        <Loader2 className="w-8 h-8 text-[#a3e635] animate-spin mb-3" />
        <p className="text-sm font-medium text-white">Recording Execution Trace...</p>
        <p className="text-xs text-zinc-400 mt-1">
          Running code in instrumented sandbox to capture state snapshots.
        </p>
      </div>
    );
  }

  if (loadError || (traceData && traceData.status === 'error' && totalSteps === 0)) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#0b0c0f] text-center font-sans">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
        <p className="text-sm font-semibold text-white">Trace Generation Failed</p>
        <p className="text-xs text-rose-300/90 font-mono mt-1 max-w-md bg-[#141720] p-3 rounded border border-rose-900/50 whitespace-pre-wrap">
          {loadError || traceData?.error || 'Syntax or runtime error prevented tracing.'}
        </p>
        <Button
          size="sm"
          onClick={onClose}
          className="mt-4 text-xs bg-[#181b22] hover:bg-[#202530] text-white border border-[#242833]"
        >
          Close Replay
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0c0f] font-sans text-xs select-none">
      {/* Replay Control Bar */}
      <div className="h-10 px-3 bg-[#13151b] border-b border-[#242833] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-white text-xs">Code Replay</span>
          {totalSteps > 0 && (
            <span className="text-[11px] font-mono text-[#a3e635] bg-[#182618] border border-[#2b4c2b] px-1.5 py-0.5 rounded">
              Step {currentStepIndex + 1} / {totalSteps}
            </span>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRestart}
            title="Restart from beginning"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleStepBackward}
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
            className="h-7 px-2.5 bg-[#a3e635] hover:bg-[#bef264] text-black font-semibold shadow-sm gap-1"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleStepForward}
            disabled={currentStepIndex >= totalSteps - 1}
            title="Step Forward"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>

          {/* Speed Selector */}
          <div className="flex items-center ml-2 border-l border-[#242833] pl-2 gap-1 text-[11px] font-mono text-zinc-400">
            <span
              onClick={() => setPlaybackSpeed(1500)}
              className={cn(
                'cursor-pointer px-1 py-0.5 rounded',
                playbackSpeed === 1500 ? 'text-white bg-[#1e2330]' : 'hover:text-zinc-200'
              )}
            >
              0.5x
            </span>
            <span
              onClick={() => setPlaybackSpeed(800)}
              className={cn(
                'cursor-pointer px-1 py-0.5 rounded',
                playbackSpeed === 800 ? 'text-white bg-[#1e2330]' : 'hover:text-zinc-200'
              )}
            >
              1x
            </span>
            <span
              onClick={() => setPlaybackSpeed(300)}
              className={cn(
                'cursor-pointer px-1 py-0.5 rounded',
                playbackSpeed === 300 ? 'text-white bg-[#1e2330]' : 'hover:text-zinc-200'
              )}
            >
              2x
            </span>
          </div>

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

      {/* Scrub Slider Bar */}
      {totalSteps > 1 && (
        <div className="px-4 py-2 bg-[#0e1015] border-b border-[#242833] flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500">1</span>
          <input
            type="range"
            min="0"
            max={totalSteps - 1}
            value={currentStepIndex}
            onChange={handleSliderChange}
            className="flex-1 h-1 bg-[#1e2330] rounded-lg appearance-none cursor-pointer accent-[#a3e635]"
          />
          <span className="text-[10px] font-mono text-zinc-500">{totalSteps}</span>
        </div>
      )}

      {/* Replay Details: Variables + Output + Call info */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Variables Inspector */}
        <div className="flex-1 border-r border-[#242833] flex flex-col p-3 overflow-y-auto space-y-3 bg-[#0b0c0f]">
          <div className="flex items-center justify-between border-b border-[#242833] pb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Variable className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scope Variables</span>
            </div>
            {currentStep && (
              <span className="text-[11px] font-mono text-zinc-400">
                Line <strong className="text-[#a3e635]">{currentStep.line}</strong> &bull; Function{' '}
                <strong className="text-zinc-200">{currentStep.func}</strong>
              </span>
            )}
          </div>

          {currentStep && Object.keys(currentStep.variables).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(currentStep.variables).map(([name, val]) => {
                const wasChanged = changedVars.has(name);
                return (
                  <div
                    key={name}
                    className={cn(
                      'p-2 rounded border font-mono transition-all',
                      wasChanged
                        ? 'bg-[#182618] border-[#2b4c2b] text-emerald-300 ring-1 ring-[#a3e635]/40'
                        : 'bg-[#13151b] border-[#242833] text-zinc-300'
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-white">{name}</span>
                      {wasChanged && (
                        <span className="text-[9px] uppercase px-1 rounded bg-[#a3e635]/20 text-[#a3e635] font-semibold">
                          updated
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate select-text text-zinc-200">{val}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-zinc-600 text-xs">
              <Variable className="w-6 h-6 mb-1.5 opacity-30" />
              <span>No user variables assigned at this step.</span>
            </div>
          )}
        </div>

        {/* Right Side: Step Output Accumulator */}
        <div className="w-72 flex flex-col p-3 overflow-y-auto space-y-2 bg-[#0e1015]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white border-b border-[#242833] pb-2">
            <Terminal className="w-3.5 h-3.5 text-[#a3e635]" />
            <span>Stdout (as of Step {currentStepIndex + 1})</span>
          </div>

          <pre className="flex-1 bg-[#0b0c0f] p-2.5 rounded border border-[#242833] font-mono text-xs text-zinc-300 whitespace-pre-wrap select-text leading-relaxed overflow-y-auto">
            {currentStep?.stdout ? currentStep.stdout : <span className="text-zinc-600">(no stdout yet)</span>}
          </pre>
        </div>
      </div>
    </div>
  );
}
