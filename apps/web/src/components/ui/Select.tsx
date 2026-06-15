import type { SelectHTMLAttributes, ReactNode } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
  leftIcon?: ReactNode;
}

export default function Select({ label, error, options, placeholder, leftIcon, className = '', id, ...rest }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="form-group">
      {label && <label htmlFor={selectId} className="form-label">{label}</label>}
      <div className="input-wrapper">
        {leftIcon && <span className="input-icon">{leftIcon}</span>}
        <select
          id={selectId}
          className={`form-select ${leftIcon ? 'has-icon' : ''} ${error ? 'is-error' : ''} ${className}`}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
