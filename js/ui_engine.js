// ui_engine.js - Consolidated PWA Modernized UI Engine
console.log('ui_engine.js loading...');

// Global App State
let currentScreen = 'home';
window.currentAppMode = localStorage.getItem('tripsplit_app_mode') || 'split';

// ── Theme Engine ─────────────────────────────────────────────────────────────
(function applyAppTheme() {
  localStorage.setItem('tripsplit_theme', 'light');
  document.documentElement.classList.add('light-mode');
  document.body.classList.add('light-mode');
  
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', '#f0f4ff');
})();

window.toggleAppTheme = function() {
  console.log('Theme is locked to Light Mode.');
};
// ─────────────────────────────────────────────────────────────────────────────


// Dynamic Trip Cover Photo Helper
window.getTripCoverPhoto = function(tripName) {
  const name = (tripName || '').toLowerCase();
  if (name.includes('beach') || name.includes('sea') || name.includes('goa') || name.includes('bali') || name.includes('island') || name.includes('ocean') || name.includes('vizag') || name.includes('kerala')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('mountain') || name.includes('hill') || name.includes('snow') || name.includes('trek') || name.includes('himalaya') || name.includes('manali') || name.includes('ooty') || name.includes('coorg')) {
    return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('city') || name.includes('urban') || name.includes('london') || name.includes('paris') || name.includes('tokyo') || name.includes('ny') || name.includes('shopping') || name.includes('delhi') || name.includes('mumbai') || name.includes('bangalore')) {
    return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('road') || name.includes('drive') || name.includes('trip') || name.includes('car') || name.includes('bike') || name.includes('highway')) {
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('nature') || name.includes('forest') || name.includes('camp') || name.includes('green') || name.includes('jungle') || name.includes('waterfall') || name.includes('lake')) {
    return 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=80';
  }
  // Default premium travel scenery background
  return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
};

// Beautiful overlapping avatars renderer
window.renderAvatarsHtml = function(participants, maxCount = 3) {
  if (!participants || participants.length === 0) {
    return `<div class="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[9px] text-slate-400 font-bold">👤</div>`;
  }
  let html = '';
  participants.slice(0, maxCount).forEach((p) => {
    const colors = [
      'bg-indigo-600 text-indigo-100',
      'bg-purple-600 text-purple-100',
      'bg-rose-600 text-rose-100',
      'bg-emerald-600 text-emerald-100',
      'bg-amber-600 text-amber-100',
      'bg-cyan-600 text-cyan-100'
    ];
    const colorIndex = p.name.charCodeAt(0) % colors.length;
    const initials = p.name.charAt(0).toUpperCase();
    html += `
      <div class="w-6 h-6 rounded-full border border-[#1f1f23] ${colors[colorIndex]} flex items-center justify-center text-[9px] font-bold shadow-sm" style="margin-left:-4px;" title="${p.name}">
        ${initials}
      </div>
    `;
  });
  if (participants.length > maxCount) {
    html += `
      <div class="w-6 h-6 rounded-full border border-[#1f1f23] bg-zinc-800 text-slate-400 flex items-center justify-center text-[9px] font-bold shadow-sm" style="margin-left:-4px;">
        +${participants.length - maxCount}
      </div>
    `;
  }
  return `<div class="flex pl-1.5 items-center">${html}</div>`;
};

// Favorites Toggle Helper
window.toggleFavoriteTrip = function(tripId, event) {
  if (event) event.stopPropagation();
  let favorites = JSON.parse(localStorage.getItem('tripsplit_favorites') || '[]');
  const tripIdStr = String(tripId);
  const index = favorites.indexOf(tripIdStr);
  if (index === -1) {
    favorites.push(tripIdStr);
    if (window.showToast) window.showToast('Added to Favorites ❤️', 'success');
  } else {
    favorites.splice(index, 1);
    if (window.showToast) window.showToast('Removed from Favorites', 'info');
  }
  localStorage.setItem('tripsplit_favorites', JSON.stringify(favorites));
  if (typeof loadTrips === 'function') loadTrips();
};

// Supported Currencies List (F7)
const CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' }
];

// Navigation Flow
window.showScreen = function(screenId) {
  console.log('Switching to screen:', screenId);
  
  // Hide all screens
  document.querySelectorAll('section[id$="-screen"]').forEach(section => {
    section.style.display = 'none';
    section.classList.add('hidden');
  });

  // Show selected screen
  const screen = document.getElementById(`${screenId}-screen`);
  if (screen) {
    screen.style.display = 'flex';
    screen.classList.remove('hidden');
    screen.classList.add('animate-fade-in');
  }

  // Update bottom navigation bar buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('nav-active');
  });

  const activeBtn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('nav-active');
  }

  // Top Capsule Container Visibility (only home, expenses, or split tabs)
  const capsuleContainer = document.getElementById('trips-capsule-container');
  if (capsuleContainer) {
    if (['home', 'expenses', 'split'].includes(screenId)) {
      capsuleContainer.classList.remove('hidden');
      loadTripsCapsules();
    } else {
      capsuleContainer.classList.add('hidden');
    }
  }

  // Load screen-specific data
  if (screenId === 'home') loadHomeData();
  if (screenId === 'expenses') loadExpenses();
  if (screenId === 'plan') {
    loadTripNotes();
    // Force leaflet to recalculate after becoming visible
    setTimeout(() => { if (window.leafletMap) window.leafletMap.invalidateSize(); }, 250);
  }
  if (screenId === 'split') calculateSplit();
  if (screenId === 'trips') loadTrips();
  if (screenId === 'my') loadMyData();

  // Contextual Global FAB binding
  updateCenterFAB(screenId);

  currentScreen = screenId;
};

// Contextual Floating Action Button updates
async function updateCenterFAB(screenId) {
  const fab = document.getElementById('fab');
  if (!fab) return;

  const canEdit = typeof window.canEditCurrentTrip === 'function' ? await window.canEditCurrentTrip() : true;

  if (screenId !== 'trips' && !canEdit) {
      fab.style.display = 'none';
      return;
  } else {
      fab.style.display = 'flex';
  }

  fab.innerHTML = '';
  let iconHTML = '';
  let action = () => {};

  switch(screenId) {
    case 'expenses':
      iconHTML = '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>';
      action = showAddExpenseModal;
      break;
    case 'plan':
      iconHTML = '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>';
      action = () => {
        const dropdown = document.getElementById('ai-dropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
      };
      break;
    case 'trips':
      iconHTML = '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>';
      action = showCreateTripModal;
      break;
    default:
      iconHTML = '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>';
      action = showCreateTripModal;
  }

  fab.innerHTML = iconHTML;
  const newFab = fab.cloneNode(true);
  fab.parentNode.replaceChild(newFab, fab);
  newFab.addEventListener('click', action);
}

// Modal Base Panels
window.showModal = function(content) {
  const modalContent = document.getElementById('modal-content');
  const modalOverlay = document.getElementById('modal-overlay');
  
  if (modalContent && modalOverlay) {
    modalContent.innerHTML = content;
    modalOverlay.style.display = 'flex';
    modalOverlay.classList.remove('hidden');
    setTimeout(() => modalOverlay.classList.add('active'), 10);
    document.body.style.overflow = 'hidden'; // Stop background scrolling
  }
};

window.hideModal = function() {
  if (window.isModalMandatory) return; // Prevent closing mandatory modals
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
      modalOverlay.classList.add('hidden');
      modalOverlay.style.display = 'none';
      document.body.style.overflow = 'auto';
    }, 300);
  }
};

// Premium Toast Alert system (Dark Theme)
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '🔔';
  
  // Dark matte toast colors
  let bgColor, borderColor, textColor;
  if (type === 'success') {
    bgColor = 'rgba(16, 185, 129, 0.12)';
    borderColor = 'rgba(16, 185, 129, 0.25)';
    textColor = '#6ee7b7'; // emerald-300
  } else if (type === 'error') {
    bgColor = 'rgba(239, 68, 68, 0.12)';
    borderColor = 'rgba(239, 68, 68, 0.25)';
    textColor = '#fca5a5'; // rose-300
  } else {
    bgColor = 'rgba(30, 30, 36, 0.95)';
    borderColor = 'rgba(255, 255, 255, 0.1)';
    textColor = '#e2e8f0'; // slate-200
  }
  
  toast.style.cssText = `
    background: ${bgColor};
    border: 1px solid ${borderColor};
    color: ${textColor};
    padding: 14px 16px;
    border-radius: 18px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: translateY(-20px);
    opacity: 0;
    font-family: 'Outfit', sans-serif;
  `;
  toast.innerHTML = `
    <div style="font-size:18px; flex-shrink:0; margin-top:1px;">${icon}</div>
    <div style="flex:1; font-weight:700; font-size:13px; line-height:1.4;">${message}</div>
  `;
  
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });
  
  setTimeout(() => {
    toast.style.transform = 'translateY(-20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
};

// Rich Expense Notification — iOS-style banner for real-time expense updates
window.showRichExpenseNotification = function(actorName, expenseTitle, amount, category, onTap) {
  // Remove existing banner if any
  const existing = document.getElementById('rich-notif-banner');
  if (existing) existing.remove();

  const categoryEmoji = {
    food: '🍽️', transport: '🚗', hotel: '🏨', accommodation: '🏨',
    activity: '🎭', entertainment: '🎉', shopping: '🛍️', health: '💊',
    emergency: '🚨', other: '📌', misc: '📌', fuel: '⛽'
  };
  const icon = categoryEmoji[(category || 'other').toLowerCase()] || '💸';

  const banner = document.createElement('div');
  banner.id = 'rich-notif-banner';
  banner.className = 'rich-notification';
  banner.innerHTML = `
    <div class="rich-notification-card" onclick="this.closest('.rich-notification').remove(); ${onTap ? '(' + onTap.toString() + ')()' : ''}">
      <div class="rich-notification-icon">${icon}</div>
      <div class="rich-notification-body">
        <div class="rich-notification-title">TripSplit • New Expense</div>
        <div class="rich-notification-headline">${expenseTitle || 'Expense Added'}</div>
        <div class="rich-notification-sub">${actorName} added · Tap to view details</div>
      </div>
      <div class="rich-notification-amount">${amount}</div>
    </div>
  `;

  document.body.appendChild(banner);
  
  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('show'));
  });

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 600);
  }, 6000);
};

// Sync status dot & sync trigger (F2)
window.updateLiveStatusIndicator = function(isSynced) {
  const el = document.getElementById('live-sync-indicator');
  if (!el) return;
  
  const pendingSync = typeof data !== 'undefined' && data.pendingSync;
  
  if (!navigator.onLine) {
    el.className = "flex items-center gap-1.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all";
    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>Offline`;
  } else if (isSynced === false || pendingSync) {
    el.className = "flex items-center gap-1.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all";
    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>Pending`;
  } else {
    el.className = "flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all";
    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Synced`;
  }
};

window.addEventListener('online', () => updateLiveStatusIndicator(true));
window.addEventListener('offline', () => updateLiveStatusIndicator(false));

// Load active trip capsules at the top header
async function loadTripsCapsules() {
  const trips = await getTrips();
  const container = document.getElementById('trips-capsule-container');
  if (!container) return;

  container.innerHTML = '';
  trips.forEach(trip => {
    const isActive = String(currentTripId) === String(trip.id);
    const capsule = document.createElement('button');
    capsule.onclick = () => selectTrip(trip.id);
    capsule.style.cssText = isActive
      ? 'background: var(--primary-gradient); color: white; box-shadow: 0 4px 12px rgba(79,70,229,0.4); transform: scale(1.05);'
      : 'background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.08);';
    capsule.className = `flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all`;
    capsule.textContent = trip.tripName;
    container.appendChild(capsule);
  });
}

// Select trip modal dialog
window.showTripSelectionModal = function() {
  getTrips().then(trips => {
    let content = `
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-slate-800">Select Trip</h3>
        <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;
    
    if (trips.length === 0) {
      content += `
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          </div>
          <p class="text-slate-500 mb-6">No trips found. Start by creating your first adventure!</p>
          <button onclick="showCreateTripModal()" class="w-full btn-primary py-4">Create First Trip</button>
        </div>
      `;
    } else {
      content += '<div class="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">';
      trips.forEach(trip => {
        content += `
          <button onclick="selectTrip('${trip.id}')" class="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl border-2 border-transparent hover:border-indigo-100 transition-all group">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-bold text-slate-800 group-hover:text-indigo-700">${trip.tripName}</p>
                <p class="text-xs text-slate-400 mt-1">${new Date(trip.createdAt).toLocaleDateString()}</p>
              </div>
              <svg class="w-5 h-5 text-slate-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
          </button>`;
      });
      content += '</div>';
      content += '<button onclick="showCreateTripModal()" class="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-2xl mt-6 hover:bg-slate-200 transition-colors">Create New Trip</button>';
    }
      const content = `
    <h3 class="text-xl font-bold mb-6 text-slate-800">New Trip</h3>
    <form id="create-trip-form" class="space-y-5">
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trip Name</label>
        <input type="text" id="trip-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="E.g. Goa Trip 2024" required>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Budget</label>
          <input type="number" id="trip-budget" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="0.00" min="0" step="0.01">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Base Currency</label>
          <select id="trip-currency" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all">
            ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === 'INR' ? 'selected' : ''}>${c.code} (${c.symbol})</option>`).join('')}
          </select>
        </div>
      </div>

      ${templates.length > 0 ? `
      <div class="p-4 bg-orange-50 rounded-2xl border border-orange-100">
        <label class="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">⚡ Start from Template</label>
        <select id="create-trip-template" class="w-full p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-orange-500 transition-all text-orange-900 font-medium">
          <option value="">-- Fresh Trip --</option>
          ${templatesOptions}
        </select>
      </div>
      ` : ''}

      <div class="mb-4">
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trip Style</label>
        <div class="grid grid-cols-2 gap-3" id="trip-style-container">
          <label class="cursor-pointer relative">
            <input type="radio" name="tripType" value="multi_payer" class="peer sr-only" checked>
            <div class="h-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl peer-checked:border-indigo-500 peer-checked:bg-indigo-50 transition-all">
              <div class="font-bold text-slate-800 mb-1">👥 Friends Split</div>
              <div class="text-[11px] text-slate-500 leading-tight">Anyone can pay. Settle with anyone.</div>
            </div>
          </label>
          <label class="cursor-pointer relative">
            <input type="radio" name="tripType" value="single_payer" class="peer sr-only">
            <div class="h-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl peer-checked:border-indigo-500 peer-checked:bg-indigo-50 transition-all">
              <div class="font-bold text-slate-800 mb-1">👑 Leader-Led</div>
              <div class="text-[11px] text-slate-500 leading-tight">One manager. All owe the leader.</div>
            </div>
          </label>
        </div>
      </div>

      <div id="leader-selection-container" class="hidden mb-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
        <label class="block text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Select Trip Leader</label>
        <select id="trip-leader-select" class="w-full p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all">
          <option value="creator">Me (Creator)</option>
        </select>
        <p class="text-[10px] text-indigo-600 mt-2">All expenses and debts will be routed to this person.</p>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes (Optional)</label>
        <textarea id="trip-notes-input" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" rows="2" placeholder="Brief description..."></textarea>
      </div>
      <div class="flex space-x-3 pt-2">
        <button type="submit" class="flex-1 btn-primary py-4">Create Trip</button>
        <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
      </div>
    </form>
  `;
  showModal(content);

  setTimeout(() => {
    const tripTypeRadios = document.querySelectorAll('input[name="tripType"]');
    const leaderContainer = document.getElementById('leader-selection-container');
    const templateSelect = document.getElementById('create-trip-template');
    const leaderSelect = document.getElementById('trip-leader-select');

    if (tripTypeRadios) {
      tripTypeRadios.forEach(r => r.addEventListener('change', (e) => {
        if (e.target.value === 'single_payer') {
          leaderContainer.classList.remove('hidden');
        } else {
          leaderContainer.classList.add('hidden');
        }
      }));
    }

    if (templateSelect && leaderSelect) {
      templateSelect.addEventListener('change', async (e) => {
        const tId = Number(e.target.value);
        leaderSelect.innerHTML = '<option value="creator">Me (Creator)</option>';
        if (tId && typeof getTemplates === 'function') {
          const list = await getTemplates();
          const t = list.find(x => x.id === tId);
          if (t && t.crew) {
             t.crew.forEach((c, idx) => {
                leaderSelect.innerHTML += \`<option value="template_crew_\${idx}">\${c.name}</option>\`;
             });
          }
        }
      });
    }
  }, 50);on..."></textarea>
      </div>
      <div class="flex space-x-3 pt-4">
        <button type="submit" class="flex-1 btn-primary py-4">Create Trip</button>
        <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
      </div>
    </form>
  `;
  showModal(content);

  document.getElementById('create-trip-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tripName = document.getElementById('trip-name').value.trim();
    const budget = parseFloat(document.getElementById('trip-budget').value) || 0;
    const notes = document.getElementById('trip-notes-input').value.trim();
    const currencyCode = document.getElementById('trip-currency').value;
    const currencyObj = CURRENCIES.find(c => c.code === currencyCode) || { code: 'INR', symbol: '₹' };

    const templateSelect = document.getElementById('create-trip-template');
    const selectedTemplateId = templateSelect ? Number(templateSelect.value) : null;
    
    const tripTypeElement = document.querySelector('input[name="tripType"]:checked');
    const tripType = tripTypeElement ? tripTypeElement.value : 'multi_payer';
    const leaderSelection = document.getElementById('trip-leader-select') ? document.getElementById('trip-leader-select').value : 'creator';

    if (tripName) {
      let tripId;
      if (selectedTemplateId && typeof getTemplates === 'function') {
        const list = await getTemplates();
        const template = list.find(t => t.id === selectedTemplateId);
        if (template) {
          tripId = await addTrip({
            tripName: tripName,
            notes: notes || `Created from template: ${template.name}`,
            estimatedBudget: budget || template.estimatedBudget,
            currency: template.currency || currencyObj.code,
            currencySymbol: template.currencySymbol || currencyObj.symbol,
            itinerary: template.itinerary || [],
            tripType: tripType,
            isClosed: false,
            leaderId: 'creator' // Will update below if a specific member was selected
          });
          
          let actualLeaderId = null;

          // Auto add crew from template
          if (template.crew && template.crew.length > 0) {
            for (let idx = 0; idx < template.crew.length; idx++) {
              const member = template.crew[idx];
              const pId = await addParticipant({
                tripId: tripId,
                name: member.name,
                phone: '',
                familyCount: member.familyCount || 1
              });
              if (leaderSelection === `template_crew_${idx}`) {
                 actualLeaderId = pId;
              }
            }
          }
          
          if (actualLeaderId) {
             await updateTrip(tripId, { leaderId: actualLeaderId });
          }

          if (window.showToast) window.showToast('Created trip from template! Crew loaded. ✅', 'success');
        }
      } else {
        tripId = await addTrip({ 
          tripName, 
          notes, 
          estimatedBudget: budget, 
          currency: currencyObj.code, 
          currencySymbol: currencyObj.symbol,
          tripType: tripType,
          isClosed: false,
          leaderId: 'creator'
        });
      }
      
      hideModal();
      loadTrips();
      selectTrip(tripId);
    }
  });
};

// Add Participant Modal
window.showAddParticipantModal = async function() {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify participants.');
    if (!currentTripId) {
        showTripSelectionModal();
        return;
    }

  const content = `
    <h3 class="text-xl font-bold mb-6 text-slate-800">Add Participant</h3>
    <form id="add-participant-form" class="space-y-5">
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
        <input type="text" id="participant-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="John Doe" required>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone</label>
          <input type="tel" id="participant-phone" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="+91...">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Family Size (Self + others)</label>
          <input type="number" id="participant-family" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="1" value="1">
        </div>
      </div>
      <div class="flex space-x-3 pt-4">
        <button type="submit" class="flex-1 btn-primary py-4">Add Member</button>
        <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
      </div>
    </form>
  `;
  showModal(content);

  document.getElementById('add-participant-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('participant-name').value.trim();
    const phone = document.getElementById('participant-phone').value.trim();
    const familyCount = parseInt(document.getElementById('participant-family').value) || 1;

    if (name) {
      await addParticipant({ tripId: currentTripId, name, phone, familyCount });
      hideModal();
      loadHomeData();
    }
  });
};

// Add Expense Modal
window.showAddExpenseModal = async function() {
    if (!currentTripId) {
        showTripSelectionModal();
        return;
    }
    const trip = await getTrip(currentTripId);
    if (trip && trip.isClosed) return alert('This trip is closed. You must reopen it to add new expenses.');
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify expenses.');

  getParticipants(currentTripId).then(participants => {
    if (participants.length === 0) {
        alert('Please add at least one participant first');
        showAddParticipantModal();
        return;
    }

    const participantOptions = participants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    const baseSymbol = window.currentTripSymbol || '₹';

    const content = `
      <h3 class="text-xl font-bold mb-6 text-slate-800">New Expense</h3>
      <form id="add-expense-form" class="space-y-5">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What did you pay for?</label>
          <input type="text" id="expense-title" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Lunch, Fuel, etc." required>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Price (${baseSymbol})</label>
            <input type="number" id="expense-total" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="0" step="0.01" placeholder="0.00" oninput="calculateForeignAmount()" required>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Advance Paid (${baseSymbol})</label>
            <input type="number" id="expense-advance" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="0" step="0.01" value="0" oninput="calculateForeignAmount()">
          </div>
        </div>
        
        <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center text-xs font-bold text-slate-600">
            <span class="uppercase tracking-widest text-[10px]">Payment Summary</span>
            <span id="remaining-amount" class="text-rose-500 font-extrabold">Remaining: ${baseSymbol}0.00</span>
        </div>

        <!-- F7: Foreign Currency Support -->
        <div class="p-4 bg-slate-100/50 rounded-2xl space-y-4">
          <label class="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-600 uppercase tracking-wider">
            <input type="checkbox" id="expense-foreign-toggle" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" onchange="toggleForeignCurrencyFields()">
            <span>Paid in Foreign Currency?</span>
          </label>
          <div id="foreign-currency-fields" class="hidden grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Currency Code</label>
              <select id="expense-foreign-currency" class="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold" onchange="calculateForeignAmount()">
                ${CURRENCIES.map(c => `<option value="${c.code}">${c.code} (${c.symbol})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rate (1 Foreign = ? Base)</label>
              <input type="number" id="expense-exchange-rate" class="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold" min="0" step="0.0001" placeholder="Exchange rate" oninput="calculateForeignAmount()">
            </div>
          </div>
        </div>

        <!-- F8: Recurring Expense -->
        <div class="p-4 bg-slate-100/50 rounded-2xl space-y-3">
          <label class="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-600 uppercase tracking-wider">
            <input type="checkbox" id="expense-recurring-toggle" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" onchange="toggleRecurringFields()">
            <span>🔄 Repeat Daily?</span>
          </label>
          <div id="recurring-fields" class="hidden">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Repeat For How Many Days? (Max 7)</label>
            <input type="number" id="expense-recurring-days" class="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold" min="1" max="7" value="3">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <select id="expense-category" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" required>
              <option value="Others" selected>Others</option>
              <option value="Food">Food</option>
              <option value="Fuel">Fuel</option>
              <option value="Hotel">Hotel</option>
              <option value="Shopping">Shopping</option>
              <option value="Tickets">Tickets</option>
              <option value="Emergency">Emergency</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Paid By</label>
            <select id="expense-paid-by" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" required>
              ${participantOptions}
            </select>
          </div>
        </div>

        <div id="manual-category-container" class="hidden">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Manual Category Name</label>
          <input type="text" id="manual-category" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="E.g. Toll, Laundry">
        </div>

        <!-- Collapsible Dropdown split checklist -->
        <div>
          <button type="button" onclick="toggleSplitWithContainer()" class="w-full p-4 bg-slate-50 rounded-2xl flex justify-between items-center text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
              <span>👥 Split With: All Crew (Tap to customize)</span>
              <svg id="split-arrow" class="w-4 h-4 transform transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          
          <div id="split-with-collapsible" class="hidden mt-3 p-3 bg-slate-50 rounded-2xl space-y-3">
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Crew Members</span>
              <div class="flex gap-2">
                <button type="button" onclick="toggleSelectAllAddParticipants(true)" class="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-wider">Select All</button>
                <span class="text-slate-300">|</span>
                <button type="button" onclick="toggleSelectAllAddParticipants(false)" class="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider">Clear</button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto no-scrollbar p-1">
              ${participants.map(p => `
                <label class="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-slate-100 cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  <input type="checkbox" name="add-split-participant" value="${p.id}" checked class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                  <span class="truncate">${p.name}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="flex space-x-3 pt-4">
          <button type="submit" class="w-full btn-primary py-4">Add Expense</button>
          <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
        </div>
      </form>
    `;
    showModal(content);

    const categorySelect = document.getElementById('expense-category');
    const manualContainer = document.getElementById('manual-category-container');
    
    categorySelect.addEventListener('change', () => {
      const val = categorySelect.value;
      manualContainer.classList.toggle('hidden', val !== 'Others');
      
      // Wire F4 Split Presets
      if (typeof getPresetForCategory === 'function') {
        const preset = getPresetForCategory(currentTripId, val);
        if (preset) {
          document.querySelectorAll('input[name="add-split-participant"]').forEach(cb => {
            cb.checked = preset.participantIds.includes(Number(cb.value));
          });
          if (window.showToast) window.showToast(`Preset auto-applied for ${val} ⚡`, 'success');
        }
      }
    });

    document.getElementById('add-expense-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('expense-title').value.trim();
      let totalAmount = parseFloat(document.getElementById('expense-total').value);
      let advancePay = parseFloat(document.getElementById('expense-advance').value) || 0;
      let category = document.getElementById('expense-category').value;
      const paidBy = Number(document.getElementById('expense-paid-by').value);

      const splitCheckboxes = document.querySelectorAll('input[name="add-split-participant"]:checked');
      const splitBetween = Array.from(splitCheckboxes).map(cb => Number(cb.value));

      if (splitBetween.length === 0) {
        alert('You must select at least one person to split with.');
        return;
      }

      if (category === 'Others') {
        const manual = document.getElementById('manual-category').value.trim();
        category = manual || 'Others';
      }

      // Foreign Exchange calculations
      const foreignToggle = document.getElementById('expense-foreign-toggle');
      if (foreignToggle && foreignToggle.checked) {
        const rate = parseFloat(document.getElementById('expense-exchange-rate').value) || 1;
        totalAmount = totalAmount * rate;
        advancePay = advancePay * rate;
      }

      const isRecurring = document.getElementById('expense-recurring-toggle').checked;
      const recurringDays = isRecurring ? Math.min(Number(document.getElementById('expense-recurring-days').value) || 1, 7) : 1;

      if (title && totalAmount > 0) {
        if (isRecurring && recurringDays > 1) {
          const tempParentId = Date.now() + Math.floor(Math.random() * 1000);
          for (let i = 0; i < recurringDays; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            
            await addExpense({
              tripId: currentTripId,
              title: `${title} (Day ${i + 1})`,
              amount: totalAmount,
              totalAmount: totalAmount,
              advancePay: advancePay,
              category: category,
              paidBy: paidBy,
              splitBetween: splitBetween,
              createdAt: d.toISOString(),
              isRecurring: true,
              recurringDayIndex: i,
              parentRecurringId: i === 0 ? null : tempParentId
            });
          }
          if (window.showToast) window.showToast(`Added recurring expense for ${recurringDays} days! 🔄`, 'success');
        } else {
          await addExpense({ 
            tripId: currentTripId, 
            title, 
            amount: totalAmount, 
            totalAmount, 
            advancePay, 
            category, 
            paidBy, 
            splitBetween 
          });
        }
        hideModal();
        loadHomeData();
        loadExpenses();
        if (typeof calculateSplit === 'function') calculateSplit(); // instantly refresh split numbers
        if (window.showToast) window.showToast('Expense added! Calculations refreshed.', 'success');
      }
    });
  });
};

// Collapsible helper buttons
window.toggleSplitWithContainer = function() {
  const container = document.getElementById('split-with-collapsible');
  const arrow = document.getElementById('split-arrow');
  if (container) {
    container.classList.toggle('hidden');
    if (arrow) {
      arrow.style.transform = container.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  }
};

window.toggleSelectAllAddParticipants = function(checked) {
  document.querySelectorAll('input[name="add-split-participant"]').forEach(cb => {
    cb.checked = checked;
  });
};

window.toggleSelectAllParticipants = function(checked) {
  document.querySelectorAll('input[name="split-participant"]').forEach(cb => {
    cb.checked = checked;
  });
};

window.toggleForeignCurrencyFields = function() {
  const toggle = document.getElementById('expense-foreign-toggle');
  const fields = document.getElementById('foreign-currency-fields');
  if (toggle && fields) {
    fields.classList.toggle('hidden', !toggle.checked);
  }
};

window.calculateForeignAmount = function() {
  const toggle = document.getElementById('expense-foreign-toggle');
  const totalInput = document.getElementById('expense-total');
  const advanceInput = document.getElementById('expense-advance');
  const rateInput = document.getElementById('expense-exchange-rate');
  const remDisplay = document.getElementById('remaining-amount');
  const tripSymbol = window.currentTripSymbol || '₹';
  
  if (toggle && toggle.checked) {
    const rate = parseFloat(rateInput.value) || 1;
    const foreignAmount = parseFloat(totalInput.value) || 0;
    const foreignAdvance = parseFloat(advanceInput.value) || 0;
    
    const baseAmount = foreignAmount * rate;
    const baseAdvance = foreignAdvance * rate;
    const baseRemaining = baseAmount - baseAdvance;
    
    remDisplay.innerHTML = `<span class="text-slate-400 font-normal">Base:</span> ${tripSymbol}${baseAmount.toFixed(2)} <span class="mx-1 font-normal text-slate-300">|</span> <span class="text-slate-400 font-normal">Rem:</span> ${tripSymbol}${baseRemaining.toFixed(2)}`;
  } else {
    calculateRemaining();
  }
};

window.toggleRecurringFields = function() {
  const toggle = document.getElementById('expense-recurring-toggle');
  const fields = document.getElementById('recurring-fields');
  if (toggle && fields) {
    fields.classList.toggle('hidden', !toggle.checked);
  }
};

// Calculate base remaining in Add modal (without foreign currency)
window.calculateRemaining = function() {
  const total = parseFloat(document.getElementById('expense-total').value) || 0;
  const advance = parseFloat(document.getElementById('expense-advance').value) || 0;
  const rem = document.getElementById('remaining-amount');
  const tripSymbol = window.currentTripSymbol || '₹';
  if (rem) rem.textContent = `Remaining: ${tripSymbol}${(total - advance).toFixed(2)}`;
};

// Load Home Page data
async function loadHomeData(silentModeSwitch = false) {
  const participantsList = document.getElementById('participants-list');
  
  if (!currentTripId) {
    document.getElementById('current-trip-name').textContent = 'No trip selected';
    document.getElementById('total-expense').textContent = '₹0';
    if (participantsList) {
        participantsList.innerHTML = `
            <div class="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-4 min-w-[140px] flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-500 transition-all" onclick="showTripSelectionModal()">
                <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                <span class="text-xs font-medium">Select Trip</span>
            </div>`;
    }
    return;
  }

  const trip = await getTrip(currentTripId);
  const participants = await getParticipants(currentTripId);
  const allExpenses = await getExpenses(currentTripId);
  const expenses = allExpenses.filter(e => !e.isSettlement);

  const tripSymbol = trip ? (trip.currencySymbol || '₹') : '₹';
  window.currentTripSymbol = tripSymbol;
  const canEdit = trip ? (trip.myRole === 'owner' || trip.myRole === 'editor' || !trip.share_id) : true;

  // Active theme sync
  document.body.className = window.currentAppMode === 'adviser' ? 'theme-adviser' : 'theme-split';

  document.getElementById('current-trip-name').textContent = trip ? trip.tripName : 'No trip selected';
  const subtext = document.getElementById('trip-dates');
  if (subtext) {
      subtext.textContent = (trip && trip.notes) ? trip.notes : 'Manage your travel expenses';
  }

  // Dynamic Cover Photo Background for Active Hero Card
  const heroCard = document.querySelector('.hero-card');
  if (heroCard && trip) {
    const coverPhoto = window.getTripCoverPhoto(trip.tripName);
    heroCard.style.backgroundImage = `linear-gradient(180deg, rgba(18, 18, 20, 0.3) 0%, rgba(18, 18, 20, 0.9) 100%), url('${coverPhoto}')`;
    heroCard.style.backgroundSize = 'cover';
    heroCard.style.backgroundPosition = 'center';
    heroCard.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.4)';
  } else if (heroCard) {
    heroCard.style.backgroundImage = '';
    heroCard.style.boxShadow = '';
  }

  // Dynamic Overlapping Invite Card CTA
  let inviteCard = document.getElementById('home-invite-cta-card');
  if (trip) {
    if (!inviteCard) {
      inviteCard = document.createElement('div');
      inviteCard.id = 'home-invite-cta-card';
      inviteCard.className = 'relative flex items-center justify-between p-4 bg-[#1f1f23] border border-white/5 rounded-3xl mt-4 animate-slide-up';
      
      const homeQuickSettlement = document.getElementById('home-quick-settlement-card');
      if (homeQuickSettlement) {
        homeQuickSettlement.parentNode.insertBefore(inviteCard, homeQuickSettlement);
      }
    }
    
    const avatarsHtml = window.renderAvatarsHtml(participants, 3);
    inviteCard.innerHTML = `
      <div class="flex items-center gap-3">
        ${avatarsHtml}
        <div style="margin-left: 8px;">
          <p class="text-xs font-bold text-white">Share & Collaborate</p>
          <p class="text-[9px] text-slate-400">Invite your crew to track live expenses!</p>
        </div>
      </div>
      <button onclick="window.shareTripInvite()" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10">
        Invite
      </button>
    `;
    inviteCard.classList.remove('hidden');
  } else if (inviteCard) {
    inviteCard.classList.add('hidden');
  }

  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  document.getElementById('total-expense').textContent = `${tripSymbol}${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  // Update Share ID pill
  const idCol = document.getElementById('trip-id-pill');
  if (idCol) {
    if (trip && trip.share_id) {
        idCol.classList.remove('hidden');
        document.getElementById('display-share-id').textContent = trip.share_id;
    } else {
        idCol.classList.add('hidden');
    }
  }

  // Update budget progress layout
  const budget = trip ? (trip.estimatedBudget || 0) : 0;
  document.getElementById('display-budget').textContent = `${tripSymbol}${budget.toLocaleString('en-IN')}`;

  // F2 Sync indicator status
  updateLiveStatusIndicator();

  // F2 Small stats display inside split mode (Budget / Exp Count)
  const statsDisplay = document.getElementById('split-mode-stats');
  if (statsDisplay) {
    statsDisplay.textContent = `Exp count: ${expenses.length}`;
    if (window.currentAppMode === 'split') statsDisplay.classList.remove('hidden');
    else statsDisplay.classList.add('hidden');
  }

  // Populate Adviser Mode widgets if active
  const itineraryPreview = document.getElementById('adviser-itinerary-preview');
  if (itineraryPreview) {
    itineraryPreview.innerHTML = '';
    const itinerary = (trip && trip.itinerary) ? trip.itinerary : [];
    if (itinerary.length === 0) {
      itineraryPreview.innerHTML = '<p class="text-slate-400 text-xs italic py-2">Roadmap is empty. Go to Plan to add places.</p>';
    } else {
      itinerary.slice(0, 3).forEach(item => {
        const div = document.createElement('div');
        div.className = 'relative flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100/50';
        div.innerHTML = `
          <div>
            <h4 class="font-bold text-slate-700 text-xs ${item.visited ? 'line-through text-slate-400/80' : ''}">${item.placeName}</h4>
            <p class="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">${item.time || 'Anytime'}</p>
          </div>
          ${item.visited ? '<span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-full">Visited</span>' : '<span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-100 px-2 py-0.5 rounded-full">Planned</span>'}
        `;
        itineraryPreview.appendChild(div);
      });
      if (itinerary.length > 3) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'text-center text-[10px] font-black text-indigo-600 uppercase tracking-wider py-2 cursor-pointer hover:text-indigo-700 transition-colors';
        moreDiv.onclick = () => showScreen('plan');
        moreDiv.textContent = `+ ${itinerary.length - 3} more stops`;
        itineraryPreview.appendChild(moreDiv);
      }
    }
  }

  const adviserNotesContent = document.getElementById('adviser-notes-content');
  if (adviserNotesContent) {
    if (trip && trip.notes && trip.notes.trim() !== '') {
      adviserNotesContent.textContent = trip.notes;
    } else {
      adviserNotesContent.textContent = 'No guidelines or checklists added yet. Tap edit at the top to add trip parameters or notes.';
    }
  }

  // Header profile letter sync
  const profileDiv = document.getElementById('header-profile');
  if (profileDiv) {
    getUserProfile().then(profile => {
      if (profile && profile.name) {
        profileDiv.textContent = profile.name.charAt(0).toUpperCase();
      } else {
        profileDiv.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
      }
    });
  }

  const budgetContainer = document.getElementById('budget-progress-container');
  if (budgetContainer) {
    if (budget > 0 && window.currentAppMode === 'split') {
        budgetContainer.classList.remove('hidden');
        const percentage = Math.min((totalExpense / budget) * 100, 100);
        const progressBar = document.getElementById('budget-progress-bar');
        const percentageText = document.getElementById('budget-percentage');
        
        if (percentageText) percentageText.textContent = `${Math.round((totalExpense / budget) * 100)}%`;
        if (progressBar) progressBar.style.width = `${percentage}%`;
        
        const statusText = document.getElementById('budget-status-text');
        if (statusText) {
          if (totalExpense > budget) {
              progressBar.classList.remove('bg-indigo-500', 'bg-amber-500');
              progressBar.classList.add('bg-rose-500');
              statusText.textContent = 'Budget Exceeded!';
          } else if (totalExpense > budget * 0.8) {
              progressBar.classList.remove('bg-indigo-500', 'bg-rose-500');
              progressBar.classList.add('bg-amber-500');
              statusText.textContent = 'Approaching Limit';
          } else {
              progressBar.classList.remove('bg-rose-500', 'bg-amber-500');
              progressBar.classList.add('bg-indigo-500');
              statusText.textContent = 'Budget Progress';
          }
        }
    } else {
        budgetContainer.classList.add('hidden');
    }
  }

  // Render Horizontal Participants Carousel
  if (participantsList) {
    participantsList.innerHTML = '';
    participants.forEach(participant => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-3xl p-4 min-w-[140px] shadow-sm border border-slate-100 flex flex-col items-center animate-scale-in relative group cursor-pointer hover:border-indigo-200 transition-all';
      card.onclick = () => window.viewParticipantProfile(participant.id);
      card.innerHTML = `
        <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 font-bold text-lg">
          ${participant.name.charAt(0).toUpperCase()}
        </div>
        <div class="font-bold text-slate-800 text-sm truncate w-full text-center">${participant.name}</div>
        <div class="text-xs font-bold text-indigo-500 mt-1">${tripSymbol}${participant.totalSpent.toFixed(0)}</div>
      `;
      participantsList.appendChild(card);
    });
    
    if (canEdit) {
      // Add Member Pill Card
      const addBtn = document.createElement('div');
      addBtn.className = 'bg-white border-2 border-dashed border-slate-200 rounded-3xl p-4 min-w-[140px] flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-500 transition-all';
      addBtn.onclick = showAddParticipantModal;
      addBtn.innerHTML = `
        <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        <span class="text-xs font-medium">Add Member</span>
      `;
      participantsList.appendChild(addBtn);
    }
  }

  // Render Detailed participants overlay dropdown
  const participantsDetails = document.getElementById('participants-details');
  if (participantsDetails) {
    participantsDetails.innerHTML = '';
    participants.forEach(participant => {
      const detailCard = document.createElement('div');
      detailCard.className = 'premium-card flex justify-between items-center';
      detailCard.innerHTML = `
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500">${participant.name.charAt(0)}</div>
          <div>
            <h4 class="font-bold text-slate-800">${participant.name}</h4>
            <p class="text-xs text-slate-400">${participant.familyCount > 0 ? `+${participant.familyCount} family` : 'Individual'}</p>
          </div>
        </div>
        <div class="text-right flex items-center space-x-4">
          <div>
              <p class="font-bold text-slate-800">${tripSymbol}${participant.totalSpent.toFixed(2)}</p>
              <button onclick="viewParticipantProfile(${participant.id})" class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Profile & Pay</button>
          </div>
        </div>
      `;
      participantsDetails.appendChild(detailCard);
    });
  }

  // Render Category breakdown percentages
  const expenseSummary = document.getElementById('expense-summary');
  if (expenseSummary) {
    const categoryTotals = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    expenseSummary.innerHTML = '';
    const categoriesList = Object.keys(categoryTotals);
    if (categoriesList.length === 0) {
      expenseSummary.innerHTML = '<p class="text-slate-400 text-center py-4 italic text-sm">No expenses recorded yet.</p>';
    } else {
      categoriesList.forEach(category => {
        const percentage = (categoryTotals[category] / totalExpense) * 100;
        const div = document.createElement('div');
        div.className = 'space-y-2';
        div.innerHTML = `
          <div class="flex justify-between items-center text-sm font-bold">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span class="text-slate-700">${category}</span>
            </div>
            <span class="text-slate-900">${tripSymbol}${categoryTotals[category].toLocaleString('en-IN')}</span>
          </div>
          <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
          </div>
        `;
        expenseSummary.appendChild(div);
      });
    }
  }

  // Render detailed recent expenses on home screen with Inline swipe Edit/Delete overlays (F3)
  const expenseDetails = document.getElementById('expense-details');
  if (expenseDetails) {
    expenseDetails.innerHTML = '';
    if (expenses.length > 0) {
      const expensesByCategory = {};
      expenses.forEach(exp => {
        if (!expensesByCategory[exp.category]) expensesByCategory[exp.category] = [];
        expensesByCategory[exp.category].push(exp);
      });

      const participantMap = {};
      participants.forEach(p => participantMap[p.id] = p.name);

      Object.keys(expensesByCategory).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'space-y-3';
        categoryDiv.innerHTML = `<h5 class="text-xs font-black text-slate-300 uppercase tracking-widest">${category}</h5>`;

        expensesByCategory[category].forEach(expense => {
          const expenseDiv = document.createElement('div');
          expenseDiv.className = 'flex justify-between items-center group relative overflow-hidden py-1';
          expenseDiv.innerHTML = `
            <div class="flex items-center space-x-3">
               <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path></svg>
               </div>
               <div>
                  <p class="text-sm font-bold text-slate-700">${expense.title}</p>
                  <p class="text-[10px] text-slate-400">${new Date(expense.createdAt).toLocaleDateString()} paid by ${participantMap[expense.paidBy] || 'Unknown'}</p>
               </div>
            </div>
            <div class="flex items-center space-x-3">
               <span class="text-sm font-black text-slate-800">${tripSymbol}${expense.amount.toFixed(0)}</span>
               <div class="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                  <button onclick="editExpense(${expense.id})" class="text-xs text-indigo-500 hover:text-indigo-700 font-bold">Edit</button>
                  <span class="text-slate-300 text-[10px]">|</span>
                  <button onclick="deleteExpense(${expense.id})" class="text-xs text-rose-500 hover:text-rose-700 font-bold">Delete</button>
               </div>
            </div>
          `;
          categoryDiv.appendChild(expenseDiv);
        });
        expenseDetails.appendChild(categoryDiv);
      });
    }
  }

  // Inject Close Trip CTA for Single-Payer mode
  const existingCloseCard = document.getElementById('close-trip-card');
  if (existingCloseCard) existingCloseCard.remove();
  
  if (trip && trip.tripType === 'single_payer') {
    const closeCard = document.createElement('div');
    closeCard.id = 'close-trip-card';
    if (trip.isClosed) {
       closeCard.className = 'premium-card bg-rose-50 border-rose-200 mt-6 mb-2 text-center';
       closeCard.innerHTML = `
         <div class="inline-block p-3 bg-rose-100 text-rose-500 rounded-full mb-3">
           <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>
         </div>
         <h4 class="text-sm font-bold text-rose-900 mb-1">Trip Closed & Locked</h4>
         <p class="text-xs text-rose-600 mb-4">No new expenses can be added.</p>
         <div class="flex gap-2 justify-center">
            <button onclick="broadcastDuesWhatsApp()" class="flex-1 max-w-[200px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md">
               Broadcast Dues
            </button>
            <button onclick="reopenTrip()" class="px-4 py-3 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all">
               Reopen
            </button>
         </div>
       `;
    } else {
       closeCard.className = 'premium-card bg-slate-900 text-white mt-6 mb-2 border-none';
       closeCard.innerHTML = `
         <div class="flex justify-between items-center mb-1">
            <div>
               <h4 class="text-sm font-bold text-white mb-1 flex items-center gap-2">
                 <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                 Lock & Close Trip
               </h4>
               <p class="text-[10px] text-slate-400">Lock expenses & generate dues.</p>
            </div>
            <button onclick="closeTrip()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md">
               Close Trip
            </button>
         </div>
       `;
    }
    
    // Find the home-settlements-details container to insert before it
    const hsd = document.getElementById('home-settlements-details');
    if (hsd && hsd.parentNode) {
       hsd.parentNode.insertBefore(closeCard, hsd);
    }
  }

  // Populate Home settlements dropdown
  if (typeof window.renderHomeSettlements === 'function') {
    await window.renderHomeSettlements();
  }
}

// Load full Expenses list screen
// Load full Expenses list screen
async function loadExpenses() {
  if (!currentTripId) return;

  const allExpenses = await getExpenses(currentTripId);
  const expenses = allExpenses.filter(e => !e.isSettlement);
  const participants = await getParticipants(currentTripId);
  const trip = await getTrip(currentTripId);
  
  const tripSymbol = trip ? (trip.currencySymbol || '₹') : '₹';
  const participantMap = {};
  participants.forEach(p => participantMap[p.id] = p.name);

  const expensesList = document.getElementById('expenses-list');
  if (!expensesList) return;

  expensesList.innerHTML = '';

  if (expenses.length === 0) {
    expensesList.innerHTML = `
        <div class="text-center py-20 opacity-40">
            <div class="w-20 h-20 bg-zinc-800 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            <p class="font-bold text-slate-400">No expenses found</p>
        </div>`;
    return;
  }

  const canEdit = typeof window.canEditCurrentTrip === 'function' ? await window.canEditCurrentTrip() : true;

  expenses.forEach(expense => {
    const isSettlement = expense.isSettlement === true;
    const categoryLetter = expense.category ? expense.category.charAt(0).toUpperCase() : 'E';
    
    // Choose beautiful background classes for categories
    const colors = [
      'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
    ];
    const colorIdx = expense.category ? expense.category.charCodeAt(0) % colors.length : 0;
    const catClass = isSettlement ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : colors[colorIdx];

    const card = document.createElement('div');
    card.className = 'relative overflow-hidden rounded-3xl border border-white/5 bg-[#1f1f23] p-5 shadow-md mb-4 transition-all duration-200 hover:scale-[1.01]';
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${catClass}">
                ${isSettlement ? '✅' : categoryLetter}
            </div>
            <div>
              <h4 class="font-extrabold text-white text-base flex items-center gap-1.5">
                ${expense.title}
                ${expense.isRecurring ? '<span class="text-xs text-indigo-400 font-bold ml-1" title="Recurring Daily Expense">🔄</span>' : ''}
              </h4>
              <p class="text-xs text-slate-400 mt-1 font-medium">${isSettlement ? 'Settlement Settle' : expense.category} • Paid by <span class="text-slate-300 font-semibold">${participantMap[expense.paidBy] || 'Unknown'}</span></p>
            </div>
        </div>
        <div class="text-right">
          <p class="font-black text-lg text-white">${tripSymbol}${(expense.totalAmount || expense.amount).toFixed(2)}</p>
          <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">${new Date(expense.createdAt).toLocaleDateString()}</p>
          ${expense.advancePay ? `
            <div class="mt-2 text-[10px] font-bold">
                <span class="text-emerald-400">PAID: ${tripSymbol}${expense.advancePay.toFixed(0)}</span>
                <span class="mx-1 text-slate-600">|</span>
                <span class="text-rose-400">REM: ${tripSymbol}${((expense.totalAmount || expense.amount) - expense.advancePay).toFixed(0)}</span>
            </div>
          ` : ''}
        </div>
      </div>
      ${(canEdit && !isSettlement) ? `
      <div class="flex space-x-4 pt-4 border-t border-white/5">
        <button onclick="editExpense(${expense.id})" class="flex items-center space-x-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            <span>EDIT</span>
        </button>
        <button onclick="deleteExpense(${expense.id})" class="flex items-center space-x-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            <span>DELETE</span>
        </button>
      </div>
      ` : ''}
      ${(canEdit && isSettlement) ? `
      <div class="flex space-x-4 pt-4 border-t border-white/5">
        <span class="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">Settlement Transaction</span>
      </div>
      ` : ''}
    `;
    expensesList.appendChild(card);
  });
}

// Edit Trip Details modal
window.showEditTripModal = async function() {
  if (!currentTripId) return;
  const trip = await getTrip(currentTripId);
  if (!trip) return;

  const content = `
    <h3 class="text-xl font-bold mb-6 text-slate-800">Edit Trip Details</h3>
    <form id="edit-trip-form" class="space-y-5">
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trip Name</label>
        <input type="text" id="edit-trip-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${trip.tripName}" required>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Budget</label>
          <input type="number" id="edit-trip-budget" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${trip.estimatedBudget || 0}" min="0" step="0.01">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Base Currency</label>
          <select id="edit-trip-currency" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all">
            ${CURRENCIES.map(c => `<option value="${c.code}" ${trip.currency === c.code ? 'selected' : ''}>${c.code} (${c.symbol})</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</label>
        <textarea id="edit-trip-notes" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" rows="3">${trip.notes || ''}</textarea>
      </div>
      <div class="flex space-x-3 pt-4">
        <button type="submit" class="flex-1 btn-primary py-4">Save Changes</button>
        <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
      </div>
    </form>
  `;
  showModal(content);

  document.getElementById('edit-trip-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tripName = document.getElementById('edit-trip-name').value.trim();
    const budget = parseFloat(document.getElementById('edit-trip-budget').value) || 0;
    const notes = document.getElementById('edit-trip-notes').value.trim();
    const currencyCode = document.getElementById('edit-trip-currency').value;
    const currencyObj = CURRENCIES.find(c => c.code === currencyCode) || { code: 'INR', symbol: '₹' };

    if (tripName) {
      await updateTrip(currentTripId, { 
        tripName, 
        notes, 
        estimatedBudget: budget,
        currency: currencyObj.code,
        currencySymbol: currencyObj.symbol
      });
      hideModal();
      loadHomeData();
      loadTrips();
      if (window.showToast) window.showToast('Trip details updated!', 'success');
    }
  });
};

// Load Trips screen history containing Save Template action (F6)
// Load Trips screen history containing Save Template action (F6)
async function loadTrips() {
  const trips = await getTrips();
  const tripsList = document.getElementById('trips-list');
  if (!tripsList) return;

  tripsList.innerHTML = '';

  if (trips.length === 0) {
    tripsList.innerHTML = '<p class="text-center text-slate-400 py-10 font-bold">No trips found. Create one using the action button!</p>';
    return;
  }

  // Fetch participants for all trips in parallel
  const allParticipantsList = await Promise.all(trips.map(t => getParticipants(t.id)));
  const favorites = JSON.parse(localStorage.getItem('tripsplit_favorites') || '[]');

  trips.forEach((trip, index) => {
    const isCurrent = String(currentTripId) === String(trip.id);
    const symbol = trip.currencySymbol || '₹';
    const coverPhoto = window.getTripCoverPhoto(trip.tripName);
    const isFavorite = favorites.includes(String(trip.id));
    const tripParticipants = allParticipantsList[index] || [];
    const avatarsHtml = window.renderAvatarsHtml(tripParticipants, 3);

    const card = document.createElement('div');
    card.className = `relative overflow-hidden rounded-3xl border border-white/5 bg-[#1f1f23] shadow-xl group mb-4 transition-all duration-300 ${isCurrent ? 'ring-2 ring-indigo-500' : ''}`;
    
    card.innerHTML = `
      <!-- Scenic Cover Photo Banner -->
      <div class="w-full h-32 bg-cover bg-center relative" style="background-image: url('${coverPhoto}');">
        <div class="absolute inset-0 bg-gradient-to-t from-[#1f1f23] to-transparent"></div>
        
        <!-- Favourites Toggle Heart -->
        <button onclick="window.toggleFavoriteTrip('${trip.id}', event)" class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors">
          <svg class="w-4 h-4 ${isFavorite ? 'fill-rose-500 stroke-rose-500' : 'stroke-white'}" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </button>
        
        <!-- Dynamic Currency & Budget Pill -->
        <div class="absolute bottom-3 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
          <span class="text-indigo-400 font-extrabold">${symbol}</span> Budget: ${symbol}${trip.estimatedBudget || 0}
        </div>
      </div>
      
      <!-- Content Details -->
      <div class="p-5">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-extrabold text-lg text-white">${trip.tripName}</h4>
              ${isCurrent ? '<span class="bg-indigo-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Active</span>' : ''}
              ${trip.share_id ? `<span class="text-[9px] text-indigo-400 font-black tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">ID: ${trip.share_id}</span>` : ''}
            </div>
            <p class="text-xs text-slate-400 mt-1 line-clamp-1">${trip.notes || 'No description provided'}</p>
          </div>
        </div>
        
        <!-- Bottom Row: Overlapping Avatars & Sleek Action buttons -->
        <div class="flex justify-between items-center pt-4 border-t border-white/5">
          <!-- Overlapping Crew Avatars -->
          ${avatarsHtml}
          
          <!-- Sleek Mini Option Actions -->
          <div class="flex items-center gap-2">
            <button onclick="selectTrip('${trip.id}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/10">SELECT</button>
            <button onclick="duplicateTrip('${trip.id}')" title="Duplicate Trip" class="p-2 bg-zinc-800 text-emerald-400 hover:text-emerald-300 hover:bg-zinc-700/80 rounded-xl transition-all active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
            </button>
            <button onclick="saveTripAsTemplate('${trip.id}')" title="Save as Template" class="p-2 bg-zinc-800 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-700/80 rounded-xl transition-all active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </button>
            <button onclick="deleteTrip('${trip.id}')" title="Delete Trip" class="p-2 bg-zinc-800 text-rose-500 hover:text-rose-400 hover:bg-zinc-700/80 rounded-xl transition-all active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
    tripsList.appendChild(card);
  });
}

// Dropdown arrow transitions
window.toggleParticipantsDropdown = function() {
  const details = document.getElementById('participants-details');
  const arrow = document.getElementById('participants-arrow');
  if (details) {
    const isHidden = details.classList.contains('hidden');
    details.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180', !isHidden);
  }
};

window.toggleExpenseSummaryDropdown = function() {
  const details = document.getElementById('expense-details');
  const arrow = document.getElementById('expense-summary-arrow');
  if (details) {
    const isHidden = details.classList.contains('hidden');
    details.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180', !isHidden);
  }
};

window.toggleHomeSettlementsDropdown = function() {
  const details = document.getElementById('home-settlements-details');
  const arrow = document.getElementById('home-settlements-arrow');
  if (details) {
    const isHidden = details.classList.contains('hidden');
    details.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180', !isHidden);
  }
};

// Edit Participant details
window.editParticipant = async function(participantId) {
  const participant = await getParticipant(participantId);
  if (!participant) return;

  const content = `
    <h3 class="text-xl font-bold mb-6 text-slate-800">Edit Participant</h3>
    <form id="edit-participant-form" class="space-y-5">
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</label>
        <input type="text" id="participant-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${participant.name}" required>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone</label>
          <input type="tel" id="participant-phone" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${participant.phone || ''}">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Family Size</label>
          <input type="number" id="participant-family" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="0" value="${participant.familyCount}">
        </div>
      </div>
      <div class="flex space-x-3 pt-4">
        <button type="submit" class="flex-1 btn-primary py-4">Update Member</button>
        <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
      </div>
    </form>
  `;
  showModal(content);

  document.getElementById('edit-participant-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('participant-name').value.trim();
    const phone = document.getElementById('participant-phone').value.trim();
    const familyCount = parseInt(document.getElementById('participant-family').value) || 0;

    if (name) {
      await updateParticipant(participantId, { name, phone, familyCount });
      hideModal();
      loadHomeData();
    }
  });
};

// ── Participant Profile & Settle Modal ───────────────────────────────────────
window.viewParticipantProfile = async function(participantId) {
  const participant = await getParticipant(participantId);
  if (!participant) return;

  const trip = await getTrip(currentTripId);
  const tripSymbol = trip ? (trip.currencySymbol || '₹') : '₹';
  const participants = await getParticipants(currentTripId);
  const allExpenses = await getExpenses(currentTripId);
  
  const travelExpenses = allExpenses.filter(e => !e.isSettlement);
  const settlements = allExpenses.filter(e => e.isSettlement);

  const totalSpentOnTravel = travelExpenses
    .filter(e => e.paidBy === participantId)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalTravelCost = travelExpenses.reduce((sum, e) => sum + e.amount, 0);
  const perPersonShare = participants.length > 0 ? (totalTravelCost / participants.length) : 0;
  
  const sentPaymentsTotal = settlements
    .filter(e => e.paidBy === participantId)
    .reduce((sum, e) => sum + e.amount, 0);

  const receivedPaymentsTotal = settlements
    .filter(e => e.isSettlement && e.splitBetween && e.splitBetween.includes(participantId))
    .reduce((sum, e) => sum + e.amount, 0);

  const netBalance = (totalSpentOnTravel + sentPaymentsTotal) - (perPersonShare + receivedPaymentsTotal);
  const isCreditor = netBalance >= 0;

  const mySentPayments = settlements.filter(e => e.paidBy === participantId);
  const myReceivedPayments = settlements.filter(e => e.isSettlement && e.splitBetween && e.splitBetween.includes(participantId));
  const allMyPayments = [...mySentPayments, ...myReceivedPayments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const otherParticipants = participants.filter(p => p.id !== participantId);
  const otherOptionsHtml = otherParticipants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  let paymentsHistoryHtml = '';
  if (allMyPayments.length > 0) {
    paymentsHistoryHtml = allMyPayments.map(pay => {
      const isSender = pay.paidBy === participantId;
      const peerName = isSender 
        ? (participants.find(p => p.id === pay.splitBetween[0])?.name || 'Unknown')
        : (participants.find(p => p.id === pay.paidBy)?.name || 'Unknown');
      
      const paymentMethod = pay.description && pay.description.includes('Cash') ? '💵 Cash' : '💳 UPI / Transfer';

      return `
        <div class="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
          <div>
            <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
              ${isSender ? `👉 Paid <strong>${peerName}</strong>` : `👈 Recd from <strong>${peerName}</strong>`}
            </p>
            <p class="text-[9px] text-slate-400 mt-0.5">${paymentMethod} • ${new Date(pay.createdAt).toLocaleDateString()}</p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-xs font-black ${isSender ? 'text-rose-500' : 'text-emerald-500'}">
              ${isSender ? '-' : '+'}${tripSymbol}${pay.amount.toFixed(2)}
            </span>
            <button onclick="window.deleteDirectPayment(${pay.id}, ${participantId})" class="p-1 bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:text-rose-700 rounded-lg transition-colors border border-rose-100 dark:border-rose-500/20" title="Delete Payment">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  } else {
    paymentsHistoryHtml = `<p class="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">No payments recorded yet.</p>`;
  }

  const content = `
    <div id="participant-profile-view">
      <div class="flex justify-between items-start mb-6">
        <div class="flex items-center space-x-4">
          <div class="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center font-extrabold text-2xl border border-indigo-500/20">
            ${participant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 class="text-lg font-black text-slate-800 dark:text-white">${participant.name}</h3>
            <p class="text-xs text-slate-400 font-medium mt-0.5">${participant.phone || 'No phone'} • ${participant.familyCount > 0 ? `+${participant.familyCount} family` : 'Individual'}</p>
          </div>
        </div>
        <button onclick="window.toggleParticipantEditForm()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black rounded-xl transition-all">
          Edit Info
        </button>
      </div>

      <!-- Financial Statistics Box -->
      <div class="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 mb-6">
        <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Financial Profile</p>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
            <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Spent</span>
            <p class="text-sm font-black text-slate-800 dark:text-white mt-1">${tripSymbol}${totalSpentOnTravel.toLocaleString('en-IN')}</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
            <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Expected Share</span>
            <p class="text-sm font-black text-slate-800 dark:text-white mt-1">${tripSymbol}${perPersonShare.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div class="flex justify-between items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3 shadow-sm">
          <div>
            <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Net Status</span>
            <p class="text-xs font-medium text-slate-400 mt-0.5">Including registered paybacks</p>
          </div>
          <div class="text-right">
            <p class="text-base font-black ${isCreditor ? 'text-emerald-500' : 'text-rose-500'}">
              ${isCreditor ? '+' : '-'}${tripSymbol}${Math.abs(netBalance).toFixed(2)}
            </p>
            <span class="text-[9px] font-bold uppercase tracking-wider ${isCreditor ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'} px-2 py-0.5 rounded-full inline-block mt-0.5">
              ${isCreditor ? 'Receives back' : 'Owes total'}
            </span>
          </div>
        </div>
      </div>

      <!-- Record Direct Payment Entry Form -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 mb-6 shadow-sm">
        <h4 class="text-xs font-black text-indigo-500 uppercase tracking-widest mb-3">💸 Record Direct Payment</h4>
        <form id="record-direct-payment-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Action</label>
              <select id="payment-direction" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                <option value="sent">Paid To</option>
                <option value="received">Received From</option>
              </select>
            </div>
            <div>
              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Crew Member</label>
              <select id="payment-peer" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200" required>
                ${otherOptionsHtml}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Amount</label>
              <input type="number" id="payment-amount" placeholder="₹ Amount" min="1" step="any" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200" required>
            </div>
            <div>
              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Method</label>
              <select id="payment-method" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                <option value="UPI">UPI / GPay / NetBanking</option>
                <option value="Cash">Cash Handover</option>
                <option value="Other">Other / Card</option>
              </select>
            </div>
          </div>
          <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/10">
            Save Payment Record
          </button>
        </form>
      </div>

      <!-- Payment History list -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm max-h-[180px] overflow-y-auto no-scrollbar">
        <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">📜 Payment History</h4>
        <div class="space-y-1">${paymentsHistoryHtml}</div>
      </div>
      
      <div class="pt-4 flex justify-end">
        <button onclick="hideModal()" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all">Close Profile</button>
      </div>
    </div>

    <!-- Edit Info Form inside Modal (hidden by default) -->
    <div id="participant-edit-form" class="hidden">
      <h3 class="text-xl font-bold mb-6 text-slate-800 dark:text-white">Edit Crew Info</h3>
      <form id="edit-profile-fields-form" class="space-y-5">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</label>
          <input type="text" id="edit-part-name" class="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 transition-all" value="${participant.name}" required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone</label>
            <input type="tel" id="edit-part-phone" class="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 transition-all" value="${participant.phone || ''}">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Family Size</label>
            <input type="number" id="edit-part-family" class="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 transition-all" min="0" value="${participant.familyCount}">
          </div>
        </div>
        <div class="flex space-x-3 pt-4">
          <button type="submit" class="flex-1 btn-primary py-4">Save Changes</button>
          <button type="button" onclick="window.toggleParticipantEditForm()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Back to Profile</button>
        </div>
      </form>
    </div>
  `;
  showModal(content);

  // Wire up Record Payment form submit
  document.getElementById('record-direct-payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const direction = document.getElementById('payment-direction').value;
    const peerId = parseInt(document.getElementById('payment-peer').value);
    const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const method = document.getElementById('payment-method').value;

    if (amount > 0 && peerId) {
      const peer = participants.find(p => p.id === peerId);
      if (!peer) return;

      const fromId = direction === 'sent' ? participantId : peerId;
      const toId = direction === 'sent' ? peerId : participantId;
      const fromName = direction === 'sent' ? participant.name : peer.name;
      const toName = direction === 'sent' ? peer.name : participant.name;

      const settlementKey = `${fromName}-->${toName}`;

      const settlementExpense = {
        tripId: currentTripId,
        id: Date.now(),
        title: `Payment: ${fromName} → ${toName}`,
        description: `Direct Settle (${method}): ${fromName} → ${toName}`,
        amount: amount,
        totalAmount: amount,
        paidBy: fromId,
        category: 'Settlement',
        splitMethod: 'exact',
        splitBetween: [toId],
        splits: { [toId]: amount },
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        isSettlement: true,
        settlementKey: settlementKey
      };

      const storageData = JSON.parse(localStorage.getItem('tripsplit_data'));
      if (!storageData.expenses) storageData.expenses = [];
      storageData.expenses.push(settlementExpense);
      localStorage.setItem('tripsplit_data', JSON.stringify(storageData));

      if (typeof triggerBackgroundSync === 'function') {
        triggerBackgroundSync(`Recorded direct payment from ${fromName} to ${toName}`);
      }

      if (window.showToast) window.showToast('Payment recorded successfully! 💸', 'success');

      await window.viewParticipantProfile(participantId);
      loadHomeData();
    }
  });

  // Wire up edit info submit
  document.getElementById('edit-profile-fields-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('edit-part-name').value.trim();
    const phone = document.getElementById('edit-part-phone').value.trim();
    const familyCount = parseInt(document.getElementById('edit-part-family').value) || 0;

    if (name) {
      await updateParticipant(participantId, { name, phone, familyCount });
      await window.viewParticipantProfile(participantId);
      loadHomeData();
    }
  });
};

window.toggleParticipantEditForm = function() {
  const profileView = document.getElementById('participant-profile-view');
  const editForm = document.getElementById('participant-edit-form');
  if (profileView && editForm) {
    const isEditing = profileView.classList.contains('hidden');
    profileView.classList.toggle('hidden', !isEditing);
    editForm.classList.toggle('hidden', isEditing);
  }
};

window.deleteDirectPayment = async function(paymentId, participantId) {
  if (confirm('Are you sure you want to delete this payment record?')) {
    const storageData = JSON.parse(localStorage.getItem('tripsplit_data'));
    storageData.expenses = storageData.expenses.filter(e => e.id !== paymentId);
    localStorage.setItem('tripsplit_data', JSON.stringify(storageData));

    if (typeof triggerBackgroundSync === 'function') {
      triggerBackgroundSync(`Deleted payment record`);
    }

    if (window.showToast) window.showToast('Payment record deleted', 'info');

    await window.viewParticipantProfile(participantId);
    loadHomeData();
  }
};

// Switch App Mode (silent persists changes quietly)
window.switchAppMode = function(mode, silent = false) {
  localStorage.setItem('tripsplit_app_mode', mode);
  window.currentAppMode = mode;
  
  // Update body class immediately to apply adviser/split theme gradients
  document.body.className = mode === 'adviser' ? 'theme-adviser' : 'theme-split';
  
  const adviserBtn = document.getElementById('mode-btn-adviser');
  const splitBtn = document.getElementById('mode-btn-split');
  
  if (adviserBtn && splitBtn) {
    if (mode === 'adviser') {
      adviserBtn.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 bg-white text-slate-800 shadow-sm";
      splitBtn.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 text-white/60 hover:text-white hover:bg-white/5";
    } else {
      splitBtn.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 bg-white text-slate-800 shadow-sm";
      adviserBtn.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 text-white/60 hover:text-white hover:bg-white/5";
    }
  }

  // Toggling Home Widgets Visibility
  const crewSection = document.getElementById('home-crew-section');
  const settlementsCard = document.getElementById('home-settlements-card') || document.getElementById('home-quick-settlement-card');
  const settlementsDropdownCard = document.getElementById('home-settlements-dropdown-card');
  const breakdownCard = document.getElementById('home-breakdown-card');
  const expensesCard = document.getElementById('home-expenses-card');
  const detailsCard = document.getElementById('home-details-card');
  const budgetContainer = document.getElementById('budget-progress-container');
  const itineraryCard = document.getElementById('adviser-itinerary-card');
  const notesCard = document.getElementById('adviser-notes-card');
  const statsDisplay = document.getElementById('split-mode-stats');

  if (mode === 'adviser') {
    if (crewSection) crewSection.classList.add('hidden');
    if (settlementsCard) settlementsCard.classList.add('hidden');
    if (settlementsDropdownCard) settlementsDropdownCard.classList.add('hidden');
    if (breakdownCard) breakdownCard.classList.add('hidden');
    if (expensesCard) expensesCard.classList.add('hidden');
    if (detailsCard) detailsCard.classList.add('hidden');
    if (budgetContainer) budgetContainer.classList.add('hidden');
    
    if (itineraryCard) itineraryCard.classList.remove('hidden');
    if (notesCard) notesCard.classList.remove('hidden');
    if (statsDisplay) statsDisplay.classList.add('hidden');
  } else {
    // Split mode layout overrides
    if (crewSection) crewSection.classList.remove('hidden');
    if (settlementsCard) settlementsCard.classList.remove('hidden');
    if (settlementsDropdownCard) settlementsDropdownCard.classList.remove('hidden');
    if (breakdownCard) breakdownCard.classList.remove('hidden');
    if (expensesCard) expensesCard.classList.remove('hidden');
    if (detailsCard) detailsCard.classList.remove('hidden');
    
    if (itineraryCard) itineraryCard.classList.add('hidden');
    if (notesCard) notesCard.classList.add('hidden');
    
    if (statsDisplay) statsDisplay.classList.remove('hidden');
  }
  
  if (!silent && window.showToast) {
    window.showToast(`Mode: ${mode === 'adviser' ? '🎒 Adviser' : '💰 Split'} active`, 'info');
  }
  
  loadHomeData(true);
};

// My Tab Screen (Me tab) personal balance logic (F5)
window.loadMyData = async function() {
  const summaryCard = document.getElementById('my-summary-card');
  if (!summaryCard) return;

  const profile = typeof getUserProfile === 'function' ? await getUserProfile() : null;
  
  if (currentTripId) {
    const participants = await getParticipants(currentTripId);
    const expenses = await getExpenses(currentTripId);
    const trip = await getTrip(currentTripId);
    const symbol = trip ? (trip.currencySymbol || '₹') : '₹';
    
    if (!profile || !profile.name) {
      summaryCard.innerHTML = `
        <div class="text-center py-6">
          <p class="text-slate-500 mb-4 text-xs font-bold">Please set your name in Settings to see your personal summary.</p>
          <button onclick="showSettings()" class="btn-primary py-2.5 px-4 rounded-xl text-xs">Configure Profile</button>
        </div>`;
    } else {
      const me = participants.find(p => p.name.trim().toLowerCase() === profile.name.trim().toLowerCase());
      if (!me) {
        summaryCard.innerHTML = `
          <div class="text-center py-6">
            <p class="text-slate-500 mb-4 text-xs font-bold leading-relaxed">
              You are currently matching with profile <b>"${profile.name}"</b>.<br>
              To display data, add a participant named "${profile.name}" to this trip or edit your name in Settings.
            </p>
            <button onclick="showSettings()" class="btn-primary py-2.5 px-4 rounded-xl text-xs">Configure Profile</button>
          </div>`;
      } else {
        let myTotalSpent = 0;
        let myExpectedShare = 0;

        expenses.forEach(e => {
          // Paid by Me
          if (e.paidBy === me.id) {
            myTotalSpent += (e.totalAmount || e.amount || 0);
          }
          
          // Me in split subset
          let splitBetweenIds = e.splitBetween || [];
          if (!Array.isArray(splitBetweenIds) || splitBetweenIds.length === 0) {
            splitBetweenIds = participants.map(p => p.id);
          }
          if (splitBetweenIds.includes(me.id)) {
            const splitParticipants = participants.filter(p => splitBetweenIds.includes(p.id));
            const totalSplitFamily = splitParticipants.reduce((sum, p) => sum + (p.familyCount || 1), 0);
            if (totalSplitFamily > 0) {
              const costPerHead = (e.totalAmount || e.amount || 0) / totalSplitFamily;
              myExpectedShare += costPerHead * (me.familyCount || 1);
            }
          }
        });

        const myBalance = myTotalSpent - myExpectedShare;
        const isCreditor = myBalance >= 0;
        
        summaryCard.innerHTML = `
          <div class="flex flex-col gap-4">
            <div class="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h4 class="font-bold text-slate-800 text-lg">${me.name}</h4>
                <p class="text-xs text-slate-400">Device Account Matches Profile</p>
              </div>
              <span class="px-4 py-2 rounded-2xl font-black text-sm ${isCreditor ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                ${isCreditor ? '+' + symbol + myBalance.toFixed(0) : '-' + symbol + Math.abs(myBalance).toFixed(0)}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Your Total Spendings</p>
                <p class="text-xl font-black text-slate-800">${symbol}${myTotalSpent.toFixed(0)}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Your Adjusted Share</p>
                <p class="text-xl font-black text-slate-800">${symbol}${myExpectedShare.toFixed(0)}</p>
              </div>
            </div>
          </div>
        `;

        // Expenses filter details
        const myExpenses = expenses.filter(e => e.paidBy === me.id);
        const myExpensesList = document.getElementById('my-expenses-list');
        const myExpensesItems = document.getElementById('my-expenses-items');
        
        if (myExpensesList && myExpensesItems) {
          if (myExpenses.length > 0) {
            myExpensesList.classList.remove('hidden');
            myExpensesItems.innerHTML = myExpenses.map(e => `
              <div class="flex justify-between items-center py-3 border-b border-slate-50 last:border-b-0">
                <div>
                  <p class="text-sm font-bold text-slate-700">${e.title}</p>
                  <p class="text-[10px] text-slate-400">${new Date(e.createdAt).toLocaleDateString()} • ${e.category}</p>
                </div>
                <span class="text-sm font-black text-slate-800">${symbol}${e.amount.toFixed(0)}</span>
              </div>
            `).join('');
          } else {
            myExpensesList.classList.add('hidden');
          }
        }
      }
    }
  } else {
    // No active trip selected placeholder
    summaryCard.innerHTML = `
      <div class="text-center py-8 flex flex-col items-center justify-center">
        <span class="text-3xl mb-2">✈️</span>
        <h4 class="font-bold text-slate-700 text-sm">No Active Trip Selected</h4>
        <p class="text-slate-400 text-xs mt-1 leading-relaxed">Select or create a trip to see your personal spending ledger and balances.</p>
        <button onclick="showScreen('trips')" class="btn-primary py-2 px-5 rounded-xl text-xs font-bold mt-4 shadow-sm">View Trips</button>
      </div>`;
    
    const myExpensesList = document.getElementById('my-expenses-list');
    if (myExpensesList) myExpensesList.classList.add('hidden');
  }

  // Always load and render sync & recovery options
  window.renderSyncCard();
};

window.showAppGuideModal = function() {
    const content = `
      <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">📖 Complete App Guide</h3>
          <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
      </div>
      
      <div class="space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar pr-1 pb-4 text-slate-700">
          
          <!-- Section 1: Split & Expenses -->
          <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
              <h4 class="font-extrabold text-sm text-indigo-700 flex items-center gap-1.5 mb-2">
                  <span>💰</span> Expense Splitter & List Page
              </h4>
              <ul class="text-xs font-semibold text-slate-600 space-y-2 list-none pl-0">
                  <li class="flex gap-2">
                      <span class="text-indigo-500">➕</span>
                      <span><b>Add Crew</b>: Go to the <b>Trips</b> tab, scroll down to <b>Participant Details</b>, and tap <code>Add Member</code> to build your travel group.</span>
                  </li>
                  <li class="flex gap-2">
                      <span class="text-indigo-500">📝</span>
                      <span><b>Log Expenses</b>: Tap the bottom <code>➕</code> FAB, enter the title, total price, who paid, and who splits. You can also specify an <b>Advance Paid</b>.</span>
                  </li>
                  <li class="flex gap-2">
                      <span class="text-indigo-500">⚡</span>
                      <span><b>Split Presets</b>: The app automatically remembers split configurations for different categories to save you time.</span>
                  </li>
              </ul>
          </div>

          <!-- Section 2: Itinerary & Plan -->
          <div class="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/30">
              <h4 class="font-extrabold text-sm text-amber-700 flex items-center gap-1.5 mb-2">
                  <span>🎒</span> Itinerary & Plan Page
              </h4>
              <ul class="text-xs font-semibold text-slate-600 space-y-2 list-none pl-0">
                  <li class="flex gap-2">
                      <span class="text-amber-500">📍</span>
                      <span><b>Pin Locations</b>: Copy-paste raw coordinates (e.g. <code>15.2993, 74.1240</code>) or Google/Apple maps links directly into the Search box, then tap <b>Add to Roadmap</b>.</span>
                  </li>
                  <li class="flex gap-2">
                      <span class="text-amber-500">🚗</span>
                      <span><b>Road Distances</b>: Calculates actual driving road route distances (matching Google Maps) when online, and gracefully falls back to straight-line Haversine math when offline.</span>
                  </li>
                  <li class="flex gap-2">
                      <span class="text-amber-500">🧭</span>
                      <span><b>Directions Link</b>: Click the direction icon on any timeline card to instantly launch Google Maps turn-by-turn driving routing.</span>
                  </li>
              </ul>
          </div>

          <!-- Section 3: Settlements -->
          <div class="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/30">
              <h4 class="font-extrabold text-sm text-emerald-700 flex items-center gap-1.5 mb-2">
                  <span>📊</span> Settlements & Split Page
              </h4>
              <ul class="text-xs font-semibold text-slate-600 space-y-2 list-none pl-0">
                  <li class="flex gap-2">
                      <span class="text-emerald-500">🤝</span>
                      <span><b>Minimized Transactions</b>: Our splitting algorithm automatically aggregates and optimizes all transactions so that your crew pays back the absolute minimum number of payments.</span>
                  </li>
                  <li class="flex gap-2">
                      <span class="text-emerald-500">📲</span>
                      <span><b>WhatsApp Sharing</b>: Click the <code>Share All</code> button in Settlements to copy a beautiful pre-formatted summary text that opens directly in WhatsApp for sharing with your group!</span>
                  </li>
              </ul>
          </div>

          <!-- Section 4: Cloud Sync & PWA -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 class="font-extrabold text-sm text-slate-700 flex items-center gap-1.5 mb-2">
                  <span>☁️</span> Cloud Sync, Profile & Offline PWA
              </h4>
              <ul class="text-xs font-semibold text-slate-600 space-y-2 list-none pl-0">
                  <li class="flex gap-2">
                      <span class="text-slate-400">👤</span>
                      <span><b>Personal Summary</b>: Set your matching name in Settings to see your device's customized ledger, total spendings, and net creditor/debtor balance on the Profile tab.</span>
                  </li>
                  <li class="flex gap-2">
                      <span class="text-slate-400">🔐</span>
                      <span><b>Secure Sync</b>: Link your email on the Profile tab to enable cloud backup and real-time multiplayer trip updates with your friends.</span>
                  </li>
                  <li class="flex gap-2">
                      <span class="text-slate-400">📱</span>
                      <span><b>Install PWA</b>: Install TripSplit to your home screen to use it 100% offline. The app will cache OpenStreetMap tiles locally so your itinerary maps continue working offline!</span>
                  </li>
              </ul>
          </div>
          
      </div>
      
      <button onclick="hideModal()" class="w-full btn-primary py-4 mt-4">Got It!</button>
    `;
    showModal(content);
};

window.syncFlowState = window.syncFlowState || {
    email: '',
    mode: 'initial', // 'initial', 'restore_input', 'otp'
    flowType: '', // 'link' or 'restore'
    timerInterval: null
};

window.renderSyncCard = async function() {
    const syncCard = document.getElementById('my-sync-card');
    if (!syncCard) return;
    
    const profile = typeof getUserProfile === 'function' ? await getUserProfile() : null;
    
    // Linked State
    if (profile && profile.email) {
        syncCard.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
                        ☁️
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm text-slate-800">Secure Cloud Sync Active</h4>
                        <p class="text-xs text-slate-400">Your trips are safely backed up to the cloud.</p>
                    </div>
                    <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-[9px] uppercase tracking-wider border border-emerald-100">Linked</span>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-400">Account Email:</span>
                        <span class="font-bold text-slate-700">${profile.email}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-400">Device Identity:</span>
                        <span class="font-bold text-slate-500 font-mono text-[10px]">${profile.device_id ? profile.device_id.substring(0, 15) : '...'}...</span>
                    </div>
                </div>
                <p class="text-[10px] text-slate-400 leading-relaxed italic">
                    💡 <b>Tip:</b> If you get a new device, click "Restore Account" and verify this email address to load all your trips instantly.
                </p>
            </div>
        `;
        return;
    }
    
    // OTP Entry State
    if (window.syncFlowState.mode === 'otp') {
        syncCard.innerHTML = `
            <div class="space-y-5 animate-scale-in">
                <div class="flex items-center space-x-3">
                    <button onclick="window.handleShowInitialView()" class="p-1 text-slate-400 hover:text-slate-600 hover:scale-115 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm text-slate-800">Enter Verification Code</h4>
                        <p class="text-[11px] text-slate-400 leading-relaxed">Enter the 6-digit OTP code sent to <b class="text-indigo-600">${window.syncFlowState.email}</b>.</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" id="otp-code-input" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-center text-xl font-black tracking-[0.6em] text-slate-800" placeholder="------" required>
                    
                    <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                        <span id="otp-timer">Resend code in 59s</span>
                        <button onclick="window.handleResendOTP()" id="resend-otp-btn" class="hidden text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider font-bold">Resend Code</button>
                    </div>
                    
                    <button onclick="window.handleVerifyOTP()" id="verify-otp-submit-btn" class="w-full btn-primary py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center space-x-2">
                        <span>Confirm & Verify Code</span>
                    </button>
                </div>
            </div>
        `;
        window.startOTPTimer();
    } else if (window.syncFlowState.mode === 'restore_input') {
        // Account Restore Input State
        syncCard.innerHTML = `
            <div class="space-y-4 animate-scale-in">
                <div class="flex items-center space-x-3">
                    <button onclick="window.handleShowInitialView()" class="p-1 text-slate-400 hover:text-slate-600 hover:scale-115 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm text-slate-800">Restore Cloud Account</h4>
                        <p class="text-xs text-slate-400">Restore your historical trips using your registered email.</p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Email Address</label>
                        <input type="email" id="restore-email-input" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-xs" placeholder="E.g. name@domain.com" required>
                    </div>
                    <button onclick="window.handleStartRestoreAccount()" id="restore-submit-btn" class="w-full btn-primary py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center space-x-2">
                        <span>Send Verification Code</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                </div>
            </div>
        `;
    } else {
        // Unlinked State / Initial Sync Options
        syncCard.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
                        📧
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm text-slate-800">Secure Cloud Backup</h4>
                        <p class="text-xs text-slate-400">Link your email address to sync trips across devices and prevent data loss.</p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Backup Email Address</label>
                        <input type="email" id="sync-email-input" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-xs" placeholder="E.g. name@domain.com" required>
                    </div>
                    
                    <button onclick="window.handleStartLinkEmail()" id="link-submit-btn" class="w-full btn-primary py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center space-x-2">
                        <span>Link & Sync Account</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                    
                    <div class="relative flex py-2 items-center">
                        <div class="flex-grow border-t border-slate-100"></div>
                        <span class="flex-grow border-t border-slate-100"></span>
                        <span class="flex-shrink mx-4 text-slate-300 font-bold text-[9px] uppercase tracking-wider">Returning User?</span>
                        <div class="flex-grow border-t border-slate-100"></div>
                    </div>
                    
                    <button onclick="window.handleShowRestoreView()" class="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2">
                        <span>🔄 Restore Account from Cloud</span>
                    </button>
                </div>
            </div>
        `;
    }
};

window.handleShowInitialView = function() {
    clearInterval(window.syncFlowState.timerInterval);
    window.syncFlowState.mode = 'initial';
    window.renderSyncCard();
};

window.handleShowRestoreView = function() {
    window.syncFlowState.mode = 'restore_input';
    window.renderSyncCard();
};

window.handleStartLinkEmail = async function() {
    const emailInput = document.getElementById('sync-email-input');
    if (!emailInput || !emailInput.value.trim()) {
        alert("Please enter a valid email address.");
        return;
    }
    const email = emailInput.value.trim().toLowerCase();
    
    const submitBtn = document.getElementById('link-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Sending Code...</span>`;
    }
    
    try {
        const existingProfile = await window.getProfileByEmail(email);
        if (existingProfile && existingProfile.device_id !== getDeviceId()) {
            alert("This email address is already linked to an existing account. To recover your existing trips, please use 'Restore Account' instead.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Link & Sync Account</span>`;
            }
            return;
        }
        
        await window.sendEmailOTP(email);
        window.syncFlowState.email = email;
        window.syncFlowState.flowType = 'link';
        window.syncFlowState.mode = 'otp';
        window.renderSyncCard();
        if (window.showToast) window.showToast('OTP verification code sent!', 'info');
    } catch (e) {
        alert("Failed to send code: " + e.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Link & Sync Account</span>`;
        }
    }
};

window.handleStartRestoreAccount = async function() {
    const emailInput = document.getElementById('restore-email-input');
    if (!emailInput || !emailInput.value.trim()) {
        alert("Please enter a valid email address.");
        return;
    }
    const email = emailInput.value.trim().toLowerCase();
    
    const submitBtn = document.getElementById('restore-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Sending Code...</span>`;
    }
    
    try {
        const existingProfile = await window.getProfileByEmail(email);
        if (!existingProfile) {
            alert("No saved account found for this email address. Please make sure you link your email first on your original device.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Send Verification Code</span>`;
            }
            return;
        }
        
        await window.sendEmailOTP(email);
        window.syncFlowState.email = email;
        window.syncFlowState.flowType = 'restore';
        window.syncFlowState.mode = 'otp';
        window.renderSyncCard();
        if (window.showToast) window.showToast('OTP verification code sent!', 'info');
    } catch (e) {
        alert("Failed to send code: " + e.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Send Verification Code</span>`;
        }
    }
};

window.handleResendOTP = async function() {
    try {
        await window.sendEmailOTP(window.syncFlowState.email);
        if (window.showToast) window.showToast('New verification code sent!', 'success');
        window.startOTPTimer();
    } catch (e) {
        alert("Failed to resend code: " + e.message);
    }
};

window.startOTPTimer = function() {
    let secondsLeft = 60;
    const timerText = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('resend-otp-btn');
    if (!timerText || !resendBtn) return;
    
    resendBtn.classList.add('hidden');
    timerText.classList.remove('hidden');
    timerText.textContent = `Resend code in ${secondsLeft}s`;
    
    clearInterval(window.syncFlowState.timerInterval);
    window.syncFlowState.timerInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(window.syncFlowState.timerInterval);
            timerText.classList.add('hidden');
            resendBtn.classList.remove('hidden');
        } else {
            timerText.textContent = `Resend code in ${secondsLeft}s`;
        }
    }, 1000);
};

window.handleVerifyOTP = async function() {
    const otpInput = document.getElementById('otp-code-input');
    if (!otpInput || otpInput.value.trim().length !== 6) {
        alert("Please enter the 6-digit verification code.");
        return;
    }
    const token = otpInput.value.trim();
    
    const submitBtn = document.getElementById('verify-otp-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Verifying Code...</span>`;
    }
    
    try {
        await window.verifyEmailOTP(window.syncFlowState.email, token);
        
        clearInterval(window.syncFlowState.timerInterval);
        
        if (window.syncFlowState.flowType === 'link') {
            await window.linkEmailToProfile(window.syncFlowState.email);
            if (window.showToast) window.showToast('Profile linked & Cloud sync enabled!', 'success');
            
            const profile = await getUserProfile();
            const emailInputOnSettings = document.getElementById('profile-email');
            if (emailInputOnSettings) emailInputOnSettings.value = profile.email || '';
            
            window.syncFlowState.mode = 'initial';
            window.loadMyData();
        } else if (window.syncFlowState.flowType === 'restore') {
            const localTrips = await getTrips();
            if (localTrips.length > 0) {
                const confirmRestore = confirm("Warning: Restoring your account will switch your device identity and replace current local trips. Make sure you don't have unsaved data. Proceed?");
                if (!confirmRestore) {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = `<span>Confirm & Verify Code</span>`;
                    }
                    return;
                }
            }
            
            if (window.showToast) window.showToast('Code verified! Fetching historical trips...', 'info');
            const tripsCount = await window.restoreAccountByEmail(window.syncFlowState.email);
            
            alert(`Account recovered successfully! Restored ${tripsCount} trips and updated your device identity. The app will now reload.`);
            window.location.reload();
        }
    } catch (e) {
        alert("Verification failed: " + e.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Confirm & Verify Code</span>`;
        }
    }
};

// Save Trip as template helper (F6)
window.saveTripAsTemplate = async function(tripId) {
  if (typeof saveTemplateFromTrip === 'function') {
    try {
      const templateId = await saveTemplateFromTrip(tripId);
      if (templateId && window.showToast) {
        window.showToast('Saved Trip structure as Template! 📋', 'success');
      }
    } catch (error) {
      console.error(error);
      alert('Could not save template: ' + error.message);
    }
  }
};

// Show Settings panel overlay
window.showSettings = async function() {
    const trip = currentTripId ? await getTrip(currentTripId) : null;
    const profile = typeof getUserProfile === 'function' ? await getUserProfile() : null;

    // Determine role clearly:
    // - No share_id means this is a local trip created on THIS device → always 'owner'
    // - Otherwise use stored myRole, fallback to 'viewer' for cloud-joined trips
    let myRole = null;
    if (trip) {
        if (!trip.share_id) {
            // Pure local trip — this device created it, must be owner
            myRole = 'owner';
            // Repair corrupted role silently
            if (trip.myRole !== 'owner') await updateTrip(trip.id, { myRole: 'owner' });
        } else {
            myRole = trip.myRole || 'viewer';
        }
    }
    const isOwner = myRole === 'owner';
    const isEditor = myRole === 'editor';
    const isViewer = myRole === 'viewer';
    const canEdit = isOwner || isEditor;

    // Role badge styling
    const roleBadge = myRole === 'owner'
        ? `<span class="px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest">👑 Admin</span>`
        : myRole === 'editor'
        ? `<span class="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">✏️ Editor</span>`
        : myRole === 'viewer'
        ? `<span class="px-3 py-1 rounded-full bg-slate-400 text-white text-[10px] font-black uppercase tracking-widest">👁️ Viewer</span>`
        : '';

    const content = `
        <div class="space-y-5 relative">
            <!-- Close Button -->
            <button onclick="hideModal()" class="absolute -top-1 -right-1 p-2 text-slate-400 hover:text-slate-600 hover:scale-110 active:scale-95 transition-all cursor-pointer" title="Close Settings">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>

            <!-- Profile Header -->
            <div class="flex items-center space-x-4 mb-4 pr-8">
                <div class="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-2xl font-bold shadow-xl shadow-indigo-100">
                    ${(profile ? profile.name : 'Guest').charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 class="text-xl font-bold text-slate-800">${profile ? profile.name : 'Guest User'}</h3>
                    <p class="text-sm text-slate-400 mb-1">Settings &amp; Sync Controls</p>
                    ${trip ? `<div class="flex items-center gap-2">${roleBadge}<span class="text-[10px] text-slate-400 font-bold">${trip.tripName}</span></div>` : ''}
                </div>
            </div>

            ${trip ? `
            <!-- Role Rules Card -->
            <div class="rounded-2xl border-2 ${isOwner ? 'border-indigo-200 bg-indigo-50' : isEditor ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'} p-4">
                <p class="text-[10px] font-black uppercase tracking-widest mb-3 ${isOwner ? 'text-indigo-600' : isEditor ? 'text-emerald-600' : 'text-slate-500'}">Trip Access Rules</p>
                <div class="space-y-2">
                    <div class="flex items-start gap-3">
                        <span class="text-sm mt-0.5">👑</span>
                        <div>
                            <p class="text-xs font-black text-slate-700">Admin (Trip Creator)</p>
                            <p class="text-[10px] text-slate-500">Full access — create, edit, delete expenses, plan stops, manage members, assign editors, delete trip</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <span class="text-sm mt-0.5">✏️</span>
                        <div>
                            <p class="text-xs font-black text-slate-700">Editor (Permission granted by Admin)</p>
                            <p class="text-[10px] text-slate-500">Can add/edit/delete expenses &amp; plan stops. Changes sync to all devices instantly</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <span class="text-sm mt-0.5">👁️</span>
                        <div>
                            <p class="text-xs font-black text-slate-700">Viewer (Default for joined members)</p>
                            <p class="text-[10px] text-slate-500">Read-only. Can view expenses, plan &amp; splits. Cannot modify anything. Ask Admin for Editor access</p>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Account -->
            <div class="space-y-3">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account &amp; Preferences</p>
                
                <button onclick="showProfileModal()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            👤
                        </div>
                        <span class="font-bold text-slate-700">User Account Settings</span>
                    </div>
                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>

            <!-- Trip Options -->
            <div class="space-y-3 pt-4 border-t border-slate-100">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trip Options</p>
                
                ${canEdit ? `
                <button onclick="showEditTripModal()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">📝</div>
                        <span class="font-bold text-slate-700">Edit Trip Details</span>
                    </div>
                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>
                ` : ''}

                ${isOwner ? `
                <button onclick="handleManagePermissions()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">👥</div>
                        <div>
                            <span class="font-bold text-slate-700 block">Manage Editors</span>
                            <span class="text-[10px] text-slate-400">${trip && trip.share_id ? 'Grant/revoke edit access to members' : 'Sync to cloud first to manage editors'}</span>
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>
                ` : ''}

                ${isViewer && trip && trip.share_id ? `
                <button onclick="claimOwnerRole()" class="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 rounded-2xl transition-all group border border-amber-200">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all">👑</div>
                        <div>
                            <span class="font-bold text-amber-700 block">I Created This Trip</span>
                            <span class="text-[10px] text-amber-500">If you are the trip creator, tap to reclaim Admin access</span>
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>
                ` : ''}

                <button onclick="showJoinTripModal()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-slate-100 text-slate-600 rounded-lg">📥</div>
                        <span class="font-bold text-slate-700">Join Friend's Cloud Trip</span>
                    </div>
                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>

                ${isOwner ? `
                <button onclick="handleDeleteTripFromSettings()" class="w-full flex items-center justify-between p-4 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-all">🗑️</div>
                        <span class="font-bold text-rose-600">Delete Current Trip</span>
                    </div>
                    <svg class="w-5 h-5 text-rose-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>
                ` : ''}
            </div>

            <!-- Local Backups -->
            <div class="space-y-4 pt-4 border-t border-slate-100">
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Database Backups</p>
               <div class="grid grid-cols-2 gap-2">
                   <button id="export-json-btn-settings" class="p-4 bg-slate-100 text-slate-600 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-slate-200 transition-all">
                       <span class="text-[10px] font-bold text-center">Export Backup</span>
                   </button>
                   <button id="import-json-btn-settings" class="p-4 bg-slate-800 text-white rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-slate-900 transition-all">
                       <span class="text-[10px] font-bold text-center">Restore Backup</span>
                   </button>
               </div>
            </div>

            <!-- Push Notifications -->
            <div class="space-y-3 pt-4 border-t border-slate-100">
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Push Notifications &amp; Alerts</p>
               <div class="flex flex-col gap-2">
                   <button id="enable-notifications-btn" onclick="requestNotificationPermission()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                       <div class="flex items-center space-x-3">
                           <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all" id="notif-icon">🔔</div>
                           <span class="font-bold text-slate-700" id="notif-text">Enable Push Notifications</span>
                       </div>
                       <span id="notif-status-badge" class="pill bg-slate-200 text-[10px] font-black text-slate-500">Disabled</span>
                   </button>
               </div>
            </div>

            <div class="pt-4 border-t border-slate-100">
                <button onclick="hideModal()" class="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Close Settings</button>
            </div>
            
            <p class="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-4">
                TripSplit v3.0 • A Product from <a href="https://aispace.co.in/" target="_blank" class="hover:text-indigo-400 transition-colors underline decoration-indigo-500/30 underline-offset-2">Aispace.co.in</a>
            </p>
        </div>
    `;

    showModal(content);

    // Call updateNotificationSettingsUI to sync UI state
    if (typeof updateNotificationSettingsUI === 'function') {
        updateNotificationSettingsUI();
    }

    // Backup & restore click wire-up
    const expBtn = document.getElementById('export-json-btn-settings');
    if (expBtn) {
      expBtn.onclick = () => {
        exportDataToJSON().then(jsonData => {
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tripsplit-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (window.showToast) window.showToast('Backup downloaded!', 'success');
        });
      };
    }

    const impBtn = document.getElementById('import-json-btn-settings');
    if (impBtn) {
      impBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    await importDataFromJSON(reader.result);
                    loadHomeData();
                    loadTrips();
                    if (window.showToast) window.showToast('Data restored!', 'success');
                    hideModal();
                } catch (error) {
                    alert('Error restoring backup: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
      };
    }
};

window.requestNotificationPermission = async function() {
    if (!('Notification' in window)) {
        alert('This browser does not support notifications.');
        return;
    }

    const permission = await Notification.requestPermission();
    if (typeof updateNotificationSettingsUI === 'function') {
        updateNotificationSettingsUI();
    }

    if (permission === 'granted') {
        if (window.showToast) window.showToast('Notification permission granted! 🔔', 'success');
        if (typeof subscribeToPush === 'function') {
            await subscribeToPush();
        }
    } else {
        if (window.showToast) window.showToast('Notification permission denied.', 'error');
    }
};

window.updateNotificationSettingsUI = function() {
    const btn = document.getElementById('enable-notifications-btn');
    const badge = document.getElementById('notif-status-badge');
    const text = document.getElementById('notif-text');
    const icon = document.getElementById('notif-icon');
    const testBtn = document.getElementById('test-notifications-btn');

    if (!btn || !badge) return;

    if (!('Notification' in window)) {
        badge.textContent = 'Unsupported';
        badge.className = 'pill bg-rose-100 text-[10px] font-black text-rose-700';
        return;
    }

    if (Notification.permission === 'granted') {
        badge.textContent = 'Active';
        badge.className = 'pill bg-emerald-100 text-[10px] font-black text-emerald-700';
        text.textContent = 'Notifications Active';
        if (icon) icon.textContent = '🔔';
        if (testBtn) testBtn.classList.remove('hidden');
    } else if (Notification.permission === 'denied') {
        badge.textContent = 'Blocked';
        badge.className = 'pill bg-rose-100 text-[10px] font-black text-rose-700';
        text.textContent = 'Notifications Blocked';
        if (icon) icon.textContent = '🔕';
        if (testBtn) testBtn.classList.add('hidden');
    } else {
        badge.textContent = 'Configure';
        badge.className = 'pill bg-amber-100 text-[10px] font-black text-amber-700';
        text.textContent = 'Enable Push Notifications';
        if (icon) icon.textContent = '🔔';
        if (testBtn) testBtn.classList.add('hidden');
    }
};

window.triggerTestNotification = function() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        alert('Please enable notifications first.');
        return;
    }

    if (window.showToast) window.showToast('Testing native notification... 🚀', 'info');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('TripSplit Notification Test', {
                body: '🎉 Notifications are working perfectly! Split bills, share memories!',
                icon: './assets/icon-192.png',
                badge: './assets/icon-192.png',
                vibrate: [100, 50, 100],
                tag: 'tripsplit-test',
                renotify: true,
                data: {
                    url: './'
                }
            });
        }).catch(err => {
            new Notification('TripSplit Notification Test', {
                body: '🎉 Notifications are working perfectly! Split bills, share memories!',
                icon: './assets/icon-192.png',
            });
        });
    } else {
        new Notification('TripSplit Notification Test', {
            body: '🎉 Notifications are working perfectly! Split bills, share memories!',
            icon: './assets/icon-192.png',
        });
    }
};

window.showProfileModal = async function() {
    const profile = typeof getUserProfile === 'function' ? await getUserProfile() : null;
    const isMandatory = !profile || !profile.name;
    if (isMandatory) {
        window.isModalMandatory = true;
    }
    const content = `
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">User Profile</h3>
          ${isMandatory ? `
            <span class="text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full shadow-sm">Setup Required</span>
          ` : `
            <button onclick="showSettings()" class="text-slate-400 hover:text-slate-600 hover:scale-110 active:scale-95 transition-all">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
            </button>
          `}
        </div>

        ${isMandatory ? `
        <!-- Warm Welcome Greeting -->
        <div class="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start space-x-3 mb-5">
            <span class="text-lg">👋</span>
            <div class="flex-1">
                <h4 class="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Welcome to TripSplit!</h4>
                <p class="text-[11px] text-indigo-700 leading-relaxed font-semibold">
                    To help you track expenses, split bills, and sync trips with friends, let's set up your profile name first. It takes just a second!
                </p>
            </div>
        </div>
        ` : `
        <!-- Local Storage and Backup Warning Note -->
        <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3 mb-5">
            <span class="text-lg">🔒</span>
            <div class="flex-1">
                <h4 class="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Local Data Security Note</h4>
                <p class="text-[11px] text-amber-700 leading-relaxed">
                    Your data is stored securely **directly on your device** for absolute privacy and safety. 
                    <b>Warning:</b> Do not clear your browser cache, site data, or private browsing history without exporting a backup first. 
                    Once you backup your files, your data is secure and ready to be fully restored at any time!
                </p>
            </div>
        </div>
        `}

        <form id="profile-form" class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Profile Name</label>
                <input type="text" id="profile-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-semibold text-slate-800" value="${profile ? profile.name : ''}" placeholder="E.g. Your Name" required>
                <p class="text-[10px] text-slate-400 mt-1">This name is used to identify you on the "Me" screen and personal balance trackers.</p>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div class="relative">
                    <input type="email" id="profile-email" class="w-full p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-xs ${profile && profile.email ? 'bg-emerald-50/30 border border-emerald-100 text-emerald-800 font-bold pr-20' : 'bg-slate-50 border-none'}" placeholder="E.g. name@domain.com" value="${profile ? (profile.email || '') : ''}" data-original="${profile ? (profile.email || '') : ''}">
                    ${profile && profile.email ? `
                        <span id="profile-email-badge" class="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-sm transition-all duration-200">✓ Verified</span>
                    ` : ''}
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Linking an email address enables secure cloud backups and collaborative trip syncing.</p>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Mobile</label>
                <input type="tel" id="profile-mobile" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-semibold text-slate-800" value="${profile ? (profile.mobile || '') : ''}" placeholder="+91 ...">
            </div>
            <div class="pt-4">
                <button type="submit" class="w-full btn-primary py-4">${isMandatory ? 'Get Started & Save Profile' : 'Save Account Profile'}</button>
            </div>
        </form>

        ${isMandatory ? '' : `
        <!-- CSV Export Option Tools -->
        <div class="space-y-3 pt-5 border-t border-slate-100 mt-5">
           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Local Data Export Tools</p>
           
           <div class="grid grid-cols-1 gap-2">
               <button type="button" id="export-csv-all-btn" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                   <div class="flex items-center space-x-3">
                       <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                           📊
                       </div>
                       <span class="font-bold text-slate-700 text-left">Export All Trips to CSV</span>
                   </div>
                   <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
               </button>

               ${window.currentTripId ? `
               <button type="button" id="export-csv-trip-btn" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                   <div class="flex items-center space-x-3">
                       <div class="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                           ✈️
                       </div>
                       <span class="font-bold text-slate-700 text-left">Export Active Trip Ledger (.csv)</span>
                   </div>
                   <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
               </button>
               ` : ''}
           </div>
        </div>
        `}
    `;
    showModal(content);
    
    // Bind dynamic verification badge state
    const profileEmailInput = document.getElementById('profile-email');
    const profileEmailBadge = document.getElementById('profile-email-badge');
    if (profileEmailInput && profileEmailBadge) {
        profileEmailInput.addEventListener('input', (e) => {
            const currentVal = e.target.value.trim().toLowerCase();
            const originalVal = e.target.getAttribute('data-original').trim().toLowerCase();
            if (currentVal === originalVal) {
                profileEmailBadge.style.opacity = '1';
                profileEmailBadge.style.pointerEvents = 'auto';
                profileEmailInput.classList.add('bg-emerald-50/30', 'border', 'border-emerald-100', 'text-emerald-800', 'font-bold', 'pr-20');
                profileEmailInput.classList.remove('bg-slate-50', 'border-none');
            } else {
                profileEmailBadge.style.opacity = '0';
                profileEmailBadge.style.pointerEvents = 'none';
                profileEmailInput.classList.remove('bg-emerald-50/30', 'border', 'border-emerald-100', 'text-emerald-800', 'font-bold', 'pr-20');
                profileEmailInput.classList.add('bg-slate-50', 'border-none');
            }
        });
    }
    
    // Bind form submission
    document.getElementById('profile-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value.trim();
        const email = document.getElementById('profile-email').value.trim().toLowerCase();
        const mobile = document.getElementById('profile-mobile').value.trim();
        
        try {
            const currentEmail = (profile && profile.email) ? profile.email.toLowerCase() : '';
            
            if (email && email !== currentEmail) {
                // The user entered a new email! Let's save other settings and redirect to sync OTP flow
                const confirmLink = confirm(`To link and secure your account to "${email}", we need to send a quick verification code.\n\nSend verification code now?`);
                if (confirmLink) {
                    window.isModalMandatory = false; // Release mandatory block
                    // Save name & mobile locally first
                    await saveUserProfile({ name, email: '', mobile });
                    hideModal();
                    
                    // Switch to profile sync page, populate input and trigger verification
                    showScreen('my');
                    const syncInput = document.getElementById('sync-email-input');
                    if (syncInput) {
                        syncInput.value = email;
                        window.handleStartLinkEmail();
                    }
                    return;
                }
            } else {
                // Standard profile update (email matches or empty)
                await saveUserProfile({ name, email: currentEmail, mobile });
                window.isModalMandatory = false; // Release mandatory block
                if (window.showToast) {
                    if (isMandatory) {
                        window.showToast('Welcome aboard! Profile saved successfully! 🎉', 'success');
                    } else {
                        window.showToast('Profile saved successfully!', 'success');
                    }
                }
                hideModal();
                if (!isMandatory) {
                    showSettings();
                }
            }
        } catch (error) {
            alert('Error saving profile: ' + error.message);
        }
    };

    // CSV Export All Wire-Up
    const csvAllBtn = document.getElementById('export-csv-all-btn');
    if (csvAllBtn) {
        csvAllBtn.onclick = async () => {
            try {
                if (typeof exportDataToCSV === 'function') {
                    const csvContent = await exportDataToCSV();
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tripsplit-all-trips-${new Date().toISOString().split('T')[0]}.csv`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    if (window.showToast) window.showToast('CSV Backup exported successfully! 📊', 'success');
                }
            } catch (err) {
                alert('Export failed: ' + err.message);
            }
        };
    }

    // CSV Export Active Trip Wire-Up
    const csvTripBtn = document.getElementById('export-csv-trip-btn');
    if (csvTripBtn) {
        csvTripBtn.onclick = async () => {
            try {
                if (typeof exportTripToCSV === 'function' && window.currentTripId) {
                    const csvContent = await exportTripToCSV(window.currentTripId);
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tripsplit-trip-ledger-${window.currentTripId}-${new Date().toISOString().split('T')[0]}.csv`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    if (window.showToast) window.showToast('Active trip ledger exported! ✈️', 'success');
                }
            } catch (err) {
                alert('Export failed: ' + err.message);
            }
        };
    }
};

// Join Trip modal (Download trip from ID)
window.showJoinTripModal = async function() {
    const content = `
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Join a Trip</h3>
          <button onclick="showSettings()" class="text-slate-400 hover:text-slate-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
        </div>
        <div class="mb-6 p-4 bg-indigo-50 rounded-2xl">
            <p class="text-xs text-indigo-700 leading-relaxed">
                Enter the unique <b>Trip ID</b> shared by your friend (e.g., GOA-8492) to download and sync their trip data.
            </p>
        </div>
        <form id="join-trip-form" class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unique Trip ID</label>
                <input type="text" id="join-trip-id" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-mono uppercase" placeholder="E.g. GOA-1234" required>
            </div>
            <div class="pt-4">
                <button type="submit" class="w-full btn-primary py-4">Join Trip</button>
            </div>
        </form>
    `;
    showModal(content);
    
    document.getElementById('join-trip-form').onsubmit = async (e) => {
        e.preventDefault();
        const shareId = document.getElementById('join-trip-id').value.trim().toUpperCase();
        
        if (shareId && typeof joinTripFromCloud === 'function') {
            try {
                if (window.showToast) window.showToast('Searching for cloud trip...', 'info');
                const tripId = await joinTripFromCloud(shareId);
                
                if (typeof subscribeToTripUpdates === 'function') {
                    subscribeToTripUpdates(shareId);
                }
                
                hideModal();
                loadTrips();
                selectTrip(tripId);
                if (window.showToast) window.showToast('Trip loaded successfully!', 'success');
            } catch (error) {
                alert('Trip not found: ' + error.message);
            }
        }
    };
};

// Export selections for CSV
window.showExportSelectionModal = function() {
  getTrips().then(trips => {
    let content = `
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-slate-800">Export for Sheets</h3>
        <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <p class="text-xs text-slate-400 mb-6 font-bold uppercase tracking-widest">Select what to download:</p>
      <div class="space-y-3">
        <button onclick="downloadCSV('all')" class="w-full text-left p-5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 flex justify-between items-center group transition-all">
            <div>
                <p class="font-bold">Backup All Trips</p>
                <p class="text-[10px] opacity-70">Complete history and all data</p>
            </div>
            <svg class="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </button>
        
        <div class="pt-4 border-t border-slate-100">
            <p class="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest">Single Trip Export:</p>
            <div class="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
      `;
      
      trips.forEach(trip => {
        content += `
          <button onclick="downloadCSV(${trip.id})" class="w-full text-left p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border-2 border-transparent hover:border-emerald-100 transition-all group">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-bold text-slate-800 group-hover:text-emerald-700">${trip.tripName}</p>
                <p class="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">${new Date(trip.createdAt).toLocaleDateString()}</p>
              </div>
              <svg class="w-5 h-5 text-slate-300 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </div>
          </button>`;
      });

      content += `
            </div>
        </div>
      </div>
      <button onclick="hideModal()" class="w-full mt-6 py-4 font-bold text-slate-400">Close</button>
    `;
    showModal(content);
  });
};

window.downloadCSV = async function(tripId) {
    let csvData;
    let filename;
    
    if (tripId === 'all') {
        csvData = typeof exportDataToCSV === 'function' ? await exportDataToCSV() : '';
        filename = `tripsplit-all-backup-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
        csvData = typeof exportTripToCSV === 'function' ? await exportTripToCSV(tripId) : '';
        const trip = await getTrip(tripId);
        const safeName = (trip ? trip.tripName : 'trip').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        filename = `tripsplit-trip-${safeName}-${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    hideModal();
};

window.saveSyncURL = function() {
    const url = document.getElementById('sync-url-input').value.trim();
    if (url) {
        localStorage.setItem('tripsplit_sync_url', url);
        alert('Sync URL saved successfully!');
    }
};

// Edit Stop/Place inside itinerary list (Plan tab)
window.showEditPlaceOverlay = function(index) {
    getTrip(currentTripId).then(trip => {
        const item = trip.itinerary[index];
        const content = `
            <h3 class="text-xl font-bold mb-6 text-slate-800">Edit Stop</h3>
            <form id="edit-place-form" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Place Name</label>
                    <input type="text" id="edit-place-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${item.placeName}" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Time / Day</label>
                    <input type="text" id="edit-place-time" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${item.time || ''}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</label>
                    <textarea id="edit-place-notes" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" rows="2">${item.notes || ''}</textarea>
                </div>
                <div class="flex space-x-3 pt-4">
                    <button type="submit" class="flex-1 btn-primary py-4">Save Changes</button>
                    <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
                </div>
            </form>
        `;
        showModal(content);

        document.getElementById('edit-place-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const placeName = document.getElementById('edit-place-name').value.trim();
            const time = document.getElementById('edit-place-time').value.trim();
            const notes = document.getElementById('edit-place-notes').value.trim();

            if (placeName) {
                const itinerary = trip.itinerary;
                itinerary[index] = { ...itinerary[index], placeName, time, notes };
                await updateTrip(currentTripId, { itinerary });
                hideModal();
                if (typeof loadTripNotes === 'function') loadTripNotes();
            }
        });
    });
};

// Cloud sync runner
window.handleCloudSync = async function() {
    if (!currentTripId) {
        if (window.showToast) window.showToast('Please select a trip first!', 'info');
        return;
    }
    
    if (typeof syncTripToCloud !== 'function') {
        alert('Offline Sync module is not fully loaded. Check your internet connection.');
        return;
    }

    const trip = await getTrip(currentTripId);
    if (!trip) return;

    if (window.showToast) window.showToast('Syncing trip data...', 'info');

    try {
        if (trip.share_id) {
            // 1. First sync user role with database to apply up-to-date role permissions
            if (typeof syncLocalRoleWithCloud === 'function') {
                await syncLocalRoleWithCloud(currentTripId);
            }
            
            // Get updated local role
            const updatedTrip = await getTrip(currentTripId);
            const myRole = updatedTrip ? (updatedTrip.myRole || 'viewer') : 'viewer';

            if (myRole === 'owner' || myRole === 'editor') {
                // Editor/Owner: Bi-directional sync. Pull latest cloud updates first, then push local edits.
                if (typeof pullTripFromCloud === 'function') {
                    await pullTripFromCloud(currentTripId);
                }
                await syncTripToCloud(currentTripId);
            } else {
                // Viewer (Read-only): Pull only from the cloud.
                if (typeof pullTripFromCloud === 'function') {
                    const pulled = await pullTripFromCloud(currentTripId);
                    if (!pulled) {
                        throw new Error("Could not pull latest changes from cloud. Check your connection.");
                    }
                }
            }
            if (window.showToast) window.showToast('Trip fully synced! 🟢', 'success');
        } else {
            // Local Trip: Publish and push to cloud.
            await syncTripToCloud(currentTripId);
            if (window.showToast) window.showToast('Trip published and synced! 🟢', 'success');
        }

        // Re-render UI to show latest data
        await loadHomeData();
        if (window.currentScreen === 'expenses' && typeof loadExpenses === 'function') loadExpenses();
        if (window.currentScreen === 'split' && typeof calculateSplit === 'function') calculateSplit();
        if (window.currentScreen === 'plan' && typeof loadTripNotes === 'function') loadTripNotes();
        await loadTripsCapsules();
    } catch (error) {
        alert('Sync error: ' + error.message);
    }
};

window.handleDeleteTripFromSettings = async function() {
    if (!currentTripId) return;
    if (confirm('Are you sure you want to delete this trip and all its data? This cannot be undone.')) {
        if (typeof deleteTrip === 'function') {
          await deleteTrip(currentTripId);
          currentTripId = null;
          window.location.reload();
        }
    }
};

// Global PWA UI Listeners registration
window.initUI = function() {
  console.log('Registering premium UI hooks & listeners...');
  
  // Dock Nav switching hooks
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const screenId = btn.getAttribute('data-screen');
    if (screenId) {
      btn.addEventListener('click', () => showScreen(screenId));
    }
  });

  // Action Add FAB contextual settings
  updateCenterFAB(currentScreen);

  // Sheets Export link
  const exportSheetsBtn = document.getElementById('export-sheets-btn');
  if (exportSheetsBtn) {
    exportSheetsBtn.onclick = showExportSelectionModal;
  }

  // Gemini AI Menu dropdown transitions
  const aiMenuBtn = document.getElementById('ai-menu-btn');
  const aiDropdown = document.getElementById('ai-dropdown');
  if (aiMenuBtn && aiDropdown) {
    aiMenuBtn.onclick = (e) => {
      e.stopPropagation();
      aiDropdown.classList.toggle('hidden');
    };
    document.addEventListener('click', () => aiDropdown.classList.add('hidden'));
  }

  // Horizontal collapsibles toggles
  const expenseToggle = document.getElementById('expense-summary-toggle');
  if (expenseToggle) {
    expenseToggle.addEventListener('click', toggleExpenseSummaryDropdown);
  }

  const pToggle = document.getElementById('participants-toggle');
  if (pToggle) {
    pToggle.addEventListener('click', toggleParticipantsDropdown);
  }

  const sToggle = document.getElementById('home-settlements-toggle');
  if (sToggle) {
    sToggle.addEventListener('click', toggleHomeSettlementsDropdown);
  }

  // Header options gear and overlay close
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.onclick = showSettings;
  }

  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        if (window.isModalMandatory) return; // Do not close if mandatory
        hideModal();
      }
    });
  }

  // Initial render calls
  switchAppMode(window.currentAppMode, true);
};

// Self-repair function: lets a trip creator reclaim Admin role if stuck as Viewer
window.claimOwnerRole = async function() {
    if (!currentTripId) return;
    const trip = await getTrip(currentTripId);
    if (!trip) return;

    const confirmed = confirm(
        'Only the original trip creator should use this.\n\n' +
        'This will set your role to Admin for "' + trip.tripName + '".\n\n' +
        'Proceed?'
    );
    if (!confirmed) return;

    // Force local role to owner
    await updateTrip(currentTripId, { myRole: 'owner' });

    // Re-sync to cloud so the server records this device as owner
    if (typeof syncTripToCloud === 'function') {
        try {
            await syncTripToCloud(currentTripId, 'Claimed owner role');
            if (window.showToast) window.showToast('Admin role claimed! You now have full access.', 'success');
        } catch(e) {
            if (window.showToast) window.showToast('Role updated locally. Sync when online to confirm.', 'info');
        }
    }

    hideModal();
    // Re-open settings with updated role
    setTimeout(() => showSettings(), 300);
};

// Share Trip Invite Helper
window.shareTripInvite = async function() {
  if (!currentTripId) return;
  const trip = await getTrip(currentTripId);
  if (!trip) return;
  
  if (!trip.share_id) {
    if (typeof window.triggerBackgroundSync === 'function') {
      if (window.showToast) window.showToast('Publishing trip to cloud...', 'info');
      const shareId = await window.triggerBackgroundSync('share trip');
      if (shareId) {
        trip.share_id = shareId;
      }
    }
    if (!trip.share_id) {
      if (window.showToast) window.showToast('Could not sync. Please connect to the Internet.', 'warning');
      return;
    }
  }

  const message = `Join my trip "${trip.tripName}" on TripSplit!\n\nUse this Trip ID to collaborate live:\n👉 *${trip.share_id}*\n\nTo join:\n1. Open TripSplit\n2. Go to Settings or Profile Tab\n3. Click "Join Trip"\n4. Enter the Trip ID above!\n\nSplit bills, share memories. A Product from Aispace.co.in`;
  
  if (navigator.share) {
    navigator.share({
      title: `TripSplit Invite: ${trip.tripName}`,
      text: message
    }).catch(err => {
      console.log('Share failed:', err);
      navigator.clipboard.writeText(message);
      if (window.showToast) window.showToast('Invite details copied to clipboard!', 'success');
    });
  } else {
    navigator.clipboard.writeText(message);
    if (window.showToast) window.showToast('Invite details copied to clipboard!', 'success');
  }
};

window.closeTrip = async function() {
  if (!confirm("Are you sure you want to close this trip? This will lock all new expenses.")) return;
  await updateTrip(currentTripId, { isClosed: true });
  if (window.showToast) window.showToast('Trip Closed & Locked 🔒', 'success');
  loadHomeData();
};

window.reopenTrip = async function() {
  if (!confirm("Reopen this trip? This will allow new expenses to be added.")) return;
  await updateTrip(currentTripId, { isClosed: false });
  if (window.showToast) window.showToast('Trip Reopened 🔓', 'info');
  loadHomeData();
};

window.broadcastDuesWhatsApp = async function() {
  if (!currentTripId) return;
  const trip = await getTrip(currentTripId);
  if (!trip || trip.tripType !== 'single_payer') return;
  
  const splitData = await calculateSplit();
  if (!splitData) return;
  
  const settlements = splitData.settlements;
  const symbol = trip.currencySymbol || '₹';
  
  let msg = `*🔒 Trip Closed: ${trip.tripName}*\n`;
  msg += `Total Expenses: ${symbol}${splitData.totalExpense.toFixed(0)}\n\n`;
  msg += `*Final Settlement Dues:*\n`;
  
  if (settlements.length === 0) {
      msg += `Everything is perfectly balanced! No payments needed. 🎉\n`;
  } else {
      settlements.forEach(s => {
          msg += `• ${s.from} owes ${symbol}${s.amount.toFixed(0)} to ${s.to}\n`;
      });
  }
  
  msg += `\nPlease settle your dues at the earliest.`;
  
  const encodedMsg = encodeURIComponent(msg);
  window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
};
