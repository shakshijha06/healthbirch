import React from 'react';

export const Badge = ({ children, variant = 'routine', className = '' }) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';
  
  const variants = {
    routine: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    urgent: 'bg-amber-100 text-amber-700 border border-amber-200 relative',
    emergency: 'bg-red-100 text-red-700 border border-red-200 animate-pulse',
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-500 line-through',
    specialty: 'bg-primary-light text-primary text-xs font-semibold px-3 py-1',
    day: 'bg-slate-100 text-slate-600 text-xs px-2.5 py-1 font-medium',
  };

  const selectedVariant = variants[variant] || variants.routine;

  return (
    <span className={`${baseClasses} ${selectedVariant} ${className}`}>
      {variant === 'urgent' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1.5" />}
      {children}
    </span>
  );
};
