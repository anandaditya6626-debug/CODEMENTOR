'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CodeVersionEntry } from '@/lib/learning-api';
import { History, GitCommit, Plus, Clock, Cpu, MemoryStick } from 'lucide-react';

interface CodeTimeMachineProps {
  versions: CodeVersionEntry[];
  onSave: (code: string, lang: string, desc: string) => void;
}

export function CodeTimeMachine({ versions, onSave }: CodeTimeMachineProps) {
  const [selectedVersion, setSelectedVersion] = useState<CodeVersionEntry | null>(versions[0] || null);

  if (versions.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="text-center py-12 flex flex-col items-center justify-center space-y-4">
          <History className="w-12 h-12 text-zinc-700" />
          <div>
            <h3 className="text-lg font-medium text-zinc-300">No versions saved</h3>
            <p className="text-zinc-500 text-sm">Save your progress to track how your solution evolves.</p>
          </div>
          <Button onClick={() => onSave('// current code', 'javascript', 'Initial version')} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Save Snapshot
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1 h-[500px] flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2"><History className="w-5 h-5" /> Timeline</span>
            <Button size="sm" variant="outline" className="h-8" onClick={() => onSave('// new code', 'javascript', 'Manual save')}>
              <Plus className="w-4 h-4 mr-1" /> Save
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 pr-2 space-y-4">
          {versions.map((v, idx) => (
            <div 
              key={v.id} 
              className={`relative pl-6 py-3 cursor-pointer border-l-2 transition-colors ${selectedVersion?.id === v.id ? 'border-indigo-500' : 'border-zinc-800 hover:border-zinc-600'}`}
              onClick={() => setSelectedVersion(v)}
            >
              <div className={`absolute w-3 h-3 rounded-full -left-[7px] top-4 ${selectedVersion?.id === v.id ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm text-zinc-200">v{v.version_number}</span>
                {v.created_at && (
                  <span className="text-xs text-zinc-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> {new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2">{v.change_description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2 h-[500px] flex flex-col">
        {selectedVersion ? (
          <>
            <CardHeader className="py-3 border-b border-zinc-800 bg-zinc-950 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium text-zinc-200">Version {selectedVersion.version_number}</CardTitle>
                <CardDescription className="text-xs">{selectedVersion.change_description}</CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedVersion.time_complexity && (
                  <Badge variant="outline" className="bg-zinc-900 text-xs flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-indigo-400" /> {selectedVersion.time_complexity}
                  </Badge>
                )}
                {selectedVersion.space_complexity && (
                  <Badge variant="outline" className="bg-zinc-900 text-xs flex items-center gap-1">
                    <MemoryStick className="w-3 h-3 text-emerald-400" /> {selectedVersion.space_complexity}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden relative bg-[#1e1e1e]">
              <pre className="p-4 h-full overflow-auto text-sm font-mono text-zinc-300">
                <code>{selectedVersion.code}</code>
              </pre>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a version to view code
          </div>
        )}
      </Card>
    </div>
  );
}
