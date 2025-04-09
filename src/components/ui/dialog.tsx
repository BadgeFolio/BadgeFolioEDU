'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className={clsx(
          "relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto p-6",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={clsx("text-lg font-medium text-gray-900 dark:text-gray-100", className)}>
      {children}
    </h2>
  );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("mt-2 text-sm text-gray-500 dark:text-gray-400", className)}>
      {children}
    </div>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("mt-5 sm:mt-6 flex space-x-3 justify-end", className)}>
      {children}
    </div>
  );
} 