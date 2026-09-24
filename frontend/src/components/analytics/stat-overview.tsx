'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatOverviewProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorClass?: string;
  bgClass?: string;
}

export function StatOverview({ 
  title, 
  value, 
  icon, 
  trend, 
  trendValue, 
  colorClass = 'text-indigo-400',
  bgClass = 'from-indigo-500/10 to-transparent'
}: StatOverviewProps) {
  return (
    <Card className={cn('bg-zinc-900 border-zinc-800 overflow-hidden relative group')}>
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity', bgClass)} />
      <CardContent className="p-5 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <div className={cn('p-2 rounded-lg bg-zinc-800/50', colorClass)}>
            {icon}
          </div>
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{value}</h3>
          
          {trendValue && (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium">
              {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
              {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-400" />}
              {trend === 'neutral' && <Minus className="w-3 h-3 text-zinc-500" />}
              
              <span className={cn(
                trend === 'up' ? 'text-emerald-400' : 
                trend === 'down' ? 'text-red-400' : 
                'text-zinc-500'
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
