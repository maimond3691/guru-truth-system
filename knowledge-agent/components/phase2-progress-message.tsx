'use client';

import { motion } from 'framer-motion';
import { Loader2, FileText, Sparkles, CheckCircle, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Phase2ProgressMessageProps {
  text: string;
}

export function Phase2ProgressMessage({ text }: Phase2ProgressMessageProps) {
  const [progress, setProgress] = useState(0);
  const [animationPhase, setAnimationPhase] = useState('chunking');

  // Parse the message to extract progress information
  const parseProgressFromText = (text: string) => {
    // Look for progress indicators in the text
    if (text.includes('CHUNKING')) {
      setAnimationPhase('chunking');
    } else if (text.includes('PROCESSING')) {
      setAnimationPhase('processing');
    } else if (text.includes('WAITING')) {
      setAnimationPhase('waiting');
    } else if (text.includes('COMPLETE')) {
      setAnimationPhase('complete');
      setProgress(100);
    }

    // Extract numbers for progress
    const chunkMatch = text.match(/chunk (\d+)\/(\d+)/i);
    if (chunkMatch) {
      const current = parseInt(chunkMatch[1]);
      const total = parseInt(chunkMatch[2]);
      const calculatedProgress = Math.round((current / total) * 100);
      setProgress(calculatedProgress);
    }
  };

  useEffect(() => {
    parseProgressFromText(text);
  }, [text]);

  const getPhaseIcon = () => {
    switch (animationPhase) {
      case 'chunking':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;
      case 'waiting':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Zap className="w-5 h-5 text-purple-500" />;
    }
  };

  const getPhaseColor = () => {
    switch (animationPhase) {
      case 'chunking':
        return 'from-blue-500/20 to-blue-600/20 border-blue-200 dark:border-blue-800';
      case 'processing':
        return 'from-orange-500/20 to-orange-600/20 border-orange-200 dark:border-orange-800';
      case 'waiting':
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-200 dark:border-yellow-800';
      case 'complete':
        return 'from-green-500/20 to-green-600/20 border-green-200 dark:border-green-800';
      default:
        return 'from-purple-500/20 to-purple-600/20 border-purple-200 dark:border-purple-800';
    }
  };

  // Enhanced progress animation for large document processing
  if (text.includes('Large Document Detected') || text.includes('CHUNKING') || text.includes('PROCESSING') || text.includes('WAITING')) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`my-4 p-4 rounded-xl bg-gradient-to-r ${getPhaseColor()} border backdrop-blur-sm`}
      >
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ 
              rotate: animationPhase === 'processing' ? 360 : 0,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2, repeat: Infinity }
            }}
          >
            {getPhaseIcon()}
          </motion.div>
          
          <div className="flex-1 space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {text.split('\n').map((line, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-1 last:mb-0"
                >
                  {line}
                </motion.p>
              ))}
            </div>

            {/* Animated Progress Bar */}
            {progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Particle animation for processing */}
            {animationPhase === 'processing' && (
              <div className="relative h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}

            {/* Pulsing dots for waiting */}
            {animationPhase === 'waiting' && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (text.includes('ERROR')) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-4 p-4 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-200 dark:border-red-800"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div className="prose prose-sm dark:prose-invert max-w-none text-red-700 dark:text-red-300">
            {text}
          </div>
        </div>
      </motion.div>
    );
  }

  // Completion state
  if (text.includes('PROCESSING COMPLETE')) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-4 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-200 dark:border-green-800"
      >
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6 }}
          >
            <CheckCircle className="w-6 h-6 text-green-500" />
          </motion.div>
          <div className="flex-1">
            <div className="prose prose-sm dark:prose-invert max-w-none text-green-700 dark:text-green-300">
              {text}
            </div>
            {/* Confetti-like animation */}
            <div className="relative mt-2">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-green-500 rounded-full"
                  initial={{ y: 0, x: i * 20, opacity: 1 }}
                  animate={{ 
                    y: -30,
                    x: i * 20 + (Math.random() - 0.5) * 20,
                    opacity: 0,
                    scale: [1, 0.5, 0]
                  }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default enhanced formatting for Phase 2 messages
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-500 mt-0.5" />
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {text}
        </div>
      </div>
    </motion.div>
  );
}
