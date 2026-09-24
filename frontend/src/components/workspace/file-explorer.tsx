'use client';

import React, { useState, useMemo } from 'react';
import {
  FileCode2,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  FileText,
  Database,
  Terminal,
} from 'lucide-react';
import { useWorkspaceStore, FileNode } from '@/stores/workspace-store';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function FileExplorer() {
  const {
    nodes,
    activeTabId,
    openTab,
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    toggleFolder,
  } = useWorkspaceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [activeParentFolderId, setActiveParentFolderId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [deletingNode, setDeletingNode] = useState<FileNode | null>(null);

  // Group nodes by parentId
  const { rootNodes, childrenMap } = useMemo(() => {
    const root: FileNode[] = [];
    const children: Record<string, FileNode[]> = {};

    Object.values(nodes).forEach((node) => {
      if (!node.parentId) {
        root.push(node);
      } else {
        if (!children[node.parentId]) children[node.parentId] = [];
        children[node.parentId].push(node);
      }
    });

    // Sort folders first, then alphabetical
    const sortFn = (a: FileNode, b: FileNode) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    };

    root.sort(sortFn);
    Object.keys(children).forEach((k) => children[k].sort(sortFn));

    return { rootNodes: root, childrenMap: children };
  }, [nodes]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      return;
    }

    if (isCreatingFile) {
      createFile(trimmed, activeParentFolderId);
    } else if (isCreatingFolder) {
      createFolder(trimmed, activeParentFolderId);
    }

    setNewItemName('');
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
    setActiveParentFolderId(null);
  };

  const handleStartRename = (e: React.MouseEvent, node: FileNode) => {
    e.stopPropagation();
    setEditingId(node.id);
    setEditingName(node.name);
  };

  const handleFinishRename = () => {
    if (editingId && editingName.trim()) {
      renameNode(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const confirmDelete = () => {
    if (deletingNode) {
      deleteNode(deletingNode.id);
      setDeletingNode(null);
    }
  };

  // Helper icon renderer
  const renderFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
        return <span className="text-yellow-400 font-mono text-[11px] font-bold">Py</span>;
      case 'js':
        return <span className="text-yellow-300 font-mono text-[11px] font-bold">JS</span>;
      case 'ts':
        return <span className="text-blue-400 font-mono text-[11px] font-bold">TS</span>;
      case 'cpp':
      case 'c':
        return <span className="text-cyan-400 font-mono text-[11px] font-bold">C++</span>;
      case 'java':
        return <span className="text-orange-400 font-mono text-[11px] font-bold">Jv</span>;
      case 'sql':
        return <Database className="w-3.5 h-3.5 text-emerald-400" />;
      case 'txt':
      case 'md':
        return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
      default:
        return <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  // Render individual tree item
  const renderNode = (node: FileNode, depth = 0) => {
    const isEditing = editingId === node.id;
    const isActive = activeTabId === node.id;
    const isFolder = node.type === 'folder';
    const isExpanded = node.isExpanded ?? true;

    // Filter check
    if (searchQuery.trim() && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      // If folder has matching child, don't hide
      const children = childrenMap[node.id] || [];
      const hasMatchingChild = children.some((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (!hasMatchingChild) return null;
    }

    return (
      <div key={node.id} className="select-none text-xs">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.id);
            } else {
              openTab(node.id);
            }
          }}
          style={{ paddingLeft: `${depth * 12 + 10}px` }}
          className={cn(
            'group flex items-center justify-between py-1 pr-2 rounded cursor-pointer transition-colors relative',
            isActive
              ? 'bg-[#181d26] text-white font-medium border-l-2 border-[#a3e635]'
              : 'text-[#9ca3af] hover:bg-[#15181f] hover:text-[#f3f4f6]'
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isFolder ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(node.id);
                  }}
                  className="p-0.5 text-zinc-500 hover:text-zinc-300"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </>
            ) : (
              <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                {renderFileIcon(node.name)}
              </span>
            )}

            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={editingName}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="bg-[#0b0c0f] border border-[#3b4252] rounded px-1 py-0 text-xs text-white focus:outline-none w-full"
              />
            ) : (
              <span className="truncate flex-1">{node.name}</span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.isDirty && !isFolder && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] shrink-0" title="Unsaved changes" />
            )}
            {isFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveParentFolderId(node.id);
                  setIsCreatingFile(true);
                }}
                title="New File Inside"
                className="p-0.5 hover:text-white text-zinc-400"
              >
                <FilePlus className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => handleStartRename(e, node)}
              title="Rename"
              className="p-0.5 hover:text-white text-zinc-400"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingNode(node);
              }}
              title="Delete"
              className="p-0.5 hover:text-red-400 text-zinc-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Render Folder Children */}
        {isFolder && isExpanded && childrenMap[node.id] && (
          <div>
            {childrenMap[node.id].map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#13151b] border-r border-[#242833] select-none text-[#9ca3af]">
      {/* Explorer Header */}
      <div className="px-3 py-2 border-b border-[#242833] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#a3e635]" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#f3f4f6]">
            Workspace
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveParentFolderId(null);
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
            }}
            title="New File"
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#1e2129] rounded"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveParentFolderId(null);
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
            }}
            title="New Folder"
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#1e2129] rounded"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery((prev) => (prev ? '' : ' '))}
            title="Filter Files"
            className={cn(
              'p-1 text-zinc-400 hover:text-white hover:bg-[#1e2129] rounded',
              searchQuery && 'text-[#a3e635] bg-[#1e2129]'
            )}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Search / Filter Bar */}
      {searchQuery !== '' && (
        <div className="p-2 border-b border-[#242833] flex items-center gap-1.5 bg-[#0e1015]">
          <Search className="w-3 h-3 text-zinc-500 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Filter files..."
            value={searchQuery.trimStart()}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
          />
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Inline Create Input */}
      {(isCreatingFile || isCreatingFolder) && (
        <form onSubmit={handleCreateSubmit} className="p-2 bg-[#0e1015] border-b border-[#242833]">
          <div className="flex items-center gap-1.5">
            {isCreatingFile ? (
              <FilePlus className="w-3.5 h-3.5 text-[#a3e635]" />
            ) : (
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            )}
            <input
              type="text"
              autoFocus
              placeholder={isCreatingFile ? 'filename.py' : 'folder name'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsCreatingFile(false);
                  setIsCreatingFolder(false);
                  setNewItemName('');
                }
              }}
              className="bg-[#141720] border border-[#374151] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-[#a3e635] w-full font-mono"
            />
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 pl-5">
            Press <kbd className="font-mono text-zinc-400">Enter</kbd> to create, <kbd className="font-mono text-zinc-400">Esc</kbd> to cancel
          </div>
        </form>
      )}

      {/* Files Tree Area */}
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {rootNodes.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-zinc-500">
            No files in workspace.<br />Click the icon above to create one.
          </div>
        ) : (
          rootNodes.map((node) => renderNode(node, 0))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingNode} onOpenChange={(open) => !open && setDeletingNode(null)}>
        <DialogContent className="bg-[#181b22] border-[#242833] text-[#f3f4f6] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base text-red-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Delete {deletingNode?.type === 'folder' ? 'Folder' : 'File'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 pt-1">
              Are you sure you want to delete <span className="text-white font-mono font-medium">{deletingNode?.name}</span>?
              {deletingNode?.type === 'folder' && ' All contents inside this folder will also be permanently deleted.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingNode(null)}
              className="border-zinc-700 hover:bg-zinc-800 text-xs h-7"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-xs h-7"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
