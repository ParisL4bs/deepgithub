"use client";

import React from 'react';
import { BoardColumn } from './board-column';
import { mockColumns } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Plus, Users, Star, Shield, Zap } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function TrelloBoard() {
  const teamMembers = [
    { name: 'Alice', initials: 'AJ', color: 'bg-blue-500' },
    { name: 'Bob', initials: 'BS', color: 'bg-green-500' },
    { name: 'Carol', initials: 'CD', color: 'bg-purple-500' },
    { name: 'David', initials: 'DW', color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400">
      {/* Header */}
      <header className="bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">A</span>
                </div>
                Project Team Spirit
              </h1>
              <Star className="w-5 h-5 text-yellow-300 fill-current" />
              <Shield className="w-5 h-5 text-white/70" />
              <span className="text-white/90 text-sm">Acme, Inc.</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Team Members */}
              <div className="flex -space-x-2">
                {teamMembers.map((member, index) => (
                  <Avatar key={index} className="w-8 h-8 border-2 border-white">
                    <AvatarFallback className={`text-white text-xs font-medium ${member.color}`}>
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
                <Button
                  size="sm"
                  className="w-8 h-8 p-0 rounded-full bg-white/20 hover:bg-white/30 border-2 border-white text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Button
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Users className="w-4 h-4 mr-2" />
                Invite
              </Button>

              <Button
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                variant="outline"
              >
                <Zap className="w-4 h-4 mr-2" />
                +12
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <main className="p-6">
        <div className="flex gap-6 overflow-x-auto pb-4">
          {mockColumns.map((column) => (
            <BoardColumn key={column.id} column={column} />
          ))}
          
          {/* Add Another List Button */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              className="w-80 h-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add another list
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
} 