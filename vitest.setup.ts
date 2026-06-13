import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock Leaflet
vi.stubGlobal('L', {
  map: vi.fn(() => ({
    setView: vi.fn(() => ({ invalidateSize: vi.fn() })),
    addTo: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  layerGroup: vi.fn(() => ({ addTo: vi.fn() })),
});
