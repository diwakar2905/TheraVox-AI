import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCamera } from '../useCamera';

describe('useCamera', () => {
  it('starts uninitialized with no error', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('stopCamera is safe to call before the camera starts', () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.stopCamera();
    });
    expect(result.current.isInitialized).toBe(false);
  });
});
