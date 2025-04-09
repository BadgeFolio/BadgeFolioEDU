'use client';

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'left', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setOpen(!open)}>
        {trigger}
      </div>

      {open && (
        <div
          className={clsx(
            "origin-top-right absolute z-50 mt-2 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none",
            align === 'left' ? 'left-0' : 'right-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItems({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("py-1", className)} role="menu" aria-orientation="vertical">
      {children}
    </div>
  );
}

export function DropdownMenuItem({ 
  className,
  children,
  onClick,
  disabled = false
}: { 
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={clsx(
        "w-full text-left block px-4 py-2 text-sm",
        disabled ? 
          "text-gray-400 dark:text-gray-500 cursor-not-allowed" : 
          "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
    >
      {children}
    </button>
  );
} 