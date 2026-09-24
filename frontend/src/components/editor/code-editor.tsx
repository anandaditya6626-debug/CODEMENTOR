'use client';
import React, { useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Language } from '@/types';
import {
  getLanguageBuiltins,
  extractSymbols,
  getFunctionSignature,
  getTypoCorrection,
  BuiltinEntry,
} from '@/lib/language-intelligence';
import { checkSyntax, SyntaxDiagnostic } from '@/lib/syntax-checker';
import { completionApi } from '@/lib/completion-api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0b0c0f] flex items-center justify-center">
      <div className="space-y-3 w-full max-w-md px-8">
        <Skeleton className="h-4 w-3/4 bg-zinc-800/40" />
        <Skeleton className="h-4 w-1/2 bg-zinc-800/40" />
        <Skeleton className="h-4 w-5/6 bg-zinc-800/40" />
        <Skeleton className="h-4 w-2/3 bg-zinc-800/40" />
        <Skeleton className="h-4 w-1/3 bg-zinc-800/40" />
      </div>
    </div>
  ),
});

interface CodeEditorProps {
  defaultCode?: string;
  language?: Language;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  height?: string;
  fontSize?: number;
  tabSize?: number;
  minimap?: boolean;
  wordWrap?: 'on' | 'off';
  theme?: 'midnight' | 'dark' | 'light';
  onCursorChange?: (line: number, col: number) => void;
  autocomplete?: boolean;
  ghostText?: boolean;
  aiCompletion?: boolean;
  highlightedLine?: number | null;
  errorLine?: number | null;
  errorSymbol?: string | null;
}

// Map our language names to Monaco language IDs
function getMonacoLanguage(language: Language): string {
  const mapping: Record<Language, string> = {
    python: 'python',
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    javascript: 'javascript',
    typescript: 'typescript',
    html: 'html',
    css: 'css',
    sql: 'sql',
    csharp: 'csharp',
    go: 'go',
    rust: 'rust',
    php: 'php',
    ruby: 'ruby',
    kotlin: 'kotlin',
    swift: 'swift',
  };
  return mapping[language] || 'plaintext';
}

// Map BuiltinEntry kind → Monaco CompletionItemKind
function getCompletionItemKind(kind: BuiltinEntry['kind'], monaco: any): number {
  switch (kind) {
    case 'keyword': return monaco.languages.CompletionItemKind.Keyword;
    case 'function': return monaco.languages.CompletionItemKind.Function;
    case 'type': return monaco.languages.CompletionItemKind.Class;
    case 'module': return monaco.languages.CompletionItemKind.Module;
    case 'constant': return monaco.languages.CompletionItemKind.Constant;
    case 'method': return monaco.languages.CompletionItemKind.Method;
    case 'class': return monaco.languages.CompletionItemKind.Class;
    case 'snippet': return monaco.languages.CompletionItemKind.Snippet;
    default: return monaco.languages.CompletionItemKind.Text;
  }
}

// Map SyntaxDiagnostic severity → Monaco MarkerSeverity
function getMarkerSeverity(severity: SyntaxDiagnostic['severity'], monaco: any): number {
  switch (severity) {
    case 'error': return monaco.MarkerSeverity.Error;
    case 'warning': return monaco.MarkerSeverity.Warning;
    case 'info': return monaco.MarkerSeverity.Info;
    case 'hint': return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Info;
  }
}

export function CodeEditor({
  defaultCode = '',
  language = 'python',
  onChange,
  readOnly = false,
  height = '100%',
  fontSize = 14,
  tabSize = 4,
  minimap = false,
  wordWrap = 'off',
  theme = 'midnight',
  onCursorChange,
  autocomplete = true,
  ghostText = true,
  aiCompletion = true,
  highlightedLine = null,
  errorLine = null,
  errorSymbol = null,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const disposablesRef = useRef<any[]>([]);
  const decorationsRef = useRef<string[]>([]);
  const errorDecorationsRef = useRef<string[]>([]);
  const currentDiagnosticsRef = useRef<SyntaxDiagnostic[]>([]);
  const diagnosticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up providers on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((d) => {
        try { d.dispose(); } catch { /* ignore */ }
      });
      disposablesRef.current = [];
      if (diagnosticTimerRef.current) clearTimeout(diagnosticTimerRef.current);
    };
  }, []);

  // Sync external code updates (e.g. from Apply Fix or starter code)
  useEffect(() => {
    if (editorRef.current) {
      const current = editorRef.current.getValue();
      if (defaultCode !== undefined && current !== defaultCode) {
        editorRef.current.setValue(defaultCode);
      }
    }
  }, [defaultCode]);

  // Update line highlight decoration when highlightedLine changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (highlightedLine && highlightedLine > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monaco.Range(highlightedLine, 1, highlightedLine, 1),
          options: {
            isWholeLine: true,
            className: 'replay-active-line',
            glyphMarginClassName: 'replay-active-glyph',
          },
        },
      ]);
      editor.revealLineInCenterIfOutsideViewport(highlightedLine);
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [highlightedLine]);

  // Update execution error line and symbol decoration when errorLine changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (errorLine && errorLine > 0) {
      const model = editor.getModel();
      const newDecorations: any[] = [
        {
          range: new monaco.Range(errorLine, 1, errorLine, 1),
          options: {
            isWholeLine: true,
            className: 'execution-error-line',
            glyphMarginClassName: 'execution-error-glyph',
          },
        },
      ];

      // If a specific faulty symbol is identified, highlight the exact word on that line
      if (model && errorSymbol) {
        const lineContent = model.getLineContent(errorLine) || '';
        const symbolIdx = lineContent.indexOf(errorSymbol);
        if (symbolIdx !== -1) {
          newDecorations.push({
            range: new monaco.Range(errorLine, symbolIdx + 1, errorLine, symbolIdx + 1 + errorSymbol.length),
            options: {
              inlineClassName: 'execution-error-symbol',
              hoverMessage: { value: `**${errorSymbol}**: Caused error on this line` },
            },
          });
        }
      }

      errorDecorationsRef.current = editor.deltaDecorations(errorDecorationsRef.current, newDecorations);
      editor.revealLineInCenterIfOutsideViewport(errorLine);
    } else {
      errorDecorationsRef.current = editor.deltaDecorations(errorDecorationsRef.current, []);
    }
  }, [errorLine, errorSymbol]);

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.focus();

    // -----------------------------------------------------------------
    // 1. Define Midnight Studio custom theme
    // -----------------------------------------------------------------
    monaco.editor.defineTheme('midnight-studio', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '0b0c0f', foreground: 'f3f4f6' },
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'a3e635', fontStyle: 'bold' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'operator', foreground: 'ff79c6' },
        { token: 'variable', foreground: 'f8f8f2' },
      ],
      colors: {
        'editor.background': '#0b0c0f',
        'editor.foreground': '#f3f4f6',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#a3e635',
        'editor.lineHighlightBackground': '#141720',
        'editor.lineHighlightBorder': '#1e2330',
        'editor.selectionBackground': '#222b3d',
        'editor.inactiveSelectionBackground': '#182030',
        'editorBracketMatch.background': '#253046',
        'editorBracketMatch.border': '#3b4252',
        'editorCursor.foreground': '#a3e635',
        'editorWhitespace.foreground': '#242833',
        'editorIndentGuide.background': '#1b1f29',
        'editorIndentGuide.activeBackground': '#374151',
        // Ghost text styling
        'editorGhostText.foreground': '#4b5563',
      },
    });

    // Define Code Mentor Light theme
    monaco.editor.defineTheme('codementor-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', background: 'fafafa', foreground: '1f2937' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7c3aed', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'dc2626' },
        { token: 'type', foreground: '2563eb' },
        { token: 'function', foreground: '16a34a' },
        { token: 'operator', foreground: 'db2777' },
        { token: 'variable', foreground: '1f2937' },
      ],
      colors: {
        'editor.background': '#fafafa',
        'editor.foreground': '#1f2937',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#7c3aed',
        'editor.lineHighlightBackground': '#f3f4f6',
        'editor.lineHighlightBorder': '#e5e7eb',
        'editor.selectionBackground': '#ddd6fe',
        'editor.inactiveSelectionBackground': '#e5e7eb',
        'editorBracketMatch.background': '#ede9fe',
        'editorBracketMatch.border': '#c4b5fd',
        'editorCursor.foreground': '#7c3aed',
        'editorWhitespace.foreground': '#e5e7eb',
        'editorIndentGuide.background': '#e5e7eb',
        'editorIndentGuide.activeBackground': '#d1d5db',
        'editorGhostText.foreground': '#9ca3af',
      },
    });

    // Apply the active theme
    const monacoTheme = theme === 'light' ? 'codementor-light' : theme === 'dark' ? 'vs-dark' : 'midnight-studio';
    monaco.editor.setTheme(monacoTheme);

    // -----------------------------------------------------------------
    // 2. Register Completion Provider (Autocomplete)
    // -----------------------------------------------------------------
    const monacoLang = getMonacoLanguage(language);

    if (autocomplete) {
      const completionDisp = monaco.languages.registerCompletionItemProvider(monacoLang, {
        triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '#'],
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const prefix = word.word.toLowerCase();
          const suggestions: any[] = [];

          // 1. Language builtins
          const builtins = getLanguageBuiltins(language);
          for (const entry of builtins) {
            if (prefix && !entry.name.toLowerCase().startsWith(prefix) && !entry.name.toLowerCase().includes(prefix)) continue;

            const isSnippet = entry.kind === 'snippet';
            suggestions.push({
              label: entry.name,
              kind: getCompletionItemKind(entry.kind, monaco),
              detail: entry.detail || '',
              documentation: entry.documentation ? { value: entry.documentation } : undefined,
              insertText: entry.insertText || entry.name,
              insertTextRules: isSnippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
              range,
              sortText: entry.kind === 'keyword' ? '0' + entry.name : entry.kind === 'function' ? '1' + entry.name : '2' + entry.name,
            });
          }

          // 2. User-defined symbols from current file
          const code = model.getValue();
          const userSymbols = extractSymbols(code, language);
          for (const sym of userSymbols) {
            if (prefix && !sym.name.toLowerCase().startsWith(prefix)) continue;
            // Skip if already in suggestions
            if (suggestions.some((s) => s.label === sym.name)) continue;

            suggestions.push({
              label: sym.name,
              kind: sym.kind === 'function' ? monaco.languages.CompletionItemKind.Function
                  : sym.kind === 'class' ? monaco.languages.CompletionItemKind.Class
                  : sym.kind === 'constant' ? monaco.languages.CompletionItemKind.Constant
                  : monaco.languages.CompletionItemKind.Variable,
              detail: `${sym.kind} (line ${sym.line})`,
              insertText: sym.name,
              range,
              sortText: '00' + sym.name, // user symbols rank highest
            });
          }

          // 3. Typo correction suggestions
          if (prefix.length >= 3) {
            const correction = getTypoCorrection(word.word, language);
            if (correction && !suggestions.some((s) => s.label === correction)) {
              suggestions.unshift({
                label: correction,
                kind: monaco.languages.CompletionItemKind.Text,
                detail: `Did you mean '${correction}'?`,
                documentation: { value: `Suggested correction for '${word.word}'` },
                insertText: correction,
                range,
                sortText: '000' + correction,
                preselect: true,
              });
            }
          }

          return { suggestions };
        },
      });
      disposablesRef.current.push(completionDisp);
    }

    // -----------------------------------------------------------------
    // 3. Register Signature Help Provider
    // -----------------------------------------------------------------
    const sigHelpDisp = monaco.languages.registerSignatureHelpProvider(monacoLang, {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: (model: any, position: any) => {
        // Find the function name before the opening paren
        const lineContent = model.getLineContent(position.lineNumber);
        const textBefore = lineContent.substring(0, position.column - 1);

        // Walk backwards to find function name
        let parenDepth = 0;
        let funcEnd = -1;
        for (let i = textBefore.length - 1; i >= 0; i--) {
          if (textBefore[i] === ')') parenDepth++;
          if (textBefore[i] === '(') {
            if (parenDepth === 0) { funcEnd = i; break; }
            parenDepth--;
          }
        }
        if (funcEnd === -1) return null;

        // Extract function name
        const beforeParen = textBefore.substring(0, funcEnd).trimEnd();
        const funcMatch = beforeParen.match(/([a-zA-Z_$][\w.$]*)\s*$/);
        if (!funcMatch) return null;
        const funcName = funcMatch[1];

        const signature = getFunctionSignature(funcName, language);
        if (!signature) return null;

        // Count commas to determine active parameter
        const argsText = textBefore.substring(funcEnd + 1);
        let commaCount = 0;
        let depth = 0;
        for (const ch of argsText) {
          if (ch === '(' || ch === '[' || ch === '{') depth++;
          if (ch === ')' || ch === ']' || ch === '}') depth--;
          if (ch === ',' && depth === 0) commaCount++;
        }

        return {
          value: {
            signatures: [{
              label: `${signature.name}(${signature.parameters.map((p) => (p.optional ? `${p.name}?` : p.name) + (p.type ? `: ${p.type}` : '')).join(', ')})${signature.returnType ? ` → ${signature.returnType}` : ''}`,
              documentation: signature.documentation ? { value: signature.documentation } : undefined,
              parameters: signature.parameters.map((p) => ({
                label: p.name,
                documentation: p.documentation ? { value: `${p.documentation}${p.type ? ` (${p.type})` : ''}` } : undefined,
              })),
            }],
            activeSignature: 0,
            activeParameter: Math.min(commaCount, signature.parameters.length - 1),
          },
          dispose: () => {},
        };
      },
    });
    disposablesRef.current.push(sigHelpDisp);

    // -----------------------------------------------------------------
    // 4. Register Hover Provider
    // -----------------------------------------------------------------
    const hoverDisp = monaco.languages.registerHoverProvider(monacoLang, {
      provideHover: (model: any, position: any) => {
        // Check active diagnostics on this line first
        const diags = currentDiagnosticsRef.current;
        const hit = diags.find((d) => d.line === position.lineNumber);
        if (hit) {
          const contents: any[] = [
            { value: `**${hit.severity === 'error' ? '🔴 Error' : '⚠️ Warning'}:** ${hit.message}` },
          ];
          if (hit.suggestion) {
            contents.push({ value: `💡 **Suggestion:** ${hit.suggestion}` });
          }
          if (hit.fixTitle) {
            contents.push({ value: `🛠️ *Quick Fix: ${hit.fixTitle} (Alt+Enter / Ctrl+.)*` });
          }
          return {
            range: new monaco.Range(hit.line, hit.startCol, hit.line, hit.endCol),
            contents,
          };
        }

        const word = model.getWordAtPosition(position);
        if (!word) return null;

        // Check builtins
        const builtins = getLanguageBuiltins(language);
        const match = builtins.find((b) => b.name === word.word);
        if (match) {
          const contents = [];
          if (match.detail) contents.push({ value: `\`\`\`\n${match.detail}\n\`\`\`` });
          if (match.documentation) contents.push({ value: match.documentation });
          if (contents.length > 0) {
            return {
              range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
              contents,
            };
          }
        }

        // Check user symbols
        const code = model.getValue();
        const userSymbols = extractSymbols(code, language);
        const userMatch = userSymbols.find((s) => s.name === word.word);
        if (userMatch) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${userMatch.kind}** \`${userMatch.name}\`` },
              { value: `Defined on line ${userMatch.line}` },
            ],
          };
        }

        // Check for typos
        const correction = getTypoCorrection(word.word, language);
        if (correction) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `⚠️ Did you mean **\`${correction}\`**?` },
            ],
          };
        }

        return null;
      },
    });
    disposablesRef.current.push(hoverDisp);

    // -----------------------------------------------------------------
    // 5. Register Code Action Provider (Quick Fixes)
    // -----------------------------------------------------------------
    const codeActionDisp = monaco.languages.registerCodeActionProvider(monacoLang, {
      provideCodeActions: (model: any, range: any, context: any) => {
        const actions: any[] = [];
        const markers = context.markers || [];

        // Check diagnostics with fixCode
        const diags = currentDiagnosticsRef.current;
        const matching = diags.filter(
          (d) => d.line >= range.startLineNumber - 1 && d.line <= range.endLineNumber + 1
        );

        for (const d of matching) {
          if (d.fixCode) {
            const isFullReplacement = d.isFullReplacement ?? (d.fixCode.includes('\n') && (d.code === 'syntax-error' || d.fixCode.length > 80));
            actions.push({
              title: `💡 Fix: ${d.fixTitle || d.suggestion || 'Apply Suggestion'}`,
              kind: 'quickfix',
              isPreferred: true,
              edit: {
                edits: [
                  isFullReplacement
                    ? {
                        resource: model.uri,
                        textEdit: {
                          range: model.getFullModelRange(),
                          text: d.fixCode,
                        },
                      }
                    : {
                        resource: model.uri,
                        textEdit: {
                          range: new monaco.Range(d.line, d.startCol, d.line, d.endCol),
                          text: d.fixCode,
                        },
                      },
                ],
              },
            });
          }
        }

        for (const marker of markers) {
          // If marker has a typo suggestion, offer a quick fix
          if (marker.code === 'typo' || marker.message?.includes('Did you mean')) {
            const correctionMatch = marker.message.match(/did you mean '(\w+)'/i);
            if (correctionMatch) {
              const correction = correctionMatch[1];
              actions.push({
                title: `Replace with '${correction}'`,
                kind: 'quickfix',
                diagnostics: [marker],
                edit: {
                  edits: [{
                    resource: model.uri,
                    textEdit: {
                      range: {
                        startLineNumber: marker.startLineNumber,
                        startColumn: marker.startColumn,
                        endLineNumber: marker.endLineNumber,
                        endColumn: marker.endColumn,
                      },
                      text: correction,
                    },
                    versionId: undefined,
                  }],
                },
                isPreferred: true,
              });
            }
          }

          // Missing colon fix for Python
          if (marker.code === 'missing-colon' && language === 'python') {
            const lineContent = model.getLineContent(marker.startLineNumber);
            const trimmed = lineContent.replace(/#.*$/, '').trimEnd();
            actions.push({
              title: 'Add missing colon',
              kind: 'quickfix',
              diagnostics: [marker],
              edit: {
                edits: [{
                  resource: model.uri,
                  textEdit: {
                    range: {
                      startLineNumber: marker.startLineNumber,
                      startColumn: trimmed.length + 1,
                      endLineNumber: marker.startLineNumber,
                      endColumn: trimmed.length + 1,
                    },
                    text: ':',
                  },
                  versionId: undefined,
                }],
              },
              isPreferred: true,
            });
          }

          // Missing semicolon fix
          if (marker.code === 'missing-semicolon') {
            actions.push({
              title: 'Add semicolon',
              kind: 'quickfix',
              diagnostics: [marker],
              edit: {
                edits: [{
                  resource: model.uri,
                  textEdit: {
                    range: {
                      startLineNumber: marker.startLineNumber,
                      startColumn: marker.endColumn,
                      endLineNumber: marker.startLineNumber,
                      endColumn: marker.endColumn,
                    },
                    text: ';',
                  },
                  versionId: undefined,
                }],
              },
              isPreferred: true,
            });
          }
        }

        return { actions, dispose: () => {} };
      },
    });
    disposablesRef.current.push(codeActionDisp);

    // -----------------------------------------------------------------
    // 6. Register Inline Completion Provider (Ghost Text)
    // -----------------------------------------------------------------
    if (ghostText) {
      const inlineDisp = monaco.languages.registerInlineCompletionsProvider(monacoLang, {
        provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
          const lineContent = model.getLineContent(position.lineNumber);
          const textBefore = lineContent.substring(0, position.column - 1);
          const trimmedBefore = textBefore.trimEnd();
          const items: any[] = [];

          if (language === 'python') {
            // Auto-complete brackets/quotes
            if (trimmedBefore.endsWith('(') && !lineContent.substring(position.column - 1).includes(')')) {
              items.push({ insertText: ')', range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column } });
            }
            if (trimmedBefore.endsWith('[') && !lineContent.substring(position.column - 1).includes(']')) {
              items.push({ insertText: ']', range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column } });
            }
            // Auto-suggest colon after block keywords
            if (/^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/.test(trimmedBefore) && !trimmedBefore.endsWith(':')) {
              const kw = trimmedBefore.match(/^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/);
              if (kw) {
                const afterKw = trimmedBefore.substring(trimmedBefore.indexOf(kw[1]) + kw[1].length).trim();
                if (afterKw.length > 0 || kw[1] === 'else' || kw[1] === 'try' || kw[1] === 'finally') {
                  items.push({
                    insertText: kw[1] === 'else' || kw[1] === 'try' || kw[1] === 'finally' ? ':' : '',
                    range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column },
                  });
                }
              }
            }
            // Common pattern completions
            if (trimmedBefore.match(/def\s+\w+\(\s*self\s*\)\s*$/)) {
              items.push({ insertText: ':\n        pass', range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column } });
            }
            if (trimmedBefore.match(/if\s+__name__\s*==\s*['"]__main__['"]\s*$/)) {
              items.push({ insertText: ':\n    main()', range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column } });
            }
          } else if (language === 'javascript' || language === 'typescript') {
            // Auto-close brackets
            if (trimmedBefore.endsWith('{') && !lineContent.substring(position.column - 1).trim().startsWith('}')) {
              items.push({ insertText: '\n  \n}', range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column } });
            }
            // console.log completion
            if (trimmedBefore.match(/console\.$/)) {
              items.push({ insertText: 'log()', range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column } });
            }
          }

          // Return local heuristics immediately if found
          if (items.length > 0) {
            return { items };
          }

          // If AI completion is enabled and user typed at least 3 characters
          if (aiCompletion && trimmedBefore.trim().length >= 3) {
            try {
              // Wait briefly for user to pause typing (300ms)
              await new Promise((resolve) => setTimeout(resolve, 300));
              if (token?.isCancellationRequested) {
                return { items: [] };
              }

              const fullCode = model.getValue();
              const response = await completionApi.getInlineCompletion({
                code: fullCode,
                language,
                cursor_line: position.lineNumber,
                cursor_col: position.column,
              });

              if (token?.isCancellationRequested) {
                return { items: [] };
              }

              const suggestion = response.data?.suggestion;
              if (suggestion && suggestion.trim().length > 0) {
                return {
                  items: [{
                    insertText: suggestion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  }],
                };
              }
            } catch {
              // Gracefully ignore AI error or network failure
            }
          }

          return { items };
        },
        freeInlineCompletions: () => {},
      });
      disposablesRef.current.push(inlineDisp);
    }

    // -----------------------------------------------------------------
    // 7. Set up live diagnostics (debounced)
    // -----------------------------------------------------------------
    const updateMarkers = (diags: SyntaxDiagnostic[]) => {
      const model = editor.getModel();
      if (!model) return;
      const markers = diags.map((d) => ({
        severity: getMarkerSeverity(d.severity, monaco),
        startLineNumber: d.line,
        startColumn: d.startCol,
        endLineNumber: d.line,
        endColumn: d.endCol,
        message: d.suggestion ? `${d.message}\n💡 Suggestion: ${d.suggestion}` : d.message,
        source: d.source,
        code: d.code,
      }));
      monaco.editor.setModelMarkers(model, 'codementor', markers);
    };

    const runDiagnostics = () => {
      const model = editor.getModel();
      if (!model) return;
      const code = model.getValue();
      const diagnosticResults = checkSyntax(code, language);

      // Also add typo markers for identifiers
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const wordRegex = /\b([a-zA-Z_]\w{2,})\b/g;
        let match;
        while ((match = wordRegex.exec(line)) !== null) {
          const word = match[1];
          const correction = getTypoCorrection(word, language);
          if (correction) {
            const userSymbols = extractSymbols(code, language);
            if (userSymbols.some((s) => s.name === word)) continue;
            const builtins = getLanguageBuiltins(language);
            if (builtins.some((b) => b.name === word)) continue;
            const beforeWord = line.substring(0, match.index);
            if (beforeWord.includes('#') || beforeWord.includes('//')) continue;
            if ((beforeWord.split('"').length - 1) % 2 !== 0) continue;
            if ((beforeWord.split("'").length - 1) % 2 !== 0) continue;

            diagnosticResults.push({
              line: i + 1,
              startCol: match.index + 1,
              endCol: match.index + word.length + 1,
              message: `Unknown identifier '${word}' — did you mean '${correction}'?`,
              severity: 'warning',
              source: 'CodeMentor',
              code: 'typo',
              suggestion: `Replace '${word}' with '${correction}'.`,
              fixTitle: `Change to '${correction}'`,
              fixCode: correction,
            });
          }
        }
      }

      currentDiagnosticsRef.current = diagnosticResults;
      updateMarkers(diagnosticResults);

      // Async: If Python, run backend AST parser for 100% grammar accuracy & deep fixes
      if (language === 'python' && code.trim()) {
        completionApi.lint({ code, language }).then((res) => {
          if (!res.data.valid && res.data.diagnostics.length > 0) {
            const astDiags: SyntaxDiagnostic[] = res.data.diagnostics.map((d) => ({
              line: d.line,
              startCol: d.column || 1,
              endCol: d.end_column && d.end_column > 0 ? d.end_column : (d.column || 1) + 4,
              message: d.message,
              severity: 'error',
              source: 'Python AST',
              code: d.code || 'syntax-error',
              suggestion: d.suggestion,
              fixTitle: d.suggestion ? 'Apply Recommended Fix' : undefined,
              fixCode: d.fix_code,
            }));
            const filteredLocal = diagnosticResults.filter(
              (loc) => !astDiags.some((ast) => ast.line === loc.line)
            );
            const combined = [...astDiags, ...filteredLocal];
            currentDiagnosticsRef.current = combined;
            updateMarkers(combined);
          }
        }).catch(() => {
          // ignore network error
        });
      }
    };

    // Run diagnostics on content change (debounced)
    const changeDisp = editor.onDidChangeModelContent(() => {
      if (diagnosticTimerRef.current) clearTimeout(diagnosticTimerRef.current);
      diagnosticTimerRef.current = setTimeout(runDiagnostics, 500);
    });
    disposablesRef.current.push(changeDisp);

    // Initial diagnostics run
    setTimeout(runDiagnostics, 300);

    // -----------------------------------------------------------------
    // 8. Cursor position tracking
    // -----------------------------------------------------------------
    editor.onDidChangeCursorPosition((e: any) => {
      if (e?.position) {
        onCursorChange?.(e.position.lineNumber, e.position.column);
      }
    });

    // -----------------------------------------------------------------
    // 9. Register keyboard shortcuts
    // -----------------------------------------------------------------
    editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      ],
      run: () => {
        window.dispatchEvent(new CustomEvent('codementor:run'));
      },
    });

    editor.addAction({
      id: 'save-code',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        window.dispatchEvent(new CustomEvent('codementor:save'));
      },
    });

    editor.addAction({
      id: 'command-palette',
      label: 'Command Palette',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: () => {
        window.dispatchEvent(new CustomEvent('codementor:commandpalette'));
      },
    });

    editor.addAction({
      id: 'quick-open',
      label: 'Quick Open File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP],
      run: () => {
        window.dispatchEvent(new CustomEvent('codementor:quickopen'));
      },
    });

    editor.addAction({
      id: 'submit-code',
      label: 'Submit Code',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      ],
      run: () => {
        window.dispatchEvent(new CustomEvent('codementor:submit'));
      },
    });
  }, [theme, onCursorChange, language, autocomplete, ghostText]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      onChange?.(value);
    },
    [onChange]
  );

  const activeMonacoTheme =
    theme === 'light' ? 'codementor-light' : theme === 'dark' ? 'vs-dark' : 'midnight-studio';

  return (
    <div className="w-full h-full bg-[#0b0c0f]">
      <MonacoEditor
        height={height}
        language={getMonacoLanguage(language)}
        value={defaultCode}
        theme={activeMonacoTheme}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: minimap },
          fontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          scrollBeyondLastLine: false,
          padding: { top: 14, bottom: 14 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          bracketPairColorization: { enabled: true },
          autoIndent: 'full',
          formatOnPaste: true,
          suggestOnTriggerCharacters: autocomplete,
          acceptSuggestionOnEnter: 'on',
          tabSize,
          insertSpaces: true,
          wordWrap,
          contextmenu: true,
          readOnly,
          automaticLayout: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          roundedSelection: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          // Inline suggestions (ghost text)
          inlineSuggest: { enabled: ghostText },
          quickSuggestions: autocomplete ? {
            other: true,
            comments: false,
            strings: false,
          } : false,
          parameterHints: { enabled: true },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showVariables: true,
            showClasses: true,
            showModules: true,
            showConstants: true,
            showMethods: true,
            preview: true,
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false,
          },
        }}
      />
    </div>
  );
}
