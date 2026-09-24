'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { HeatmapDay } from '@/lib/analytics-api';

interface ActivityCalendarProps {
  data: HeatmapDay[];
  year?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ActivityCalendar({ data }: ActivityCalendarProps) {
  // Group data by weeks
  const weeks: HeatmapDay[][] = [];
  let maxWeek = 0;
  
  data.forEach(day => {
    if (!weeks[day.week]) {
      weeks[day.week] = new Array(7).fill(null);
    }
    weeks[day.week][day.weekday] = day;
    if (day.week > maxWeek) maxWeek = day.week;
  });

  // Ensure all weeks up to maxWeek exist
  for (let i = 0; i <= maxWeek; i++) {
    if (!weeks[i]) weeks[i] = new Array(7).fill(null);
  }

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-zinc-800/80';
    if (count <= 2) return 'bg-emerald-900/60';
    if (count <= 4) return 'bg-emerald-700/80';
    if (count <= 6) return 'bg-emerald-500';
    return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pt-5 pr-2">
          {DAYS.map((day, i) => (
            <div key={day} className="h-[12px] text-[10px] leading-[12px] text-zinc-500 font-medium">
              {i % 2 === 1 ? day : ''}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex flex-col gap-1 overflow-x-auto pb-2">
          {/* Month labels (approximate based on week index) */}
          <div className="flex gap-[3px] mb-1">
            {MONTHS.map((month, i) => (
              <div 
                key={month} 
                className="text-[11px] text-zinc-400 font-medium"
                style={{ width: `${(52 / 12) * 15}px` }}
              >
                {month}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            <TooltipProvider delayDuration={50}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <div key={`empty-${weekIndex}-${dayIndex}`} className="w-3 h-3 rounded-[2px]" />;
                    }

                    return (
                      <Tooltip key={day.date}>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "w-3 h-3 rounded-[2px] transition-all hover:ring-1 hover:ring-zinc-400 ring-offset-zinc-900 ring-offset-1 cursor-pointer",
                              getColorClass(day.count)
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-xs">
                          <p className="font-medium">{day.count} contributions</p>
                          <p className="text-zinc-400">on {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-xs text-zinc-400 mt-2">
        <span>Less</span>
        <div className="flex gap-[3px]">
          <div className="w-3 h-3 rounded-[2px] bg-zinc-800/80" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-900/60" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-700/80" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-500" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
