// True inside a Capacitor native shell (iOS/Android). Used to branch web-only vs
// native-only behavior — Stripe Checkout is web-only (Apple requires StoreKit via
// RevenueCat for in-app purchases inside a native app shell), so billing.ts routes
// the Pro Plan purchase by this flag.
export function isNativeApp(): boolean {
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}
