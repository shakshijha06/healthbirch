import React from 'react'; // Import React to define a reusable button component.

export const Button = ({ children, variant = 'primary', className = '', ...props }) => { // Declare configurable Button component with variant support.
  const baseClasses = 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:ring-offset-2 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95'; // Define shared classes for accessibility, layout, and press animation.
  const variants = { // Define variant class map to enforce consistent design language.
    primary: 'bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm hover:opacity-90', // Provide filled indigo rounded-full button style.
    secondary: 'border border-primary bg-white text-primary font-semibold text-sm px-5 py-2.5 rounded-full hover:opacity-90', // Provide outlined indigo rounded-full button style.
    danger: 'bg-danger text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm hover:opacity-90', // Provide rounded-full danger variant for destructive actions.
    ghost: 'text-slate-600 hover:bg-gray-50 font-medium text-sm px-4 py-2.5 rounded-full', // Provide subtle rounded ghost variant for low-emphasis actions.
  }; // Close variants map.
  const selectedVariant = variants[variant] || variants.primary; // Resolve the final style variant with primary fallback safety.
  return ( // Return the styled native button element.
    <button className={`${baseClasses} ${selectedVariant} ${className}`} {...props}> {/* Merge base, variant, and caller classes with forwarded props. */}
      {children} {/* Render button content passed by parent components. */}
    </button> // Close button element.
  ); // Close JSX return.
}; // Close Button component.
