'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  Plus,
  Trash2,
  RotateCcw,
  Clock,
  FlaskConical,
  Loader2,
  Sliders,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, TestCaseItem } from '@/stores/workspace-store';
import { execution } from '@/lib/api';

interface TestLabProps {
  currentCode: string;
  language: string;
}

export function TestLab({ currentCode, language }: TestLabProps) {
  const { testCases, addTestCase, updateTestCase, deleteTestCase, resetTestCases } =
    useWorkspaceStore();

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activeRunningId, setActiveRunningId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(testCases[0]?.id || '');

  const passedCount = testCases.filter((tc) => tc.status === 'passed').length;
  const failedCount = testCases.filter((tc) => tc.status === 'failed').length;
  const totalCount = testCases.length;
  const passPercent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  // Run a single test case
  const runSingleTest = async (tc: TestCaseItem) => {
    setActiveRunningId(tc.id);
    updateTestCase(tc.id, { status: 'running', actualOutput: '', error: undefined });

    const startTime = performance.now();
    try {
      const resp = await execution.execute({
        code: currentCode,
        language,
        stdin: tc.input,
      });

      const elapsed = Math.round(performance.now() - startTime);
      const data = resp.data;
      const actualOut = (data.stdout || '').trim();
      const expectedOut = tc.expectedOutput.trim();
      const hasError = !!data.stderr || !!data.compile_output || data.exit_code !== 0;

      const isPassed = !hasError && actualOut === expectedOut;

      updateTestCase(tc.id, {
        status: isPassed ? 'passed' : 'failed',
        actualOutput: data.stdout || '',
        error: data.stderr || data.compile_output || (hasError ? data.error : undefined),
        time: data.time || `${elapsed / 1000}`,
      });
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      updateTestCase(tc.id, {
        status: 'failed',
        error: err.message || 'Execution failed',
        time: `${elapsed / 1000}`,
      });
    } finally {
      setActiveRunningId(null);
    }
  };

  // Run all test cases sequentially
  const handleRunAll = async () => {
    if (isRunningAll || testCases.length === 0) return;
    setIsRunningAll(true);
    resetTestCases();

    for (const tc of testCases) {
      await runSingleTest(tc);
    }
    setIsRunningAll(false);
  };

  const activeTestCase = testCases.find((tc) => tc.id === selectedCaseId) || testCases[0];

  return (
    <div className="h-full flex flex-col bg-[#0b0c0f] font-sans select-none">
      {/* Test Lab Toolbar */}
      <div className="h-10 px-3 bg-[#13151b] border-b border-[#242833] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <FlaskConical className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-white">Test Lab</span>

          {totalCount > 0 && (
            <div className="flex items-center gap-2 text-[11px] font-mono pl-2 border-l border-[#242833]">
              <span className="text-emerald-400 font-medium">{passedCount} passed</span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-rose-400 font-medium">{failedCount} failed</span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-zinc-400">{totalCount} total</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetTestCases}
              disabled={isRunningAll}
              className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => addTestCase()}
            disabled={isRunningAll}
            className="h-6 px-2 text-xs text-zinc-300 hover:text-white bg-[#181b22] border border-[#242833]"
          >
            <Plus className="w-3 h-3 mr-1 text-[#a3e635]" />
            <span>Add Case</span>
          </Button>

          <Button
            size="sm"
            onClick={handleRunAll}
            disabled={isRunningAll || totalCount === 0}
            className="h-7 px-3 text-xs bg-[#a3e635] hover:bg-[#bef264] text-black font-semibold shadow-sm gap-1.5"
          >
            {isRunningAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run All Tests</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="h-1 w-full bg-[#181b22]">
          <div
            className={cn(
              'h-full transition-all duration-300',
              failedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{ width: `${passPercent}%` }}
          />
        </div>
      )}

      {/* Main Body: Left Case List + Right Detail Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Cases Sidebar */}
        <div className="w-56 border-r border-[#242833] flex flex-col bg-[#0e1015]">
          <div className="p-2 border-b border-[#242833] flex items-center justify-between text-[11px] text-zinc-400">
            <span>Test Cases ({totalCount})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {testCases.map((tc, idx) => {
              const isSelected = tc.id === (activeTestCase?.id || '');
              const isRunning = activeRunningId === tc.id;

              return (
                <div
                  key={tc.id}
                  onClick={() => setSelectedCaseId(tc.id)}
                  className={cn(
                    'px-2.5 py-2 rounded flex items-center justify-between cursor-pointer text-xs font-mono transition-all',
                    isSelected
                      ? 'bg-[#1e2330] text-white border border-[#2e374a]'
                      : 'hover:bg-[#141720] text-zinc-400 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#a3e635] animate-spin shrink-0" />
                    ) : tc.status === 'passed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : tc.status === 'failed' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-zinc-600 shrink-0" />
                    )}
                    <span className="truncate font-medium">{tc.name || `Case #${idx + 1}`}</span>
                  </div>

                  {tc.time && (
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {tc.time}s
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Case Editor & Results */}
        {activeTestCase ? (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-3.5 bg-[#0b0c0f]">
            {/* Case header bar */}
            <div className="flex items-center justify-between pb-2 border-b border-[#242833]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeTestCase.name || ''}
                  onChange={(e) => updateTestCase(activeTestCase.id, { name: e.target.value })}
                  placeholder="Test Case Name"
                  className="bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-zinc-500 font-sans"
                />
                {activeTestCase.status && activeTestCase.status !== 'idle' && (
                  <span
                    className={cn(
                      'text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold border',
                      activeTestCase.status === 'passed'
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                        : activeTestCase.status === 'failed'
                        ? 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    )}
                  >
                    {activeTestCase.status}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => runSingleTest(activeTestCase)}
                  disabled={isRunningAll || activeRunningId === activeTestCase.id}
                  className="h-6 px-2.5 text-xs text-[#a3e635] hover:bg-[#182618] border border-[#2b4c2b]"
                >
                  {activeRunningId === activeTestCase.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 fill-current mr-1" />
                  )}
                  <span>Run This Case</span>
                </Button>

                {testCases.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTestCase(activeTestCase.id)}
                    className="h-6 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Input and Expected Output columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Input (stdin) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 font-mono">
                  Input (stdin)
                </label>
                <textarea
                  value={activeTestCase.input}
                  onChange={(e) => updateTestCase(activeTestCase.id, { input: e.target.value })}
                  placeholder="Standard input passed to program..."
                  className="w-full h-28 bg-[#141720] border border-[#242833] rounded p-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none select-text"
                />
              </div>

              {/* Expected Output */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 font-mono">
                  Expected Output
                </label>
                <textarea
                  value={activeTestCase.expectedOutput}
                  onChange={(e) =>
                    updateTestCase(activeTestCase.id, { expectedOutput: e.target.value })
                  }
                  placeholder="Expected stdout..."
                  className="w-full h-28 bg-[#141720] border border-[#242833] rounded p-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none select-text"
                />
              </div>
            </div>

            {/* Actual Output / Execution result */}
            {activeTestCase.actualOutput !== undefined && (
              <div className="space-y-1.5 pt-2 border-t border-[#242833]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400 font-mono">
                    Actual Output
                  </label>
                  {activeTestCase.time && (
                    <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activeTestCase.time}s
                    </span>
                  )}
                </div>

                <pre
                  className={cn(
                    'p-3 rounded border text-xs font-mono whitespace-pre-wrap select-text max-h-36 overflow-y-auto leading-relaxed',
                    activeTestCase.status === 'passed'
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                  )}
                >
                  {activeTestCase.actualOutput || '(no output)'}
                </pre>

                {activeTestCase.error && (
                  <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-xs font-mono text-rose-300 whitespace-pre-wrap select-text">
                    <span className="font-bold">Error: </span>
                    {activeTestCase.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs">
            <p>No test cases. Click &ldquo;Add Case&rdquo; to create your first test case.</p>
          </div>
        )}
      </div>
    </div>
  );
}
