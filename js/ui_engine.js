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
    const notes = document.getElementById('trip-notes-input').value.trim();

    if (tripName) {
      await addTrip({ tripName, notes });
      hideModal();
      loadTrips();
      showTripSelectionModal();
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
  document.getElementById('total-expense').textContent = `₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

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
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Created ${new Date(trip.createdAt).toLocaleDateString()}</p>
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

function showSettings() {
  const content = `
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-slate-800">Settings</h3>
        <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Safety Warning Note -->
      <div class="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3">
        <div class="mt-0.5 text-amber-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <p class="text-[11px] text-amber-800 leading-relaxed">
            <span class="font-bold">Important:</span> Your data is stored locally. Don't clear your browser cache before downloading a backup to avoid losing your trips.
        </p>
      </div>

      <div class="space-y-3">
          <button id="install-btn" class="hidden w-full p-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-between group transition-all">
              <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  </div>
                  <span class="font-bold">Install TripSplit App</span>
              </div>
              <svg class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
          <button id="export-btn" class="w-full p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl flex items-center justify-between group transition-all">
              <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  </div>
                  <span class="font-bold text-slate-700">Export CSV</span>
              </div>
              <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
          <button id="import-btn" class="w-full p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl flex items-center justify-between group transition-all">
              <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  </div>
                  <span class="font-bold text-slate-700">Import CSV</span>
              </div>
              <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
          <div class="pt-4 mt-4 border-t border-slate-100">
              <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Google Sheets Integration</p>
              <div class="space-y-3">
                  <button id="export-sheets-btn" class="w-full p-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-100 group transition-all">
                      <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span class="font-bold">Download for Google Sheets</span>
                  </button>
                  <p class="text-[10px] text-slate-400 text-center leading-relaxed">Downloads a .csv file. Simply drag and drop this file directly into any Google Sheet.</p>
              </div>
          </div>
          <div class="pt-4 mt-4 border-t border-slate-100">
              <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">App Data Backup (Local)</p>
              <div class="grid grid-cols-2 gap-3">
                  <button id="export-json-btn" class="p-4 bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-indigo-700 transition-all">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                      <span class="text-xs font-bold">Backup .json</span>
                  </button>
                  <button id="import-json-btn" class="p-4 bg-slate-800 text-white rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-slate-900 transition-all">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      <span class="text-xs font-bold">Restore .json</span>
                  </button>
              </div>
          <div class="pt-6 mt-6 border-t border-slate-100 text-center">
              <p class="text-xs text-slate-400 mb-2">Want advanced apps or custom features?</p>
              <a href="https://aispace.co.in/" target="_blank" rel="noopener" class="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Contact Ai Space →
              </a>
          </div>
      </div>
      <button onclick="hideModal()" class="w-full mt-6 py-4 font-bold text-slate-400">Close</button>
  `;
  showModal(content);
  
  // Attach Listeners
  const installBtn = document.getElementById('install-btn');
  if (deferredPrompt) {
      installBtn.classList.remove('hidden');
      installBtn.onclick = async () => {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          installBtn.classList.add('hidden');
          hideModal();
      };
  }

  document.getElementById('export-sheets-btn').onclick = showExportSelectionModal;
  
  document.getElementById('export-btn').onclick = () => {
      exportDataToCSV().then(csvData => {
          const blob = new Blob([csvData], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tripsplit-backup-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          hideModal();
      });
  };
  
  document.getElementById('import-btn').onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = e => {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = async () => {
              try {
                  await importDataFromCSV(reader.result);
                  loadHomeData();
                  loadTrips();
                  alert('Data imported successfully!');
                  hideModal();
              } catch (error) {
                  alert('Error importing CSV: ' + error.message);
              }
          };
          reader.readAsText(file);
      };
      input.click();
  };
  
  document.getElementById('export-json-btn').onclick = () => {
      exportDataToJSON().then(jsonData => {
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tripsplit-app-backup-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          hideModal();
      });
  };

  document.getElementById('import-json-btn').onclick = () => {
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
                  alert('App data restored successfully!');
                  hideModal();
              } catch (error) {
                  alert('Error restoring JSON: ' + error.message);
              }
          };
          reader.readAsText(file);
      };
      input.click();
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
function calculateRemaining() {
    const total = parseFloat(document.getElementById('expense-total').value) || 0;
    const advance = parseFloat(document.getElementById('expense-advance').value) || 0;
    const rem = document.getElementById('remaining-amount');
    if (rem) rem.textContent = '₹' + (total - advance).toFixed(2);
}
