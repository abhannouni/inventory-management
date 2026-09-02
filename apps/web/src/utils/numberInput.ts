import type { KeyboardEvent } from 'react';

/**
 * Makes number inputs that default to `0` behave nicely: when the field's whole
 * value is a lone zero and the user types a digit, the `0` is replaced instead of
 * producing values like `05`. Works no matter where the caret sits (including
 * right after clicking into the field).
 *
 * Usage: <input type="number" onKeyDown={handleNumberInputKeyDown} ... />
 */
export function handleNumberInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!/^[0-9]$/.test(e.key)) return;

  const input = e.currentTarget;
  const value = input.value;
  // Only when the entire current content is a single zero.
  if (value !== '0') return;
  // If the user has already selected the whole thing, the browser handles it.
  if (input.selectionStart === 0 && input.selectionEnd === value.length) return;

  // Select the zero so the incoming digit overwrites it.
  input.select();
}
