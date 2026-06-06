# SprinklerSmart Development Guide

## Spec-Driven Development (BDD + Unit Tests)

This project follows **spec-driven development**: every feature is defined in BDD format first (`specs/SPRINKLER_PLANNER.spec.md`), then implemented with unit tests.

### Workflow

1. **Read the spec** (`specs/SPRINKLER_PLANNER.spec.md`)
   - Understand the feature's scenarios and acceptance criteria
   - Identify test cases

2. **Write unit tests** (`src/__tests__/*.test.ts`)
   - Test pure logic (geometry, calculations, data transforms)
   - Use Vitest + testing-library

3. **Implement the feature**
   - Code to make tests pass
   - Keep components testable: separate logic from UI

4. **Run tests locally**
   ```bash
   npm run test:unit          # Watch mode
   npm run test               # Run once
   npm run coverage           # See coverage report
   ```

5. **Push to GitHub**
   - GitHub Actions runs full CI/CD pipeline
   - Tests must pass before merge to main
   - Preview deployed automatically on PR

---

## Testing Standards

### Unit Tests (Vitest)

**Location:** `src/__tests__/*.test.ts`

**Format:**
```typescript
import { describe, it, expect } from 'vitest';

describe('Feature: Lawn Zone Drawing', () => {
  it('calculates area correctly', () => {
    const area = polyAreaFt([...polygon]);
    expect(area).toBeCloseTo(2500, 0);
  });
});
```

**Coverage Goals:**
- Pure logic (geometry, calculations): 100%
- Utilities: 90%+
- React components: 70%+
- Integrations (Stripe, maps): Mocked

### Component Tests (React Testing Library)

**Location:** `src/__tests__/components/*.test.tsx`

**Format:**
```typescript
import { render, screen, userEvent } from '@testing-library/react';
import { ZoneDrawer } from '@/components/ZoneDrawer';

describe('<ZoneDrawer />', () => {
  it('renders canvas with zone tool selected', () => {
    render(<ZoneDrawer />);
    expect(screen.getByText(/Draw Zone/)).toBeInTheDocument();
  });

  it('creates zone on 3 clicks', async () => {
    const { container } = render(<ZoneDrawer />);
    const canvas = container.querySelector('canvas');
    
    await userEvent.click(canvas, { x: 100, y: 100 });
    await userEvent.click(canvas, { x: 150, y: 100 });
    await userEvent.click(canvas, { x: 125, y: 150 });
    
    expect(screen.getByText(/2500 ft²/)).toBeInTheDocument();
  });
});
```

---

## Monetization Tracking

All revenue funnels are tracked via `src/lib/analytics.ts`:

### Pro Plan Funnel (Primary Revenue)
```typescript
analytics.trackProPlanInitiated(zones, heads, savings);  // Step 1: Click button
analytics.trackProPlanPurchased(amount, details);       // Step 2: Stripe success
```

### Affiliate Revenue (Secondary)
```typescript
analytics.trackAffiliateClick('Hunter MP', 4, 26.00);   // Earn ~$1.30 commission
```

### Plan Design (Engagement)
```typescript
analytics.trackPlanDesigned(zones, heads, savings);     // Track completed designs
```

---

## Code Architecture

### Directory Structure

```
src/
├── App.tsx                          # Main app container
├── components/
│   ├── LandingScreen.tsx           # Location picker, address input
│   ├── PlannerCanvas.tsx           # Map + drawing overlay
│   ├── ToolbarPanel.tsx            # Zone/head/erase/select controls
│   ├── SidebarAnalytics.tsx        # Savings card, property breakdown, recs
│   └── ProPlanCard.tsx             # $19 export button
├── hooks/
│   ├── useLeaflet.ts               # Leaflet loader + error handling
│   └── usePlanState.ts             # Zones, heads, selection state
├── lib/
│   ├── geometry.ts                 # pipPx, polyAreaFt, autoPlace
│   ├── calculations.ts             # Savings, gallons, payback
│   ├── analytics.ts                # Monetization event tracking
│   └── types.ts                    # Pt, Zone, Head, MonetizationEvent
├── __tests__/
│   ├── geometry.test.ts
│   ├── calculations.test.ts
│   └── components/
│       ├── PlannerCanvas.test.tsx
│       └── SidebarAnalytics.test.tsx
└── main.tsx
```

### Pure Logic Separation

**Goal:** Make all calculations testable without React.

✅ **Good:**
```typescript
// lib/geometry.ts (testable, no dependencies)
export function polyAreaFt(pts: Pt[]): number { ... }
export function autoPlace(zones: Zone[]): Head[] { ... }
```

❌ **Bad:**
```typescript
// Inside component (hard to test)
const area = useEffect(() => {
  setArea(polyAreaFt(zone.pts));
}, [zone]);
```

---

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

**On every push or PR:**

1. **Install dependencies** (cached)
2. **Lint** (`npm run lint`) — ESLint
3. **Unit tests** (`npm run test:unit -- --run`) — Vitest
4. **Build** (`npm run build`) — Vite
5. **Upload coverage** to Codecov

**On merge to main:**

6. **Deploy to Vercel** (`npm run deploy:prod`)
   - Requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets
   - Deploys to production in ~30–60s

**On PR:**

7. **Preview deploy** to Vercel
   - Creates preview URL
   - Posts link in PR comment

### Setting Up CI/CD

1. **Add Vercel secrets to GitHub:**
   ```bash
   gh secret set VERCEL_TOKEN --body "..."
   gh secret set VERCEL_ORG_ID --body "..."
   gh secret set VERCEL_PROJECT_ID --body "..."
   ```

2. **Verify workflow runs:**
   - Push a branch → PR → see workflow in "Checks" tab

---

## Mobile (iOS/Android via Capacitor)

### Prepare for Mobile Build

1. **Install Capacitor:**
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   npx cap init
   ```

2. **Build web for Capacitor:**
   ```bash
   npm run build
   npx cap sync
   ```

3. **Generate native projects:**
   ```bash
   npx cap add ios
   npx cap add android
   ```

4. **Native plugins needed:**
   - `@capacitor/geolocation` — Get device GPS
   - `@capacitor/app` — App lifecycle
   - `@capacitor/splash-screen` — Custom splash

### Running on Device

**iOS (Mac + Xcode):**
```bash
npx cap open ios
# In Xcode: Product → Run (or ⌘R)
```

**Android (Android Studio):**
```bash
npx cap open android
# In Android Studio: Run (or Shift+F10)
```

### App Store / Play Store Submission

- **iOS:** TestFlight → App Store Review (1–3 days)
- **Android:** Google Play Console (2–3 hours)
- Both require monetization setup: Stripe for in-app billing, or Subscriptions API

---

## Monetization Implementation (Roadmap)

### Phase 1: Affiliate Links ✅
- [x] Parts list with Hunter/Rain Bird/Kurapia links
- [x] Analytics tracking (affiliate clicks)
- [ ] Set up real affiliate accounts & swap example URLs

### Phase 2: Pro Plan ($19 PDF)
- [ ] Add Stripe `@stripe/react-js` package
- [ ] Implement payment modal in ProPlanCard
- [ ] Webhook handler to send PDF email on success
- [ ] Analytics: track payment flow

### Phase 3: Subscriptions (Optional)
- [ ] Pro+ ($9.99/mo): Unlimited designs, saved to cloud
- [ ] Cloud backend (Firebase, Supabase, or custom)
- [ ] Requires user authentication (Clerk)

### Phase 4: Mobile Monetization
- [ ] In-app billing (iOS StoreKit, Android Google Play)
- [ ] Same Pro/Pro+ tiers via Capacitor plugins
- [ ] Apple & Google take 30% cut

---

## Development Checklist

Before pushing:

- [ ] Read the BDD spec for the feature
- [ ] Write unit tests (red → green → refactor)
- [ ] Run `npm run lint` — no errors
- [ ] Run `npm run test` — all passing
- [ ] Run `npm run build` — no TS errors
- [ ] Test the feature in browser (`npm run dev`)
- [ ] Commit with conventional message: `feat: ...`, `fix: ...`, `test: ...`
- [ ] Push → GitHub Actions runs → all checks pass
- [ ] Merge to main → deployed to production

---

## Quick Commands

```bash
# Development
npm run dev                 # Start dev server (localhost:5173)
npm run build              # Production build
npm run preview            # Preview prod build locally

# Testing
npm run test:unit          # Watch mode
npm run test               # Run once + exit
npm run test:ui            # Vitest UI (http://localhost:51204)
npm run coverage           # Coverage report

# Linting
npm run lint               # Check code style

# CI/CD
npm run deploy:prod        # Deploy to Vercel (requires token)

# Mobile
npm run build:mobile       # Build for Capacitor (iOS/Android)
npx cap sync               # Sync web build to native projects
npx cap open ios           # Open iOS project in Xcode
npx cap open android       # Open Android project in Android Studio
```

---

## Resources

- **BDD Spec:** `specs/SPRINKLER_PLANNER.spec.md`
- **Vitest Docs:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/react
- **Capacitor:** https://capacitorjs.com/
- **Stripe:** https://stripe.com/docs
- **GitHub Actions:** https://docs.github.com/actions
