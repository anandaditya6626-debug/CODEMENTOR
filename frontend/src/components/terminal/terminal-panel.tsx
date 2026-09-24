'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Keyboard,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Trash2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Clock,
  Cpu,
  CornerDownLeft,
  FlaskConical,
  Bug,
  Sparkles,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ErrorDetective } from './error-detective';
import { TestLab } from './test-lab';
import { parseExecutionError, ParsedError } from '@/lib/error-parser';

export interface OutputChunk {
  id: number;
  type: 'stdout' | 'stderr' | 'compile' | 'system' | 'stdin';
  text: string;
}

export interface ExecutionDiagnostic {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  time: number | string | null;
  memory: number | null;
  exitCode: number | null;
  error?: string;
}

export interface TestCaseResult {
  id: string;
  passed: boolean;
  input_data?: string;
  expected_output?: string;
  actual_output?: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  time?: number;
}

interface TerminalPanelProps {
  chunks: OutputChunk[];
  isRunning: boolean;
  status: ExecutionDiagnostic['status'];
  diagnostics: ExecutionDiagnostic | null;
  testCaseResults: TestCaseResult[] | null;
  stdin: string;
  onStdinChange: (val: string) => void;
  onSendInteractiveInput: (val: string) => void;
  onClearOutput: () => void;
  onStop: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRunTestCases?: () => void;
  currentCode?: string;
  language?: string;
  onApplyFix?: (newCode: string) => void;
  onUndoFix?: () => void;
  canUndo?: boolean;
  onRunAgain?: () => void;
  onJumpToLine?: (line: number) => void;
  onJumpToSymbol?: (symbol: string) => void;
}

export function TerminalPanel({
  chunks,
  isRunning,
  status,
  diagnostics,
  testCaseResults,
  stdin,
  onStdinChange,
  onSendInteractiveInput,
  onClearOutput,
  onStop,
  isFullscreen,
  onToggleFullscreen,
  onRunTestCases,
  currentCode = '',
  language = 'python',
  onApplyFix,
  onUndoFix,
  canUndo = false,
  onRunAgain,
  onJumpToLine,
  onJumpToSymbol,
}: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'terminal' | 'preview' | 'stdin' | 'diagnostics' | 'tests' | 'error-detective'
  >('terminal');
  const [copied, setCopied] = useState(false);
  const [interactiveInput, setInteractiveInput] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Auto-switch to preview tab when working with HTML/CSS
  useEffect(() => {
    if (language === 'html' || language === 'css') {
      setActiveTab('preview');
    }
  }, [language]);

  // Auto-switch to tests tab when automated problem test case results are loaded
  useEffect(() => {
    if (testCaseResults && testCaseResults.length > 0) {
      setActiveTab('tests');
    }
  }, [testCaseResults]);

  const errorChunks = chunks.filter((c) => c.type === 'stderr' || c.type === 'compile');
  const errorOutput = errorChunks.map((c) => c.text).join('') || diagnostics?.error || '';

  // Parse error if execution failed or stderr contains errors
  const parsedError = React.useMemo(() => {
    if (!errorOutput) return null;
    return parseExecutionError(errorOutput, language, currentCode);
  }, [errorOutput, language, currentCode]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal on new chunks
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chunks, activeTab]);

  // Focus interactive input when running
  useEffect(() => {
    if (isRunning && activeTab === 'terminal') {
      inputRef.current?.focus();
    }
  }, [isRunning, activeTab]);

  // Live timer while running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const handleInteractiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactiveInput) return;
    onSendInteractiveInput(interactiveInput);
    setInteractiveInput('');
  };

  const handleCopy = async () => {
    const rawText = chunks.map((c) => c.text).join('');
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0c0f] text-[#f3f4f6] font-mono text-xs select-none">
      {/* Console Header */}
      <div className="h-9 px-3 bg-[#13151b] border-b border-[#242833] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 h-full">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full border-b-2 font-medium transition-colors text-xs',
              activeTab === 'terminal'
                ? 'border-[#a3e635] text-white bg-[#181b22]'
                : 'border-transparent text-[#9ca3af] hover:text-white hover:bg-[#181b22]/50'
            )}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-[#a3e635]" />
            <span>Terminal</span>
            {chunks.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1 rounded">
                {chunks.length}
              </span>
            )}
          </button>

          {/* Live Web Preview Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full border-b-2 font-medium transition-colors text-xs',
              activeTab === 'preview'
                ? 'border-cyan-400 text-white bg-[#181b22]'
                : 'border-transparent text-[#9ca3af] hover:text-white hover:bg-[#181b22]/50'
            )}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preview</span>
            {(language === 'html' || language === 'css') && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stdin')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full border-b-2 font-medium transition-colors text-xs',
              activeTab === 'stdin'
                ? 'border-[#a3e635] text-white bg-[#181b22]'
                : 'border-transparent text-[#9ca3af] hover:text-white hover:bg-[#181b22]/50'
            )}
          >
            <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
            <span>INPUT (stdin)</span>
            {stdin.trim() && (
              <span className="text-[10px] text-zinc-400 font-mono">({stdin.length}c)</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full border-b-2 font-medium transition-colors text-xs',
              activeTab === 'tests'
                ? 'border-[#a3e635] text-white bg-[#181b22]'
                : 'border-transparent text-[#9ca3af] hover:text-white hover:bg-[#181b22]/50'
            )}
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
            <span>Test Lab</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('error-detective')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full border-b-2 font-medium transition-colors text-xs',
              activeTab === 'error-detective'
                ? 'border-rose-400 text-white bg-[#181b22]'
                : 'border-transparent text-[#9ca3af] hover:text-white hover:bg-[#181b22]/50'
            )}
          >
            <Bug className="w-3.5 h-3.5 text-rose-400" />
            <span>Error Detective</span>
            {errorOutput.length > 0 && status === 'failed' && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full border-b-2 font-medium transition-colors text-xs',
              activeTab === 'diagnostics'
                ? 'border-[#a3e635] text-white bg-[#181b22]'
                : 'border-transparent text-[#9ca3af] hover:text-white hover:bg-[#181b22]/50'
            )}
          >
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>Diagnostics</span>
            {diagnostics && diagnostics.exitCode !== null && (
              <span className={cn('w-1.5 h-1.5 rounded-full', diagnostics.exitCode === 0 ? 'bg-emerald-400' : 'bg-rose-400')} />
            )}
          </button>
        </div>

        {/* State Machine Status & Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <div className="flex items-center gap-1.5 text-xs text-[#a3e635] bg-[#182618] border border-[#2b4c2b] px-2 py-0.5 rounded">
              <span className="w-2 h-2 rounded-full bg-[#a3e635] animate-pulse" />
              <span>Executing ({elapsedSeconds}s)</span>
            </div>
          ) : status === 'completed' ? (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              <span>Done {diagnostics?.time ? `(${diagnostics.time}s)` : ''}</span>
            </div>
          ) : status === 'failed' ? (
            <div className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/50 border border-rose-800/50 px-2 py-0.5 rounded">
              <XCircle className="w-3 h-3" />
              <span>Exit code {diagnostics?.exitCode ?? -1}</span>
            </div>
          ) : null}

          <div className="h-3.5 w-px bg-[#242833]" />

          <button
            type="button"
            onClick={handleCopy}
            title="Copy Output"
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#1e2129] rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#a3e635]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClearOutput}
            title="Clear Terminal"
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#1e2129] rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Restore Terminal' : 'Maximize Terminal'}
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#1e2129] rounded transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Console Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* 1. Terminal View */}
        {activeTab === 'terminal' && (
          <div className="h-full flex flex-col p-3 overflow-y-auto font-mono text-xs leading-relaxed select-text">
            {chunks.length === 0 && !isRunning ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs py-8 select-none">
                <TerminalIcon className="w-8 h-8 mb-2 opacity-30 text-[#a3e635]" />
                <p className="text-zinc-400">Terminal ready. Click <span className="text-[#a3e635] font-semibold">&ldquo;Run&rdquo;</span> or press <kbd className="bg-[#181b22] border border-[#242833] px-1 rounded text-white">Enter</kbd> to execute.</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Streaming stdout, interactive standard input, and diagnostics.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {chunks.map((chunk) => {
                  if (chunk.type === 'system') {
                    return (
                      <div key={chunk.id} className="text-zinc-500 font-mono text-[11px]">
                        {chunk.text}
                      </div>
                    );
                  }
                  if (chunk.type === 'compile') {
                    return (
                      <div key={chunk.id} className="text-amber-300/90 whitespace-pre-wrap font-mono">
                        {chunk.text}
                      </div>
                    );
                  }
                  if (chunk.type === 'stderr') {
                    return (
                      <div key={chunk.id} className="text-rose-400 whitespace-pre-wrap font-mono">
                        {chunk.text}
                      </div>
                    );
                  }
                  if (chunk.type === 'stdin') {
                    return (
                      <div key={chunk.id} className="text-[#a3e635] font-mono font-medium">
                        {chunk.text}
                      </div>
                    );
                  }
                  return (
                    <div key={chunk.id} className="text-[#f3f4f6] whitespace-pre-wrap font-mono">
                      {chunk.text}
                    </div>
                  );
                })}

                {/* Interactive stdin input prompt while running */}
                {isRunning && (
                  <form onSubmit={handleInteractiveSubmit} className="flex items-center gap-1.5 pt-1 text-white">
                    <span className="text-[#a3e635]">&rsaquo;</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={interactiveInput}
                      onChange={(e) => setInteractiveInput(e.target.value)}
                      placeholder="Type input and press Enter..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                    />
                    <button type="submit" className="text-zinc-500 hover:text-white">
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* Interactive Error Suggestion & Quick-Fix Card */}
                {!isRunning && (status === 'failed' || errorOutput.length > 0) && (
                  <div className="mt-3 p-3 rounded-lg border border-rose-900/60 bg-gradient-to-br from-rose-950/40 via-[#181116] to-[#0f1117] text-xs shadow-md">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 shrink-0">
                          <Bug className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-semibold text-rose-200">
                          {parsedError?.errorType || 'Execution Error'}
                        </span>
                        {parsedError?.line ? (
                          <button
                            type="button"
                            onClick={() => onJumpToLine?.(parsedError.line!)}
                            className="px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-300 font-mono text-[11px] border border-rose-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Click to jump to this line in the code editor"
                          >
                            <span>📍 Line {parsedError.line}</span>
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {parsedError?.suggestedFix && onApplyFix && (
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => onApplyFix(parsedError.suggestedFix!)}
                            className="h-6 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1 shadow-sm"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-200" />
                            <span>Apply Fix</span>
                          </Button>
                        )}
                        {canUndo && onUndoFix && (
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={onUndoFix}
                            className="h-6 px-2 text-[11px] bg-zinc-900/80 hover:bg-zinc-800 border-zinc-700 text-zinc-300 gap-1"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-400" />
                            <span>Undo Fix</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => setActiveTab('error-detective')}
                          className="h-6 px-2.5 text-[11px] bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-sans font-medium gap-1 shadow-sm"
                        >
                          <Bug className="w-3 h-3 text-rose-400" />
                          <span>Error Detective</span>
                        </Button>
                      </div>
                    </div>

                    {parsedError ? (
                      <div className="mt-2.5 pl-7 space-y-2 text-zinc-300">
                        {parsedError.problem && (
                          <p className="text-zinc-100 text-xs font-semibold leading-relaxed">
                            {parsedError.problem}
                          </p>
                        )}
                        <p className="text-zinc-300 text-xs font-normal leading-relaxed">
                          {parsedError.why_it_happened || parsedError.explanation}
                        </p>
                        
                        {/* Diff Preview if available */}
                        {parsedError.diff_preview && (
                          <div className="my-1.5 p-2 rounded bg-[#0b0c10] border border-zinc-800 text-[11px] font-mono">
                            <div className="flex items-center text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded">
                              <span className="select-none font-bold mr-2 text-rose-500">-</span>
                              <span className="truncate">{parsedError.diff_preview.original_line}</span>
                            </div>
                            <div className="flex items-center text-emerald-300 bg-emerald-950/30 px-1.5 py-0.5 rounded mt-0.5">
                              <span className="select-none font-bold mr-2 text-emerald-400">+</span>
                              <span className="truncate">{parsedError.diff_preview.fixed_line}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2 text-amber-200/90 bg-amber-950/40 p-2.5 rounded border border-amber-800/40">
                          <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                          <div className="text-[11.5px] leading-relaxed">
                            <span className="font-semibold text-amber-300">Fix Suggestion: </span>
                            {parsedError.how_to_fix || parsedError.suggestion}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 pl-7 text-zinc-400 text-xs">
                        Execution failed. Review output above or click Error Detective for automated analysis.
                      </div>
                    )}
                  </div>
                )}

                <div ref={terminalEndRef} />
              </div>
            )}
          </div>
        )}

        {/* 1.5. Live Web Preview View (HTML / CSS) */}
        {activeTab === 'preview' && (
          <div className="h-full flex flex-col bg-[#0b0c0f]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#13151b] border-b border-[#242833] text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-white">Live Web Preview</span>
                <span className="text-[10px] text-zinc-500 font-mono">sandboxed</span>
              </div>
              <div className="text-[11px] font-mono text-cyan-300">
                {language === 'html' ? 'HTML5 Render' : language === 'css' ? 'CSS3 Stylesheet Preview' : 'Web Preview'}
              </div>
            </div>
            <div className="flex-1 p-2 bg-[#12141a]">
              <iframe
                sandbox="allow-scripts"
                srcDoc={
                  language === 'css'
                    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${currentCode}</style></head><body style="font-family:system-ui,sans-serif;padding:24px;background:#0b0c0f;color:#f3f4f6;"><div class="hero" style="max-width:500px;margin:0 auto;text-align:center;"><h1>CSS Preview</h1><p>Your custom CSS rules are rendered in this live container.</p><button class="btn" style="padding:8px 16px;cursor:pointer;">Sample Button</button></div></body></html>`
                    : currentCode || '<div style="font-family:system-ui;padding:2rem;color:#888;text-align:center;">Empty HTML Document</div>'
                }
                className="w-full h-full bg-white rounded border border-[#242833]"
                title="Live HTML/CSS Preview"
              />
            </div>
          </div>
        )}

        {/* 2. Dedicated INPUT (stdin) View */}
        {activeTab === 'stdin' && (
          <div className="h-full flex flex-col p-3 bg-[#0b0c0f]">
            <div className="flex items-center justify-between pb-2 text-zinc-400 text-xs border-b border-[#242833]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#a3e635]" />
                <span>Standard Input Buffer (passed to program before execution)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStdinChange('')}
                className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
              >
                Clear Buffer
              </Button>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Enter multiline stdin data here...&#10;Line 1&#10;Line 2&#10;Line 3"
              className="flex-1 w-full bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none resize-none pt-2 font-mono leading-relaxed select-text"
            />
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-[#242833] flex justify-between">
              <span>{stdin.split('\n').length} lines &bull; {stdin.length} characters</span>
              <span>Input is automatically fed into stdin when clicking Run.</span>
            </div>
          </div>
        )}

        {/* 3. Output & Diagnostics View */}
        {activeTab === 'diagnostics' && (
          <div className="h-full p-4 overflow-y-auto space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#13151b] border border-[#242833] p-3 rounded">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>Execution Time</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {diagnostics?.time !== null && diagnostics?.time !== undefined
                    ? `${diagnostics.time}s`
                    : 'N/A'}
                </div>
              </div>

              <div className="bg-[#13151b] border border-[#242833] p-3 rounded">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Memory Usage</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {diagnostics?.memory ? `${(diagnostics.memory / 1024).toFixed(1)} MB` : 'Sandbox Default'}
                </div>
              </div>

              <div className="bg-[#13151b] border border-[#242833] p-3 rounded">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Process Exit Code</span>
                </div>
                <div className={cn('text-base font-semibold', diagnostics?.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {diagnostics?.exitCode !== null && diagnostics?.exitCode !== undefined ? diagnostics.exitCode : '0'}
                </div>
              </div>
            </div>

            {parsedError && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-3.5 rounded text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-rose-400" />
                    <span className="font-semibold text-rose-200">{parsedError.errorType}</span>
                    {parsedError.line ? (
                      <button
                        type="button"
                        onClick={() => onJumpToLine?.(parsedError.line)}
                        className="px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-300 font-mono text-[11px] border border-rose-700/60 cursor-pointer"
                      >
                        Line {parsedError.line}
                      </button>
                    ) : null}
                  </div>
                  {parsedError.suggestedFix && onApplyFix && (
                    <Button
                      size="sm"
                      onClick={() => onApplyFix(parsedError.suggestedFix!)}
                      className="h-6 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-200" />
                      <span>Apply Fix</span>
                    </Button>
                  )}
                </div>
                <div className="text-zinc-200">{parsedError.explanation}</div>
                <div className="flex items-start gap-1.5 p-2 rounded bg-amber-950/30 border border-amber-800/30 text-amber-200 text-[11.5px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">Suggestion: </span>
                    {parsedError.suggestion}
                  </div>
                </div>
              </div>
            )}

            {diagnostics?.error && !parsedError && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded text-rose-300 text-xs font-mono">
                <div className="font-bold mb-1">Runtime Diagnostic Error:</div>
                <div className="whitespace-pre-wrap">{diagnostics.error}</div>
              </div>
            )}
          </div>
        )}

        {/* 4. Test Lab View */}
        {activeTab === 'tests' && (
          <TestLab currentCode={currentCode} language={language} />
        )}

        {/* 5. Error Detective View */}
        {activeTab === 'error-detective' && (
          <ErrorDetective
            currentCode={currentCode}
            language={language}
            errorOutput={errorOutput}
            onApplyFix={onApplyFix || (() => {})}
            onUndoFix={onUndoFix}
            canUndo={canUndo}
            onRunAgain={onRunAgain}
            onJumpToLine={onJumpToLine}
            executionStatus={status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'idle'}
          />
        )}
      </div>
    </div>
  );
}
