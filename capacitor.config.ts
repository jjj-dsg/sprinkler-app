import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for the iOS/Android wrappers.
 * `webDir` is the Vite build output. The native platforms (ios/android) are
 * generated on a Mac via `npx cap add ios` — see docs/MOBILE_TESTFLIGHT.md.
 */
const config: CapacitorConfig = {
  appId: 'com.desertservicesgroup.sprinklersmart',
  appName: 'SprinklerSmart',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  plugins: {
    Geolocation: {
      // iOS Info.plist usage strings are set in the native project; documented in the runbook.
    },
  },
};

export default config;
