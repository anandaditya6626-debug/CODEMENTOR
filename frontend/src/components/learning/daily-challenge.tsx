'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DailyChallenge } from '@/lib/learning-api';
import { Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DailyChallengeProps {
  challenge: DailyChallenge | null;
}

export function DailyChallengeWidget({ challenge }: DailyChallengeProps) {
  if (!challenge) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 text-center">
          <p className="text-zinc-400">No challenge today. Take a break!</p>
        </CardContent>
      </Card>
    );
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'medium': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'hard': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/10';
    }
  };

  return (
    <Card className="relative overflow-hidden bg-zinc-900 border-zinc-800 before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-indigo-500/10 before:to-blue-500/10 border-t-2 border-t-indigo-500">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <Target className="w-5 h-5" />
            <span>Daily Challenge</span>
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            {new Date(challenge.challenge_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 line-clamp-1">{challenge.problem.title}</h3>
            <div className="mt-2">
              <Badge variant="outline" className={getDifficultyColor(challenge.problem.difficulty)}>
                {challenge.problem.difficulty}
              </Badge>
            </div>
          </div>

          <Link href={`/solve/${challenge.problem.slug}`} className="block w-full">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2">
              Solve Now <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
