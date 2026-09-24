'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EdgeCase } from '@/lib/ai-api';
import { ShieldAlert, CheckCircle2, AlertTriangle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EdgeCaseRadarProps {
  edgeCases: EdgeCase[];
  onGenerateTests?: () => void;
}

export function EdgeCaseRadar({ edgeCases, onGenerateTests }: EdgeCaseRadarProps) {
  const handledCount = edgeCases.filter(ec => ec.handled).length;
  const totalCount = edgeCases.length;

  const getSeverityColor = (severity: string) => {
    switch(severity.toLowerCase()) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2 text-zinc-100 font-semibold">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          Edge Case Radar
        </div>
        <Badge variant="outline" className="bg-zinc-800/50 text-zinc-300 border-zinc-700">
          {handledCount} of {totalCount} Handled
        </Badge>
      </div>

      <div className="p-0 flex-1 overflow-y-auto max-h-[300px]">
        {edgeCases.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No edge cases detected.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/50">
            {edgeCases.map((ec, idx) => (
              <li key={idx} className="p-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {ec.handled ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-zinc-200">{ec.name}</h4>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 uppercase ${getSeverityColor(ec.severity)}`}>
                        {ec.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400">{ec.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onGenerateTests && (
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/80">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
            onClick={onGenerateTests}
          >
            <Bug className="w-3.5 h-3.5 mr-2" />
            Generate Edge Tests
          </Button>
        </div>
      )}
    </Card>
  );
}
