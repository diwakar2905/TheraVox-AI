import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useWellnessStore } from '../useWellnessStore';

describe('useWellnessStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds and deletes journal entries', () => {
    const { result } = renderHook(() => useWellnessStore());

    act(() => {
      result.current.dispatch({
        type: 'ADD_JOURNAL_ENTRY',
        payload: { type: 'journal', content: 'Gratitude journal entry' },
      });
    });

    expect(result.current.state.journalEntries).toHaveLength(1);
    const id = result.current.state.journalEntries[0].id;

    act(() => {
      result.current.dispatch({ type: 'DELETE_JOURNAL_ENTRY', payload: id });
    });

    expect(result.current.state.journalEntries).toHaveLength(0);
  });

  it('logging a mood starts a 1-day streak', () => {
    const { result } = renderHook(() => useWellnessStore());

    act(() => {
      result.current.dispatch({ type: 'ADD_MOOD_LOG', payload: { mood: 'happy', emoji: '😄' } });
    });

    expect(result.current.state.moodLogs[0].mood).toBe('happy');
    expect(result.current.state.streak.count).toBe(1);
  });
});
