// ui_engine.js - Consolidated PWA Modernized UI Engine
console.log('ui_engine.js loading...');

// Global App State
let currentScreen = 'home';
window.currentAppMode = localStorage.getItem('tripsplit_app_mode') || 'split';

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
  if (screenId === 'plan') loadTripNotes();
  if (screenId === 'split') calculateSplit();
  if (screenId === 'trips') loadTrips();
  if (screenId === 'my') loadMyData();

  // Contextual Global FAB binding
  updateCenterFAB(screenId);

  currentScreen = screenId;
};

// Contextual Floating Action Button updates
function updateCenterFAB(screenId) {
  const fab = document.getElementById('fab');
  if (!fab) return;

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

// Premium Toast Alert system
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '🔔';
  const bg = type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
             type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 
             'bg-white/90 border-slate-100 text-slate-800 backdrop-blur-xl shadow-2xl';
             
  toast.className = `p-4 rounded-2xl border flex items-start space-x-3 transition-all duration-500 transform translate-y-[-100%] opacity-0 ${bg}`;
  toast.innerHTML = `
      <div class="text-xl">${icon}</div>
      <div class="flex-1 mt-0.5 font-bold text-xs leading-relaxed">${message}</div>
  `;
  
  container.appendChild(toast);
  requestAnimationFrame(() => {
      toast.classList.remove('translate-y-[-100%]', 'opacity-0');
  });
  
  setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-[-100%]');
      setTimeout(() => toast.remove(), 500);
  }, 4000);
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
    capsule.className = `flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all ${
      isActive 
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105' 
      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    }`;
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
    showModal(content);
  });
};

// Create Trip Modal with currency selector and templates option (F6, F7)
window.showCreateTripModal = async function() {
  const templates = typeof getTemplates === 'function' ? await getTemplates() : [];
  const templatesOptions = templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

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
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">⚡ Start from Template</label>
        <select id="create-trip-template" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all">
          <option value="">-- Fresh Trip --</option>
          ${templatesOptions}
        </select>
      </div>
      ` : ''}

      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes (Optional)</label>
        <textarea id="trip-notes-input" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" rows="3" placeholder="Brief description..."></textarea>
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
            itinerary: template.itinerary || []
          });
          
          // Auto add crew from template
          if (template.crew && template.crew.length > 0) {
            for (const member of template.crew) {
              await addParticipant({
                tripId: tripId,
                name: member.name,
                phone: '',
                familyCount: member.familyCount || 1
              });
            }
          }
          if (window.showToast) window.showToast('Created trip from template! Crew loaded. ✅', 'success');
        }
      } else {
        tripId = await addTrip({ 
          tripName, 
          notes, 
          estimatedBudget: budget, 
          currency: currencyObj.code, 
          currencySymbol: currencyObj.symbol 
        });
      }
      
      hideModal();
      loadTrips();
      selectTrip(tripId);
    }
  });
};

// Add Participant Modal
window.showAddParticipantModal = function() {
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

// Add Expense Modal with Collapsible "Split With" dropdown and Foreign currency + Recurring fields (F4, F7, F8)
window.showAddExpenseModal = function() {
  if (!currentTripId) {
    showTripSelectionModal();
    return;
  }

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
  const expenses = await getExpenses(currentTripId);

  const tripSymbol = trip ? (trip.currencySymbol || '₹') : '₹';
  window.currentTripSymbol = tripSymbol;

  // Active theme sync
  document.body.className = window.currentAppMode === 'adviser' ? 'theme-adviser' : 'theme-split';

  document.getElementById('current-trip-name').textContent = trip ? trip.tripName : 'No trip selected';
  const subtext = document.getElementById('trip-dates');
  if (subtext) {
      subtext.textContent = (trip && trip.notes) ? trip.notes : 'Manage your travel expenses';
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
      card.className = 'bg-white rounded-3xl p-4 min-w-[140px] shadow-sm border border-slate-100 flex flex-col items-center animate-scale-in relative group';
      card.innerHTML = `
        <button onclick="editParticipant(${participant.id})" class="absolute top-2 right-2 p-1 bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </button>
        <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 font-bold text-lg">
          ${participant.name.charAt(0).toUpperCase()}
        </div>
        <div class="font-bold text-slate-800 text-sm truncate w-full text-center">${participant.name}</div>
        <div class="text-xs font-bold text-indigo-500 mt-1">${tripSymbol}${participant.totalSpent.toFixed(0)}</div>
      `;
      participantsList.appendChild(card);
    });
    
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
              <button onclick="editParticipant(${participant.id})" class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Edit</button>
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
}

// Load full Expenses list screen
async function loadExpenses() {
  if (!currentTripId) return;

  const expenses = await getExpenses(currentTripId);
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
            <div class="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            <p class="font-bold">No expenses found</p>
        </div>`;
    return;
  }

  expenses.forEach(expense => {
    const card = document.createElement('div');
    card.className = 'premium-card animate-scale-in';
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                ${expense.category.charAt(0)}
            </div>
            <div>
              <h4 class="font-bold text-slate-800 text-lg flex items-center">
                ${expense.title}
                ${expense.isRecurring ? '<span class="text-xs text-indigo-500 font-bold ml-1.5" title="Recurring Daily Expense">🔄</span>' : ''}
              </h4>
              <p class="text-xs text-slate-400 font-medium">${expense.category} • Paid by ${participantMap[expense.paidBy] || 'Unknown'}</p>
            </div>
        </div>
        <div class="text-right">
          <p class="font-black text-xl text-slate-900">${tripSymbol}${(expense.totalAmount || expense.amount).toFixed(2)}</p>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${new Date(expense.createdAt).toLocaleDateString()}</p>
          ${expense.advancePay ? `
            <div class="mt-2 text-[10px] font-bold">
                <span class="text-emerald-500">PAID: ${tripSymbol}${expense.advancePay.toFixed(0)}</span>
                <span class="mx-1 text-slate-300">|</span>
                <span class="text-rose-500">REM: ${tripSymbol}${((expense.totalAmount || expense.amount) - expense.advancePay).toFixed(0)}</span>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="flex space-x-4 pt-4 border-t border-slate-50">
        <button onclick="editExpense(${expense.id})" class="flex items-center space-x-1 text-xs font-bold text-indigo-500 hover:text-indigo-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            <span>EDIT</span>
        </button>
        <button onclick="deleteExpense(${expense.id})" class="flex items-center space-x-1 text-xs font-bold text-rose-500 hover:text-rose-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            <span>DELETE</span>
        </button>
      </div>
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
async function loadTrips() {
  const trips = await getTrips();
  const tripsList = document.getElementById('trips-list');
  if (!tripsList) return;

  tripsList.innerHTML = '';

  if (trips.length === 0) {
    tripsList.innerHTML = '<p class="text-center text-slate-400 py-10 font-bold">No trips found. Create one using the action button!</p>';
    return;
  }

  trips.forEach(trip => {
    const isCurrent = String(currentTripId) === String(trip.id);
    const card = document.createElement('div');
    const symbol = trip.currencySymbol || '₹';
    card.className = `premium-card animate-scale-in ${isCurrent ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}`;
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <div>
          <div class="flex items-center space-x-2">
            <h4 class="font-bold text-lg text-slate-800">${trip.tripName}</h4>
            ${isCurrent ? '<span class="bg-indigo-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Active</span>' : ''}
          </div>
          <p class="text-sm text-slate-500 mt-1 line-clamp-1">${trip.notes || 'No description provided'}</p>
          <div class="flex items-center space-x-3 mt-2">
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Budget: ${symbol}${trip.estimatedBudget || 0}</p>
            ${trip.share_id ? `<span class="text-[10px] text-indigo-400 font-black tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">ID: ${trip.share_id}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
        <button onclick="selectTrip('${trip.id}')" class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">SELECT</button>
        <button onclick="duplicateTrip('${trip.id}')" class="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors">DUPLICATE</button>
        <button onclick="saveTripAsTemplate('${trip.id}')" class="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors">📋 TEMPLATE</button>
        <button onclick="deleteTrip('${trip.id}')" class="px-4 py-2 bg-rose-100 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-200 transition-colors">DELETE</button>
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
  const settlementsCard = document.getElementById('home-settlements-card');
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

    const content = `
        <div class="space-y-6 relative">
            <!-- Top Right Close Icon Button -->
            <button onclick="hideModal()" class="absolute -top-1 -right-1 p-2 text-slate-400 hover:text-slate-600 hover:scale-110 active:scale-95 transition-all cursor-pointer" title="Close Settings">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>

            <div class="flex items-center space-x-4 mb-6 pr-8">
                <div class="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-2xl font-bold shadow-xl shadow-indigo-100">
                    ${(profile ? profile.name : 'Guest').charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 class="text-xl font-bold text-slate-800">${profile ? profile.name : 'Guest User'}</h3>
                    <p class="text-sm text-slate-400">Settings & Offline Sync Controls</p>
                </div>
            </div>

            <div class="space-y-3">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account & Preferences</p>
                
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

            <div class="space-y-3 pt-4 border-t border-slate-100">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trip Options</p>
                
                <button onclick="showEditTripModal()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            📝
                        </div>
                        <span class="font-bold text-slate-700">Edit Trip Details</span>
                    </div>
                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>

                ${trip && trip.share_id ? `
                <button onclick="showManageEditorsModal()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            👥
                        </div>
                        <span class="font-bold text-slate-700">Manage Editors</span>
                    </div>
                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>
                ` : ''}

                <button onclick="showJoinTripModal()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-slate-100 text-slate-600 rounded-lg">
                            📥
                        </div>
                        <span class="font-bold text-slate-700">Join Friend's Cloud Trip</span>
                    </div>
                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>

                <button onclick="handleDeleteTripFromSettings()" class="w-full flex items-center justify-between p-4 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all group">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-all">
                            🗑️
                        </div>
                        <span class="font-bold text-rose-600">Delete Current Trip</span>
                    </div>
                    <svg class="w-5 h-5 text-rose-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>

            <!-- F2: Local Backups -->
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

            <!-- Push Notifications Section -->
            <div class="space-y-3 pt-4 border-t border-slate-100">
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Push Notifications & Alerts</p>
               
               <div class="flex flex-col gap-2">
                   <button id="enable-notifications-btn" onclick="requestNotificationPermission()" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                       <div class="flex items-center space-x-3">
                           <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all" id="notif-icon">
                               🔔
                           </div>
                           <span class="font-bold text-slate-700" id="notif-text">Enable Push Notifications</span>
                       </div>
                       <span id="notif-status-badge" class="pill bg-slate-200 text-[10px] font-black text-slate-500">Disabled</span>
                   </button>
               </div>
            </div>

            <div class="pt-6 border-t border-slate-100">
                <button onclick="hideModal()" class="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Close Settings</button>
            </div>
            
            <p class="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-4">TripSplit v3.0 • A Product from Aispace.co.in</p>
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

// Edit Profile settings
window.showProfileModal = async function() {
    const profile = typeof getUserProfile === 'function' ? await getUserProfile() : null;
    const content = `
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">User Profile</h3>
          <button onclick="showSettings()" class="text-slate-400 hover:text-slate-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
        </div>

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

        <form id="profile-form" class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Profile Name</label>
                <input type="text" id="profile-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${profile ? profile.name : ''}" placeholder="E.g. Praveen" required>
                <p class="text-[10px] text-slate-400 mt-1">This name is used to identify you on the "Me" screen and personal balance trackers.</p>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                ${profile && profile.email ? `
                    <div class="relative">
                        <input type="hidden" id="profile-email" value="${profile.email}">
                        <input type="email" class="w-full p-4 bg-emerald-50/50 border border-emerald-100 text-emerald-800 font-bold rounded-2xl focus:outline-none cursor-not-allowed text-xs" value="${profile.email}" readonly>
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-sm">✓ Verified</span>
                    </div>
                ` : `
                    <div class="relative">
                        <input type="hidden" id="profile-email" value="">
                        <input type="email" class="w-full p-4 bg-slate-100/50 border border-slate-100 text-slate-400 rounded-2xl focus:outline-none cursor-not-allowed text-xs" placeholder="Not linked" readonly>
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600 text-[10px] font-bold hover:underline cursor-pointer" onclick="hideModal(); showScreen('my');">Link Email ➔</span>
                    </div>
                `}
                <p class="text-[10px] text-slate-400 mt-1">To link, change, or recover your email account, please use the sync panel on the "My Summary" screen.</p>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Mobile</label>
                <input type="tel" id="profile-mobile" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${profile ? (profile.mobile || '') : ''}" placeholder="+91 ...">
            </div>
            <div class="pt-4">
                <button type="submit" class="w-full btn-primary py-4">Save Account Profile</button>
            </div>
        </form>

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
    `;
    showModal(content);
    
    // Bind form submission
    document.getElementById('profile-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value.trim();
        const email = document.getElementById('profile-email').value.trim();
        const mobile = document.getElementById('profile-mobile').value.trim();
        
        try {
            await saveUserProfile({ name, email, mobile });
            if (window.showToast) window.showToast('Profile saved successfully!', 'success');
            showSettings();
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

    if (window.showToast) window.showToast('Syncing trip data...', 'info');

    try {
        await syncTripToCloud(currentTripId);
        if (window.showToast) window.showToast('Trip fully synced to cloud! 🟢', 'success');
        loadHomeData();
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

  // Header options gear and overlay close
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.onclick = showSettings;
  }

  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        hideModal();
      }
    });
  }

  // Initial render calls
  switchAppMode(window.currentAppMode, true);
};
