import React from 'react';

export function ActivityHeatmap() {
  const levels = ['bg-zinc-800', 'bg-indigo-900/60', 'bg-indigo-700/80', 'bg-indigo-500', 'bg-indigo-400'];
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-col gap-1 min-w-fit">
        {Array.from({ length: 7 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {Array.from({ length: 5 }).map((_, colIndex) => {
              const level = Math.floor(Math.random() * 5);
              return (
                <div 
                  key={`${rowIndex}-${colIndex}`} 
                  className={`w-4 h-4 rounded-sm ${levels[level]} hover:ring-1 ring-zinc-400 transition-all cursor-pointer`}
                  title="3 contributions"
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
