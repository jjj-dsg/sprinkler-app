import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Separate file (own module registry) — the mock factory itself throws, simulating the
// RevenueCat native module failing to load entirely (missing/broken plugin in the native
// shell), distinct from the "loads but an individual call rejects" suite. Every billing
// entry point must still degrade to "not entitled" / no-op rather than throw.
vi.mock('@revenuecat/purchases-capacitor', () => {
  throw new Error('native module unavailable');
});

import { initBilling, getNativeOffering, purchaseNative, restoreNative, isNativeEntitlementActive } from '../billing';

type WithCapacitor = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

describe('billing (native, plugin fails to load at all)', () => {
  beforeEach(() => {
    (window as WithCapacitor).Capacitor = { isNativePlatform: () => true };
    vi.stubEnv('VITE_REVENUECAT_IOS_KEY', 'appl_test_key');
  });

  afterEach(() => {
    delete (window as WithCapacitor).Capacitor;
    vi.unstubAllEnvs();
  });

  it('initBilling resolves without throwing', async () => {
    await expect(initBilling()).resolves.toBeUndefined();
  });

  it('getNativeOffering returns null', async () => {
    await expect(getNativeOffering()).resolves.toBeNull();
  });

  it('purchaseNative returns false', async () => {
    await expect(purchaseNative()).resolves.toBe(false);
  });

  it('restoreNative returns false', async () => {
    await expect(restoreNative()).resolves.toBe(false);
  });

  it('isNativeEntitlementActive returns false', async () => {
    await expect(isNativeEntitlementActive()).resolves.toBe(false);
  });
});
