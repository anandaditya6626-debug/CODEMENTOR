'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Play,
  Square,
  FileCode,
  FolderTree,
  Terminal,
  Settings,
  BookOpen,
  Trash2,
  Check,
  Activity,
  Boxes,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Language, LANGUAGES } from '@/types';
import { QUESTIONS } from '@/lib/questions';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  category: 'Actions' | 'Navigation' | 'Languages' | 'Files' | 'Problems';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  onRunCode: () => void;
  onStopCode: () => void;
  onClearTerminal: () => void;
  onSelectLanguage: (lang: Language) => void;
}

export function CommandPalette({
  onRunCode,
  onStopCode,
  onClearTerminal,
  onSelectLanguage,
}: CommandPaletteProps) {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    nodes,
    openTab,
    setExplorerCollapsed,
    setTerminalCollapsed,
    setProblemsOpen,
    setSettingsOpen,
    setReplayOpen,
    setVisualLogicOpen,
  } = useWorkspaceStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close palette helper
  const close = () => {
    setCommandPaletteOpen(false);
    setQuery('');
  };

  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: 'run-code',
        category: 'Actions',
        title: 'Run Program',
        subtitle: 'Execute active file in interactive environment',
        shortcut: 'Enter',
        icon: <Play className="w-4 h-4 text-[#a3e635]" />,
        action: () => {
          onRunCode();
          close();
        },
      },
      {
        id: 'stop-code',
        category: 'Actions',
        title: 'Stop Execution',
        subtitle: 'Terminate the running process immediately',
        icon: <Square className="w-4 h-4 text-red-400" />,
        action: () => {
          onStopCode();
          close();
        },
      },
      {
        id: 'clear-terminal',
        category: 'Actions',
        title: 'Clear Terminal Output',
        subtitle: 'Wipe all current stdout and stderr chunks',
        icon: <Trash2 className="w-4 h-4 text-zinc-400" />,
        action: () => {
          onClearTerminal();
          close();
        },
      },
      {
        id: 'toggle-explorer',
        category: 'Navigation',
        title: 'Toggle File Explorer',
        subtitle: 'Show/hide the left workspace tree sidebar',
        shortcut: 'Ctrl+B',
        icon: <FolderTree className="w-4 h-4 text-zinc-300" />,
        action: () => {
          setExplorerCollapsed((prev) => !prev);
          close();
        },
      },
      {
        id: 'toggle-terminal',
        category: 'Navigation',
        title: 'Toggle Terminal Console',
        subtitle: 'Show/hide the bottom output panel',
        shortcut: 'Ctrl+J',
        icon: <Terminal className="w-4 h-4 text-zinc-300" />,
        action: () => {
          setTerminalCollapsed((prev) => !prev);
          close();
        },
      },
      {
        id: 'toggle-problems',
        category: 'Navigation',
        title: 'Toggle Problems Catalog',
        subtitle: 'Browse curated DSA practice problems',
        icon: <BookOpen className="w-4 h-4 text-indigo-400" />,
        action: () => {
          setProblemsOpen((prev) => !prev);
          close();
        },

      },
      {
        id: 'open-settings',
        category: 'Navigation',
        title: 'Open Settings',
        subtitle: 'Customize font size, theme, and tab preferences',
        icon: <Settings className="w-4 h-4 text-zinc-300" />,
        action: () => {
          setSettingsOpen(true);
          close();
        },
      },
      {
        id: 'toggle-replay',
        category: 'Actions',
        title: 'Toggle Code Replay',
        subtitle: 'Step-by-step visual code debugger and variable timeline',
        icon: <Activity className="w-4 h-4 text-emerald-400" />,
        action: () => {
          setReplayOpen((prev) => !prev);
          close();
        },
      },
      {
        id: 'toggle-visual-logic',
        category: 'Actions',
        title: 'Toggle Visual Logic Mode',
        subtitle: 'Interactive flowchart, loop counters, and branch visualization',
        icon: <Boxes className="w-4 h-4 text-purple-400" />,
        action: () => {
          setVisualLogicOpen((prev) => !prev);
          close();
        },
      },
    ];

    // Add workspace files
    Object.values(nodes)
      .filter((n) => n.type === 'file')
      .forEach((file) => {
        list.push({
          id: `file-${file.id}`,
          category: 'Files',
          title: file.name,
          subtitle: `Open file in editor (${file.language || 'text'})`,
          icon: <FileCode className="w-4 h-4 text-[#a3e635]" />,
          action: () => {
            openTab(file.id);
            close();
          },
        });
      });

    // Add Language Switchers
    LANGUAGES.slice(0, 7).forEach((lang) => {
      list.push({
        id: `lang-${lang.value}`,
        category: 'Languages',
        title: `Switch Language: ${lang.label}`,
        subtitle: `Set active file syntax and compiler to ${lang.label}`,
        icon: <FileCode className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onSelectLanguage(lang.value);
          close();
        },
      });
    });

    // Add Problems from Catalog
    QUESTIONS.forEach((q) => {
      list.push({
        id: `prob-${q.id}`,
        category: 'Problems',
        title: `Problem: ${q.title} (${q.difficulty})`,
        subtitle: `Open ${q.title} starter code and test suite`,
        icon: <BookOpen className="w-4 h-4 text-indigo-400" />,
        action: () => {
          const starter = q.starterCode['python'] || '# Starter code\n';
          const tc = (q.examples || []).map((ex, idx) => ({
            id: `tc-${q.id}-${idx + 1}`,
            name: `Example ${idx + 1}`,
            input: ex.input,
            expectedOutput: ex.output,
            status: 'idle' as const,
          }));
          useWorkspaceStore.getState().loadProblemStarter(q.id, q.title, starter, 'python', tc);
          close();
        },
      });
    });

    return list;
  }, [nodes, onRunCode, onStopCode, onClearTerminal, onSelectLanguage]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) target.action();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="bg-[#13151b] border-[#242833] text-[#f3f4f6] max-w-xl p-0 overflow-hidden shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#242833] bg-[#0e1015]">
          <Search className="w-4 h-4 text-[#a3e635] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            placeholder="Type a command or file name... (e.g. Run, Python, main.py)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
          />
          <kbd className="text-[10px] font-mono bg-[#181b22] border border-[#242833] text-zinc-400 px-1.5 py-0.5 rounded">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer transition-colors select-none',
                    isSelected
                      ? 'bg-[#181d26] text-white border-l-2 border-[#a3e635]'
                      : 'text-zinc-300 hover:bg-[#181b22]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    <div className="truncate">
                      <div className="font-medium text-white">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[10px] text-zinc-500 truncate">{item.subtitle}</div>
                      )}
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className="text-[10px] font-mono bg-[#1c202a] border border-[#242833] text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Palette Footer Help */}
        <div className="px-4 py-2 bg-[#0e1015] border-t border-[#242833] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <span>&uarr;&darr; Navigate</span>
            <span>&bull;</span>
            <span>&crarr; Execute</span>
          </div>
          <span>CodeMentor Midnight Studio</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
