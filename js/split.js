// split.js - Split calculation logic

async function calculateSplit() {
  if (!currentTripId) return;

  const participants = await getParticipants(currentTripId);
  const expenses = await getExpenses(currentTripId);
  const tripObj = await getTrip(currentTripId);
  const symbol = tripObj ? (tripObj.currencySymbol || '₹') : '₹';

  if (participants.length === 0) {
      document.getElementById('split-details').innerHTML = `
        <div class="text-center py-20 opacity-40">
            <p class="font-bold">No participants to split with.</p>
        </div>`;
      return;
  }

  // Initialize balances structure with zero totals
  const balances = participants.map(p => ({
    ...p,
    totalSpent: 0,
    expectedShare: 0,
    balance: 0
  }));

  // Calculate actual individual spent and expected share totals based on split subset per expense
  expenses.forEach(e => {
    // Add to paid amount for the payer
    const payer = balances.find(p => p.id === e.paidBy);
    if (payer) {
      payer.totalSpent += (e.totalAmount || e.amount || 0);
    }

    // Determine the set of participants this expense is split between
    let splitBetweenIds = e.splitBetween || [];
    if (!Array.isArray(splitBetweenIds) || splitBetweenIds.length === 0) {
      // Backwards compatibility: split among all active participants
      splitBetweenIds = participants.map(p => p.id);
    }

    const splitParticipants = participants.filter(p => splitBetweenIds.includes(p.id));
    const totalSplitFamily = splitParticipants.reduce((sum, p) => sum + (p.familyCount || 1), 0);

    if (totalSplitFamily > 0) {
      const costPerHead = (e.totalAmount || e.amount || 0) / totalSplitFamily;
      splitParticipants.forEach(sp => {
        const balanceRecord = balances.find(p => p.id === sp.id);
        if (balanceRecord) {
          balanceRecord.expectedShare += costPerHead * (sp.familyCount || 1);
        }
      });
    }
  });

  // Calculate final net balances
  balances.forEach(b => {
    b.balance = b.totalSpent - b.expectedShare;
  });

  const totalExpense = expenses.reduce((sum, exp) => sum + (exp.totalAmount || exp.amount || 0), 0);
  const totalParticipants = participants.reduce((sum, p) => sum + (p.familyCount || 1), 0);
  const perPersonShare = totalParticipants > 0 ? totalExpense / totalParticipants : 0;

  // Display split details
  const splitDetails = document.getElementById('split-details');
  splitDetails.innerHTML = `
    <div class="premium-card bg-indigo-50 border-none mb-6">
      <h4 class="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Trip Summary</h4>
      <div class="grid grid-cols-2 gap-4">
        <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase">Total Expense</p>
            <p class="text-xl font-black text-slate-800">${symbol}${totalExpense.toFixed(0)}</p>
        </div>
        <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase">Per Person</p>
            <p class="text-xl font-black text-slate-800">${symbol}${perPersonShare.toFixed(0)}</p>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-indigo-100 flex justify-between items-center">
        <span class="text-xs font-bold text-indigo-600">Total Members</span>
        <span class="px-3 py-1 bg-white rounded-full text-xs font-black text-indigo-600">${totalParticipants}</span>
      </div>
    </div>
    
    <h3 class="text-lg font-bold text-slate-800 mb-4">Individual Balances</h3>
  `;

  // Display individual balances
  balances.forEach(participant => {
    const balanceDiv = document.createElement('div');
    balanceDiv.className = 'premium-card mb-3 animate-scale-in';
    const isCreditor = participant.balance >= 0;
    
    balanceDiv.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl ${isCreditor ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center font-bold">
            ${participant.name.charAt(0)}
          </div>
          <div>
            <h5 class="font-bold text-slate-800">${participant.name}</h5>
            <p class="text-[10px] text-slate-400 font-bold uppercase">Expected: ${symbol}${participant.expectedShare.toFixed(0)}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-black text-lg ${isCreditor ? 'text-emerald-600' : 'text-rose-600'}">
            ${isCreditor ? '+' : ''}${symbol}${Math.abs(participant.balance).toFixed(0)}
          </p>
          <p class="text-[10px] font-black uppercase tracking-widest ${isCreditor ? 'text-emerald-400' : 'text-rose-400'}">
            ${isCreditor ? 'Receives' : 'Owes'}
          </p>
          <button onclick="shareIndividualOnWhatsApp(${participant.id})" class="mt-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center justify-end space-x-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            <span>SHARE</span>
          </button>
        </div>
      </div>
    `;
    splitDetails.appendChild(balanceDiv);
  });

  // Calculate settlements
  const settlementHeader = document.createElement('h3');
  settlementHeader.className = 'text-lg font-bold text-slate-800 mt-8 mb-4';
  settlementHeader.textContent = 'Settlement Plan';
  splitDetails.appendChild(settlementHeader);

  const settlementContainer = document.createElement('div');
  settlementContainer.className = 'premium-card bg-slate-900 text-white border-none mb-10';
  
  const creditors = balances.filter(p => p.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(p => p.balance < -0.01).sort((a, b) => a.balance - b.balance);

  let settlements = [];
  let i = 0, j = 0;

  // Deep copy for calculation
  const tempCreditors = creditors.map(c => ({...c}));
  const tempDebtors = debtors.map(d => ({...d}));

  while (i < tempCreditors.length && j < tempDebtors.length) {
    const creditor = tempCreditors[i];
    const debtor = tempDebtors[j];
    const amount = Math.min(creditor.balance, -debtor.balance);

    if (amount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: amount
      });

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance <= 0.01) i++;
      if (debtor.balance >= -0.01) j++;
    } else {
      if (creditor.balance <= 0.01) i++;
      if (debtor.balance >= -0.01) j++;
    }
  }

  if (settlements.length === 0) {
    settlementContainer.innerHTML = `
        <div class="flex flex-col items-center py-6 text-emerald-400">
            <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p class="font-bold">Everything is perfectly balanced!</p>
        </div>`;
  } else {
    settlementContainer.innerHTML = '<div class="space-y-4"></div>';
    const list = settlementContainer.querySelector('div');
    
    const currentTrip = await getTrip(currentTripId);
    const pending = currentTrip.pending_settlements || [];
    
    settlements.forEach(settlement => {
      const isPending = pending.find(p => p.from === settlement.from && p.to === settlement.to);
      const isOwner = currentTrip.is_owner || false; // Owner tag added during sync
      
      let actionHtml = '';
      if (isPending) {
          if (isOwner) {
              actionHtml = `<button onclick="confirmSettlement('${isPending.id}')" class="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/30">Confirm</button>`;
          } else {
              actionHtml = `<span class="px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/30 animate-pulse">Pending...</span>`;
          }
      } else {
          actionHtml = `<button onclick="requestSettlement('${settlement.from}', '${settlement.to}', ${settlement.amount})" class="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold rounded-lg transition-all">Pay Now</button>`;
      }

      const item = document.createElement('div');
      item.className = 'flex flex-col p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3';
      item.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="text-right">
                    <p class="text-xs font-bold text-white">${settlement.from}</p>
                    <p class="text-[8px] text-slate-400 uppercase">Pays to</p>
                </div>
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7-7 7M3 12h18"></path></svg>
                <p class="text-xs font-bold text-indigo-400">${settlement.to}</p>
            </div>
            <div class="text-right">
                <p class="text-lg font-black text-emerald-400">${symbol}${settlement.amount.toFixed(0)}</p>
            </div>
        </div>
        <div class="flex justify-end pt-2 border-t border-white/10">
            ${actionHtml}
        </div>
      `;
      list.appendChild(item);
    });
  }

  splitDetails.appendChild(settlementContainer);

  return {
    totalExpense,
    totalParticipants,
    perPersonShare,
    balances,
    settlements
  };
}

// Settlement Action Functions
window.requestSettlement = async function(from, to, amount) {
    const trip = await getTrip(currentTripId);
    if (!trip.pending_settlements) trip.pending_settlements = [];
    trip.pending_settlements.push({ id: Date.now().toString(), from, to, amount, status: 'pending' });
    await updateTrip(currentTripId, trip);
    
    if (window.showToast) window.showToast(`Payment request sent to owner for approval`, 'success');
    if (typeof triggerBackgroundSync === 'function') triggerBackgroundSync(`${from} paid ${to}`);
    calculateSplit(); // refresh UI
}

window.confirmSettlement = async function(requestId) {
    const trip = await getTrip(currentTripId);
    if (!trip || !trip.pending_settlements) return;
    
    const requestIndex = trip.pending_settlements.findIndex(p => p.id === requestId);
    if (requestIndex === -1) return;
    
    const req = trip.pending_settlements[requestIndex];
    
    // To balance the ledger, we add an Expense where "from" pays "amount" and it is split ONLY to "to"
    const settlementExpense = {
        tripId: currentTripId,
        id: Date.now(),
        description: `Settlement: ${req.from} → ${req.to}`,
        amount: req.amount,
        paidBy: req.from,
        splitMethod: 'exact',
        splits: { [req.to]: req.amount },
        date: new Date().toISOString().split('T')[0],
        isSettlement: true
    };
    
    const data = JSON.parse(localStorage.getItem('tripsplit_data'));
    data.expenses.push(settlementExpense);
    localStorage.setItem('tripsplit_data', JSON.stringify(data));
    
    // Remove the request
    trip.pending_settlements.splice(requestIndex, 1);
    await updateTrip(currentTripId, trip);
    
    if (window.showToast) window.showToast(`Payment confirmed!`, 'success');
    if (typeof triggerBackgroundSync === 'function') triggerBackgroundSync(`Confirmed payment from ${req.from}`);
    calculateSplit(); // refresh UI
}

// Load split data when split screen is shown
function loadSplitData() {
  calculateSplit();
}