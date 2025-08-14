'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, FileText, Sparkles, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ProgressEvent {
  type: 'progress' | 'error' | 'complete';
  phase: 'chunking' | 'processing' | 'completed' | 'waiting' | 'merging';
  message: string;
  totalChunks?: number;
  currentChunk?: number;
  progress?: number;
  cardsInChunk?: number;
  waitTime?: number;
  data?: any;
  details?: any;
}

interface Phase2ProgressProps {
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  markdown: string;
}

export function Phase2Progress({ onComplete, onError, markdown }: Phase2ProgressProps) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<ProgressEvent | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource('/api/phase2', {
      // This doesn't work with POST, so we'll use fetch with streaming instead
    });

    // Actually, let's use fetch with streaming
    const startStreaming = async () => {
      try {
        const response = await fetch('/api/phase2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rawContext: markdown,
            stream: true,
          }),
        });

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as ProgressEvent;
                setEvents(prev => [...prev, event]);
                setCurrentEvent(event);

                if (event.type === 'complete') {
                  setIsComplete(true);
                  setTotalCards(event.data?.card_count || 0);
                  onComplete?.(event.data);
                } else if (event.type === 'error') {
                  onError?.(event.message);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      } catch (error: any) {
        onError?.(error.message);
      }
    };

    startStreaming();
  }, [markdown, onComplete, onError]);

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'chunking':
        return <FileText className="w-5 h-5" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'waiting':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'merging':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'chunking':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-orange-500';
      case 'completed':
        return 'bg-green-500';
      case 'waiting':
        return 'bg-yellow-500';
      case 'merging':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 border rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-slate-200"
        >
          <Sparkles className="w-6 h-6 text-blue-500" />
          Phase 2: Generating Guru Cards
        </motion.div>
        {currentEvent?.totalChunks && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Processing {currentEvent.totalChunks} chunks
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {currentEvent && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>Progress</span>
            <span>{currentEvent.progress || 0}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-full ${getPhaseColor(currentEvent.phase)} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${currentEvent.progress || 0}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Current Status */}
      {currentEvent && (
        <motion.div
          key={`current-${events.length}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-3">
            {getPhaseIcon(currentEvent.phase)}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {currentEvent.message}
              </p>
              {currentEvent.cardsInChunk && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  +{currentEvent.cardsInChunk} cards generated
                </p>
              )}
            </div>
            {currentEvent.currentChunk && currentEvent.totalChunks && (
              <div className="text-right">
                <div className="text-sm font-mono text-slate-600 dark:text-slate-300">
                  {currentEvent.currentChunk}/{currentEvent.totalChunks}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  chunks
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Chunk Timeline */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Processing Timeline
        </h3>
        <div className="max-h-48 overflow-y-auto space-y-2">
          <AnimatePresence>
            {events.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                  event.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex-shrink-0">
                  {event.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    getPhaseIcon(event.phase)
                  )}
                </div>
                <div className="flex-1">
                  <p>{event.message}</p>
                  {event.cardsInChunk && (
                    <div className="flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400">
                        +{event.cardsInChunk} cards
                      </span>
                    </div>
                  )}
                </div>
                {event.currentChunk && event.totalChunks && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {event.currentChunk}/{event.totalChunks}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Completion Summary */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">
                Processing Complete!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Successfully generated {totalCards} Guru cards
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Waiting Timer */}
      {currentEvent?.phase === 'waiting' && currentEvent.waitTime && (
        <WaitingTimer waitTime={currentEvent.waitTime} />
      )}
    </div>
  );
}

function WaitingTimer({ waitTime }: { waitTime: number }) {
  const [timeLeft, setTimeLeft] = useState(waitTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
    >
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-yellow-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Rate Limit Cooldown
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Waiting to respect API limits...
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono text-yellow-700 dark:text-yellow-300">
            {timeLeft}s
          </div>
          <div className="w-16 bg-yellow-200 dark:bg-yellow-800 rounded-full h-1">
            <motion.div
              className="h-full bg-yellow-500 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / waitTime) * 100}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
