// app.js - Main application logic

// State Management (Global)
let deferredPrompt = null;


// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // PWA Install logic
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install prompt captured');
    
    // Show header install button
    const headerInstallBtn = document.getElementById('install-header-btn');
    if (headerInstallBtn) {
        headerInstallBtn.classList.remove('hidden');
        headerInstallBtn.onclick = async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            headerInstallBtn.classList.add('hidden');
        };
    }
  });
});

async function initApp() {
  console.log('TripSplit initializing...');
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      console.log('Service worker registered');
      
      // Auto-subscribe to push if permission is already granted
      if ('Notification' in window && Notification.permission === 'granted') {
        if (typeof subscribeToPush === 'function') {
          subscribeToPush();
        }
      }

      // Handle updates to the service worker
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New update available. Activating...');
            }
          });
        }
      });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }

    // Auto-reload to apply new service worker updates instantly
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  // Splash Screen Logic (Snappy 1-Second Fade out)
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      setTimeout(() => splash.remove(), 700); // Remove after fade transition
    }
  }, 1000);

  // Initialize Modules
  if (typeof initUI === 'function') initUI();
  if (typeof initPlanner === 'function') initPlanner();
  if (typeof initShare === 'function') initShare();

  // Load initial data
  // Load initial data and restore last active trip ID across sessions
  const trips = await getTrips();
  const savedActiveTripId = localStorage.getItem('tripsplit_active_trip_id');
  
  // Robust check: compare as strings to handle both numeric and string IDs (cloud-synced UUIDs)
  const matchedTrip = trips.find(t => String(t.id) === String(savedActiveTripId));
  if (savedActiveTripId && matchedTrip) {
    currentTripId = matchedTrip.id;
    window.currentTripId = matchedTrip.id;
  } else if (trips.length > 0) {
    currentTripId = trips[0].id;
    window.currentTripId = trips[0].id;
    localStorage.setItem('tripsplit_active_trip_id', currentTripId);
  } else {
    currentTripId = null;
    window.currentTripId = null;
  }

  // Highlight and guide new users to the Trips icon if no active trip exists
  const tripsNavBtn = document.getElementById('nav-btn-trips');
  if (tripsNavBtn) {
    if (!currentTripId) {
      tripsNavBtn.classList.add('glowing-pulse-nav');
    } else {
      tripsNavBtn.classList.remove('glowing-pulse-nav');
    }
  }

  await loadHomeData();
  await loadTrips();
  await loadTripsCapsules();
  showScreen('home');
  
  // Attach WebSocket if cloud connected
  if (currentTripId) {
    const activeTrip = trips.find(t => String(t.id) === String(currentTripId));
    if (activeTrip && activeTrip.share_id && typeof subscribeToTripUpdates === 'function') {
        subscribeToTripUpdates(activeTrip.share_id);
    } else {
        if (typeof updateLiveStatusIndicator === 'function') {
            updateLiveStatusIndicator(false);
        }
    }
  } else {
    if (typeof updateLiveStatusIndicator === 'function') {
        updateLiveStatusIndicator(false);
    }
  }

  // Handle header scroll effect
  window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}


// Trip selection
async function selectTrip(tripId) {
  currentTripId = tripId;
  window.currentTripId = tripId;
  localStorage.setItem('tripsplit_active_trip_id', tripId);
  
  // Remove guide pulse on selection
  const tripsNavBtn = document.getElementById('nav-btn-trips');
  if (tripsNavBtn) {
    tripsNavBtn.classList.remove('glowing-pulse-nav');
  }
  
  hideModal();
  await loadHomeData();
  await loadExpenses();
  await loadTripNotes();
  await loadTripsCapsules();
  showScreen('home');
  
  // Attach WebSocket if cloud connected
  const trip = await getTrip(tripId);
  if (trip && trip.share_id && typeof subscribeToTripUpdates === 'function') {
      subscribeToTripUpdates(trip.share_id);
  } else {
      if (typeof realtimeSubscription !== 'undefined' && realtimeSubscription) {
          supabase.removeChannel(realtimeSubscription);
          window.realtimeSubscription = null;
      }
      if (typeof updateLiveStatusIndicator === 'function') {
          updateLiveStatusIndicator(false);
      }
  }
}

// Trip operations
async function deleteTrip(tripId) {
    const participants = await getParticipants(tripId);
    const expenses = await getExpenses(tripId);

    // Using the DB functions directly to avoid recursion
    for (const participant of participants) {
      await deleteParticipantFromDB(participant.id);
    }
    for (const expense of expenses) {
      await deleteExpenseFromDB(expense.id);
    }

    await deleteTripFromDB(tripId);

    if (String(currentTripId) === String(tripId)) {
      currentTripId = null;
      window.currentTripId = null;
      localStorage.removeItem('tripsplit_active_trip_id');
      
      // Guide user back to selecting/creating a trip
      const tripsNavBtn = document.getElementById('nav-btn-trips');
      if (tripsNavBtn) {
        tripsNavBtn.classList.add('glowing-pulse-nav');
      }
    }

    loadHomeData();
    loadTrips();
}

async function duplicateTrip(tripId) {
  const newTripId = await duplicateTripFromDB(tripId);
  if (newTripId) {
    const participants = await getParticipants(tripId);
    for (const participant of participants) {
      const newParticipant = { ...participant, tripId: newTripId };
      delete newParticipant.id;
      await addParticipant(newParticipant);
    }

    const expenses = await getExpenses(tripId);
    for (const expense of expenses) {
      const newExpense = { ...expense, tripId: newTripId };
      delete newExpense.id;
      await addExpense(newExpense);
    }

    loadTrips();
    alert('Trip duplicated successfully!');
  }
}

// Expense operations
async function editExpense(expenseId) {
  const expense = await getExpense(expenseId);
  if (!expense) return;

  const participants = await getParticipants(currentTripId);
  const participantOptions = participants.map(p => 
    `<option value="${p.id}" ${p.id === expense.paidBy ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  const content = `
    <h3 class="text-xl font-bold mb-6 text-slate-800">Edit Expense</h3>
    <form id="edit-expense-form" class="space-y-5">
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
        <input type="text" id="expense-title" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${expense.title}" required>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Price (₹)</label>
          <input type="number" id="expense-total-edit" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="0" step="0.01" value="${expense.totalPay || expense.amount}" oninput="calculateRemainingEdit()" required>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Advance Paid (₹)</label>
          <input type="number" id="expense-advance-edit" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="0" step="0.01" value="${expense.advancePay || 0}" oninput="calculateRemainingEdit()">
        </div>
      </div>
      <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
          <span class="text-xs font-bold text-slate-400 uppercase">Remaining to Pay</span>
          <span id="remaining-amount-edit" class="font-black text-rose-500">₹${((expense.totalPay || expense.amount) - (expense.advancePay || 0)).toFixed(2)}</span>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
        <select id="expense-category" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" required>
          <option value="Others" ${!['Food','Fuel','Hotel','Shopping','Tickets','Emergency','Miscellaneous'].includes(expense.category) ? 'selected' : ''}>Others</option>
          <option value="Food" ${expense.category === 'Food' ? 'selected' : ''}>Food</option>
          <option value="Fuel" ${expense.category === 'Fuel' ? 'selected' : ''}>Fuel</option>
          <option value="Hotel" ${expense.category === 'Hotel' ? 'selected' : ''}>Hotel</option>
          <option value="Shopping" ${expense.category === 'Shopping' ? 'selected' : ''}>Shopping</option>
          <option value="Tickets" ${expense.category === 'Tickets' ? 'selected' : ''}>Tickets</option>
          <option value="Emergency" ${expense.category === 'Emergency' ? 'selected' : ''}>Emergency</option>
          <option value="Miscellaneous" ${expense.category === 'Miscellaneous' ? 'selected' : ''}>Miscellaneous</option>
        </select>
      </div>
      <div id="edit-manual-category-container" class="${['Food','Fuel','Hotel','Shopping','Tickets','Emergency','Miscellaneous'].includes(expense.category) ? 'hidden' : ''}">
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category Name</label>
        <input type="text" id="edit-manual-category" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${!['Food','Fuel','Hotel','Shopping','Tickets','Emergency','Miscellaneous'].includes(expense.category) ? expense.category : ''}" placeholder="E.g. Toll, Laundry">
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Paid By</label>
        <select id="expense-paid-by" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" required>
          ${participantOptions}
        </select>
      </div>
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Split With</label>
          <div class="flex gap-2">
            <button type="button" onclick="toggleSelectAllParticipants(true)" class="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-wider">Select All</button>
            <span class="text-slate-300">|</span>
            <button type="button" onclick="toggleSelectAllParticipants(false)" class="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider">Clear</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto no-scrollbar p-2 bg-slate-50 rounded-2xl" id="split-participants-container">
          ${participants.map(p => {
            const isSplitWith = !expense.splitBetween || expense.splitBetween.includes(p.id);
            return `
              <label class="flex items-center space-x-2 p-2.5 bg-white rounded-xl border border-slate-100 cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                <input type="checkbox" name="split-participant" value="${p.id}" ${isSplitWith ? 'checked' : ''} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                <span class="truncate">${p.name}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
      <div class="flex space-x-3 pt-4">
        <button type="submit" class="flex-1 btn-primary py-4">Update Expense</button>
        <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
      </div>
    </form>
  `;
    showModal(content);

    const categorySelect = document.getElementById('expense-category');
    const manualContainer = document.getElementById('edit-manual-category-container');
    
    categorySelect.addEventListener('change', () => {
      manualContainer.classList.toggle('hidden', categorySelect.value !== 'Others');
    });

    document.getElementById('edit-expense-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('expense-title').value.trim();
      const totalPay = parseFloat(document.getElementById('expense-total-edit').value);
      const advancePay = parseFloat(document.getElementById('expense-advance-edit').value) || 0;
      const amount = totalPay; // Maintain compatibility
      let category = document.getElementById('expense-category').value;
      const paidBy = Number(document.getElementById('expense-paid-by').value);

      const splitCheckboxes = document.querySelectorAll('input[name="split-participant"]:checked');
      const splitBetween = Array.from(splitCheckboxes).map(cb => Number(cb.value));

      if (splitBetween.length === 0) {
        alert('You must select at least one person to split with.');
        return;
      }

      if (category === 'Others') {
        const manual = document.getElementById('edit-manual-category').value.trim();
        category = manual || 'Others';
      }

      if (title && totalPay > 0) {
      await updateExpense(expenseId, { title, amount, totalPay, advancePay, category, paidBy, splitBetween });
      hideModal();
      loadHomeData();
      loadExpenses();
    }
  });
}

async function deleteExpense(expenseId) {
  if (confirm('Are you sure you want to delete this expense?')) {
    await deleteExpenseFromDB(expenseId); // Fixed: call DB function, not self
    loadHomeData();
    loadExpenses();
  }
}

async function deleteParticipant(participantId) {
  if (confirm('Are you sure you want to delete this participant? This will also remove their expenses.')) {
    const expenses = await getExpenses(currentTripId);
    const participantExpenses = expenses.filter(e => e.paidBy === participantId);
    for (const expense of participantExpenses) {
      await deleteExpenseFromDB(expense.id);
    }

    await deleteParticipantFromDB(participantId);
    loadHomeData();
  }
}

function calculateRemainingEdit() {
    const total = parseFloat(document.getElementById('expense-total-edit').value) || 0;
    const advance = parseFloat(document.getElementById('expense-advance-edit').value) || 0;
    const rem = document.getElementById('remaining-amount-edit');
    if (rem) rem.textContent = '₹' + (total - advance).toFixed(2);
}