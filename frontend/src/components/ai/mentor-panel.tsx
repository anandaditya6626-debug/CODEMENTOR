'use client';

import React, { useState, useRef, useEffect } from 'react';
import { aiApi, HintRequest, ExplainRequest, DebugRequest, ComplexityResult, EdgeCase, CodeReview as CodeReviewType } from '@/lib/ai-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, User, X, Zap, RefreshCw, MessageSquare, Bug, Gauge, ShieldAlert, CheckSquare, SearchCode } from 'lucide-react';
import { TypingIndicator } from './typing-indicator';
import { MarkdownRenderer } from './markdown-renderer';
import { ComplexityDisplay } from './complexity-display';
import { EdgeCaseRadar } from './edge-case-radar';
import { CodeReviewDisplay } from './code-review';
import { motion, AnimatePresence } from 'framer-motion';

interface MentorPanelProps {
  problemTitle: string;
  problemDescription: string;
  code: string;
  language: string;
  problemId?: string;
  compilerOutput?: string;
  isOpen: boolean;
  onClose: () => void;
}

type MessageType = 'hint' | 'explanation' | 'debug' | 'complexity' | 'edge_cases' | 'review' | 'error' | 'user';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  type: MessageType;
  content?: string;
  data?: any;
  level?: number;
  timestamp: Date;
}

const HINT_LEVELS = [
  { level: 1, label: 'Nudge', color: 'bg-emerald-500' },
  { level: 2, label: 'Hint', color: 'bg-blue-500' },
  { level: 3, label: 'Approach', color: 'bg-indigo-500' },
  { level: 4, label: 'Pseudocode', color: 'bg-amber-500' },
  { level: 5, label: 'Solution', color: 'bg-red-500' },
];

export function MentorPanel({
  problemTitle,
  problemDescription,
  code,
  language,
  problemId,
  compilerOutput,
  isOpen,
  onClose
}: MentorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'ai',
      type: 'hint',
      content: "Hi! I'm CodeMentor. I can help you with hints, explanations, debugging, or analyzing your code. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentHintLevel, setCurrentHintLevel] = useState(1);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiApi.getStatus().then(res => setIsAvailable(res.data.available)).catch(() => setIsAvailable(false));
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now().toString(), timestamp: new Date() }]);
  };

  const handleHint = async (level: number) => {
    if (!code.trim()) return;
    
    addMessage({ sender: 'user', type: 'user', content: `Requesting ${HINT_LEVELS[level-1].label}` });
    setIsLoading(true);
    setCurrentHintLevel(Math.max(currentHintLevel, level));
    
    try {
      const prevHints = messages.filter(m => m.type === 'hint' && m.sender === 'ai').map(m => m.content || '');
      
      const req: HintRequest = {
        problem_id: problemId,
        problem_title: problemTitle,
        problem_description: problemDescription,
        code,
        language,
        hint_level: level,
        previous_hints: prevHints
      };
      
      const res = await aiApi.getHint(req);
      addMessage({ sender: 'ai', type: 'hint', content: res.data.hint, level: res.data.level });
    } catch (error) {
      addMessage({ sender: 'ai', type: 'error', content: 'Failed to get hint. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!code.trim()) return;
    addMessage({ sender: 'user', type: 'user', content: 'Explain this code' });
    setIsLoading(true);
    
    try {
      const res = await aiApi.explainCode({ code, language, mode: 'intermediate' });
      addMessage({ sender: 'ai', type: 'explanation', content: res.data.explanation });
    } catch (error) {
      addMessage({ sender: 'ai', type: 'error', content: 'Failed to explain code.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebug = async () => {
    if (!code.trim()) return;
    addMessage({ sender: 'user', type: 'user', content: 'Debug my code' });
    setIsLoading(true);
    
    try {
      const res = await aiApi.debugCode({ code, language, error_output: compilerOutput || 'No visible errors' });
      addMessage({ sender: 'ai', type: 'debug', content: res.data.analysis });
    } catch (error) {
      addMessage({ sender: 'ai', type: 'error', content: 'Failed to debug code.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplexity = async () => {
    if (!code.trim()) return;
    addMessage({ sender: 'user', type: 'user', content: 'Analyze complexity' });
    setIsLoading(true);
    
    try {
      const res = await aiApi.analyzeComplexity({ code, language });
      addMessage({ sender: 'ai', type: 'complexity', data: res.data });
    } catch (error) {
      addMessage({ sender: 'ai', type: 'error', content: 'Failed to analyze complexity.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdgeCases = async () => {
    if (!code.trim()) return;
    addMessage({ sender: 'user', type: 'user', content: 'Detect edge cases' });
    setIsLoading(true);
    
    try {
      const res = await aiApi.detectEdgeCases({ code, language, problem_description: problemDescription });
      addMessage({ sender: 'ai', type: 'edge_cases', data: res.data.edge_cases });
    } catch (error) {
      addMessage({ sender: 'ai', type: 'error', content: 'Failed to detect edge cases.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!code.trim()) return;
    addMessage({ sender: 'user', type: 'user', content: 'Review my code' });
    setIsLoading(true);
    
    try {
      const res = await aiApi.reviewCode({ code, language, problem_context: problemTitle });
      addMessage({ sender: 'ai', type: 'review', data: res.data });
    } catch (error) {
      addMessage({ sender: 'ai', type: 'error', content: 'Failed to review code.' });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'ai',
        type: 'hint',
        content: "Chat cleared. How can I help you?",
        timestamp: new Date()
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[#13151b] border-l border-[#242833] flex flex-col shadow-2xl z-50 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[#242833] flex items-center justify-between bg-[#0e1015]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#8b5cf6]" />
          <h2 className="text-xs font-semibold text-white tracking-wide">AI Mentor &bull; Code Intelligence</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={clearChat} title="Reset Chat" className="w-7 h-7 text-zinc-400 hover:text-white hover:bg-[#181b22]">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close Mentor" className="w-7 h-7 text-zinc-400 hover:text-white hover:bg-[#181b22]">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isAvailable === false && (
        <div className="p-3 bg-amber-950/40 border-b border-amber-800/50 text-[11px] text-amber-200/90 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-medium text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Provider in Offline Mode</span>
          </div>
          <span className="text-zinc-400">
            Set <code className="text-amber-300 font-mono">GEMINI_API_KEY</code> or <code className="text-amber-300 font-mono">OPENAI_API_KEY</code> in <code className="text-zinc-300">backend/.env</code> to activate live AI responses.
          </span>
        </div>
      )}

      {/* 5-Level Progressive Hints Bar */}
      <div className="p-2.5 border-b border-[#242833] bg-[#0e1015]/60 overflow-x-auto whitespace-nowrap hide-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 pl-1">Hints:</span>
        {HINT_LEVELS.map((hint) => (
          <Button
            key={hint.level}
            variant="outline"
            size="sm"
            disabled={isLoading || !isAvailable || (hint.level > currentHintLevel + 1)}
            onClick={() => handleHint(hint.level)}
            className={`text-xs h-6 px-2.5 rounded border-[#242833] ${hint.level <= currentHintLevel ? 'bg-[#181b22] text-white border-zinc-600' : 'bg-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${hint.color}`} />
            {hint.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/50">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'user' ? (
                <div className="bg-zinc-800 text-zinc-200 text-sm py-2 px-3 rounded-2xl rounded-tr-sm max-w-[85%] border border-zinc-700/50">
                  {msg.content}
                </div>
              ) : (
                <div className="flex gap-2 max-w-[95%]">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-1 border border-indigo-500/30">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {msg.type === 'error' ? (
                      <Card className="bg-red-500/10 border-red-500/20 p-3 text-red-400 text-sm">
                        {msg.content}
                      </Card>
                    ) : msg.type === 'complexity' && msg.data ? (
                      <ComplexityDisplay {...msg.data} />
                    ) : msg.type === 'edge_cases' && msg.data ? (
                      <EdgeCaseRadar edgeCases={msg.data} />
                    ) : msg.type === 'review' && msg.data ? (
                      <CodeReviewDisplay review={msg.data} />
                    ) : (
                      <Card className="bg-zinc-900 border-zinc-800 p-3 rounded-2xl rounded-tl-sm text-zinc-200">
                        {msg.level && (
                          <Badge className={`mb-2 text-[10px] ${HINT_LEVELS[msg.level-1]?.color || 'bg-zinc-700'}`}>
                            Level {msg.level} Hint
                          </Badge>
                        )}
                        {msg.content && <MarkdownRenderer content={msg.content} />}
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%]">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-1 border border-indigo-500/30">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <Card className="bg-zinc-900 border-zinc-800 p-1 rounded-2xl rounded-tl-sm text-zinc-200 inline-block">
                <TypingIndicator />
              </Card>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900">
        <div className="grid grid-cols-4 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading || !isAvailable} 
            onClick={handleExplain}
            className="flex flex-col items-center gap-1 h-auto py-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-medium">Explain</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading || !isAvailable} 
            onClick={handleDebug}
            className="flex flex-col items-center gap-1 h-auto py-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Bug className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-medium">Debug</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading || !isAvailable} 
            onClick={handleComplexity}
            className="flex flex-col items-center gap-1 h-auto py-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-medium">Perf</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading || !isAvailable} 
            onClick={handleReview}
            className="flex flex-col items-center gap-1 h-auto py-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-medium">Review</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
