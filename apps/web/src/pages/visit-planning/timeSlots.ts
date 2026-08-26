/**
 * The next free hour, so adding several points of sale stays quick.
 *
 * Lives apart from the components that use it: a module that exports both a
 * component and a plain function breaks fast refresh.
 */
export function nextFreeTime(taken: string[]): string {
  for (let h = 8; h <= 20; h++) {
    const slot = `${String(h).padStart(2, '0')}:00`;
    if (!taken.includes(slot)) return slot;
  }
  return '';
}
