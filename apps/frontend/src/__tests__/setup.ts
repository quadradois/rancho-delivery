import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup após cada teste
afterEach(() => {
  cleanup();
});

// Mock do console para evitar poluição nos logs de teste
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
