import { describe, expect, it } from 'vitest';
import { compareValues, getNextSortDirection, sortCollection } from './client-sort';

describe('client-sort utility', () => {
  interface TestItem {
    id: number;
    name: string;
    code: string;
    price: number | string;
    category?: string | null;
  }

  const sampleItems: TestItem[] = [
    { id: 1, name: 'Zebra Tool', code: 'PRD-10', price: 250, category: 'Hardware' },
    { id: 2, name: 'alpha drill', code: 'PRD-2', price: 99.5, category: 'Power Tools' },
    { id: 3, name: 'Beta Saw', code: 'PRD-1', price: '450', category: null },
    { id: 4, name: 'Alpha Cutter', code: 'PRD-20', price: 99.5, category: 'Hardware' },
    { id: 5, name: 'Omega Hammer', code: 'PRD-05', price: 0, category: '' },
  ];

  describe('getNextSortDirection', () => {
    it('cycles from unsorted (null) -> asc -> desc -> null for same column', () => {
      expect(getNextSortDirection(null, 'name', null)).toBe('asc');
      expect(getNextSortDirection('name', 'name', 'asc')).toBe('desc');
      expect(getNextSortDirection('name', 'name', 'desc')).toBeNull();
    });

    it('resets to asc when switching to a different column', () => {
      expect(getNextSortDirection('name', 'price', 'asc')).toBe('asc');
      expect(getNextSortDirection('name', 'price', 'desc')).toBe('asc');
    });
  });

  describe('compareValues', () => {
    it('compares strings case-insensitively', () => {
      expect(compareValues('apple', 'Apple')).toBe(0);
      expect(compareValues('Alpha', 'beta')).toBeLessThan(0);
      expect(compareValues('Zebra', 'alpha')).toBeGreaterThan(0);
    });

    it('compares alphanumeric strings naturally', () => {
      expect(compareValues('PRD-2', 'PRD-10')).toBeLessThan(0);
      expect(compareValues('PRD-10', 'PRD-20')).toBeLessThan(0);
    });

    it('compares numbers and numeric strings numerically', () => {
      expect(compareValues(10, 2)).toBeGreaterThan(0);
      expect(compareValues('99.5', 100)).toBeLessThan(0);
      expect(compareValues(450, '450')).toBe(0);
    });

    it('places null, undefined, and empty string at the end', () => {
      expect(compareValues('Hello', null)).toBeLessThan(0);
      expect(compareValues(null, 'Hello')).toBeGreaterThan(0);
      expect(compareValues(undefined, 'Hello')).toBeGreaterThan(0);
      expect(compareValues('', 'Hello')).toBeGreaterThan(0);
      expect(compareValues(null, null)).toBe(0);
    });
  });

  describe('sortCollection', () => {
    it('returns a new array without mutating original', () => {
      const copy = [...sampleItems];
      const sorted = sortCollection(sampleItems, 'name', 'asc');
      expect(sorted).not.toBe(sampleItems);
      expect(sampleItems).toEqual(copy);
    });

    it('restores original loaded order when direction is null', () => {
      const sorted = sortCollection(sampleItems, 'name', null);
      expect(sorted).toEqual(sampleItems);
    });

    it('sorts strings ascending case-insensitively', () => {
      const sorted = sortCollection(sampleItems, (i) => i.name, 'asc');
      expect(sorted.map((i) => i.name)).toEqual([
        'Alpha Cutter',
        'alpha drill',
        'Beta Saw',
        'Omega Hammer',
        'Zebra Tool',
      ]);
    });

    it('sorts strings descending case-insensitively', () => {
      const sorted = sortCollection(sampleItems, (i) => i.name, 'desc');
      expect(sorted.map((i) => i.name)).toEqual([
        'Zebra Tool',
        'Omega Hammer',
        'Beta Saw',
        'alpha drill',
        'Alpha Cutter',
      ]);
    });

    it('sorts numeric fields ascending and descending', () => {
      const asc = sortCollection(sampleItems, (i) => i.price, 'asc');
      expect(asc.map((i) => Number(i.price))).toEqual([0, 99.5, 99.5, 250, 450]);

      const desc = sortCollection(sampleItems, (i) => i.price, 'desc');
      expect(desc.map((i) => Number(i.price))).toEqual([450, 250, 99.5, 99.5, 0]);
    });

    it('maintains stable ordering for equal values', () => {
      // id 2 (alpha drill, 99.5) and id 4 (Alpha Cutter, 99.5)
      const asc = sortCollection(sampleItems, (i) => i.price, 'asc');
      const filtered = asc.filter((i) => Number(i.price) === 99.5);
      expect(filtered[0].id).toBe(2);
      expect(filtered[1].id).toBe(4);
    });

    it('handles null, undefined and empty values gracefully', () => {
      const sorted = sortCollection(sampleItems, (i) => i.category, 'asc');
      // Hardware (id 1, 4), Power Tools (id 2), null (id 3), empty (id 5)
      expect(sorted[0].category).toBe('Hardware');
      expect(sorted[1].category).toBe('Hardware');
      expect(sorted[2].category).toBe('Power Tools');
      // null and empty placed at end
      expect(sorted[3].category).toBeFalsy();
      expect(sorted[4].category).toBeFalsy();
    });
  });
});
