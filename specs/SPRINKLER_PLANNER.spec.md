# SprinklerSmart Feature Specs

## Feature: Lawn Zone Drawing & Classification

**As a** homeowner planning irrigation  
**I want to** draw zones on my lawn and classify them by type  
**So that** I get accurate water usage and cost estimates

### Scenario: Draw premium lawn zone
- **Given** I'm on the app landing screen
- **When** I load my property address in Gilbert, AZ
- **Then** I see the app canvas with satellite map
- **And** the zone tool is selected by default
- **And** I can click points to draw a polygon

### Scenario: Finish zone with minimum 3 points
- **Given** I've drawn 2 points on the canvas
- **When** I try to finish the zone
- **Then** the "Finish" button is disabled
- **And** I see "1 more..." hint

### Scenario: Auto-calculate zone area in sq ft
- **Given** I've drawn a 50ft × 50ft square
- **When** I finish the zone
- **Then** the zone displays "2500 ft²"
- **And** the area is accurate to ±3%

### Scenario: Recommend zone type by location
- **Given** I'm in Phoenix, AZ (premium lawn region)
- **When** I load my property
- **Then** default zone type is "Premium Lawn"

### Scenario: Switch zone type mid-draw
- **Given** I'm drawing zones
- **When** I click "Shade Bed / Trees" zone type
- **Then** the next zones I draw are shade beds
- **And** previous zones retain their classification

---

## Feature: Sprinkler Head Placement & Selection

**As a** homeowner  
**I want to** place sprinkler heads and customize their type and radius  
**So that** I can design efficient irrigation coverage

### Scenario: Place heads manually
- **Given** I've drawn a lawn zone
- **When** I select "Place Head" tool and choose "MP Rotator"
- **And** I click inside the zone
- **Then** a head appears at that location
- **And** it shows coverage circle (25ft radius for MP Rotator)

### Scenario: Auto-place heads with AI
- **Given** I've drawn a 40ft × 40ft premium lawn zone
- **When** I click "AI Auto-Place"
- **Then** heads are placed perimeter-first (corners → edges) then a triangular interior fill
- **And** spacing is derived from the live map scale (`head.radius × pxPerFt`), not a fixed grid
- **And** interior heads are inside the zone (PIP); perimeter heads sit on the boundary (edge/corner arcs)

### Scenario: Select and edit head type
- **Given** I've placed an MP Rotator head
- **When** I click "Select / Drag" tool and click the head
- **Then** a panel appears with head details
- **And** I can change the type to "Gear Rotor"
- **And** the coverage circle updates to 35ft radius

### Scenario: Adjust head radius with slider
- **Given** I have an MP Rotator selected
- **When** I drag the radius slider from 25ft to 30ft
- **Then** the coverage circle updates in real-time
- **And** the coverage visualization updates immediately

### Scenario: Drag head to reposition
- **Given** I have a head selected and "Select / Drag" is active
- **When** I drag the head marker to a new location
- **Then** it moves smoothly to the new position
- **And** the coverage circle follows it

### Scenario: Delete head
- **Given** I have a head selected
- **When** I click "Remove"
- **Then** the head is deleted
- **And** the savings estimate updates

---

## Feature: Map Scale & Measurement

**As a** homeowner  
**I want to** see a scale reference on the map and understand sprinkler coverage distance  
**So that** I can verify my design covers the entire lawn correctly

### Scenario: Display scale bar on map
- **Given** I'm on the app canvas with satellite map
- **When** the map loads
- **Then** a scale bar appears in the bottom-left corner
- **And** it shows distance in both feet and meters
- **And** the scale updates dynamically as I zoom

### Scenario: Show head coverage radius label
- **Given** I've placed a 25ft MP Rotator head
- **When** I click on the coverage circle
- **Then** a popup shows "25 ft radius" and "MP Rotator (water-saving)"
- **And** I can close the popup by clicking elsewhere

### Scenario: Verify coverage reaches property edge
- **Given** I'm planning a small 30ft × 30ft lawn
- **When** I place heads to cover it
- **Then** I can see via the scale bar that coverage circles extend to/beyond the edges
- **And** I can adjust head radius with the slider to fine-tune gaps

### Scenario: Scale is accurate on real satellite imagery
- **Given** I load a property in Gilbert, AZ (known satellite tile)
- **When** I draw a 50ft × 50ft zone on the satellite
- **Then** the scale bar confirms the zone width matches the known distance
- **And** coverage circles are proportionally correct

---

## Feature: Water Savings Calculator

**As a** homeowner  
**I want to** see annual water savings in dollars and gallons  
**So that** I can justify the investment in efficient sprinklers

### Scenario: Calculate baseline water usage
- **Given** I have a 50ft × 50ft premium lawn in Gilbert, AZ
- **When** I load my property
- **Then** baseline (conventional rotor) = 50 × (63/12) × 7.48 / 0.55 ≈ 4,000 gal/yr

### Scenario: Calculate efficient water usage
- **Given** same 50×50 lawn with MP Rotators (80% efficiency)
- **When** I place heads to cover it
- **Then** efficient = baseline × 0.8 ≈ 3,200 gal/yr

### Scenario: Convert savings to dollars
- **Given** 800 gal/yr saved in Gilbert ($5.80 per 1000 gal)
- **When** the calculator runs
- **Then** savings = $4.64/year

### Scenario: Update savings in real-time
- **Given** I have zones and heads placed
- **When** I change a zone type from "Premium Lawn" to "Kurapia"
- **Then** the savings card updates immediately
- **And** annual savings increases (Kurapia uses less water)

### Scenario: Show payback period
- **Given** parts cost $150, annual savings $4.64
- **When** savings are calculated
- **Then** "Pays back in ~32 yrs"
- **And** the number is Math.max(1, round(cost/savings*10)/10)

---

## Feature: Smart Recommendations

**As a** a homeowner  
**I want to** get AI suggestions for optimizing my lawn  
**So that** I can improve efficiency and comfort

### Scenario: Warn on suboptimal head choices
- **Given** I place a Gear Rotor in a Premium Lawn zone
- **When** the rec engine runs
- **Then** a "warn" card appears: "Gear Rotor isn't ideal in Premium Lawn — prefer MP Rotator"

### Scenario: Suggest Kurapia for large lawns
- **Given** I have a 900 sq ft premium lawn with no low-water zones
- **When** the rec engine runs
- **Then** a "tip" appears: "Convert a border strip to Kurapia..."

### Scenario: Suggest right-sizing for big lawns
- **Given** I have 1500 sq ft of premium lawn
- **When** the rec engine runs
- **Then** a "tip" appears: "Right-size the turf: a smaller, well-shaded lawn..."

### Scenario: Deduplicate recommendations
- **Given** multiple zones have the same recommendation
- **When** the rec engine runs
- **Then** the recommendation appears only once

---

## Feature: Pro Plan Monetization

**As a** homeowner  
**I want to** download a PDF with my design details  
**So that** I can share it with contractors

### Scenario: Pro Plan button visible
- **Given** I have a plan with zones and heads
- **When** I scroll to the sidebar
- **Then** "Pro Plan — $19" card is visible
- **And** it describes "PDF blueprint, valve schedule, contractor handoff & rebate paperwork"

### Scenario: Launch payment flow (blocked MVP)
- **Given** I click "Export Pro Plan"
- **When** (Stripe gate not yet wired)
- **Then** (placeholder for Stripe Checkout redirect)

### Scenario: Track pro conversion event
- **Given** user clicks "Export Pro Plan"
- **When** (analytics integration)
- **Then** event "pro_plan_clicked" is sent with zones/heads count

---

## Feature: Property Location & Water Rates

**As a** homeowner  
**I want to** see my local water rate and estimated ET  
**So that** the savings estimate is accurate for my area

### Scenario: Auto-detect city from address
- **Given** I enter "1234 Main St, Gilbert, AZ" in the address field
- **When** I click "Load My Property"
- **Then** Nominatim geocodes it → Gilbert, AZ
- **And** water rate updates to $5.80 per 1000 gal
- **And** ET updates to 63 (annual evapotranspiration)

### Scenario: Fallback to state rate
- **Given** I enter an address in a city not in the MUNI list
- **When** the address is in Arizona
- **Then** fallback to STATE_DEF["AZ"] = $5.2 rate
- **And** note says "AZ regional estimate."

### Scenario: Fallback to national average
- **Given** I enter an address in a state with no data
- **When** the address is geocoded successfully but no state match
- **Then** fallback to "Other / Custom" = $5.00, ET=50
- **And** note says "National averages."

### Scenario: Allow manual city override
- **Given** I'm on the landing screen
- **When** I type a different city in the datalist
- **Or** I click a quick-select button (Gilbert, Phoenix, etc.)
- **Then** muniName updates and rate preview refreshes immediately

---

## Feature: Self-Test Suite (Regression Safety)

**As a** developer  
**I want to** validate all geometry and cost logic on load  
**So that** bugs don't slip into production

> Implementation note: the in-app panel runs `runSelfTests()` from `src/lib/selftest.ts`,
> which calls the SAME lib functions as the Vitest suite (single source of truth). The
> badge count is dynamic (N/N), and `selftest.test.ts` fails CI if any in-app check breaks.

### Scenario: Run the self-test suite on load
- **Given** user is on landing screen
- **When** the app loads
- **Then** `runSelfTests()` executes silently against the lib functions
- **And** every check passes (PIP, area, savings, recs, geocoding, BDD scenarios)

### Scenario: Display test results to user
- **Given** all checks pass
- **When** user clicks "Self-test: N/N passing"
- **Then** a collapsible panel shows all check names with green checkmarks

### Scenario: Alert on a failed check
- **Given** a check fails (e.g., PIP logic breaks)
- **When** the app loads
- **Then** the badge shows "(N-1)/N passing" in red
- **And** the collapsible panel shows the failed check name + error message

---

## Feature: Affiliate Monetization

**As a** DSG  
**I want to** earn commission on sprinkler equipment sales  
**So that** the app generates revenue even without Pro Plan purchase

### Scenario: Show parts list with affiliate links
- **Given** I've placed 4 MP Rotators and 2 drip heads
- **When** I scroll to "Shop This Plan" card
- **Then** a list shows:
  - Hunter MP Rotator (4 × $6.50) = $26
  - Netafim Inline Drip (2 × $0.60) = $1.20
- **And** each row has a "Buy →" link to affiliate URL

### Scenario: Calculate part cost
- **Given** parts list is visible
- **When** costs are summed
- **Then** "Subtotal" = $27.20
- **And** note says "Pays back in ~5.8 yrs of savings"

### Scenario: Track affiliate click
- **Given** user clicks "Buy →" on an affiliate link
- **When** (analytics integration)
- **Then** event "affiliate_clicked" with (brand, quantity, cost)

---

## Feature: Responsive Design & Mobile

**As a** homeowner on mobile  
**I want to** use the app on my phone while standing in the yard  
**So that** I can see real-time satellite imagery and draw

### Scenario: Touch-friendly controls
- **Given** I'm on a phone (viewport < 768px)
- **When** the interface loads
- **Then** buttons have 48px+ tap targets
- **And** sidebar stacks below the canvas (not beside)

### Scenario: Pinch-zoom map
- **Given** I'm viewing the satellite canvas
- **When** I pinch-zoom on a touchscreen
- **Then** the map/canvas zooms (Leaflet handles this)

### Scenario: Offline grid mode
- **Given** Leaflet tile layer fails to load
- **When** timeout hits 8 seconds
- **Then** status badge shows "grid mode (offline) · 6 ft squares"
- **And** I can still draw and place heads on the grid

---

## Feature: Cross-Platform Mobile (Capacitor / iOS / Android)

**As a** DSG engineering  
**I want to** build iOS and Android apps from this codebase  
**So that** we reach users on app stores

### Scenario: Capacitor integration ready
- **Given** we run `npm run build:mobile`
- **When** Capacitor CLI generates iOS/Android projects
- **Then** the built app is placed in `capacitor://` namespace
- **And** native APIs (location, camera) are available via Capacitor

### Scenario: Geo-location on device
- **Given** user grants location permission
- **When** they tap "Load My Property" on mobile
- **Then** geolocation.getCurrentPosition() fetches device lat/lng
- **And** we pre-fill the address field (reverse geocode if desired)

### Scenario: Native splash screen
- **Given** iOS/Android app is launched
- **When** the app cold-starts
- **Then** native splash shows DSG logo
- **And** transitions to React app when ready

---

## Feature: Analytics & Monetization Tracking

**As a** DSG product  
**I want to** track user behavior and monetization funnels  
**So that** we understand ROI and user segments

### Scenario: Track session start
- **Given** user loads the app
- **When** component mounts
- **Then** analytics.track("session_start", { ...metadata })

### Scenario: Track plan design completion
- **Given** user has ≥1 zone and ≥1 head
- **When** they focus away or close
- **Then** analytics.track("plan_designed", { zones_count, heads_count, total_area_sqft, estimated_savings })

### Scenario: Track Pro Plan click
- **Given** user clicks "Export Pro Plan"
- **When** they proceed to Stripe (eventually)
- **Then** analytics.track("pro_plan_initiated", { zones, heads, savings_dollars })

### Scenario: Track purchase (future)
- **Given** user completes Stripe payment
- **When** webhook confirms payment
- **Then** analytics.track("pro_plan_purchased", { amount, plan_details })

---

## Feature: CI/CD & Deployment

**As a** developers  
**I want to** validate all tests and deploy only passing builds  
**So that** quality is guaranteed

### Scenario: GitHub Actions on PR
- **Given** I push a branch with changes
- **When** I create a PR
- **Then** GitHub Actions runs:
  - `npm run lint` (ESLint)
  - `npm run test` (Vitest with coverage)
  - `npm run build` (Vite)
- **And** all must pass before merge

### Scenario: Deploy to Vercel on main
- **Given** a PR is merged to main
- **When** the GitHub workflow completes
- **Then** `vercel deploy --prod` runs
- **And** the app is live in 30–60s

### Scenario: Preview deploy on PR
- **Given** a PR is created
- **When** GitHub Actions completes
- **Then** Vercel creates a preview URL
- **And** the PR comment shows the preview link
