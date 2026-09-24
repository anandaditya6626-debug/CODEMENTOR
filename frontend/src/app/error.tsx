'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error to console
    console.error('Unhandled App Error:', error);
  }, [error]);

  const handleResetWorkspace = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('codementor-workspace-v3');
      }
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  const handleReload = () => {
    try {
      reset();
    } catch {
      // fallback
    }
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center space-y-6 backdrop-blur-sm shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto rotate-12 transition-transform hover:rotate-0 duration-300">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100">Something went wrong</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The studio encountered an unexpected error. You can retry, reload, or reset the local workspace cache.
          </p>
        </div>

        {error?.message && (
          <div className="text-left bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 text-xs">
            <button
              type="button"
              onClick={() => setShowDetails((p) => !p)}
              className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
            >
              <span>Error Details</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showDetails && (
              <div className="mt-2 pt-2 border-t border-zinc-800 text-rose-400 font-mono text-[11px] break-words whitespace-pre-wrap select-text max-h-40 overflow-y-auto">
                {error.message}
                {error.digest && <div className="text-zinc-500 mt-1">Digest: {error.digest}</div>}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2">
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleReload}
              className="flex-1 px-4 py-2.5 bg-[#a3e635] hover:bg-[#bef264] text-[#0e1015] rounded-xl transition-colors font-semibold text-xs flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Studio
            </button>
            <button
              onClick={handleResetWorkspace}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-colors font-medium text-xs flex items-center justify-center gap-2"
              title="Clears saved editor tabs & state if corrupted"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              Reset Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
