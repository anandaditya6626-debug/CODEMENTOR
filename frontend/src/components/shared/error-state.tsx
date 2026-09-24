import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  retry?: () => void;
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "An error occurred while loading this content.",
  retry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-red-500/20 bg-red-500/5 rounded-lg">
      <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-400 mb-2">{title}</h3>
      <p className="text-sm text-red-400/80 mb-6">{description}</p>
      {retry && (
        <Button onClick={retry} variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
          Try again
        </Button>
      )}
    </div>
  );
}
