"use client";

import { useId, type ReactNode } from "react";

/** Small form pieces used by the wizard. Every input has a visible label. */

export function Fieldset({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="panel min-w-0 space-y-4">
      <legend className="float-left mb-2 w-full">
        <span className="label block">{step}</span>
        <span className="mt-1 block font-mono text-lg font-semibold text-text">{title}</span>
      </legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  testId?: string;
};

function Counter({ value, maxLength }: { value: string; maxLength?: number }) {
  if (!maxLength) return null;
  return (
    <span className="font-mono text-xs text-muted" aria-hidden="true">
      {value.length}/{maxLength}
    </span>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  required,
  maxLength,
  placeholder,
  testId,
  type = "text",
  mono,
}: FieldProps & { type?: "text" | "url"; mono?: boolean }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label} {!required && <span className="font-normal text-muted">(optional)</span>}
        </label>
        <Counter value={value} maxLength={maxLength} />
      </div>
      <input
        id={id}
        type={type}
        inputMode={type === "url" ? "url" : undefined}
        className={`input mt-1 ${mono ? "font-mono text-sm" : ""}`}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        spellCheck={type === "url" || mono ? false : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && (
        <p id={`${id}-hint`} className="note mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  required,
  maxLength,
  placeholder,
  testId,
  rows = 4,
}: FieldProps & { rows?: number }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label} {!required && <span className="font-normal text-muted">(optional)</span>}
        </label>
        <Counter value={value} maxLength={maxLength} />
      </div>
      <textarea
        id={id}
        className="input mt-1"
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && (
        <p id={`${id}-hint`} className="note mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Shows how much of the size limit an encoded string uses. */
export function SizeMeter({ used, limit, label }: { used: number; limit: number; label: string }) {
  const id = useId();
  const percent = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <label htmlFor={id} className="text-muted">
          {label}
        </label>
        <span className="font-mono text-text">
          {used.toLocaleString("en-US")} of {limit.toLocaleString("en-US")} characters ({percent}%)
        </span>
      </div>
      <progress id={id} className="mt-1 h-2 w-full accent-(--accent)" max={limit} value={Math.min(used, limit)} />
    </div>
  );
}
