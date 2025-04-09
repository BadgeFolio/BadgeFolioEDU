'use client';

import React from 'react';
import clsx from 'clsx';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  className?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  function Table({ className, ...props }, ref) {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={clsx(
            "w-full caption-bottom text-sm",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  function TableHeader({ className, ...props }, ref) {
    return (
      <thead
        ref={ref}
        className={clsx(
          "bg-gray-50 dark:bg-gray-700",
          className
        )}
        {...props}
      />
    );
  }
);

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody({ className, ...props }, ref) {
    return (
      <tbody
        ref={ref}
        className={clsx(
          "divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800",
          className
        )}
        {...props}
      />
    );
  }
);

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ className, ...props }, ref) {
    return (
      <tr
        ref={ref}
        className={clsx(
          "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell({ className, ...props }, ref) {
    return (
      <td
        ref={ref}
        className={clsx(
          "px-6 py-4 align-middle",
          className
        )}
        {...props}
      />
    );
  }
);

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  function TableHead({ className, ...props }, ref) {
    return (
      <th
        ref={ref}
        className={clsx(
          "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
          className
        )}
        {...props}
      />
    );
  }
); 