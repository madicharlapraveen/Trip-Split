# TripSplit — Full Project Brain

TripSplit is a premium, privacy-first Progressive Web App (PWA) designed for modern travelers to manage expenses, plan itineraries, and settle group bills seamlessly.

---

## 🚀 1. Tech Stack & Architecture
*   **Core**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3.
*   **PWA**: Service Workers (v4) for offline support and manifest-driven mobile installation.
*   **Database**: Supabase (Postgres) for real-time synchronization and cloud persistence.
*   **Storage**: Local-first architecture using `localStorage` (Key: `tripsplit_data`) with background cloud syncing.
*   **Real-Time**: Supabase WebSockets (Channels) for instant collaboration across devices.
*   **Deployment**: Automated GitHub-to-Netlify workflow via `netlify.toml`.
*   **Identity**: Device-based identity with optional profile linking (Name, Email, Mobile).
*   **AI**: Integrated Google Gemini AI for automated trip itinerary generation.

---

## 🎨 2. Design System (Premium Aesthetics)
*   **Theme**: Glassmorphism (High-blur backdrops, subtle border-glows).
*   **Typography**: `Outfit` (Google Fonts) for a modern, tech-forward feel.
*   **Palette**:
    *   **Primary**: Indigo-600 (`#4f46e5`) to Violet-700.
    *   **Success**: Emerald-500.
    *   **Warning**: Amber-500.
    *   **Neutral**: Slate-50 to Slate-900.
*   **Key Components**:
    *   **Floating Dock**: Sticky navigation bar with side-scrolling capsule indicators and a center FAB.
    *   **Glass Modals**: Centered, scale-in animated overlays.
    *   **Splash Screen**: 1.5s reveal animation with brand icon.

---

## 🗺️ 3. Module Map (File Architecture)

### 📂 Root Files
*   [index.html](file:///e:/Trip%20Split/index.html): Main layout, screen sections, and shared modal overlays.
*   [service-worker.js](file:///e:/Trip%20Split/service-worker.js): Caching logic for offline functionality.
*   [manifest.json](file:///e:/Trip%20Split/manifest.json): PWA configuration and brand assets.

### 📂 /js (Logic)
*   [app.js](file:///e:/Trip%20Split/js/app.js): Orchestrates app lifecycle, splash screen timing, and PWA install prompts.
*   [ui_engine.js](file:///e:/Trip%20Split/js/ui_engine.js): **The Engine.** Manages screen switching, modal rendering, navigation highlighting, and the premium glassmorphism settings hub.
*   [sync.js](file:///e:/Trip%20Split/js/sync.js): **The Cloud Bridge.** Handles Supabase authentication, real-time WebSockets, push notification subscriptions, and cloud-to-local data merging.
*   [db.js](file:///e:/Trip%20Split/js/db.js): Data access layer. Handles all `localStorage` CRUD operations for Trips, Expenses, and Participants.
*   [split.js](file:///e:/Trip%20Split/js/split.js): Core mathematics. Calculates settlement logic, bill splitting, and per-person balances.
*   [planner.js](file:///e:/Trip%20Split/js/planner.js): Manages the itinerary timeline ("Bubbles & Plates" UI) and visit toggles.
*   [ai.js](file:///e:/Trip%20Split/js/ai.js): API bridge for Gemini AI itinerary generation.
*   [share.js](file:///e:/Trip%20Split/js/share.js): Native sharing API integration.

### 📂 /css (Styles)
*   [style.css](file:///e:/Trip%20Split/css/style.css): Global variables, animation keyframes (`splash-reveal`, `pulse-dot`), and premium component styles.

---

## 💾 4. Data Schema (`tripsplit_data`)
The entire app state is a JSON object stored under a single key.

```json
{
  "trips": [
    {
      "id": 123456789,
      "tripName": "Goa Trip",
      "createdAt": "2024-05-15T...",
      "notes": "Annual trip with college friends",
      "participants": [
        { "id": "p1", "name": "Alice", "familyCount": 1, "phone": "..." }
      ],
      "expenses": [
        { "id": "e1", "description": "Dinner", "amount": 1200, "paidBy": "p1", "splitType": "equal" }
      ],
      "itinerary": [
        { "placeName": "Beach Club", "time": "18:00", "notes": "Sunset views", "visited": false }
      ]
    }
  ],
  "currentTripId": 123456789
}
```

---

## 🔄 5. Key Workflows

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

### 🌐 Real-Time Cloud Sync & Collaboration
1.  **Identity:** Users set their profile (Name, Email) which is saved to the `profiles` table.
2.  **Sync:** Tapping "Live Sync" pushes local trip data to Supabase (`sync_trip` RPC) and generates a unique Share ID (e.g., `GOA-8492`).
3.  **Join:** Friends enter the Share ID in Settings > Join Trip. The app fetches the cloud bundle (`get_trip_data` RPC) and merges it locally.
4.  **WebSockets:** `subscribeToTripUpdates()` listens for changes. If another user edits an expense, the app updates silently and triggers a push notification.
5.  **Permissions:** Trip owners can manage editors via the `permissions` table, toggling roles between `viewer` and `editor`.

---

## 🛠️ 6. Maintenance Checklist
*   **Version Control**: Always push to `main` for Netlify deployments.
*   **Asset Management**: Keep all icons in `/assets`. Use `icon-192.png` for splash/PWA.
*   **Styles**: Avoid inline styles. Use the token system in `style.css`.
*   **Persistence**: Always use `await` when calling `db.js` function to ensure data integrity before UI updates.

---

*Last Updated: 2026-05-15*
