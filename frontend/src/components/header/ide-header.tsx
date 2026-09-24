'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  BookOpen,
  Settings,
  Command,
  ChevronDown,
  Terminal,
  Flame,
  User as UserIcon,
  LogOut,
  FolderTree,
  Activity,
  Boxes,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
import { useStatsStore } from '@/stores/stats-store';
import { Language, LANGUAGES } from '@/types';
import { cn } from '@/lib/utils';
import { RuntimeMetadata } from '@/lib/api';

interface IdeHeaderProps {
  activeFilename: string;
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  runtimes: Record<string, RuntimeMetadata>;
  isRunning: boolean;
  isAvailable: boolean;
  unavailableReason: string;
  backendStatus?: 'connected' | 'offline' | 'checking';
  onRun: () => void;
  onStop: () => void;
  onOpenAuth: () => void;
  problemCount: number;
}

export function IdeHeader({
  activeFilename,
  selectedLanguage,
  onSelectLanguage,
  runtimes,
  isRunning,
  isAvailable,
  unavailableReason,
  backendStatus = 'connected',
  onRun,
  onStop,
  onOpenAuth,
  problemCount,
}: IdeHeaderProps) {
  const {
    explorerCollapsed,
    setExplorerCollapsed,
    problemsOpen,
    setProblemsOpen,
    setSettingsOpen,
    setCommandPaletteOpen,
    replayOpen,
    setReplayOpen,
    visualLogicOpen,
    setVisualLogicOpen,
  } = useWorkspaceStore();

  const { user, isAuthenticated, logout } = useAuthStore();
  const currentStreak = useStatsStore((s) => (user?.id ? s.getUserStreak(user.id) : 0));

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLangMeta = LANGUAGES.find((l) => l.value === selectedLanguage) || LANGUAGES[0];

  return (
    <header className="h-11 bg-[#0e1015] border-b border-[#242833] flex items-center justify-between px-3 shrink-0 select-none text-xs">
      {/* Left Section: Brand, Sidebar Toggle, Workspace Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setExplorerCollapsed((prev) => !prev)}
          title={explorerCollapsed ? 'Open Explorer (Ctrl+B)' : 'Hide Explorer (Ctrl+B)'}
          className={cn(
            'p-1.5 rounded transition-colors',
            explorerCollapsed
              ? 'text-zinc-500 hover:text-white hover:bg-[#181b22]'
              : 'text-[#a3e635] bg-[#181b22]'
          )}
        >
          <FolderTree className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-[#181b22] border border-[#242833] text-[#a3e635] font-bold text-xs">
            CM
          </div>
          <span className="font-bold tracking-tight text-white hidden sm:inline-block">
            CodeMentor
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden md:inline-block border-l border-zinc-800 pl-2">
            Write. Run. Understand.
          </span>
        </div>

        <div className="h-4 w-px bg-[#242833] hidden sm:block" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-zinc-400 min-w-0 truncate">
          <span className="text-zinc-500 hidden sm:inline">workspace</span>
          <span className="text-zinc-600 hidden sm:inline">&rsaquo;</span>
          <span className="text-zinc-200 font-medium font-mono truncate">{activeFilename}</span>
        </div>
      </div>

      {/* Middle Section: Language Selector & Problems Toggle */}
      <div className="flex items-center gap-2">
        {/* Language Selector Dropdown */}
        <div className="relative" ref={langDropdownRef}>
          <button
            type="button"
            onClick={() => setLangDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1 bg-[#13151b] hover:bg-[#181b22] border border-[#242833] rounded text-zinc-200 font-mono text-xs transition-colors"
          >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isAvailable ? 'bg-[#a3e635]' : 'bg-zinc-500')} />
            <span>{activeLangMeta.label}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {langDropdownOpen && (
            <div className="absolute left-0 mt-1 w-64 max-h-96 overflow-y-auto py-1 bg-[#13151b] border border-[#242833] rounded shadow-2xl z-50">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-[#242833]">
                Programming Languages
              </div>
              {LANGUAGES.map((langItem) => {
                const rMeta = runtimes[langItem.value];
                const avail = rMeta ? rMeta.available : ['python', 'cpp', 'c', 'java', 'javascript', 'typescript', 'sql', 'html', 'css'].includes(langItem.value);
                const isSelected = langItem.value === selectedLanguage;

                return (
                  <button
                    key={langItem.value}
                    type="button"
                    onClick={() => {
                      onSelectLanguage(langItem.value);
                      setLangDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors border-b border-white/5 last:border-none',
                      isSelected
                        ? 'bg-[#182618] text-white font-medium border-l-2 border-[#a3e635]'
                        : 'text-zinc-300 hover:bg-[#181b22] hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', avail ? 'bg-[#a3e635]' : 'bg-zinc-600')} />
                      <span className="truncate">{langItem.label}</span>
                    </div>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0 font-mono', avail ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/50')}>
                      {avail ? 'Ready' : 'Judge0'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Problems Drawer Toggle */}
        <button
          type="button"
          onClick={() => setProblemsOpen((prev) => !prev)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors text-xs',
            problemsOpen
              ? 'bg-[#181b22] border-[#3b4252] text-white'
              : 'bg-[#13151b] border-[#242833] text-zinc-400 hover:text-white hover:bg-[#181b22]'
          )}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Problems</span>
          <span className="bg-indigo-950/80 border border-indigo-800/50 text-indigo-300 px-1 py-0 rounded text-[10px] font-mono">
            {problemCount}
          </span>
        </button>
      </div>

      {/* Right Section: Streak, Command Palette, Settings, Run Button */}
      <div className="flex items-center gap-2">
        {/* Streak Counter / Login */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-mono font-medium">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentStreak}d</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-[#13151b] border border-[#242833] hover:border-zinc-700 text-zinc-400 hover:text-white text-xs transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Log in for streak</span>
          </button>
        )}

        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          title="Command Palette (Ctrl+K)"
          className="hidden md:flex items-center gap-1 px-2 py-1 bg-[#13151b] hover:bg-[#181b22] border border-[#242833] rounded text-zinc-400 hover:text-white transition-colors"
        >
          <Command className="w-3 h-3" />
          <span className="text-[10px] font-mono">⌘K</span>
        </button>

        {/* Settings Toggle */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#181b22] border border-transparent hover:border-[#242833] rounded transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>


        {/* Auth / Avatar */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-1.5 pl-1 border-l border-[#242833]">
            <div className="w-6 h-6 rounded-full bg-[#181b22] border border-[#242833] flex items-center justify-center text-[#a3e635] font-bold text-[10px]">
              {user.username ? user.username[0].toUpperCase() : 'U'}
            </div>
            <button
              type="button"
              onClick={logout}
              title="Log out"
              className="p-1 text-zinc-500 hover:text-zinc-300"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAuth}
            className="text-xs h-7 px-2.5 text-zinc-300 hover:text-white hover:bg-[#181b22]"
          >
            Sign In
          </Button>
        )}

        <div className="h-4 w-px bg-[#242833] mx-0.5" />

        {/* Backend Status Indicator */}
        <div
          title={
            backendStatus === 'connected'
              ? 'Backend API (Port 8000): Connected'
              : backendStatus === 'checking'
              ? 'Checking Backend connection...'
              : 'Backend API (Port 8000): OFFLINE. Start backend with run-dev.bat'
          }
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 h-7 rounded text-[11px] font-mono border transition-all select-none',
            backendStatus === 'connected'
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
              : backendStatus === 'checking'
              ? 'bg-yellow-950/40 border-yellow-800/40 text-yellow-400'
              : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              backendStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : backendStatus === 'checking'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-rose-500'
            )}
          />
          <span className="hidden lg:inline">
            {backendStatus === 'connected'
              ? 'API Live'
              : backendStatus === 'checking'
              ? 'Checking...'
              : 'Backend Offline'}
          </span>
        </div>

        {/* Code Replay Toggle Button */}
        <button
          type="button"
          onClick={() => setReplayOpen((prev) => !prev)}
          title="Code Replay — Step-by-step Execution Debugger (Python)"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 h-7 rounded border transition-all text-xs font-medium select-none',
            replayOpen
              ? 'bg-[#182618] border-[#a3e635] text-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.15)]'
              : 'bg-[#13151b] border-[#242833] text-zinc-400 hover:text-white hover:bg-[#181b22]'
          )}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Replay</span>
        </button>

        {/* Visual Logic Toggle Button */}
        <button
          type="button"
          onClick={() => setVisualLogicOpen((prev) => !prev)}
          title="Visual Logic Mode — Interactive Flowchart & Memory Inspector"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 h-7 rounded border transition-all text-xs font-medium select-none',
            visualLogicOpen
              ? 'bg-[#1f1938] border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
              : 'bg-[#13151b] border-[#242833] text-zinc-400 hover:text-white hover:bg-[#181b22]'
          )}
        >
          <Boxes className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Visual Logic</span>
        </button>

        <div className="h-4 w-px bg-[#242833] mx-0.5" />

        {/* Primary Run / Stop Action Button */}
        {isRunning ? (
          <Button
            onClick={onStop}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3 py-1 h-7 rounded flex items-center gap-1.5 shadow-md transition-all select-none"
            title="Stop Execution (Ctrl+C)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </Button>
        ) : (
          <Button
            onClick={onRun}
            disabled={!isAvailable}
            className={cn(
              'font-semibold text-xs px-3.5 py-1 h-7 rounded flex items-center gap-1.5 shadow-md transition-all select-none',
              isAvailable
                ? 'bg-[#a3e635] text-[#0e1015] hover:bg-[#bef264] hover:shadow-[0_0_15px_rgba(163,230,53,0.3)]'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
            )}
            title={isAvailable ? 'Run Code (Enter / Shift+Enter)' : unavailableReason}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isAvailable ? 'Run' : 'Unavailable'}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
