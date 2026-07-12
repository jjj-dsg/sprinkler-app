import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Separate file so this module-level mock doesn't affect billing.test.ts's
// "plugin genuinely unavailable" tests (each test file gets its own module
// registry in Vitest, so the two suites can't interfere with each other).
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: vi.fn().mockResolvedValue(undefined),
    getOfferings: vi.fn().mockResolvedValue({
      current: {
        identifier: 'sprinkler_default',
        availablePackages: [
          {
            identifier: '$rc_lifetime',
            product: { identifier: 'com.desertservicesgroup.sprinklersmart.proplan', priceString: '$19.00' },
          },
        ],
      },
    }),
    purchasePackage: vi.fn().mockResolvedValue({
      customerInfo: { entitlements: { active: { sprinkler_pro: {} } } },
    }),
    restorePurchases: vi.fn().mockResolvedValue({
      customerInfo: { entitlements: { active: { sprinkler_pro: {} } } },
    }),
    getCustomerInfo: vi.fn().mockResolvedValue({
      customerInfo: { entitlements: { active: {} } }, // not entitled — exercises the "false" branch too
    }),
  },
}));

import {
  initBilling,
  getNativeOffering,
  purchaseNative,
  restoreNative,
  isNativeEntitlementActive,
} from '../billing';

type WithCapacitor = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

describe('billing (native, plugin loads and succeeds)', () => {
  beforeEach(() => {
    (window as WithCapacitor).Capacitor = { isNativePlatform: () => true };
    vi.stubEnv('VITE_REVENUECAT_IOS_KEY', 'appl_test_key');
  });

  afterEach(() => {
    delete (window as WithCapacitor).Capacitor;
    vi.unstubAllEnvs();
  });

  it('initBilling configures the SDK once', async () => {
    await expect(initBilling()).resolves.toBeUndefined();
  });

  it('getNativeOffering returns the $rc_lifetime package', async () => {
    const pkg = await getNativeOffering();
    expect(pkg?.identifier).toBe('$rc_lifetime');
    expect(pkg?.product.identifier).toBe('com.desertservicesgroup.sprinklersmart.proplan');
  });

  it('purchaseNative returns true when the entitlement comes back active', async () => {
    await expect(purchaseNative()).resolves.toBe(true);
  });

  it('restoreNative returns true when the entitlement comes back active', async () => {
    await expect(restoreNative()).resolves.toBe(true);
  });

  it('isNativeEntitlementActive returns false when the entitlement is not in the active set', async () => {
    await expect(isNativeEntitlementActive()).resolves.toBe(false);
  });
});
