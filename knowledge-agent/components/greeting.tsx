import { motion } from 'framer-motion';
import { PhaseSelection } from './phases/phase-selection';

export const Greeting = ({
  onSelectPhase,
}: {
  onSelectPhase?: (phase: 'phase-1' | 'phase-2' | 'phase-3') => void;
}) => {
  // If phase selection is needed, use the dedicated component
  if (onSelectPhase) {
    return <PhaseSelection onSelectPhase={onSelectPhase} />;
  }

  // Otherwise show simple welcome message
  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center gap-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-xl md:text-2xl font-semibold"
      >
        Welcome to the Peak Knowledge System
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-base md:text-lg text-zinc-500"
      >
        Your intelligent documentation generation assistant.
      </motion.div>
    </div>
  );
};
