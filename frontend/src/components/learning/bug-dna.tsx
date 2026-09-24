'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BugPattern } from '@/lib/learning-api';
import { Brain, Save, FileText, Wrench } from 'lucide-react';

interface BugDnaProps {
  patterns: BugPattern[];
}

export function BugDna({ patterns }: BugDnaProps) {
  const sortedPatterns = [...patterns].sort((a, b) => b.occurrences - a.occurrences);
  const maxOccurrences = sortedPatterns.length > 0 ? sortedPatterns[0].occurrences : 1;

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'logic': return <Brain className="w-5 h-5 text-purple-400" />;
      case 'memory': return <Save className="w-5 h-5 text-blue-400" />;
      case 'syntax': return <FileText className="w-5 h-5 text-emerald-400" />;
      default: return <Wrench className="w-5 h-5 text-zinc-400" />;
    }
  };

  const formatBugName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (patterns.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Bug DNA 🧬</CardTitle>
          <CardDescription>Your recurring bug patterns</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-zinc-400">No bug patterns detected yet. Keep coding!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Bug DNA 🧬</CardTitle>
        <CardDescription>Your recurring bug patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedPatterns.map(pattern => (
          <div key={pattern.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 p-2 rounded-md border border-zinc-800">
                  {getCategoryIcon(pattern.category)}
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-200">{formatBugName(pattern.bug_type)}</h4>
                  <p className="text-xs text-zinc-500">{pattern.description}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs uppercase bg-zinc-900">{pattern.category}</Badge>
            </div>
            
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Frequency: {pattern.occurrences} times</span>
                {pattern.last_occurred && <span>Last: {new Date(pattern.last_occurred).toLocaleDateString()}</span>}
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full" 
                  style={{ width: `${(pattern.occurrences / maxOccurrences) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
