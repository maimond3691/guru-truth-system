'use client';

import { motion } from 'framer-motion';

export interface PhaseSelectionProps {
  onSelectPhase: (phase: 'phase-1' | 'phase-2' | 'phase-3') => void;
}

export function PhaseSelection({ onSelectPhase }: PhaseSelectionProps) {
  return (
    <div
      key="phase-selection"
      className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center gap-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-xl md:text-2xl font-semibold"
      >
        Welcome to the Peak Knowledge System. What phase of documentation are you on?
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-base md:text-lg text-zinc-500 whitespace-pre-line"
      >
        {`Phase 1: Read Data Sources and Generate Raw Context File\nPhase 2: Draft Guru Cards and Refine\nPhase 3: Generate Final Guru Cards`}
      </motion.div>

      <div className="flex gap-2 pt-2">
        <button
          className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={() => onSelectPhase('phase-1')}
          type="button"
        >
          Phase 1
        </button>
        <button
          className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={() => onSelectPhase('phase-2')}
          type="button"
        >
          Phase 2
        </button>
        <button
          className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={() => onSelectPhase('phase-3')}
          type="button"
        >
          Phase 3
        </button>
      </div>
    </div>
  );
}

export default PhaseSelection;
