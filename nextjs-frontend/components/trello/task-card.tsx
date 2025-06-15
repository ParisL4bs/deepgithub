"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TaskCard as TaskCardType } from '@/lib/types';
import { Calendar, MessageCircle, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  card: TaskCardType;
  className?: string;
}

export function TaskCard({ card, className }: TaskCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Card className={cn("w-full mb-3 cursor-pointer hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        {/* Cover Image Area */}
        {card.id === '1' && (
          <div className="w-full h-24 mb-3 rounded-md bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/40"></div>
            </div>
          </div>
        )}
        
        {/* Labels */}
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label) => (
              <div
                key={label.id}
                className={cn("h-2 w-8 rounded-full", label.color)}
                title={label.name}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 mb-2 leading-relaxed">
          {card.title}
        </h3>

        {/* Progress Bar */}
        {card.progress !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Progress</span>
              <span className="text-xs text-gray-600">{card.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={cn("h-1.5 rounded-full transition-all", getProgressColor(card.progress))}
                style={{ width: `${card.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Left side - Meta info */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {card.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(card.dueDate)}</span>
              </div>
            )}
            {card.attachments && card.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>{card.attachments}</span>
              </div>
            )}
            {card.comments && card.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span>{card.comments}</span>
              </div>
            )}
          </div>

          {/* Right side - Assignees */}
          {card.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {card.assignees.slice(0, 3).map((user, index) => (
                <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : (
                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user.initials}
                    </AvatarFallback>
                  )}
                </Avatar>
              ))}
              {card.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-gray-600">+{card.assignees.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Special completion badge for done items */}
        {card.status === 'done' && card.progress === 100 && (
          <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
            ✓ Complete
          </Badge>
        )}
      </CardContent>
    </Card>
  );
} 