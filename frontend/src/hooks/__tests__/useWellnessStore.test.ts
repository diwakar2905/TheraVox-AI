import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useWellnessStore } from '../useWellnessStore';

describe('useWellnessStore', () => {
  it('adds and clears wellness entries', () => {
    const { result } = renderHook(() => useWellnessStore());

    act(() => {
      result.current.addEntry({
        id: '1',
        type: 'journal',
        content: 'Gratitude journal entry',
        moodRating: 5,
        createdAt: new Date().toISOString(),
      });
    });

    expect(result.current.entries.length).toBeGreaterThanOrEqual(1);

    act(() => {
      result.current.clearEntries();
    });

    expect(result.current.entries.length).toBe(0);
  });
});
