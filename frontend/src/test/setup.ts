import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(globalThis, 'jest', {
  value: vi,
  configurable: true,
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  configurable: true,
});
