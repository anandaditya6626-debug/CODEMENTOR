import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '@/types';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  language?: Language;
  content?: string;
  isDirty?: boolean;
  isOpen?: boolean;
  isExpanded?: boolean; // for folders
}

export interface EditorPreferences {
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  wordWrap: 'on' | 'off';
  theme: 'midnight' | 'dark' | 'light';
  autosave: boolean;
  autocomplete: boolean;
  ghostText: boolean;
  aiCompletion: boolean;
}

export interface TestCaseItem {
  id: string;
  name?: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  status?: 'idle' | 'running' | 'passed' | 'failed';
  time?: number | string;
  error?: string;
}

export interface WorkspaceState {
  nodes: Record<string, FileNode>;
  openTabIds: string[];
  activeTabId: string;
  preferences: EditorPreferences;
  explorerCollapsed: boolean;
  terminalCollapsed: boolean;
  problemsOpen: boolean;
  settingsOpen: boolean;
  commandPaletteOpen: boolean;
  searchFilter: string;

  testCases: TestCaseItem[];

  replayOpen: boolean;
  visualLogicOpen: boolean;

  // Actions
  createFile: (name: string, parentId?: string | null, content?: string, language?: Language) => string;
  createFolder: (name: string, parentId?: string | null) => string;
  renameNode: (id: string, newName: string) => void;
  deleteNode: (id: string) => void;
  toggleFolder: (id: string) => void;
  setFileContent: (id: string, content: string) => void;
  saveFile: (id: string) => void;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updatePreferences: (partial: Partial<EditorPreferences>) => void;
  setExplorerCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  setTerminalCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  setProblemsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setReplayOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setVisualLogicOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setSettingsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchFilter: (filter: string) => void;
  loadProblemStarter: (
    problemId: string,
    problemTitle: string,
    starterCode: string,
    lang: Language,
    testCases?: TestCaseItem[]
  ) => void;
  addTestCase: (testCase?: Partial<TestCaseItem>) => void;
  updateTestCase: (id: string, partial: Partial<TestCaseItem>) => void;
  deleteTestCase: (id: string) => void;
  setTestCases: (cases: TestCaseItem[]) => void;
  resetTestCases: () => void;
}

export function detectLanguageFromFilename(filename: string): Language {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return 'python';
    case 'cpp':
    case 'cc':
    case 'cxx': return 'cpp';
    case 'c':
    case 'h': return 'c';
    case 'java': return 'java';
    case 'js':
    case 'mjs': return 'javascript';
    case 'ts': return 'typescript';
    case 'html':
    case 'htm': return 'html';
    case 'css': return 'css';
    case 'sql': return 'sql';
    case 'cs': return 'csharp';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'php': return 'php';
    case 'rb': return 'ruby';
    case 'kt': return 'kotlin';
    case 'swift': return 'swift';
    default: return 'python';
  }
}

const DEFAULT_PYTHON_CODE = `# CodeMentor Midnight Studio
def main():
    name = input("Enter your name: ")
    print(f"Hello, {name}! Welcome to CodeMentor.")

if __name__ == "__main__":
    main()
`;

const DEFAULT_UTILS_CODE = `# Utility functions
def greet(name: str) -> str:
    return f"Greetings, {name}!"

def square(n: int) -> int:
    return n * n
`;

const DEFAULT_NOTES = `# CodeMentor Scratchpad
- Quick notes, test inputs, or scratch logic.
- Press Enter or click Run to execute.
- Use Ctrl+K for command palette.
- Use Ctrl+P for quick file open.
`;

const INITIAL_NODES: Record<string, FileNode> = {
  'file-main': {
    id: 'file-main',
    name: 'main.py',
    type: 'file',
    parentId: null,
    language: 'python',
    content: DEFAULT_PYTHON_CODE,
    isDirty: false,
    isOpen: true,
  },
  'file-utils': {
    id: 'file-utils',
    name: 'utils.py',
    type: 'file',
    parentId: null,
    language: 'python',
    content: DEFAULT_UTILS_CODE,
    isDirty: false,
    isOpen: false,
  },
  'file-notes': {
    id: 'file-notes',
    name: 'notes.txt',
    type: 'file',
    parentId: null,
    language: 'python',
    content: DEFAULT_NOTES,
    isDirty: false,
    isOpen: false,
  },
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      nodes: INITIAL_NODES,
      openTabIds: ['file-main'],
      activeTabId: 'file-main',
      preferences: {
        fontSize: 14,
        tabSize: 4,
        minimap: true,
        wordWrap: 'on',
        theme: 'midnight',
        autosave: true,
        autocomplete: true,
        ghostText: true,
        aiCompletion: true,
      },
      explorerCollapsed: false,
      terminalCollapsed: false,
      problemsOpen: false,
      settingsOpen: false,
      commandPaletteOpen: false,
      searchFilter: '',
      testCases: [
        { id: 'tc-1', name: 'Test Case 1', input: '', expectedOutput: 'Hello, World!', status: 'idle' },
        { id: 'tc-2', name: 'Test Case 2', input: '5', expectedOutput: '25', status: 'idle' },
      ],
      replayOpen: false,
      visualLogicOpen: false,

      createFile: (name, parentId = null, content = '', language) => {
        const id = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const detectedLang = language || detectLanguageFromFilename(name);
        const newNode: FileNode = {
          id,
          name,
          type: 'file',
          parentId,
          language: detectedLang,
          content,
          isDirty: false,
          isOpen: true,
        };

        set((state) => ({
          nodes: { ...state.nodes, [id]: newNode },
          openTabIds: state.openTabIds.includes(id) ? state.openTabIds : [...state.openTabIds, id],
          activeTabId: id,
        }));
        return id;
      },

      createFolder: (name, parentId = null) => {
        const id = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newNode: FileNode = {
          id,
          name,
          type: 'folder',
          parentId,
          isExpanded: true,
        };

        set((state) => ({
          nodes: { ...state.nodes, [id]: newNode },
        }));
        return id;
      },

      renameNode: (id, newName) => {
        set((state) => {
          const node = state.nodes[id];
          if (!node) return state;
          const updated = { ...node, name: newName };
          if (node.type === 'file') {
            updated.language = detectLanguageFromFilename(newName);
          }
          return {
            nodes: { ...state.nodes, [id]: updated },
          };
        });
      },

      deleteNode: (id) => {
        set((state) => {
          const newNodes = { ...state.nodes };
          // Find all recursive children if folder
          const toDelete = new Set<string>([id]);
          let changed = true;
          while (changed) {
            changed = false;
            (Object.values(newNodes) as FileNode[]).forEach((n) => {
              if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
                toDelete.add(n.id);
                changed = true;
              }
            });
          }

          toDelete.forEach((delId) => {
            delete newNodes[delId];
          });

          const newOpenTabs = state.openTabIds.filter((tabId: string) => !toDelete.has(tabId));
          let newActive = state.activeTabId;
          if (toDelete.has(newActive)) {
            newActive = newOpenTabs[0] || '';
          }

          return {
            nodes: newNodes,
            openTabIds: newOpenTabs,
            activeTabId: newActive,
          };
        });
      },

      toggleFolder: (id) => {
        set((state) => {
          const node = state.nodes[id];
          if (!node || node.type !== 'folder') return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...node, isExpanded: !node.isExpanded },
            },
          };
        });
      },

      setFileContent: (id, content) => {
        set((state) => {
          const node = state.nodes[id];
          if (!node || node.content === content) return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...node, content, isDirty: true },
            },
          };
        });
      },

      saveFile: (id) => {
        set((state) => {
          const node = state.nodes[id];
          if (!node) return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...node, isDirty: false },
            },
          };
        });
      },

      openTab: (id) => {
        set((state) => {
          const exists = state.nodes[id];
          if (!exists || exists.type !== 'file') return state;
          const openTabIds = state.openTabIds.includes(id)
            ? state.openTabIds
            : [...state.openTabIds, id];
          return {
            openTabIds,
            activeTabId: id,
          };
        });
      },

      closeTab: (id) => {
        set((state) => {
          const newTabs = state.openTabIds.filter((t: string) => t !== id);
          let newActive = state.activeTabId;
          if (state.activeTabId === id) {
            const idx = state.openTabIds.indexOf(id);
            newActive = newTabs[Math.max(0, idx - 1)] || '';
          }
          return {
            openTabIds: newTabs,
            activeTabId: newActive,
          };
        });
      },

      setActiveTab: (id) => {
        set({ activeTabId: id });
      },

      updatePreferences: (partial) => {
        set((state) => ({
          preferences: { ...state.preferences, ...partial },
        }));
      },

      setExplorerCollapsed: (action) => {
        set((state) => ({
          explorerCollapsed: typeof action === 'function' ? action(state.explorerCollapsed) : action,
        }));
      },

      setTerminalCollapsed: (action) => {
        set((state) => ({
          terminalCollapsed: typeof action === 'function' ? action(state.terminalCollapsed) : action,
        }));
      },


      setProblemsOpen: (action) => {
        set((state) => ({
          problemsOpen: typeof action === 'function' ? action(state.problemsOpen) : action,
        }));
      },

      setReplayOpen: (action) => {
        set((state) => ({
          replayOpen: typeof action === 'function' ? action(state.replayOpen) : action,
        }));
      },

      setVisualLogicOpen: (action) => {
        set((state) => ({
          visualLogicOpen: typeof action === 'function' ? action(state.visualLogicOpen) : action,
        }));
      },

      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setSearchFilter: (searchFilter) => set({ searchFilter }),

      loadProblemStarter: (problemId, problemTitle, starterCode, lang, testCases) => {
        const state = get();
        if (testCases && testCases.length > 0) {
          set({ testCases });
        }

        const existingNode = (Object.values(state.nodes) as FileNode[]).find(
          (n) => n.name.startsWith(problemId) && n.language === lang
        );

        if (existingNode) {
          get().openTab(existingNode.id);
          return;
        }

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
        const ext = extMap[lang] || 'py';
        const fileName = `${problemId}.${ext}`;
        const newId = get().createFile(fileName, null, starterCode, lang);
        get().openTab(newId);
      },

      addTestCase: (tc) => {
        const nextIdx = get().testCases.length + 1;
        const newTc: TestCaseItem = {
          id: `tc-${Date.now()}`,
          name: tc?.name || `Test Case ${nextIdx}`,
          input: tc?.input || '',
          expectedOutput: tc?.expectedOutput || '',
          status: 'idle',
          ...tc,
        };
        set({ testCases: [...get().testCases, newTc] });
      },

      updateTestCase: (id, partial) => {
        set({
          testCases: get().testCases.map((tc: TestCaseItem) => (tc.id === id ? { ...tc, ...partial } : tc)),
        });
      },

      deleteTestCase: (id) => {
        set({
          testCases: get().testCases.filter((tc: TestCaseItem) => tc.id !== id),
        });
      },

      setTestCases: (testCases) => set({ testCases }),

      resetTestCases: () => {
        set({
          testCases: get().testCases.map((tc: TestCaseItem) => ({
            ...tc,
            actualOutput: undefined,
            status: 'idle',
            time: undefined,
            error: undefined,
          })),
        });
      },
    }),
    {
      name: 'codementor-workspace-v3',
      merge: (persistedState: any, currentState: WorkspaceState) => {
        const p = persistedState || {};
        const rawNodes =
          p.nodes && typeof p.nodes === 'object' && Object.keys(p.nodes).length > 0
            ? p.nodes
            : INITIAL_NODES;
        const validNodeKeys = Object.keys(rawNodes);
        const rawTabIds =
          Array.isArray(p.openTabIds) && p.openTabIds.length > 0
            ? p.openTabIds.filter((id: string) => rawNodes[id])
            : [];
        const openTabIds =
          rawTabIds.length > 0 ? rawTabIds : [validNodeKeys[0] || 'file-main'];
        const activeTabId =
          p.activeTabId && rawNodes[p.activeTabId] ? p.activeTabId : openTabIds[0];
        const preferences = {
          ...currentState.preferences,
          ...(p.preferences && typeof p.preferences === 'object' ? p.preferences : {}),
        };
        const testCases =
          Array.isArray(p.testCases) && p.testCases.length > 0
            ? p.testCases
            : currentState.testCases;

        return {
          ...currentState,
          nodes: rawNodes,
          openTabIds,
          activeTabId,
          preferences,
          testCases,
        };
      },
      partialize: (state) => ({
        nodes: state.nodes,
        openTabIds: state.openTabIds,
        activeTabId: state.activeTabId,
        preferences: state.preferences,
        testCases: state.testCases,
      }),
    }
  )
);
