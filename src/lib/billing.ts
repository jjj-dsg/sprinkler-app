// Native (Capacitor iOS) billing router for the Pro Plan PDF unlock via
// RevenueCat, which wraps StoreKit — Apple requires in-app purchase inside a
// native app shell, so the web Stripe Checkout flow (unchanged, see
// ProPlanCard.tsx) can't be used there. One product, one entitlement,
// unlike a multi-tier subscription app: no PurchasePlan union needed.
//
// The RevenueCat plugin is imported DYNAMICALLY so it never lands in the web
// bundle and the web build type-checks even without the native dep installed.

import { isNativeApp } from './platform';

export interface NativePackage {
  identifier: string;
  product: {
    identifier: string;
    priceString: string;
    title?: string;
  };
}
interface RcOffering {
  identifier: string;
  availablePackages: NativePackage[];
}
interface RcOfferings {
  current: RcOffering | null;
}
interface RcEntitlements {
  active: Record<string, unknown>;
}
interface RcCustomerInfo {
  entitlements: RcEntitlements;
}
interface RcPlugin {
  configure(opts: { apiKey: string }): Promise<void>;
  getOfferings(): Promise<RcOfferings>;
  purchasePackage(opts: { aPackage: NativePackage }): Promise<{ customerInfo: RcCustomerInfo }>;
  restorePurchases(): Promise<{ customerInfo: RcCustomerInfo }>;
  getCustomerInfo(): Promise<{ customerInfo: RcCustomerInfo }>;
}

let configured = false;

/**
 * Lazy, guarded import — resolves to null if the native plugin isn't present
 * (web build) or can't load. Returns the plugin BOXED in a plain object
 * ({ plugin }) rather than directly — Capacitor's native-plugin proxy answers
 * truthy to a `.then` property access for ANY method name, so returning it
 * as the bare resolution value of an async function makes JS's promise
 * machinery mistake it for a thenable and try to call `proxy.then(...)`,
 * which throws "UNIMPLEMENTED" as an unhandled rejection that bypasses every
 * try/catch here. Boxing it in a plain object (which has no `.then`) avoids
 * the misdetection entirely.
 */
async function loadPlugin(): Promise<{ plugin: RcPlugin } | null> {
  try {
    const mod = (await import(/* @vite-ignore */ '@revenuecat/purchases-capacitor')) as {
      Purchases?: RcPlugin;
    };
    return mod.Purchases ? { plugin: mod.Purchases } : null;
  } catch {
    return null;
  }
}

function getEntitlementId(): string {
  return import.meta.env.VITE_RC_ENTITLEMENT || 'sprinkler_pro';
}

function entitledFrom(info: RcCustomerInfo | undefined): boolean {
  return !!info?.entitlements?.active?.[getEntitlementId()];
}

/**
 * Configure the RevenueCat SDK once, native only. No-op on web.
 *
 * Deliberate never-throw guard: this runs on every app load, and a billing
 * misconfiguration (missing key, plugin load failure) must degrade to
 * "purchase unavailable" rather than white-screen the whole app.
 */
export async function initBilling(): Promise<void> {
  if (!isNativeApp() || configured) return;
  try {
    const loaded = await loadPlugin();
    const apiKey = import.meta.env.VITE_REVENUECAT_IOS_KEY;
    if (!loaded || !apiKey) return;
    await loaded.plugin.configure({ apiKey });
    configured = true;
  } catch (err) {
    console.error('[billing] initBilling failed', err);
  }
}

/** The single native Pro Plan package from the sprinkler_default offering, or null. */
export async function getNativeOffering(): Promise<NativePackage | null> {
  if (!isNativeApp()) return null;
  try {
    const loaded = await loadPlugin();
    if (!loaded) return null;
    const offerings = await loaded.plugin.getOfferings();
    const packages = offerings.current?.availablePackages;
    return packages?.find((p) => p.identifier === '$rc_lifetime') ?? packages?.[0] ?? null;
  } catch (err) {
    console.error('[billing] getNativeOffering failed', err);
    return null;
  }
}

/** Run the RC purchase flow for the Pro Plan package. Returns whether it's now entitled. */
export async function purchaseNative(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const pkg = await getNativeOffering();
    if (!pkg) return false;
    const loaded = await loadPlugin();
    if (!loaded) return false;
    const { customerInfo } = await loaded.plugin.purchasePackage({ aPackage: pkg });
    return entitledFrom(customerInfo);
  } catch (err) {
    // User cancel or store error — not entitled, nothing granted.
    console.error('[billing] purchaseNative failed', err);
    return false;
  }
}

/** Restore prior purchases (App Store requirement). Returns whether now entitled. */
export async function restoreNative(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const loaded = await loadPlugin();
    if (!loaded) return false;
    const { customerInfo } = await loaded.plugin.restorePurchases();
    return entitledFrom(customerInfo);
  } catch (err) {
    console.error('[billing] restoreNative failed', err);
    return false;
  }
}

/**
 * Whether the native entitlement is currently active. Uses getCustomerInfo(),
 * NOT restorePurchases() — restorePurchases can leave a stale local flag
 * untouched on failure (e.g. offline); getCustomerInfo reads RevenueCat's own
 * on-device cache, correct whether online or offline. Reserve restoreNative()
 * for the explicit user-tapped Restore Purchases button.
 */
export async function isNativeEntitlementActive(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const loaded = await loadPlugin();
    if (!loaded) return false;
    const { customerInfo } = await loaded.plugin.getCustomerInfo();
    return entitledFrom(customerInfo);
  } catch (err) {
    console.error('[billing] isNativeEntitlementActive failed', err);
    return false;
  }
}
