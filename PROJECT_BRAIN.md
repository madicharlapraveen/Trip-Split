# TripSplit — Full Project Brain

TripSplit is a premium, privacy-first Progressive Web App (PWA) designed for modern travelers to manage expenses, plan itineraries, and settle group bills seamlessly.

---

## 🚀 1. Tech Stack & Architecture
*   **Core**: HTML5, Vanilla JavaScript (ES6+).
*   **Styling**: Hybrid Architecture — **Tailwind CSS CDN** for rapid utility layouts (grids, flexbox, spacing) combined with **Vanilla CSS3 (`style.css`)** for custom Glassmorphism components, animations, and theme overrides.
*   **PWA**: Service Workers (v4) for offline support and manifest-driven mobile installation.
*   **Database**: Supabase (Postgres) for real-time synchronization and cloud persistence.
*   **Storage**: Local-first architecture using `localStorage` (Key: `tripsplit_data`) with background cloud syncing. All new features (photos, templates, presets) are also stored 100% locally.
*   **Real-Time**: Supabase WebSockets (Channels) for instant collaboration across devices.
*   **Deployment**: Automated GitHub-to-Firebase workflow via Firebase CLI / Github.
*   **Identity**: Device-based identity with optional profile linking (Name, Email, Mobile).
*   **AI**: Integrated Google Gemini AI for automated trip itinerary generation.
*   **Intro Animation**: Snappy 1-second custom logo intro splash screen on startup featuring smooth scale bounce-in and staggered fade-out animations.
*   **Link Previews**: Open Graph and Twitter Card meta tags in `index.html` for social sharing icons (WhatsApp, Twitter, Facebook, etc.). Uses `assets/icon-512.png` as `og:image`.
*   **Routing & Distances**: Open Source Routing Machine (OSRM) driving API for exact road-driving distances (matching Google Maps) with parallel non-blocking `Promise.all` fetching and a 1.5s timeout fallback to the offline Haversine formula.
*   **Submit geocoding fallback**: Robust, multi-channel coordinate extraction (loose text coordinate regex search, manual forms, full maps links) with automatic background geocoding on submit.

---

## 👥 2. User Roles & Collaboration Permissions

TripSplit implements a role-based permission system to allow group collaboration while keeping the data secure:

| Role | Allowed Actions | UI Experience |
|------|-----------------|---------------|
| 👑 **Owner / Admin** | • Edit trip details (budget, dates, names)<br>• Add/edit/delete participants<br>• Add/edit/delete expenses<br>• Create/delete presets & templates<br>• Mark settlements as Paid / Revert to Pending | Full read/write access. Can reclaim original admin credentials via "Claim Owner Role" in Settings. |
| ✍️ **Editor** | • Add/edit/delete expenses<br>• Add/edit participants<br>• View & toggle Settlement Plan statuses | Write access to operational items. Allowed to mark transactions as Paid or Undo to Pending. |
| 👁️ **Viewer** | • Read-only access to all tabs (Home, List, Plan, Me)<br>• View interactive charts & stats | Read-only. Action buttons are hidden or disabled. Toggle settlement buttons are replaced with static `⏳ Pending` or `✅ Paid` badges. |

---

## 🎭 3. Dual App Modes (v2 — Mode-Aware Architecture)

The app has two primary modes switchable from the Home screen:

| Mode | Key UI Widgets | Color Theme |
|------|---------------|-------------|
| 🎒 **Adviser Mode** | Itinerary preview, Travel Guidelines, Memories Gallery | Indigo/Purple gradient |
| 💰 **Split Mode** | Crew list, Recent Expenses dropdown, Settlement Plan dropdown, Detailed Participants dropdown, Budget stats | Indigo/Purple (same palette, stat additions) |

Mode is persisted to `localStorage` via `tripsplit_app_mode` key. The `switchAppMode(mode, silent)` function in `ui_engine.js` handles all switching, immediately adding the active theme class (`theme-adviser` or `theme-split`) to the `body` element. This transitions all background gradients and primary color styles instantly on click without reload.

---

## 🧮 4. Settlement Mathematics & Ledger Logic

To keep ledger data consistent across calculations and avoid rounding drift, TripSplit uses a greedy ledger minimization algorithm implemented in `js/split.js`.

### 1. Balance Calculations
For any selected trip, the individual net balance $B_p$ for participant $p$ is calculated as:
$$B_p = S_p - E_p$$
Where:
- $S_p$ = Total actual amount spent by participant $p$ on all ledger expenses.
- $E_p$ = Expected share of participant $p$. 
- The expected share is computed uniformly:
$$E_p = \frac{\text{Total Trip Expense}}{\text{Total Participants}}$$

### 2. Path Minimization Algorithm
1. Filter participants into two sorted arrays:
   - **Creditors ($B_p > 0.01$)** sorted in descending order of balance.
   - **Debtors ($B_p < -0.01$)** sorted in ascending order of balance (most negative first).
2. While both arrays are non-empty:
   - Match the top Creditor $c$ with the top Debtor $d$.
   - Calculate settlement amount $A = \min(B_c, -B_d)$.
   - Record a transaction: **"$d$ pays $\$A$ to $c$"**.
   - Subtract $A$ from $B_c$ and add $A$ to $B_d$.
   - Remove participant from active arrays if their balance is fully resolved ($< 0.01$).

### 3. Option B Ledger Settlement Strategy
When a settlement transaction "$X \rightarrow Y$ of $\$A$" is marked as **Paid** by an Owner or Editor:
1. **Metadata Registry**: The string key `"X-->Y"` is appended to the trip's `paid_settlements` array.
2. **Balancing Expense Injection**: A virtual expense with the flag `isSettlement: true` is appended directly to the transaction ledger:
   ```json
   {
     "tripId": 123,
     "id": 1779180991863,
     "title": "Settlement: X → Y",
     "amount": A,
     "totalAmount": A,
     "paidBy": "X's ID",
     "splitMethod": "exact",
     "splitBetween": ["Y's ID"],
     "splits": { "Y's ID": A },
     "isSettlement": true,
     "settlementKey": "X-->Y"
   }
   ```
   Injecting this balancing entry guarantees that the standard balance formula $B_p = S_p - E_p$ evaluates correctly for both members, updating their net balances to exactly $\$0$ without changing the math loop.
3. **Reverting to Pending**: If marked as **Pending** (Undo), the key `"X-->Y"` is deleted from `paid_settlements`, and the matching settlement expense is filtered out of the ledger array.

---

## 🎨 5. Design System (Premium Aesthetics)
*   **Theme**: "Super Cool" Glassmorphism (High-blur backdrops, translucent cards, animated ambient background blobs).
*   **Typography**: `Outfit` (Google Fonts) for a modern, tech-forward feel. Brand title in persistent header is sized at `text-2xl font-extrabold` and paired with a tight, perfectly aligned tagline `SPLIT BILLS, SHARE MEMORIES` (`text-[8px] font-bold` sub-label) that fits precisely within the title bounds.
*   **Palette**:
    *   **Primary**: Deep Indigo (`#4f46e5`) to Purple gradient (`--primary-gradient`). Toggles instantly to Violet-to-Orange in Adviser Mode, and Royal Blue-to-Cyan in Split Mode.
    *   **Success/Warning/Danger**: Emerald, Amber, Rose (Tailwind standard colors).
    *   **Neutral**: Slate-50 to Slate-900.
*   **Collapsible Animation Systems**:
    *   **Chevron Rotations**: Headers contain rotating SVG chevrons (`duration-300 transform`) transitioning dynamically between $0^\circ$ and $180^\circ$ on toggle action.
    *   **State Class**: Content containers use the `.hidden` utility toggled dynamically by element references to maximize rendering speed.

---

## 🗺️ 6. Module Map (File Architecture)

### 📂 Root Files
*   [index.html](file:///e:/Trip%20Split/index.html): Main layout, screen sections, shared modal overlays. Includes collapsible Home widgets, My-screen tab, and gallery canvas.
*   [service-worker.js](file:///e:/Trip%20Split/service-worker.js): Caching logic for offline functionality.
*   [manifest.json](file:///e:/Trip%20Split/manifest.json): PWA configuration and brand assets.

### 📂 /js (Logic)
*   [app.js](file:///e:/Trip%20Split/js/app.js): Orchestrates app lifecycle, splash screen timing, and PWA install prompts.
*   [ui_engine.js](file:///e:/Trip%20Split/js/ui_engine.js): **The Engine.** Manages screen switching, modal rendering, navigation highlighting, and collapsibles (Recent Expenses, Settlement Plan, Participant Details). Holds the global comprehensive App Guide Modal (`showAppGuideModal`).
*   [sync.js](file:///e:/Trip%20Split/js/sync.js): **The Cloud Bridge.** Handles Supabase authentication, real-time WebSockets, push notification subscriptions, and cloud-to-local data merging.
*   [db.js](file:///e:/Trip%20Split/js/db.js): Data access layer. Handles all `localStorage` CRUD.
*   [split.js](file:///e:/Trip%20Split/js/split.js): Core mathematics. Calculates settlement logic, bill splitting, per-person balances, and renders home settlement elements.
*   [planner.js](file:///e:/Trip%20Split/js/planner.js): Manages the itinerary timeline ("Bubbles & Plates" UI), geocoding fallback coordinate resolution, inputs cache clearing, and Leaflet offline map layer tiles cache.
*   [ai.js](file:///e:/Trip%20Split/js/ai.js): API bridge for Gemini AI itinerary generation.
*   [share.js](file:///e:/Trip%20Split/js/share.js): Native sharing API integration.
*   [presets.js](file:///e:/Trip%20Split/js/presets.js): Offline split preset manager. Stores named presets per trip in `tripsplit_presets`.

### 📂 /css (Styles)
*   [style.css](file:///e:/Trip%20Split/css/style.css): Global variables, animation keyframes (`splash-reveal`, `pulse-dot`), and premium component styles.

---

## 💾 7. Data Schema (`tripsplit_data`)

```json
{
  "pendingSync": false,
  "templates": [
    {
      "id": 123, "name": "Goa Template",
      "estimatedBudget": 50000, "currency": "INR", "currencySymbol": "₹",
      "itinerary": [], "crew": [{ "name": "Alice", "familyCount": 1 }],
      "savedAt": "2026-05-18T..."
    }
  ],
  "trips": [
    {
      "id": 123456789, "tripName": "Goa Trip",
      "createdAt": "2026-05-15T...", "notes": "Annual trip",
      "estimatedBudget": 50000, "currency": "INR", "currencySymbol": "₹",
      "paid_settlements": ["Alice-->Bob"],
      "photos": [
        { "id": 111, "imageData": "data:image/jpeg;base64,...", "caption": "Sunset", "addedAt": "..." }
      ],
      "itinerary": [
        { "placeName": "Beach Club", "time": "18:00", "notes": "Sunset views", "visited": false }
      ]
    }
  ],
  "participants": [
    { "id": 1, "tripId": 123456789, "name": "Alice", "familyCount": 1, "phone": "..." }
  ],
  "expenses": [
    {
      "id": 999, "tripId": 123456789, "title": "Lunch",
      "amount": 1200, "totalAmount": 1200, "advancePay": 0,
      "category": "Food", "paidBy": 1, "splitBetween": [1, 2],
      "receiptImage": null,
      "localCurrency": null, "exchangeRate": 1, "localAmount": null,
      "isRecurring": false, "recurringDayIndex": 0, "parentRecurringId": null,
      "createdAt": "2026-05-15T..."
    }
  ]
}
```

`tripsplit_presets` key (separate from main data):
```json
{ "123456789": [{ "id": 555, "category": "Fuel", "participantIds": [1, 2] }] }
```

---

## 🛠️ 8. Upgraded Features Overview

| Feature | Key User Value | Implementation Point |
|---------|----------------|----------------------|
| **Collapsible Dropdowns** | Saves screen space on mobile dashboards | UI bindings for chevrons on Recent Expenses, Participant Details, and Settlement Plan. |
| **Receipt Photo Capture** | Eliminates manual receipt entry | Uses standard camera capture interfaces storing compressed Base64 images directly inside the expense object. |
| **Offline Live-Sync Indicator** | Immediate visual feedback on connection status | Sync indicator pill flashes green (`Synced`) or amber (`Offline / Sync Pending`). |
| **Trip Templates** | Speeds up setting up recurring itineraries | Serializes a trip's settings and members, allowing users to clone blueprints instantly. |
| **Interactive Map Canvas** | Map timeline visualization | Geocodes timeline nodes onto Leaflet map layers with route rendering and navigation overlays. |
| **OSRM Driving Distances** | Replaces straight line math with real road distances | Queries OSRM API in parallel with AbortController timeout & Haversine formula fallback. |
| **Onboarding App Guide** | Quick popup helper detailing all features | Sleek interactive modal popup triggered by a help button on the Profile page tab. |

---

## 🔄 9. Maintenance Checklist
*   **Version Control**: Script tags use cache-busting identifiers. Current versions: `js/planner.js?v=770064`, `js/ui_engine.js?v=770063`, `js/app.js?v=770061`, `js/recovery.js?v=770061`.
*   **Aispace Footer Branding**: Keep correct official footer copy at all times: `TripSplit v3.0 • A Product from Aispace.co.in`.
*   **String Trip ID Parsing**: Trip IDs may be numeric OR cloud-assigned hashes. Compare strictly as strings: `String(t.id) === String(savedId)`.
*   **Offline First**: Verify that every storage change updates the matching `localStorage` key immediately before starting backend network operations.

---

*Last Updated: 2026-05-25 — Implemented a sequential signup fallback for user profile verification (handling both email and signup OTP types seamlessly for new account registration), resolved concurrent execution race conditions causing duplicated timeline stops, and updated all script version cache-busters.*
