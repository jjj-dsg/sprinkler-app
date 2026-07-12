import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  initBilling,
  getNativeOffering,
  purchaseNative,
  restoreNative,
  isNativeEntitlementActive,
} from '../billing';

type WithCapacitor = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

describe('billing', () => {
  afterEach(() => {
    delete (window as WithCapacitor).Capacitor;
  });

  describe('when not native (window.Capacitor absent)', () => {
    it('initBilling resolves without error', async () => {
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

  describe('when native (plugin unavailable / degrades gracefully)', () => {
    beforeEach(() => {
      (window as WithCapacitor).Capacitor = {
        isNativePlatform: () => true,
      };
    });

    it('initBilling resolves without throwing', async () => {
      await expect(initBilling()).resolves.toBeUndefined();
    });

    it('getNativeOffering resolves to null', async () => {
      await expect(getNativeOffering()).resolves.toBeNull();
    });

    it('purchaseNative resolves to false', async () => {
      await expect(purchaseNative()).resolves.toBe(false);
    });

    it('restoreNative resolves to false', async () => {
      await expect(restoreNative()).resolves.toBe(false);
    });

    it('isNativeEntitlementActive resolves to false', async () => {
      await expect(isNativeEntitlementActive()).resolves.toBe(false);
    });
  });
});
