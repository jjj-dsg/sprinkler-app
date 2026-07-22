import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Separate file (own module registry, same rationale as billing-native-success.test.ts)
// so these mocks can't leak into the "plugin unavailable" or "plugin succeeds" suites.
// Covers the graceful-degradation catch paths: a native purchase/restore/config call
// that genuinely fails (store error, RC outage, etc.) must resolve to "not entitled",
// never throw and white-screen the app.
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: vi.fn(),
    getOfferings: vi.fn(),
    purchasePackage: vi.fn(),
    restorePurchases: vi.fn(),
    getCustomerInfo: vi.fn(),
  },
}));

import { Purchases } from '@revenuecat/purchases-capacitor';
import { initBilling, getNativeOffering, purchaseNative, restoreNative, isNativeEntitlementActive } from '../billing';

const rc = Purchases as unknown as {
  configure: ReturnType<typeof vi.fn>;
  getOfferings: ReturnType<typeof vi.fn>;
  purchasePackage: ReturnType<typeof vi.fn>;
  restorePurchases: ReturnType<typeof vi.fn>;
  getCustomerInfo: ReturnType<typeof vi.fn>;
};

const okOffering = {
  current: {
    identifier: 'sprinkler_default',
    availablePackages: [
      { identifier: '$rc_lifetime', product: { identifier: 'com.desertservicesgroup.sprinklersmart.proplan', priceString: '$19.00' } },
    ],
  },
};

type WithCapacitor = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

describe('billing (native, plugin loads but individual calls reject)', () => {
  beforeEach(() => {
    (window as WithCapacitor).Capacitor = { isNativePlatform: () => true };
    vi.stubEnv('VITE_REVENUECAT_IOS_KEY', 'appl_test_key');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rc.configure.mockReset();
    rc.getOfferings.mockReset().mockResolvedValue(okOffering);
    rc.purchasePackage.mockReset();
    rc.restorePurchases.mockReset();
    rc.getCustomerInfo.mockReset();
  });

  afterEach(() => {
    delete (window as WithCapacitor).Capacitor;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('initBilling swallows a configure() rejection instead of throwing', async () => {
    rc.configure.mockRejectedValue(new Error('RC configure failed'));
    await expect(initBilling()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[billing] initBilling failed', expect.any(Error));
  });

  it('getNativeOffering returns null when getOfferings() rejects', async () => {
    rc.getOfferings.mockReset().mockRejectedValue(new Error('RC getOfferings failed'));
    await expect(getNativeOffering()).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith('[billing] getNativeOffering failed', expect.any(Error));
  });

  it('purchaseNative returns false when purchasePackage() rejects (store error / cancel)', async () => {
    rc.purchasePackage.mockRejectedValue(new Error('RC purchase failed'));
    await expect(purchaseNative()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('[billing] purchaseNative failed', expect.any(Error));
  });

  it('restoreNative returns false when restorePurchases() rejects', async () => {
    rc.restorePurchases.mockRejectedValue(new Error('RC restore failed'));
    await expect(restoreNative()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('[billing] restoreNative failed', expect.any(Error));
  });

  it('isNativeEntitlementActive returns false when getCustomerInfo() rejects', async () => {
    rc.getCustomerInfo.mockRejectedValue(new Error('RC getCustomerInfo failed'));
    await expect(isNativeEntitlementActive()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('[billing] isNativeEntitlementActive failed', expect.any(Error));
  });
});
