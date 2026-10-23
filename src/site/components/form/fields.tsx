import { type ReactNode, useId } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  optionalLabel?: string;
  error?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Label + control + hint/error wiring with correct aria attributes. */
export function Field({ label, hint, optionalLabel, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optionalLabel ? <span className="field__optional"> ({optionalLabel})</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface ChoiceGroupProps<T extends string> {
  legend: string;
  name: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  variant?: 'pill' | 'card';
}

/** Radio group styled as pills or large cards. Native radios keep keyboard support. */
export function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  variant = 'pill',
}: ChoiceGroupProps<T>) {
  const errorId = useId();
  return (
    <fieldset
      className={`choice choice--${variant} ${error ? 'field--invalid' : ''}`}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="field__label">{legend}</legend>
      <div className="choice__options">
        {options.map((option) => (
          <label key={option.value} className={`choice__option ${value === option.value ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.icon ? <span className="choice__icon">{option.icon}</span> : null}
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

interface StepperProps {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
  describedBy?: string;
}

export function Stepper({ id, value, min, max, onChange, format, decreaseLabel, increaseLabel, describedBy }: StepperProps) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={decreaseLabel}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <output id={id} className="stepper__value" aria-live="polite" aria-describedby={describedBy}>
        {format(value)}
      </output>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={increaseLabel}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
