import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual role. Use one primary button per view. */
  variant?: 'primary' | 'secondary' | 'danger';
}

/** A button that triggers one action. Use a single primary button per view. */
export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`fn-btn fn-btn--${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
