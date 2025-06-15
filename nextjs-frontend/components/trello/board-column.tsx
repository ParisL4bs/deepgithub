"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from './task-card';
import { Column } from '@/lib/types';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BoardColumnProps {
  column: Column;
  className?: string;
}

export function BoardColumn({ column, className }: BoardColumnProps) {
  const getColumnHeaderClass = (columnId: string) => {
    switch (columnId) {
      case 'todo':
        return 'text-gray-700';
      case 'doing':
        return 'text-blue-700';
      case 'done':
        return 'text-green-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className={cn("flex flex-col w-80 bg-gray-50 rounded-lg p-3", className)}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn("font-semibold text-sm", getColumnHeaderClass(column.id))}>
          {column.title}
        </h2>
        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
          {column.cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-0 min-h-[200px]">
        {column.cards.map((card) => (
          <TaskCard key={card.id} card={card} />
        ))}
      </div>

      {/* Add Card Button */}
      <Button
        variant="ghost"
        className="justify-start text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 mt-2"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add a card
      </Button>
    </div>
  );
} 