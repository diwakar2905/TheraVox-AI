import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCamera } from '../useCamera';

describe('useCamera', () => {
  it('initializes with active camera state off', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.isCameraActive).toBe(false);
  });

  it('toggles camera state', async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isCameraActive).toBe(true);

    act(() => {
      result.current.stopCamera();
    });

    expect(result.current.isCameraActive).toBe(false);
  });
});
