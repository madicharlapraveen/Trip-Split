// ui.js - UI management functions
console.log('ui.js loading...');

let currentScreen = 'home';

// Navigation functions
function showScreen(screenId) {
  console.log('Switching to screen:', screenId);
  // Hide all screens
  document.querySelectorAll('main > section').forEach(section => {
    section.classList.add('hidden');
  });

  // Show selected screen
  const screen = document.getElementById(`${screenId}-screen`);
  if (screen) {
    screen.classList.remove('hidden');
    screen.classList.add('animate-fade-in');
  }

  // Update navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('nav-active');
  });

  const activeBtn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('nav-active');
  }

  // Top Capsule visibility - Only show on home and list
  const capsuleContainer = document.getElementById('trips-capsule-container');
  if (screenId === 'home' || screenId === 'expenses') {
    capsuleContainer.classList.remove('hidden');
    loadTripsCapsules();
  } else {
    capsuleContainer.classList.add('hidden');
  }

  // Load screen-specific data
  if (screenId === 'home') loadHomeData();
  if (screenId === 'expenses') loadExpenses();
  if (screenId === 'plan') loadTripNotes();
  if (screenId === 'split') calculateSplit();
  if (screenId === 'history' || screenId === 'trips') loadTrips();

  currentScreen = screenId;
}

// Modal functions
function showModal(content) {
  const modalContent = document.getElementById('modal-content');
  const modalOverlay = document.getElementById('modal-overlay');
  
  modalContent.innerHTML = content;
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent scroll
}

function hideModal() {
  const modalOverlay = document.getElementById('modal-overlay');
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = ''; // Restore scroll
}

// Toast Notification
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
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-100%]', 'opacity-0');
    });
    
    // Remove after 4s
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-100%]');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Trip selection modal
function showTripSelectionModal() {
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
          <button onclick="selectTrip(${trip.id})" class="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl border-2 border-transparent hover:border-indigo-100 transition-all group">
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
}

function showCreateTripModal() {
  const content = `
    <h3 class="text-xl font-bold mb-6 text-slate-800">New Trip</h3>
    <form id="create-trip-form" class="space-y-5">
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trip Name</label>
        <input type="text" id="trip-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="E.g. Goa Trip 2024" required>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Budget (₹)</label>
        <input type="number" id="trip-budget" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="0.00" min="0" step="0.01">
      </div>
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

    if (tripName) {
      const tripId = await addTrip({ tripName, notes, estimatedBudget: budget });
      hideModal();
      loadTrips();
      selectTrip(tripId);
    }
  });
}
async function loadTripsCapsules() {
  const trips = await getTrips();
  const container = document.getElementById('trips-capsule-container');
  if (!container) return;

  container.innerHTML = '';
  trips.forEach(trip => {
    const isActive = currentTripId === trip.id;
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

// Participant modal
function showAddParticipantModal() {
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
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Family/Group Size (Self + others)</label>
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
}

// Expense modal
function showAddExpenseModal() {
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

    const content = `
      <h3 class="text-xl font-bold mb-6 text-slate-800">New Expense</h3>
      <form id="add-expense-form" class="space-y-5">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What did you pay for?</label>
          <input type="text" id="expense-title" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Lunch, Fuel, etc." required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Price (₹)</label>
            <input type="number" id="expense-total" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="0" step="0.01" placeholder="0.00" oninput="calculateRemaining()" required>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Advance Paid (₹)</label>
            <input type="number" id="expense-advance" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" min="0" step="0.01" value="0" oninput="calculateRemaining()">
          </div>
        </div>
        <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
            <span class="text-xs font-bold text-slate-400 uppercase">Remaining to Pay</span>
            <span id="remaining-amount" class="font-black text-rose-500">₹0.00</span>
        </div>
        </div>
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
        </div>
        <div id="manual-category-container" class="hidden">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Manual Category Name</label>
          <input type="text" id="manual-category" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="E.g. Toll, Laundry">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Paid By</label>
          <select id="expense-paid-by" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" required>
            ${participantOptions}
          </select>
        </div>
        <div class="flex space-x-3 pt-4">
          <button type="submit" class="flex-1 btn-primary py-4">Add Expense</button>
          <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
        </div>
      </form>
    `;
    showModal(content);

    const categorySelect = document.getElementById('expense-category');
    const manualContainer = document.getElementById('manual-category-container');
    
    categorySelect.addEventListener('change', () => {
      manualContainer.classList.toggle('hidden', categorySelect.value !== 'Others');
    });
    // Show by default if Others is selected
    manualContainer.classList.remove('hidden');

    document.getElementById('add-expense-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('expense-title').value.trim();
      const totalAmount = parseFloat(document.getElementById('expense-total').value);
      const advancePay = parseFloat(document.getElementById('expense-advance').value) || 0;
      let category = document.getElementById('expense-category').value;
      const paidBy = Number(document.getElementById('expense-paid-by').value);

      if (category === 'Others') {
        const manual = document.getElementById('manual-category').value.trim();
        category = manual || 'Others';
      }

      if (title && totalAmount > 0) {
        await addExpense({ tripId: currentTripId, title, amount: totalAmount, totalAmount, advancePay, category, paidBy });
        hideModal();
        loadHomeData();
        loadExpenses();
      }
    });
  });
}

// Load home data
async function loadHomeData() {
  if (!currentTripId) {
    document.getElementById('current-trip-name').textContent = 'No trip selected';
    document.getElementById('total-expense').textContent = '₹0';
    document.getElementById('participants-list').innerHTML = `
        <div class="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-4 min-w-[140px] flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-500 transition-all" onclick="showTripSelectionModal()">
            <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            <span class="text-xs font-medium">Select Trip</span>
        </div>`;
    return;
  }

  const trip = await getTrip(currentTripId);
  const participants = await getParticipants(currentTripId);
  const expenses = await getExpenses(currentTripId);

  document.getElementById('current-trip-name').textContent = trip ? trip.tripName : 'No trip selected';
  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  document.getElementById('total-expense').textContent = `₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  // Update Share ID pill
  const idCol = document.getElementById('trip-id-pill');
  if (trip && trip.share_id) {
      idCol.classList.remove('hidden');
      document.getElementById('display-share-id').textContent = trip.share_id;
  } else {
      idCol.classList.add('hidden');
  }

  // Update Budget
  const budget = trip ? (trip.estimatedBudget || 0) : 0;
  document.getElementById('display-budget').textContent = `₹${budget.toLocaleString('en-IN')}`;
  
  const budgetContainer = document.getElementById('budget-progress-container');
  if (budget > 0) {
      budgetContainer.classList.remove('hidden');
      const percentage = Math.min((totalExpense / budget) * 100, 100);
      const progressBar = document.getElementById('budget-progress-bar');
      const percentageText = document.getElementById('budget-percentage');
      
      percentageText.textContent = `${Math.round((totalExpense / budget) * 100)}%`;
      progressBar.style.width = `${percentage}%`;
      
      // Color coding based on budget usage
      if (totalExpense > budget) {
          progressBar.classList.remove('bg-white');
          progressBar.classList.add('bg-rose-400');
          document.getElementById('budget-status-text').textContent = 'Budget Exceeded!';
      } else if (totalExpense > budget * 0.8) {
          progressBar.classList.remove('bg-white', 'bg-rose-400');
          progressBar.classList.add('bg-amber-400');
          document.getElementById('budget-status-text').textContent = 'Approaching Limit';
      } else {
          progressBar.classList.remove('bg-rose-400', 'bg-amber-400');
          progressBar.classList.add('bg-white');
          document.getElementById('budget-status-text').textContent = 'Budget Progress';
      }
  } else {
      budgetContainer.classList.add('hidden');
  }

  // Update participants horizontal list
  const participantsList = document.getElementById('participants-list');
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
      <div class="text-xs font-bold text-indigo-500 mt-1">₹${participant.totalSpent.toFixed(0)}</div>
    `;
    participantsList.appendChild(card);
  });
  
  // Add member button
  const addBtn = document.createElement('div');
  addBtn.className = 'bg-white border-2 border-dashed border-slate-200 rounded-3xl p-4 min-w-[140px] flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-500 transition-all';
  addBtn.onclick = showAddParticipantModal;
  addBtn.innerHTML = `
    <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
    <span class="text-xs font-medium">Add Member</span>
  `;
  participantsList.appendChild(addBtn);

  // Update detailed participants list
  const participantsDetails = document.getElementById('participants-details');
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
            <p class="font-bold text-slate-800">₹${participant.totalSpent.toFixed(2)}</p>
            <button onclick="editParticipant(${participant.id})" class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Edit</button>
        </div>
      </div>
    `;
    participantsDetails.appendChild(detailCard);
  });

  // Update expense summary
  const expenseSummary = document.getElementById('expense-summary');
  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

  expenseSummary.innerHTML = '';
  const categories = Object.keys(categoryTotals);
  if (categories.length === 0) {
    expenseSummary.innerHTML = '<p class="text-slate-400 text-center py-4 italic text-sm">No expenses recorded yet.</p>';
  } else {
    categories.forEach(category => {
      const percentage = (categoryTotals[category] / totalExpense) * 100;
      const badgeClass = `badge-${category.toLowerCase().substring(0, 4)}`;
      const div = document.createElement('div');
      div.className = 'space-y-2';
      div.innerHTML = `
        <div class="flex justify-between items-center text-sm font-bold">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span class="text-slate-700">${category}</span>
          </div>
          <span class="text-slate-900">₹${categoryTotals[category].toLocaleString('en-IN')}</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
        </div>
      `;
      expenseSummary.appendChild(div);
    });
  }

  // Update detailed expense breakdown
  const expenseDetails = document.getElementById('expense-details');
  expenseDetails.innerHTML = '';
  if (expenses.length > 0) {
    const expensesByCategory = {};
    expenses.forEach(exp => {
      if (!expensesByCategory[exp.category]) expensesByCategory[exp.category] = [];
      expensesByCategory[exp.category].push(exp);
    });

    Object.keys(expensesByCategory).forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'space-y-3';
      categoryDiv.innerHTML = `<h5 class="text-xs font-black text-slate-300 uppercase tracking-widest">${category}</h5>`;

      expensesByCategory[category].forEach(expense => {
        const expenseDiv = document.createElement('div');
        expenseDiv.className = 'flex justify-between items-center group';
        expenseDiv.innerHTML = `
          <div class="flex items-center space-x-3">
             <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path></svg>
             </div>
             <div>
                <p class="text-sm font-bold text-slate-700">${expense.title}</p>
                <p class="text-[10px] text-slate-400">${new Date(expense.createdAt).toLocaleDateString()}</p>
             </div>
          </div>
          <span class="text-sm font-black text-slate-800">₹${expense.amount.toFixed(0)}</span>
        `;
        categoryDiv.appendChild(expenseDiv);
      });
      expenseDetails.appendChild(categoryDiv);
    });
  }
}

// Load expenses
async function loadExpenses() {
  if (!currentTripId) return;

  const expenses = await getExpenses(currentTripId);
  const participants = await getParticipants(currentTripId);
  const participantMap = {};
  participants.forEach(p => participantMap[p.id] = p.name);

  const expensesList = document.getElementById('expenses-list');
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
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            </div>
            <div>
              <h4 class="font-bold text-slate-800 text-lg">${expense.title}</h4>
              <p class="text-xs text-slate-400 font-medium">${expense.category} • Paid by ${participantMap[expense.paidBy]}</p>
            </div>
        </div>
        <div class="text-right">
          <p class="font-black text-xl text-slate-900">₹${(expense.totalAmount || expense.amount).toFixed(2)}</p>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${new Date(expense.createdAt).toLocaleDateString()}</p>
          ${expense.advancePay ? `
            <div class="mt-2 text-[10px] font-bold">
                <span class="text-emerald-500">PAID: ₹${expense.advancePay.toFixed(0)}</span>
                <span class="mx-1 text-slate-300">|</span>
                <span class="text-rose-500">REM: ₹${((expense.totalAmount || expense.amount) - expense.advancePay).toFixed(0)}</span>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="flex space-x-4 pt-4 border-t border-slate-50">
        <button onclick="editExpense(${expense.id})" class="flex items-center space-x-1 text-xs font-bold text-indigo-500 hover:text-indigo-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            <span>EDIT</span>
        </button>
        <button onclick="deleteExpense(${expense.id})" class="flex items-center space-x-1 text-xs font-bold text-rose-500 hover:text-rose-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            <span>DELETE</span>
        </button>
      </div>
    `;
    expensesList.appendChild(card);
  });
}

async function showEditTripModal() {
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
      <div>
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Budget (₹)</label>
        <input type="number" id="edit-trip-budget" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${trip.estimatedBudget || 0}" min="0" step="0.01">
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

    if (tripName) {
      await updateTrip(currentTripId, { tripName, notes, estimatedBudget: budget });
      hideModal();
      loadHomeData();
      loadTrips();
      if (window.showToast) window.showToast('Trip updated successfully', 'success');
    }
  });
}

// Load trips for history
async function loadTrips() {
  const trips = await getTrips();
  const tripsList = document.getElementById('trips-list');
  tripsList.innerHTML = '';

  if (trips.length === 0) {
    tripsList.innerHTML = '<p class="text-center text-slate-400 py-10">No trip history yet.</p>';
    return;
  }

  trips.forEach(trip => {
    const isCurrent = currentTripId === trip.id;
    const card = document.createElement('div');
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
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Budget: ₹${trip.estimatedBudget || 0}</p>
            ${trip.share_id ? `<span class="text-[10px] text-indigo-400 font-black tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">ID: ${trip.share_id}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
        <button onclick="selectTrip(${trip.id})" class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">SELECT</button>
        <button onclick="duplicateTrip(${trip.id})" class="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors">DUPLICATE</button>
        <button onclick="deleteTrip(${trip.id})" class="px-4 py-2 bg-rose-100 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-200 transition-colors">DELETE</button>
      </div>
    `;
    tripsList.appendChild(card);
  });
}

// Dropdown toggle functions
function toggleParticipantsDropdown() {
  const details = document.getElementById('participants-details');
  const arrow = document.getElementById('participants-arrow');
  const isHidden = details.classList.contains('hidden');
  details.classList.toggle('hidden');
  if (arrow) arrow.classList.toggle('rotate-180', !isHidden);
}

function toggleExpenseSummaryDropdown() {
  const details = document.getElementById('expense-details');
  const arrow = document.getElementById('expense-summary-arrow');
  const isHidden = details.classList.contains('hidden');
  details.classList.toggle('hidden');
  if (arrow) arrow.classList.toggle('rotate-180', !isHidden);
}

// Participant edit function
async function editParticipant(participantId) {
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
}

// Initialize UI
function initUI() {
  console.log('Initializing UI listeners...');
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const screenId = btn.getAttribute('data-screen');
    if (screenId) {
      btn.addEventListener('click', () => showScreen(screenId));
    }
  });

  // Center FAB
  document.getElementById('fab').addEventListener('click', showCreateTripModal);
  
  // Action FABs
  document.getElementById('add-place-fab').addEventListener('click', showAddPlaceModal);
  document.getElementById('add-expense-fab').addEventListener('click', showAddExpenseModal);

  // Export for Google Sheets
  const exportSheetsBtn = document.getElementById('export-sheets-btn');
  if (exportSheetsBtn) {
    exportSheetsBtn.onclick = showExportSelectionModal;
  }

  // Gemini AI Menu
  const aiMenuBtn = document.getElementById('ai-menu-btn');
  const aiDropdown = document.getElementById('ai-dropdown');
  if (aiMenuBtn && aiDropdown) {
    aiMenuBtn.onclick = (e) => {
      e.stopPropagation();
      aiDropdown.classList.toggle('hidden');
    };
    document.addEventListener('click', () => aiDropdown.classList.add('hidden'));
  }

  // Dropdown toggles
  const expenseToggle = document.getElementById('expense-summary-toggle');
  if (expenseToggle) {
    expenseToggle.addEventListener('click', toggleExpenseSummaryDropdown);
  }

  // Menu button - Show Settings
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', showSettings);

  // Modal overlay click to close
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      hideModal();
    }
  });

  // Populate Sync URL if exists
  const syncInput = document.getElementById('sync-url-input');
  if (syncInput) {
    syncInput.value = localStorage.getItem('tripsplit_sync_url') || '';
  }

  // Load initial data
  loadHomeData();
  loadTrips();
  loadTripsCapsules();
}

async function showSettings() {
  const profile = await getUserProfile();
  const content = `
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-slate-800">Settings</h3>
        <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- User Profile Summary Card -->
      <div onclick="showProfileModal()" class="mb-6 p-4 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl text-white shadow-lg shadow-indigo-200 cursor-pointer hover:scale-[1.02] transition-all group relative overflow-hidden">
          <div class="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <div class="flex items-center space-x-4 relative z-10">
              <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl backdrop-blur-md">
                  ${profile ? profile.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div class="flex-1">
                  <h4 class="font-bold text-lg leading-tight">${profile ? profile.name : 'Create Account'}</h4>
                  <p class="text-indigo-100 text-xs opacity-80">${profile ? (profile.email || 'No email set') : 'Sync your data across devices'}</p>
              </div>
              <svg class="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
      </div>

      <div class="space-y-6">
          <!-- Cloud Features -->
          <section>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Cloud Sync & Share</p>
              <div class="grid grid-cols-1 gap-2">
                  <button onclick="handleCloudSync()" class="w-full p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-between transition-all">
                      <div class="flex items-center space-x-3">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                          <span class="text-sm font-bold">Live Sync to Cloud</span>
                      </div>
                      <span id="cloud-status-text" class="text-[10px] font-bold px-2 py-1 bg-white/50 rounded-lg">Push</span>
                  </button>
                  <button onclick="showJoinTripModal()" class="w-full p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-between transition-all">
                      <div class="flex items-center space-x-3">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                          <span class="text-sm font-bold">Join Using Trip ID</span>
                      </div>
                  </button>
                  <button onclick="handlePushEnable()" class="w-full p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-between transition-all">
                      <div class="flex items-center space-x-3">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                          <span class="text-sm font-bold">App Push Notifications</span>
                      </div>
                      <span id="push-status-label" class="text-[10px] font-bold px-2 py-1 bg-white/50 rounded-lg">Enable</span>
                  </button>
             <!-- Data Management -->
          <section>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Data Management</p>
              <div class="grid grid-cols-2 gap-2">
                  <button id="export-json-btn-settings" class="p-4 bg-slate-100 text-slate-600 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-slate-200 transition-all">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      <span class="text-[10px] font-bold text-center">Export JSON</span>
                  </button>
                  <button id="import-json-btn-settings" class="p-4 bg-slate-800 text-white rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-slate-900 transition-all">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                      <span class="text-[10px] font-bold text-center">Restore JSON</span>
                  </button>
              </div>
          </section>
          <!-- Contact -->
          <section class="pt-6 border-t border-slate-100 text-center">
              <a href="https://aispace.co.in/" target="_blank" rel="noopener" class="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Contact Ai Space for Custom Apps →
              </a>
          </section>
      </div>

      <button onclick="hideModal()" class="w-full mt-8 py-4 font-black text-slate-300 uppercase tracking-widest text-xs hover:text-slate-500 transition-colors">Close Settings</button>
  `;
  showModal(content);
  
  // Listeners for Settings Modal
  document.getElementById('export-json-btn-settings').onclick = () => {
    exportDataToJSON().then(jsonData => {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tripsplit-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (window.showToast) window.showToast('Backup downloaded!', 'success');
    });
  };

  document.getElementById('import-json-btn-settings').onclick = () => {
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
                alert('Error restoring: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
  };
}

async function showProfileModal() {
    const profile = await getUserProfile();
    const content = `
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">User Account</h3>
          <button onclick="showSettings()" class="text-slate-400 hover:text-slate-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
        </div>
        <form id="profile-form" class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input type="text" id="profile-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${profile ? profile.name : ''}" placeholder="Enter your name" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input type="email" id="profile-email" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${profile ? (profile.email || '') : ''}" placeholder="your@email.com" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number (Optional)</label>
                <input type="tel" id="profile-mobile" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" value="${profile ? (profile.mobile || '') : ''}" placeholder="+91 00000 00000">
            </div>
            <div class="pt-4">
                <button type="submit" class="w-full btn-primary py-4">Save Account Info</button>
            </div>
        </form>
    `;
    showModal(content);
    
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
}

async function showJoinTripModal() {
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
        
        if (shareId) {
            try {
                if (window.showToast) window.showToast('Searching for trip...', 'info');
                const tripId = await joinTripByShareId(shareId);
                hideModal();
                loadTrips();
                selectTrip(tripId);
                if (window.showToast) window.showToast('Joined trip successfully!', 'success');
            } catch (error) {
                alert('Trip not found: ' + error.message);
            }
        }
    };
}

function showExportSelectionModal() {
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
}

async function downloadCSV(tripId) {
    let csvData;
    let filename;
    
    if (tripId === 'all') {
        csvData = await exportDataToCSV();
        filename = `tripsplit-all-backup-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
        csvData = await exportTripToCSV(tripId);
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
}

function saveSyncURL() {
    const url = document.getElementById('sync-url-input').value.trim();
    if (url) {
        localStorage.setItem('tripsplit_sync_url', url);
        alert('Sync URL saved successfully!');
    }
}

function showEditPlaceModal(index) {
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
                loadTripNotes();
            }
        });
    });
}

async function handleCloudSync() {
    if (!currentTripId) {
        if (window.showToast) window.showToast('Please select a trip first!', 'info');
        return;
    }
    
    const statusText = document.getElementById('cloud-status-text');
    if (statusText) {
        statusText.textContent = 'Syncing...';
        statusText.className = 'text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-lg animate-pulse';
    }

    try {
        await syncToCloud(currentTripId);
        if (statusText) {
            statusText.textContent = 'Synced';
            statusText.className = 'text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg';
        }
        if (window.showToast) window.showToast('Trip synced to cloud!', 'success');
    } catch (error) {
        if (statusText) {
            statusText.textContent = 'Error';
            statusText.className = 'text-[10px] font-bold px-2 py-1 bg-rose-100 text-rose-700 rounded-lg';
        }
        alert('Sync error: ' + error.message);
    }
}

async function handlePushEnable() {
    const label = document.getElementById('push-status-label');
    if (label) label.textContent = 'Wait...';
    
    try {
        const success = await subscribeToPush();
        if (success) {
            if (label) {
                label.textContent = 'Active';
                label.className = 'text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg';
            }
            if (window.showToast) window.showToast('Push Notifications Enabled!', 'success');
        } else {
            if (label) label.textContent = 'Error';
            alert('Could not enable notifications. Please check browser permissions.');
        }
    } catch (error) {
        if (label) label.textContent = 'Error';
        console.error(error);
    }
}

async function handleManagePermissions() {
    // Basic owner check logic could go here
    if (window.showToast) window.showToast('Permission management coming soon!', 'info');
}

async function deleteTripUI(tripId) {
    if (confirm('Are you sure you want to delete this trip and all its data? This cannot be undone.')) {
        await deleteTrip(tripId);
        currentTripId = null;
        localStorage.removeItem('currentTripId');
        loadTrips();
        loadHomeData();
        if (window.showToast) window.showToast('Trip deleted successfully', 'success');
    }
}

function calculateRemaining() {
    const total = parseFloat(document.getElementById('expense-total').value) || 0;
    const advance = parseFloat(document.getElementById('expense-advance').value) || 0;
    const rem = document.getElementById('remaining-amount');
    if (rem) rem.textContent = '₹' + (total - advance).toFixed(2);
}
