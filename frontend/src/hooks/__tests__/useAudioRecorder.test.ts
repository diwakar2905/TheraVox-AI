import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAudioRecorder } from '../useAudioRecorder';

describe('useAudioRecorder', () => {
  it('initializes in the idle state with no recording', () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.state).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
  });
});
