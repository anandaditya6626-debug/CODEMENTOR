'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Sliders, Keyboard, Palette, Terminal, Code2 } from 'lucide-react';

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, preferences, updatePreferences } = useWorkspaceStore();

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="bg-[#13151b] border-[#242833] text-[#f3f4f6] max-w-lg p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-[#242833] bg-[#0e1015]">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-white">
            <Settings className="w-4 h-4 text-[#a3e635]" />
            IDE Preferences & Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Personalize your Midnight Studio editor layout, font size, and workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Appearance & Theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Palette className="w-3.5 h-3.5 text-[#a3e635]" />
              Appearance & Theme
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs text-zinc-300 block mb-1">Color Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(val: any) => updatePreferences({ theme: val })}
                >
                  <SelectTrigger className="bg-[#181b22] border-[#242833] text-xs h-8 text-white">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181b22] border-[#242833] text-white">
                    <SelectItem value="midnight">Midnight Studio (Recommended)</SelectItem>
                    <SelectItem value="dark">Standard VS Dark</SelectItem>
                    <SelectItem value="light">Clean Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-zinc-300 block mb-1">Editor Font Size</Label>
                <Select
                  value={String(preferences.fontSize)}
                  onValueChange={(val) => updatePreferences({ fontSize: Number(val) })}
                >
                  <SelectTrigger className="bg-[#181b22] border-[#242833] text-xs h-8 text-white">
                    <SelectValue placeholder="Font Size" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181b22] border-[#242833] text-white">
                    <SelectItem value="12">12px (Compact)</SelectItem>
                    <SelectItem value="14">14px (Standard)</SelectItem>
                    <SelectItem value="16">16px (Comfortable)</SelectItem>
                    <SelectItem value="18">18px (Large)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Editor Options */}
          <div className="space-y-3 pt-2 border-t border-[#242833]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Code2 className="w-3.5 h-3.5 text-[#a3e635]" />
              Code Editor Behavior
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-medium">Tab Indentation</div>
                  <div className="text-[11px] text-zinc-400">Choose between 2 or 4 spaces per tab</div>
                </div>
                <Select
                  value={String(preferences.tabSize)}
                  onValueChange={(val) => updatePreferences({ tabSize: Number(val) })}
                >
                  <SelectTrigger className="w-28 bg-[#181b22] border-[#242833] text-xs h-8 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181b22] border-[#242833] text-white">
                    <SelectItem value="2">2 Spaces</SelectItem>
                    <SelectItem value="4">4 Spaces</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-medium">Code Minimap</div>
                  <div className="text-[11px] text-zinc-400">Display mini code overview on right side</div>
                </div>
                <Switch
                  checked={preferences.minimap}
                  onCheckedChange={(checked) => updatePreferences({ minimap: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-medium">Word Wrap</div>
                  <div className="text-[11px] text-zinc-400">Wrap long lines to fit editor viewport</div>
                </div>
                <Switch
                  checked={preferences.wordWrap === 'on'}
                  onCheckedChange={(checked) => updatePreferences({ wordWrap: checked ? 'on' : 'off' })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-medium">Autosave & Persistence</div>
                  <div className="text-[11px] text-zinc-400">Preserve workspace code in local storage across sessions</div>
                </div>
                <Switch
                  checked={preferences.autosave}
                  onCheckedChange={(checked) => updatePreferences({ autosave: checked })}
                />
              </div>
            </div>
          </div>

          {/* Intelligence & Autocomplete */}
          <div className="space-y-3 pt-2 border-t border-[#242833]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Sliders className="w-3.5 h-3.5 text-[#a3e635]" />
              Intelligence &amp; Autocomplete
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-medium">Autocomplete</div>
                  <div className="text-[11px] text-zinc-400">Show keyword, builtin, and symbol suggestions as you type</div>
                </div>
                <Switch
                  checked={preferences.autocomplete}
                  onCheckedChange={(checked) => updatePreferences({ autocomplete: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-medium">Ghost Text Suggestions</div>
                  <div className="text-[11px] text-zinc-400">Show inline completion previews (Tab to accept, Esc to dismiss)</div>
                </div>
                <Switch
                  checked={preferences.ghostText}
                  onCheckedChange={(checked) => updatePreferences({ ghostText: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-medium">AI Completion</div>
                  <div className="text-[11px] text-zinc-400">Use AI for advanced code suggestions (requires API key in backend)</div>
                </div>
                <Switch
                  checked={preferences.aiCompletion}
                  onCheckedChange={(checked) => updatePreferences({ aiCompletion: checked })}
                />
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="space-y-3 pt-2 border-t border-[#242833]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Keyboard className="w-3.5 h-3.5 text-[#a3e635]" />
              Keyboard Shortcuts Cheat Sheet
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="flex items-center justify-between p-2 bg-[#181b22] rounded border border-[#242833]">
                <span className="text-zinc-300">Run Program</span>
                <kbd className="font-mono text-[10px] bg-[#0e1015] border border-[#242833] px-1.5 py-0.5 rounded text-white">Enter / Shift+Enter</kbd>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#181b22] rounded border border-[#242833]">
                <span className="text-zinc-300">Command Palette</span>
                <kbd className="font-mono text-[10px] bg-[#0e1015] border border-[#242833] px-1.5 py-0.5 rounded text-white">Ctrl+K / Cmd+K</kbd>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#181b22] rounded border border-[#242833]">
                <span className="text-zinc-300">Quick Open File</span>
                <kbd className="font-mono text-[10px] bg-[#0e1015] border border-[#242833] px-1.5 py-0.5 rounded text-white">Ctrl+P / Cmd+P</kbd>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#181b22] rounded border border-[#242833]">
                <span className="text-zinc-300">Save File</span>
                <kbd className="font-mono text-[10px] bg-[#0e1015] border border-[#242833] px-1.5 py-0.5 rounded text-white">Ctrl+S / Cmd+S</kbd>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#181b22] rounded border border-[#242833]">
                <span className="text-zinc-300">Toggle Explorer</span>
                <kbd className="font-mono text-[10px] bg-[#0e1015] border border-[#242833] px-1.5 py-0.5 rounded text-white">Ctrl+B</kbd>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#181b22] rounded border border-[#242833]">
                <span className="text-zinc-300">Toggle Terminal</span>
                <kbd className="font-mono text-[10px] bg-[#0e1015] border border-[#242833] px-1.5 py-0.5 rounded text-white">Ctrl+J</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#0e1015] border-t border-[#242833] flex justify-end">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-1.5 text-xs bg-[#181b22] hover:bg-[#20232c] text-white border border-[#242833] rounded font-medium"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
