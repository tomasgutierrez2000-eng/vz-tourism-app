'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingFABProps {
  onClick: () => void;
  visible: boolean;
  saving?: boolean;
  saved?: boolean;
  className?: string;
}

export function FloatingFAB({ onClick, visible, saving, saved, className }: FloatingFABProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={onClick}
          disabled={saving}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full shadow-2xl',
            'flex items-center justify-center',
            'transition-colors',
            saved
              ? 'bg-green-500 text-white'
              : 'bg-sky-500 hover:bg-sky-600 text-white',
            saving && 'opacity-80',
            className
          )}
          aria-label={saving ? 'Saving changes' : saved ? 'Changes saved' : 'Save changes'}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              <Check className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
