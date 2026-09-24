'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, HardDrive, AlertCircle, Zap } from 'lucide-react';

interface ComplexityDisplayProps {
  timeComplexity: string;
  spaceComplexity: string;
  timeExplanation: string;
  spaceExplanation: string;
  confidence: string;
  canOptimize?: boolean;
  optimizationHint?: string;
}

export function ComplexityDisplay({
  timeComplexity,
  spaceComplexity,
  timeExplanation,
  spaceExplanation,
  confidence,
  canOptimize,
  optimizationHint
}: ComplexityDisplayProps) {
  
  const getConfidenceColor = (conf: string) => {
    switch (conf.toLowerCase()) {
      case 'high': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'low': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Time Complexity Card */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-indigo-400" />
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Time
            </h3>
            <Badge variant="outline" className={`capitalize text-xs ${getConfidenceColor(confidence)}`}>
              {confidence} conf
            </Badge>
          </div>
          
          <div className="font-mono text-3xl font-bold text-zinc-100 mb-3 tracking-tighter">
            {timeComplexity}
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed">
            {timeExplanation}
          </p>
        </Card>

        {/* Space Complexity Card */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <HardDrive className="w-16 h-16 text-blue-400" />
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Space
            </h3>
          </div>
          
          <div className="font-mono text-3xl font-bold text-zinc-100 mb-3 tracking-tighter">
            {spaceComplexity}
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed">
            {spaceExplanation}
          </p>
        </Card>
      </div>

      {canOptimize && optimizationHint && (
        <Card className="bg-amber-500/5 border-amber-500/20 p-3 flex gap-3 items-start">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-500 mb-1">Optimization Possible</h4>
            <p className="text-xs text-amber-500/80">{optimizationHint}</p>
          </div>
        </Card>
      )}

      <div className="text-center">
        <span className="text-[10px] text-zinc-500 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          This is an AI estimate, not a mathematical proof
        </span>
      </div>
    </div>
  );
}
