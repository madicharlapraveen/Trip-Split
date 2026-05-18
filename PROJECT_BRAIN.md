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
*   **Deployment**: Automated GitHub-to-Firebase workflow via GitHub Actions.
*   **Identity**: Device-based identity with optional profile linking (Name, Email, Mobile).
*   **AI**: Integrated Google Gemini AI for automated trip itinerary generation.
*   **Intro Animation**: Snappy 1-second custom logo intro splash screen on startup featuring smooth scale bounce-in and staggered fade-out animations.

---

## 🎭 2. Dual App Modes (v2 — Mode-Aware Architecture)

The app has two primary modes switchable from the Home screen:

| Mode | Key UI Widgets | Color Theme |
|------|---------------|-------------|
| 🎒 **Adviser Mode** | Itinerary preview, Travel Guidelines, Memories Gallery | Indigo/Purple gradient |
| 💰 **Split Mode** | Crew list, Recent Expenses, Settlement Breakdown, Budget stats | Indigo/Purple (same palette, stat additions) |

Mode is persisted to `localStorage` via `tripsplit_app_mode` key. The `switchAppMode(mode, silent)` function in `ui_engine.js` handles all switching, immediately adding the active theme class (`theme-adviser` or `theme-split`) to the `body` element. This transitions all background gradients and primary color styles instantly on click without reload.

---

## 🎨 3. Design System (Premium Aesthetics)
*   **Theme**: "Super Cool" Glassmorphism (High-blur backdrops, translucent cards, animated ambient background blobs).
*   **Typography**: `Outfit` (Google Fonts) for a modern, tech-forward feel. Brand title in persistent header is sized at `text-2xl font-extrabold` and paired with a tight, perfectly aligned tagline `SPLIT BILLS, SHARE MEMORIES` (`text-[8px] font-bold` sub-label) that fits precisely within the title bounds.
*   **Palette**:
    *   **Primary**: Deep Indigo (`#4f46e5`) to Purple gradient (`--primary-gradient`). Toggles instantly to Violet-to-Orange in Adviser Mode, and Royal Blue-to-Cyan in Split Mode.
    *   **Success/Warning/Danger**: Emerald, Amber, Rose (Tailwind standard colors).
    *   **Neutral**: Slate-50 to Slate-900.
*   **Key Components**:
    *   **Splash Screen**: Full-screen startup intro with a bouncing brand avatar (`icon-192.png`) and staggered fade-slide titles that auto-remove after 1 second.
    *   **Floating Nav Dock**: iOS-style bottom pill with scale-in icon animations.
    *   **Glass Modals**: Centered, bouncy animated overlays (`animate-scale-in`).
    *   **Hero Trip Card**: Stunning gradient card with budget progress visualization.

---

## 🗺️ 4. Module Map (File Architecture)

### 📂 Root Files
*   [index.html](file:///e:/Trip%20Split/index.html): Main layout, screen sections, shared modal overlays. Contains My-screen and Gallery sub-tab in Plan screen.
*   [service-worker.js](file:///e:/Trip%20Split/service-worker.js): Caching logic for offline functionality.
*   [manifest.json](file:///e:/Trip%20Split/manifest.json): PWA configuration and brand assets.

### 📂 /js (Logic)
*   [app.js](file:///e:/Trip%20Split/js/app.js): Orchestrates app lifecycle, splash screen timing, and PWA install prompts.
*   [ui_engine.js](file:///e:/Trip%20Split/js/ui_engine.js): **The Engine.** Manages screen switching, modal rendering, navigation highlighting, and all 9 upgraded feature UIs (receipt capture, sync indicator, inline delete, My tab, templates, multi-currency, recurring, gallery).
*   [sync.js](file:///e:/Trip%20Split/js/sync.js): **The Cloud Bridge.** Handles Supabase authentication, real-time WebSockets, push notification subscriptions, and cloud-to-local data merging. Call `clearPendingSync()` after a successful cloud push.
*   [db.js](file:///e:/Trip%20Split/js/db.js): Data access layer. Handles all `localStorage` CRUD. Now includes `saveTemplateFromTrip`, `getTemplates`, `deleteTemplateFromDB`, `addTripPhoto`, `deleteTripPhoto`, `clearPendingSync`.
*   [split.js](file:///e:/Trip%20Split/js/split.js): Core mathematics. Calculates settlement logic, bill splitting, and per-person balances.
*   [planner.js](file:///e:/Trip%20Split/js/planner.js): Manages the itinerary timeline ("Bubbles & Plates" UI) and visit toggles.
*   [ai.js](file:///e:/Trip%20Split/js/ai.js): API bridge for Gemini AI itinerary generation.
*   [share.js](file:///e:/Trip%20Split/js/share.js): Native sharing API integration.
*   [presets.js](file:///e:/Trip%20Split/js/presets.js): **NEW.** Offline split preset manager. Stores named presets per trip in `tripsplit_presets` localStorage key. Key functions: `getPresetsForTrip`, `savePreset`, `deletePreset`, `getPresetForCategory`, `showManagePresetsModal`.

### 📂 /css (Styles)
*   [style.css](file:///e:/Trip%20Split/css/style.css): Global variables, animation keyframes (`splash-reveal`, `pulse-dot`), and premium component styles.

---

## 💾 5. Data Schema (`tripsplit_data`)

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
      "tripStartDate": "2026-06-01", "tripEndDate": "2026-06-05",
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

## 🛠️ 6. 9 Upgraded Features (v2)

| # | Feature | Mode | Where |
|---|---------|------|-------|
| F1 | Receipt Photo Capture | 💰 Split | Add Expense modal → camera input → `window._receiptImage` → stored on expense.receiptImage |
| F2 | Offline Sync Indicator | 🔗 Both | Hero card `#live-sync-indicator` → `updateSyncIndicator()` → reads `pendingSync` flag |
| F3 | Inline Expense Delete | 💰 Split | Home screen Recent Expenses → `deleteExpenseInline(id)` |
| F4 | Smart Split Presets | 💰 Split | Category dropdown change → `getPresetForCategory()` auto-checks participants. Manage via Settings → Split Presets |
| F5 | My Personal Tab | 💰 Split | "Me" nav button → `my-screen` → `loadMyData()` → profile name match → personal balance |
| F6 | Trip Templates | 🔗 Both | Trips screen "📋 TEMPLATE" button → `saveCurrentTripAsTemplate()`. Use via Settings → My Templates |
| F7 | Multi-Currency | 💰 Split | Add Expense → 💱 toggle → local amount + exchange rate → auto-calculates base amount |
| F8 | Recurring Expenses | 💰 Split | Add Expense → 🔄 checkbox → `createRecurringExpense()` → creates N daily copies |
| F9 | Memories Gallery | 🎒 Adviser | Plan screen → Memories tab → `loadGallery()` → `addTripPhoto()` → max 20 photos, 600px JPEG 0.65 |

---

## 🔄 7. Key Workflows

### 📊 CSV Export (Google Sheets Ready)
1.  User opens **Settings** > **Download for Google Sheets**.
2.  `showExportSelectionModal()` renders trip options.
3.  `exportTripToCSV()` flattens the nested JSON into a tabular structure with escaped characters.
4.  A `Blob` is generated and triggered as a download.

### ✨ AI Itinerary Planning
1.  User inputs a destination/theme.
2.  `askGeminiForPlan()` sends a prompt to the Gemini API.
3.  Returned JSON is parsed and mapped into the `itinerary` array in `db.js`.
4.  `planner.js` re-renders the "Bubbles" timeline.

### 💰 Settlement Logic
1.  `split.js` aggregates all expenses for the selected trip.
2.  Calculates total spent vs. per-person share.
3.  Generates a list of "who owes whom" to reach zero balance.
4.  Same algorithm is duplicated inside `loadMyData()` in `ui_engine.js` to show personal-view settlements on the Me screen.

### 🌐 Real-Time Cloud Sync & Collaboration
1.  **Identity:** Users set their profile (Name, Email) which is saved to the `profiles` table.
2.  **Sync:** Tapping "Live Sync" pushes local trip data to Supabase (`sync_trip` RPC) and generates a unique Share ID (e.g., `GOA-8492`).
3.  After successful cloud push, call `clearPendingSync()` to reset the sync indicator to "Synced".
4.  **Join:** Friends enter the Share ID in Settings > Join Trip. The app fetches the cloud bundle (`get_trip_data` RPC) and merges it locally.
5.  **WebSockets:** `subscribeToTripUpdates()` listens for changes. If another user edits an expense, the app updates silently and triggers a push notification.

---

## 🧱 8. Navigation Map

```
Bottom Nav:
  Home → home-screen → loadHomeData()
  List → expenses-screen → loadExpenses()
  [FAB +] context-aware action
  Plan → plan-screen → loadTripNotes() + switchPlanTab('itinerary')
       └ Gallery sub-tab → switchPlanTab('gallery') → loadGallery()
  Me  → my-screen → loadMyData()

  (Trips screen is accessible via trip capsule pill → showScreen('trips'))
```

---

## 🛠️ 9. Maintenance Checklist
*   **Version Control**: Script tags use `?v=12`. Increment on each deploy to bust browser cache.
*   **Asset Management**: Keep all icons in `/assets`. Use `icon-192.png` for splash/PWA.
*   **Styles**: Avoid inline styles. Use the token system in `style.css`.
*   **Persistence**: Always use `await` when calling `db.js` function to ensure data integrity before UI updates.
*   **Photos**: All photos are stored as Base64 JPEG on the trip object. Max 20 per trip. Enforced by `addTripPhoto()`.
*   **Sync Flag**: `saveData()` in `db.js` automatically sets `pendingSync = true`. Clear it by calling `clearPendingSync()` after a cloud push in `sync.js`.

---

*Last Updated: 2026-05-18 — v2 9-Feature Upgrade & Browser Interactive Verification Complete (100% Green)*
