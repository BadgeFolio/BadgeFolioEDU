'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, className, ...props }, ref) {
    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          ref={ref}
          className={clsx(
            "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600",
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={props.id}
            className="ml-2 text-sm text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
); 