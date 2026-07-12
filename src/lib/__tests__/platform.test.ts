import { describe, it, expect, afterEach } from 'vitest';
import { isNativeApp } from '../platform';

type WithCapacitor = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

describe('platform', () => {
  afterEach(() => {
    delete (window as WithCapacitor).Capacitor;
  });

  it('returns false when window.Capacitor is undefined', () => {
    expect(isNativeApp()).toBe(false);
  });

  it('returns false when window.Capacitor.isNativePlatform is undefined', () => {
    (window as WithCapacitor).Capacitor = {};
    expect(isNativeApp()).toBe(false);
  });

  it('returns false when window.Capacitor.isNativePlatform() returns false', () => {
    (window as WithCapacitor).Capacitor = {
      isNativePlatform: () => false,
    };
    expect(isNativeApp()).toBe(false);
  });

  it('returns true when window.Capacitor.isNativePlatform() returns true', () => {
    (window as WithCapacitor).Capacitor = {
      isNativePlatform: () => true,
    };
    expect(isNativeApp()).toBe(true);
  });
});
