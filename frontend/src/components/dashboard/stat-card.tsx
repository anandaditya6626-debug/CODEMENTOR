import React from 'react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 p-6 hover:bg-zinc-900/80 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </Card>
  );
}
