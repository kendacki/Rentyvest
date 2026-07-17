'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export const GlassInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function GlassInput({ className = '', ...props }, ref) {
    return (
      <div className="glass-field mt-1.5">
        <input ref={ref} className={`glass-field-control ${className}`} {...props} />
      </div>
    );
  },
);

export const GlassTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function GlassTextarea({ className = '', ...props }, ref) {
  return (
    <div className="glass-field mt-1.5">
      <textarea ref={ref} className={`glass-field-textarea ${className}`} {...props} />
    </div>
  );
});

type GlassSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
};

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(function GlassSelect(
  { className = '', options, children, ...props },
  ref,
) {
  return (
    <div className="glass-field relative mt-1.5">
      <select
        ref={ref}
        className={`glass-field-control appearance-none pr-10 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <SelectChevron />
    </div>
  );
});
