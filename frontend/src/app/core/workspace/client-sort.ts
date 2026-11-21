/**
 * Reusable client-side sorting utility for BBG records and dashboard tables.
 *
 * Guaranteed:
 * - 100% in-memory: Zero HTTP calls or API triggers.
 * - Pure & immutable: Does not mutate the source array.
 * - Strongly typed: No `any`.
 * - Stable: Preserves original relative order on equal values.
 * - Complete type support: Handles numbers, numeric strings, case-insensitive text,
 *   alphanumerics, nulls, undefined, and empty values gracefully.
 */

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState<TKey extends string = string> {
  column: TKey | null;
  direction: SortDirection;
}

export type SortValueAccessor<T> = (item: T) => unknown;

/**
 * Calculates the next sort direction following the standard 3-state cycle:
 * Unsorted (null) -> Ascending ('asc') -> Descending ('desc') -> Unsorted (null)
 */
export function getNextSortDirection(
  currentColumn: string | null,
  targetColumn: string,
  currentDirection: SortDirection,
): SortDirection {
  if (currentColumn !== targetColumn) {
    return 'asc';
  }
  switch (currentDirection) {
    case 'asc':
      return 'desc';
    case 'desc':
      return null;
    default:
      return 'asc';
  }
}

/**
 * Compare two values safely.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * Null/undefined/empty values are sorted to the end in ascending order.
 */
export function compareValues(a: unknown, b: unknown): number {
  const isNilA = a === null || a === undefined || a === '';
  const isNilB = b === null || b === undefined || b === '';

  if (isNilA && isNilB) return 0;
  if (isNilA) return 1; // nulls last
  if (isNilB) return -1; // nulls last

  // If both are numbers or numeric strings
  const numA =
    typeof a === 'number' ? a : typeof a === 'string' && a.trim() !== '' ? Number(a) : NaN;
  const numB =
    typeof b === 'number' ? b : typeof b === 'string' && b.trim() !== '' ? Number(b) : NaN;

  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numA - numB;
  }

  // String comparison (case-insensitive, alphanumeric-aware)
  const strA = String(a).trim();
  const strB = String(b).trim();
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Pure, stable sorting function for an array of items.
 *
 * @param items Original items array (will NOT be mutated)
 * @param accessor Value extractor function or property key
 * @param direction 'asc' | 'desc' | null
 * @returns A new sorted array, or a copy of the original array if direction is null
 */
export function sortCollection<T>(
  items: readonly T[],
  accessor: SortValueAccessor<T> | keyof T | null,
  direction: SortDirection,
): T[] {
  if (!direction || !accessor || items.length <= 1) {
    return [...items];
  }

  const getVal: SortValueAccessor<T> =
    typeof accessor === 'function'
      ? accessor
      : (item: T) => (item ? (item as Record<string, unknown>)[accessor as string] : undefined);

  // Map each item with its original index for stable sorting
  const indexed = items.map((item, index) => ({ item, index, val: getVal(item) }));

  indexed.sort((a, b) => {
    const diff = compareValues(a.val, b.val);
    if (diff !== 0) {
      return direction === 'asc' ? diff : -diff;
    }
    // Stable tie-breaker
    return a.index - b.index;
  });

  return indexed.map((x) => x.item);
}
