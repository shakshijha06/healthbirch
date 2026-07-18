import React from 'react';

export const Input = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="w-full mb-4">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-500' : 'border-slate-200'} bg-white text-slate-900 placeholder:text-slate-400 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
