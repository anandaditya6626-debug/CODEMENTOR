'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import {
  X,
  Plus,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Search,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Flame,
  User as UserIcon,
} from 'lucide-react';
import { IdeHeader } from '@/components/header/ide-header';
import { FileExplorer } from '@/components/workspace/file-explorer';
import { CommandPalette } from '@/components/workspace/command-palette';
import { SettingsModal } from '@/components/workspace/settings-modal';
import { CodeEditor } from '@/components/editor/code-editor';
import { CodeReplay } from '@/components/editor/code-replay';
import { VisualLogic } from '@/components/editor/visual-logic';
import {
  TerminalPanel,
  OutputChunk,
  ExecutionDiagnostic,
  TestCaseResult,
} from '@/components/terminal/terminal-panel';
import { AuthModal } from '@/components/auth/auth-modal';
import { useWorkspaceStore, detectLanguageFromFilename } from '@/stores/workspace-store';
import { useStatsStore } from '@/stores/stats-store';
import { useAuthStore } from '@/stores/auth-store';
import { QUESTIONS, Question } from '@/lib/questions';
import { execution, RuntimeMetadata } from '@/lib/api';
import { parseExecutionError } from '@/lib/error-parser';
import { completionApi } from '@/lib/completion-api';
import { Language } from '@/types';
import { cn } from '@/lib/utils';
import axios from 'axios';

export default function MidnightStudioIde() {
  const {
    nodes,
    openTabIds,
    activeTabId,
    preferences,
    explorerCollapsed,
    terminalCollapsed,
    problemsOpen,
    createFile,
    openTab,
    closeTab,
    setActiveTab,
    setFileContent,
    saveFile,
    setExplorerCollapsed,
    setTerminalCollapsed,
    setProblemsOpen,
    setCommandPaletteOpen,
    loadProblemStarter,
    replayOpen,
    setReplayOpen,
    visualLogicOpen,
    setVisualLogicOpen,
  } = useWorkspaceStore();

  const { user, isAuthenticated } = useAuthStore();
  const { recordUserLoginStreak, addActiveTime } = useStatsStore();

  // Runtimes from backend
  const [runtimes, setRuntimes] = useState<Record<string, RuntimeMetadata>>({});
  const [loadingRuntimes, setLoadingRuntimes] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'offline' | 'checking'>('checking');

  // Execution state machine
  const [isRunning, setIsRunning] = useState(false);
  const [execStatus, setExecStatus] = useState<ExecutionDiagnostic['status']>('idle');
  const [diagnostics, setDiagnostics] = useState<ExecutionDiagnostic | null>(null);
  const [chunks, setChunks] = useState<OutputChunk[]>([]);
  const [stdinBuffer, setStdinBuffer] = useState('');
  const [testCaseResults, setTestCaseResults] = useState<TestCaseResult[] | null>(null);
  const [isTerminalFullscreen, setIsTerminalFullscreen] = useState(false);

  // Problems drawer state
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [problemSearch, setProblemSearch] = useState('');
  const [problemFilterDiff, setProblemFilterDiff] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [revealedHints, setRevealedHints] = useState<number[]>([]);

  // Highlighted line from CodeReplay or VisualLogic
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  // Active error line from compiler / runtime execution failure
  const [errorLine, setErrorLine] = useState<number | null>(null);
  // Active faulty symbol (e.g. 'grades') for inline Monaco decoration
  const [errorSymbol, setErrorSymbol] = useState<string | null>(null);
  // Snapshot of code before applying a fix to allow 1-click Undo
  const [previousCode, setPreviousCode] = useState<string | null>(null);

  // Auto-expand terminal panel when replay is toggled open
  useEffect(() => {
    if (replayOpen && terminalCollapsed) {
      setTerminalCollapsed(false);
    }
  }, [replayOpen, terminalCollapsed, setTerminalCollapsed]);

  // Sync theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'midnight');
    const theme = preferences?.theme || 'midnight';
    if (theme === 'light') {
      root.classList.add('light');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('midnight');
    }
  }, [preferences?.theme]);

  // Auto-collapse sidebar on small mobile screens on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setExplorerCollapsed(true);
    }
  }, [setExplorerCollapsed]);

  // Auth Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const chunkIdRef = useRef(0);

  // Active file node with fallback guards
  const safeNodes = nodes && typeof nodes === 'object' ? nodes : {};
  const safeOpenTabIds = Array.isArray(openTabIds) ? openTabIds : [];
  const activeNode = safeNodes[activeTabId] || safeNodes[safeOpenTabIds[0]] || Object.values(safeNodes)[0] || null;
  const activeFilename = activeNode ? activeNode.name : 'main.py';
  const activeLanguage = activeNode?.language || 'python';
  const activeContent = activeNode?.content ?? '';

  // Auth streak recording
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      recordUserLoginStreak(user.id);
    }
  }, [isAuthenticated, user?.id, recordUserLoginStreak]);

  // Active coding time counter
  useEffect(() => {
    const timer = setInterval(() => {
      addActiveTime(1);
    }, 60000);
    return () => clearInterval(timer);
  }, [addActiveTime]);

  const checkBackendHealth = useCallback(async () => {
    try {
      const resp = await execution.checkHealth();
      if (resp.data?.status === 'healthy') {
        setBackendStatus('connected');
        return true;
      }
    } catch {
      setBackendStatus('offline');
      return false;
    }
    return false;
  }, []);

  // Fetch dynamic runtimes and monitor backend health
  useEffect(() => {
    let isMounted = true;
    const initBackend = async () => {
      try {
        const [healthRes, runtimesRes] = await Promise.allSettled([
          execution.checkHealth(),
          execution.getRuntimes(),
        ]);

        if (healthRes.status === 'fulfilled' && isMounted) {
          setBackendStatus('connected');
        } else if (isMounted) {
          setBackendStatus('offline');
        }

        if (
          runtimesRes.status === 'fulfilled' &&
          runtimesRes.value.data?.languages &&
          isMounted
        ) {
          const map: Record<string, RuntimeMetadata> = {};
          runtimesRes.value.data.languages.forEach((item) => {
            map[item.id] = item;
          });
          setRuntimes(map);
        }
      } catch (err) {
        if (isMounted) setBackendStatus('offline');
        console.warn('Failed to load runtimes from backend:', err);
      } finally {
        if (isMounted) setLoadingRuntimes(false);
      }
    };

    initBackend();

    // Heartbeat every 15 seconds
    const interval = setInterval(() => {
      checkBackendHealth();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkBackendHealth]);

  const activeRuntime = runtimes[activeLanguage];
  const isAvailable = activeRuntime
    ? activeRuntime.available
    : ['python', 'cpp', 'c', 'java', 'javascript', 'typescript', 'sql', 'html', 'css'].includes(activeLanguage);
  const unavailableReason =
    activeRuntime?.reason || `Runtime for ${activeLanguage} is unavailable.`;

  const appendChunk = useCallback((type: OutputChunk['type'], text: string) => {
    const nextId = ++chunkIdRef.current;
    setChunks((prev) => [...prev, { id: nextId, type, text }]);
  }, []);

  // Execution: Run Code via WebSocket or Fallback
  const handleRun = useCallback(async () => {
    if (isRunning || !isAvailable || !activeNode) return;

    setIsRunning(true);
    setExecStatus('running');
    setChunks([]);
    setDiagnostics(null);
    setTestCaseResults(null);

    const cmd = `${activeLanguage} ${activeFilename}`;
    appendChunk('system', `codementor@studio:~$ ${cmd}\n`);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host =
      window.location.hostname === 'localhost' || !window.location.hostname
        ? '127.0.0.1'
        : window.location.hostname;
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      `${protocol}//${host}:8000/api/v1/execute/ws`;

    let sessionStderr = '';

    try {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }

      setErrorLine(null);
      setErrorSymbol(null);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      let hasStarted = false;

      socket.onopen = () => {
        hasStarted = true;
        socket.send(
          JSON.stringify({
            type: 'start',
            code: activeContent,
            language: activeLanguage,
            stdin: stdinBuffer,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'stdout') {
            appendChunk('stdout', msg.data);
          } else if (msg.type === 'stderr') {
            sessionStderr += msg.data;
            appendChunk('stderr', msg.data);
          } else if (msg.type === 'compile_output') {
            sessionStderr += msg.data;
            appendChunk('compile', msg.data);
          } else if (msg.type === 'exit') {
            setIsRunning(false);
            const isSuccess = msg.status === 'success' || msg.exit_code === 0;
            setExecStatus(isSuccess ? 'completed' : 'failed');
            setDiagnostics({
              status: isSuccess ? 'completed' : 'failed',
              time: msg.time ?? null,
              memory: msg.memory ?? null,
              exitCode: msg.exit_code ?? (isSuccess ? 0 : 1),
              error: msg.error || '',
            });

            if (!isSuccess) {
              const fullErr = (msg.error || '') + '\n' + sessionStderr;
              const parsed = parseExecutionError(fullErr, activeLanguage, activeContent);
              if (parsed?.line) {
                setErrorLine(parsed.line);
                setHighlightedLine(parsed.line);
              }
              if (parsed?.symbol) {
                setErrorSymbol(parsed.symbol);
              } else {
                setErrorSymbol(null);
              }
            } else {
              setErrorLine(null);
              setErrorSymbol(null);
            }

            try {
              socket.close();
            } catch {
              // ignore
            }
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      socket.onerror = async () => {
        if (!hasStarted) {
          appendChunk('system', '[WebSocket unavailable. Running via direct API...]\n');
          try {
            const resp = await execution.execute({
              code: activeContent,
              language: activeLanguage,
              stdin: stdinBuffer,
            });
            const d = resp.data;
            if (d.compile_output) appendChunk('compile', d.compile_output);
            if (d.stdout) appendChunk('stdout', d.stdout);
            if (d.stderr) appendChunk('stderr', d.stderr);

            const isSuccess = d.status === 'success' || d.exit_code === 0;
            setExecStatus(isSuccess ? 'completed' : 'failed');
            setDiagnostics({
              status: isSuccess ? 'completed' : 'failed',
              time: d.time,
              memory: d.memory,
              exitCode: d.exit_code,
              error: d.error,
            });

            if (!isSuccess) {
              const fullErr = (d.stderr || '') + '\n' + (d.compile_output || '') + '\n' + (d.error || '');
              const parsed = parseExecutionError(fullErr, activeLanguage, activeContent);
              if (parsed?.line) {
                setErrorLine(parsed.line);
                setHighlightedLine(parsed.line);
              }
              if (parsed?.symbol) {
                setErrorSymbol(parsed.symbol);
              } else {
                setErrorSymbol(null);
              }
            } else {
              setErrorLine(null);
              setErrorSymbol(null);
            }
          } catch (httpErr: any) {
            const isConnErr =
              httpErr?.message === 'Network Error' ||
              httpErr?.code === 'ECONNREFUSED' ||
              httpErr?.response?.status === 502 ||
              httpErr?.response?.status === 503;

            if (isConnErr) {
              setBackendStatus('offline');
              appendChunk(
                'stderr',
                `\n[ERROR: Backend Service Offline]\nCannot connect to CodeMentor execution server at http://127.0.0.1:8000.\n\nPlease start the backend server:\n  Windows: Double-click 'run-dev.bat' (in project root)\n  Terminal: npm run dev (in project root)\n  Manual: cd backend && venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000\n`
              );
              setDiagnostics({
                status: 'failed',
                time: null,
                memory: null,
                exitCode: -1,
                error: 'Backend execution service is offline on port 8000.',
              });
            } else {
              appendChunk('stderr', httpErr?.message || 'Execution error');
              setDiagnostics({
                status: 'failed',
                time: null,
                memory: null,
                exitCode: -1,
                error: httpErr?.message || 'Execution failed',
              });
            }
            setExecStatus('failed');
          } finally {
            setIsRunning(false);
          }
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          setIsRunning(false);
        }
      };
    } catch (err: any) {
      appendChunk('stderr', `Execution failed to start: ${err?.message}\n`);
      setIsRunning(false);
      setExecStatus('failed');
    }
  }, [isRunning, isAvailable, activeNode, activeLanguage, activeFilename, activeContent, stdinBuffer, appendChunk]);

  // Stop process
  const handleStop = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    setIsRunning(false);
    setExecStatus('cancelled');
    appendChunk('system', '\n[Execution cancelled by user]\n');
  }, [appendChunk]);

  // Interactive stdin sending
  const handleSendInteractiveInput = useCallback(
    (inputLine: string) => {
      appendChunk('stdin', inputLine + '\n');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'stdin',
            data: inputLine + '\n',
          })
        );
      }
    },
    [appendChunk]
  );

  // Run automated problem test cases
  const handleRunProblemTestCases = useCallback(async () => {
    if (!selectedQuestion || !activeNode) return;
    setTerminalCollapsed(false);
    setIsRunning(true);
    setExecStatus('running');
    appendChunk('system', `[Testing ${selectedQuestion.title} test suite...]\n`);

    try {
      const testCasesPayload = (selectedQuestion.examples || []).map((ex, idx) => ({
        id: `example_${idx + 1}`,
        input_data: ex.input,
        expected_output: ex.output,
      }));

      const resp = await axios.post('/api/v1/submissions/run', {
        problem_id: selectedQuestion.id,
        code: activeContent,
        language: activeLanguage,
        test_cases: testCasesPayload,
      });

      const results: TestCaseResult[] = resp.data.results || [];
      setTestCaseResults(results);

      // Also sync to TestLab
      const newTcList = results.map((r, i) => ({
        id: `tc-${selectedQuestion.id}-${i + 1}`,
        name: `Example ${i + 1}`,
        input: r.input_data || '',
        expectedOutput: r.expected_output || '',
        actualOutput: r.stdout || '',
        status: (r.passed ? 'passed' : 'failed') as 'passed' | 'failed',
        time: r.time !== undefined && r.time !== null ? `${r.time}` : undefined,
        error: r.error || r.stderr,
      }));
      useWorkspaceStore.getState().setTestCases(newTcList);

      const passed = results.filter((r) => r.passed).length;
      appendChunk('system', `[Completed: ${passed}/${results.length} test cases passed]\n`);
      setExecStatus(passed === results.length ? 'completed' : 'failed');
    } catch (err: any) {
      appendChunk('stderr', `Test execution error: ${err?.message}\n`);
      setExecStatus('failed');
    } finally {
      setIsRunning(false);
    }
  }, [selectedQuestion, activeNode, activeContent, activeLanguage, appendChunk, setTerminalCollapsed]);

  // Save active file
  const handleSaveActiveFile = useCallback(() => {
    if (activeNode) {
      saveFile(activeNode.id);
    }
  }, [activeNode, saveFile]);

  // Language Change
  const handleSelectLanguage = useCallback(
    (lang: Language) => {
      if (!activeNode) return;
      const base = activeNode.name.split('.')[0] || 'main';
      const extMap: Record<Language, string> = {
        python: 'py',
        cpp: 'cpp',
        c: 'c',
        java: 'java',
        javascript: 'js',
        typescript: 'ts',
        html: 'html',
        css: 'css',
        sql: 'sql',
        csharp: 'cs',
        go: 'go',
        rust: 'rs',
        php: 'php',
        ruby: 'rb',
        kotlin: 'kt',
        swift: 'swift',
      };
      const newName = `${base}.${extMap[lang] || 'py'}`;
      useWorkspaceStore.getState().renameNode(activeNode.id, newName);
    },
    [activeNode]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('.monaco-editor'));

      // Ctrl+S / Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveFile();
        return;
      }

      // Ctrl+K / Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl+P / Cmd+P: Quick Open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl+B: Toggle Explorer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setExplorerCollapsed((prev) => !prev);
        return;
      }

      // Ctrl+J: Toggle Terminal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setTerminalCollapsed((prev) => !prev);
        return;
      }

      // Enter outside text fields: Run
      if (e.key === 'Enter' && !isEditingText && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRun();
        return;
      }

      // Shift+Enter or Ctrl+Enter anywhere: Run
      if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRun();
        return;
      }
    };

    const handleCustomRun = () => handleRun();
    const handleCustomSave = () => handleSaveActiveFile();
    const handleCustomPalette = () => setCommandPaletteOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('codementor:run', handleCustomRun);
    window.addEventListener('codementor:save', handleCustomSave);
    window.addEventListener('codementor:commandpalette', handleCustomPalette);
    window.addEventListener('codementor:quickopen', handleCustomPalette);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('codementor:run', handleCustomRun);
      window.removeEventListener('codementor:save', handleCustomSave);
      window.removeEventListener('codementor:commandpalette', handleCustomPalette);
      window.removeEventListener('codementor:quickopen', handleCustomPalette);
    };
  }, [handleRun, handleSaveActiveFile, setCommandPaletteOpen, setExplorerCollapsed, setTerminalCollapsed]);

  // Filtered problems list
  const filteredQuestions = QUESTIONS.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(problemSearch.toLowerCase()) ||
      q.topics.some((t) => t.toLowerCase().includes(problemSearch.toLowerCase()));
    const matchesDiff = problemFilterDiff === 'All' || q.difficulty === problemFilterDiff;
    return matchesSearch && matchesDiff;
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0e1015] text-[#f3f4f6] overflow-hidden select-none font-sans">
      {/* 1. Application Header */}
      <IdeHeader
        activeFilename={activeFilename}
        selectedLanguage={activeLanguage}
        onSelectLanguage={handleSelectLanguage}
        runtimes={runtimes}
        isRunning={isRunning}
        isAvailable={isAvailable}
        unavailableReason={unavailableReason}
        backendStatus={backendStatus}
        onRun={handleRun}
        onStop={handleStop}
        onOpenAuth={() => setAuthModalOpen(true)}
        problemCount={QUESTIONS.length}
      />

      {/* Backend Offline Warning Banner */}
      {backendStatus === 'offline' && (
        <div className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-1.5 text-xs text-rose-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>
              <strong>Backend Offline:</strong> Python execution server is not running on port 8000. Run <code className="bg-black/40 px-1 py-0.5 rounded text-rose-300 font-mono">run-dev.bat</code> or <code className="bg-black/40 px-1 py-0.5 rounded text-rose-300 font-mono">npm run dev</code> in the project root.
            </span>
          </div>
          <button
            onClick={() => checkBackendHealth()}
            className="text-[11px] px-2 py-0.5 rounded bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-700 transition-colors font-medium"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Unavailable Language Warning Banner */}
      {!isAvailable && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{activeLanguage} is not executable:</strong> {unavailableReason}
            </span>
          </div>
          <span className="text-[11px] text-amber-300 font-mono">
            backend/.env &rarr; JUDGE0_API_KEY
          </span>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        <PanelGroup direction="horizontal" className="h-full w-full">
          {/* Left Panel: File Explorer */}
          {!explorerCollapsed && (
            <>
              <Panel defaultSize={20} minSize={14} maxSize={35} className="h-full">
                <FileExplorer />
              </Panel>
              <PanelResizeHandle className="w-1 bg-[#242833] hover:bg-[#a3e635] transition-colors cursor-col-resize" />
            </>
          )}

          {/* Center Panel: Tabs + Editor + Bottom Console */}
          <Panel className="h-full flex flex-col min-w-0">
            <PanelGroup direction="vertical" className="h-full w-full">
              {/* Top Section: Tab Bar & Monaco Code Editor */}
              <Panel defaultSize={terminalCollapsed ? 100 : 65} minSize={30} className="flex flex-col min-h-0 bg-[#0b0c0f]">
                {/* File Tab Bar */}
                <div className="h-9 bg-[#13151b] border-b border-[#242833] flex items-center justify-between px-1 shrink-0 overflow-x-auto">
                  <div className="flex items-center gap-0.5 h-full min-w-0">
                    {safeOpenTabIds.map((tabId) => {
                      const node = safeNodes[tabId];
                      if (!node) return null;
                      const isActive = tabId === activeTabId;

                      return (
                        <div
                          key={node.id}
                          onClick={() => setActiveTab(node.id)}
                          className={cn(
                            'group flex items-center gap-2 px-3 h-full text-xs font-mono border-r border-[#242833] cursor-pointer transition-colors select-none relative',
                            isActive
                              ? 'bg-[#0b0c0f] text-white font-medium border-t-2 border-t-[#a3e635]'
                              : 'text-zinc-400 hover:text-white hover:bg-[#181b22]'
                          )}
                        >
                          <span className="truncate max-w-[140px]">{node.name}</span>

                          {node.isDirty ? (
                            <span
                              className="w-2 h-2 rounded-full bg-[#a3e635] shrink-0"
                              title="Unsaved changes"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeTab(node.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        const newId = createFile(`file_${openTabIds.length + 1}.py`, null, '# New code file\n');
                        openTab(newId);
                      }}
                      title="New File Tab"
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#181b22] rounded transition-colors ml-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* View Switcher: Code vs Visual Logic */}
                    <div className="ml-auto flex items-center gap-1 pr-2">
                      <button
                        type="button"
                        onClick={() => setVisualLogicOpen(false)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                          !visualLogicOpen
                            ? 'bg-[#181b22] text-[#a3e635] border border-[#242833]'
                            : 'text-zinc-500 hover:text-zinc-300'
                        )}
                      >
                        Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisualLogicOpen(true)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                          visualLogicOpen
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                            : 'text-zinc-500 hover:text-zinc-300'
                        )}
                      >
                        Visual Logic
                      </button>
                    </div>
                  </div>
                </div>

                {/* Monaco Editor Component OR Visual Logic Mode */}
                <div className="flex-1 relative overflow-hidden">
                  {visualLogicOpen ? (
                    <VisualLogic
                      code={activeContent}
                      language={activeLanguage}
                      onClose={() => setVisualLogicOpen(false)}
                      onHighlightLine={setHighlightedLine}
                    />
                  ) : activeNode ? (
                    <CodeEditor
                      key={activeNode.id}
                      defaultCode={activeNode.content}
                      language={activeLanguage}
                      fontSize={preferences.fontSize}
                      tabSize={preferences.tabSize}
                      minimap={preferences.minimap}
                      wordWrap={preferences.wordWrap}
                      theme={preferences.theme}
                      autocomplete={preferences.autocomplete}
                      ghostText={preferences.ghostText}
                      aiCompletion={preferences.aiCompletion}
                      highlightedLine={highlightedLine}
                      errorLine={errorLine}
                      errorSymbol={errorSymbol}
                      onChange={(newVal) => {
                        if (errorLine !== null) setErrorLine(null);
                        if (errorSymbol !== null) setErrorSymbol(null);
                        setFileContent(activeNode.id, newVal || '');
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                      No open files. Create or open a file from the explorer on the left.
                    </div>
                  )}
                </div>
              </Panel>

              {/* Bottom Resizable Panel: Multi-Tab Console */}
              {!terminalCollapsed && (
                <>
                  <PanelResizeHandle className="h-1 bg-[#242833] hover:bg-[#a3e635] transition-colors cursor-row-resize" />
                  <Panel
                    defaultSize={isTerminalFullscreen ? 100 : 35}
                    minSize={18}
                    maxSize={isTerminalFullscreen ? 100 : 75}
                    className="min-h-0 bg-[#0b0c0f]"
                  >
                    {replayOpen ? (
                      <CodeReplay
                        code={activeContent}
                        language={activeLanguage}
                        onClose={() => {
                          setReplayOpen(false);
                          setHighlightedLine(null);
                        }}
                        onHighlightLine={setHighlightedLine}
                      />
                    ) : (
                      <TerminalPanel
                        chunks={chunks}
                        isRunning={isRunning}
                        status={execStatus}
                        diagnostics={diagnostics}
                        testCaseResults={testCaseResults}
                        stdin={stdinBuffer}
                        onStdinChange={setStdinBuffer}
                        onSendInteractiveInput={handleSendInteractiveInput}
                        onClearOutput={() => setChunks([])}
                        onStop={handleStop}
                        isFullscreen={isTerminalFullscreen}
                        onToggleFullscreen={() => setIsTerminalFullscreen((prev) => !prev)}
                        onRunTestCases={handleRunProblemTestCases}
                        currentCode={activeNode?.content || ''}
                        language={activeLanguage}
                        onApplyFix={(newCode) => {
                          if (activeNode) {
                            setPreviousCode(activeNode.content ?? '');
                            setErrorLine(null);
                            setErrorSymbol(null);
                            setFileContent(activeNode.id, newCode);
                          }
                        }}
                        onUndoFix={() => {
                          if (activeNode && previousCode !== null) {
                            setFileContent(activeNode.id, previousCode);
                            setPreviousCode(null);
                          }
                        }}
                        canUndo={previousCode !== null}
                        onRunAgain={handleRun}
                        onJumpToLine={(line) => {
                          setHighlightedLine(line);
                          setErrorLine(line);
                        }}
                      />
                    )}
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
        </PanelGroup>

        {/* 3. Collapsible Problems Drawer (Left Slide-Over) */}
        {problemsOpen && (
          <div className="absolute inset-y-0 left-0 w-full sm:w-[480px] bg-[#13151b] border-r border-[#242833] shadow-2xl z-40 flex flex-col select-none">
            <div className="p-3 border-b border-[#242833] flex items-center justify-between bg-[#0e1015]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">DSA Practice Problems</span>
              </div>
              <button
                type="button"
                onClick={() => setProblemsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Problem Search & Difficulty Filters */}
            <div className="p-3 border-b border-[#242833] space-y-2 bg-[#0e1015]/60">
              <div className="flex items-center gap-2 bg-[#181b22] border border-[#242833] rounded px-2 py-1 text-xs">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search problems by name or tag..."
                  value={problemSearch}
                  onChange={(e) => setProblemSearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setProblemFilterDiff(diff)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-medium transition-colors border',
                      problemFilterDiff === diff
                        ? 'bg-[#181b22] border-[#a3e635] text-[#a3e635]'
                        : 'border-[#242833] text-zinc-400 hover:text-white'
                    )}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Details View OR List View */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {selectedQuestion ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedQuestion(null)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                  >
                    &larr; Back to Problem Catalog
                  </button>

                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">{selectedQuestion.title}</h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        selectedQuestion.difficulty === 'Easy'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : selectedQuestion.difficulty === 'Medium'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      )}
                    >
                      {selectedQuestion.difficulty}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {selectedQuestion.topics.map((t) => (
                      <span key={t} className="text-[10px] bg-[#181b22] border border-[#242833] text-zinc-300 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {selectedQuestion.description}
                  </div>

                  {/* Examples */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-200">Examples:</div>
                    {selectedQuestion.examples.map((ex, i) => (
                      <div key={i} className="p-2.5 bg-[#0b0c0f] border border-[#242833] rounded font-mono text-[11px] space-y-1">
                        <div><strong className="text-zinc-500">Input:</strong> <span className="text-zinc-200">{ex.input}</span></div>
                        <div><strong className="text-zinc-500">Output:</strong> <span className="text-emerald-400">{ex.output}</span></div>
                        {ex.explanation && <div><strong className="text-zinc-500">Explanation:</strong> <span className="text-zinc-400">{ex.explanation}</span></div>}
                      </div>
                    ))}
                  </div>

                  {/* Constraints */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-200">Constraints:</div>
                    <ul className="list-disc list-inside text-[11px] text-zinc-400 font-mono space-y-0.5">
                      {selectedQuestion.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#242833]">
                    <button
                      type="button"
                      onClick={() => {
                        const starter =
                          selectedQuestion.starterCode[activeLanguage] ||
                          selectedQuestion.starterCode['python'] ||
                          '# Starter code\n';
                        const problemTestCases = (selectedQuestion.examples || []).map((ex, idx) => ({
                          id: `tc-${selectedQuestion.id}-${idx + 1}`,
                          name: `Example ${idx + 1}`,
                          input: ex.input,
                          expectedOutput: ex.output,
                          status: 'idle' as const,
                        }));
                        loadProblemStarter(selectedQuestion.id, selectedQuestion.title, starter, activeLanguage, problemTestCases);
                        setProblemsOpen(false);
                      }}
                      className="flex-1 py-1.5 text-xs bg-[#a3e635] text-[#0e1015] hover:bg-[#bef264] font-semibold rounded text-center transition-colors"
                    >
                      Load in Editor
                    </button>
                    <button
                      type="button"
                      onClick={handleRunProblemTestCases}
                      className="py-1.5 px-3 text-xs bg-[#181b22] hover:bg-[#20232c] border border-[#242833] text-white font-medium rounded transition-colors"
                    >
                      Run Test Cases
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredQuestions.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestion(q)}
                      className="p-2.5 bg-[#181b22] hover:bg-[#20232c] border border-[#242833] hover:border-[#3b4252] rounded cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{q.title}</span>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded font-bold uppercase',
                            q.difficulty === 'Easy'
                              ? 'text-emerald-400'
                              : q.difficulty === 'Medium'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          )}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] text-zinc-500">
                        {q.topics.map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* 5. Modals & Floating Overlays */}
      <CommandPalette
        onRunCode={handleRun}
        onStopCode={handleStop}
        onClearTerminal={() => setChunks([])}
        onSelectLanguage={handleSelectLanguage}
      />
      <SettingsModal />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
