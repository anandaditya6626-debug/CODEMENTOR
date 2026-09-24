import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  text?: string;
  fullPage?: boolean;
  className?: string;
}

export function Loading({ text = 'Loading...', fullPage = false, className }: LoadingProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-zinc-500", className)}>
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      {text && <p className="text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] w-full">
        {content}
      </div>
    );
  }

  return content;
}
