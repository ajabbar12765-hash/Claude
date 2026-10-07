import * as React from 'react';

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visible label above the input. */
  label: string;
  /** Helper text, or the error message when `error` is set. */
  hint?: string;
  /** Marks the field invalid and colors the hint as an error. */
  error?: boolean;
}

/** A labelled single-line text input with helper or error text. */
export function TextField({ label, hint, error = false, id, ...rest }: TextFieldProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={`fn-field${error ? ' fn-field--error' : ''}`}>
      <label className="fn-field__label" htmlFor={inputId}>{label}</label>
      <input id={inputId} className="fn-field__input" aria-invalid={error || undefined} {...rest} />
      {hint ? <span className="fn-field__hint">{hint}</span> : null}
    </div>
  );
}
