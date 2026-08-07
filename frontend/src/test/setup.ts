import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock MediaRecorder
class MockMediaRecorder {
  start = vi.fn();
  stop = vi.fn();
  ondataavailable = vi.fn();
  onstop = vi.fn();
  onerror = vi.fn();
  state = 'inactive';
}

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: MockMediaRecorder,
});

// Mock mediaDevices.getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
});
