import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export default function Input({ label, error, hint, leftIcon, className = '', id, ...rest }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="form-group">
      {label && <label htmlFor={inputId} className="form-label">{label}</label>}
      <div className="input-wrapper">
        {leftIcon && <span className="input-icon">{leftIcon}</span>}
        <input
          id={inputId}
          className={`form-input ${leftIcon ? 'has-icon' : ''} ${error ? 'is-error' : ''} ${className}`}
          {...rest}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
}
