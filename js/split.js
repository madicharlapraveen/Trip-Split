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
    balance: 0,
    myExpenses: []  // list of expenses this person paid
  }));

  // Step 1: Calculate total expenses and per-person share
  const totalExpense = expenses.reduce((sum, exp) => sum + (exp.totalAmount || exp.amount || 0), 0);
  const totalMembers = participants.length;
  const perPersonShare = totalMembers > 0 ? totalExpense / totalMembers : 0;
  const totalParticipants = totalMembers; // Alias for UI compatibility

  // Step 2: Calculate how much each participant actually paid
  expenses.forEach(e => {
    const payer = balances.find(p => p.id === e.paidBy);
    if (payer) {
      payer.totalSpent += (e.totalAmount || e.amount || 0);
      payer.myExpenses.push(e); // track this expense under their name
    }
  });

  // Step 3: Assign equal expected share to each participant
  balances.forEach(b => {
    b.expectedShare = perPersonShare;
  });

  // Step 4: Calculate final net balance (Paid - Share)
  // Positive = person receives money back
  // Negative = person owes money
  balances.forEach(b => {
    b.balance = b.totalSpent - b.expectedShare;
  });

  // Pre-calculate settlements so they are available for individual card display
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

  // Display split details
  const splitDetails = document.getElementById('split-details');
  splitDetails.innerHTML = `
    <div class="premium-card bg-indigo-50 border-none mb-6">
      <h4 class="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Trip Summary</h4>

      <!-- Calculation Box -->
      <div class="bg-white rounded-2xl border border-indigo-100 p-4 mb-4">
        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-3">How the split is calculated</p>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-slate-500">Total Expenses</span>
            <span class="text-sm font-black text-slate-800">${symbol}${totalExpense.toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-slate-500">Total Members</span>
            <span class="text-sm font-black text-slate-800">${totalParticipants}</span>
          </div>
          <div class="h-px bg-indigo-100 my-2"></div>
          <div class="flex justify-between items-center bg-indigo-50 rounded-xl px-3 py-2">
            <span class="text-xs font-bold text-indigo-600">Formula</span>
            <span class="text-xs font-bold text-indigo-600">${symbol}${totalExpense.toFixed(2)} &divide; ${totalParticipants} Members</span>
          </div>
          <div class="text-center py-3 bg-indigo-600 rounded-xl">
            <span class="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block mb-1">Each Person's Share</span>
            <span class="text-3xl font-black text-white">${symbol}${perPersonShare.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-indigo-100/50 flex justify-center">
        <button onclick="shareOnWhatsApp()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          <span>Share Entire Split Summary</span>
        </button>
      </div>
    </div>
    
    <h3 class="text-lg font-bold text-slate-800 mb-4">Individual Balances</h3>
  `;

  // Display individual balances
  balances.forEach(participant => {
    const balanceDiv = document.createElement('div');
    balanceDiv.className = 'premium-card mb-4 animate-scale-in bg-white/70 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-4';
    const isCreditor = participant.balance >= 0;
    
    // Settlement for You html list
    const mySettlements = settlements.filter(s => s.from === participant.name || s.to === participant.name);
    let settlementHtml = '';
    if (mySettlements.length > 0) {
      mySettlements.forEach(s => {
        if (s.from === participant.name) {
          settlementHtml += `
            <div class="flex items-center space-x-1.5 text-rose-600 font-bold text-[11px] mt-1 bg-rose-50/50 p-1 px-2 rounded-lg border border-rose-100/30">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>👉 Pay ${symbol}${s.amount.toFixed(2)} to ${s.to}</span>
            </div>
          `;
        } else {
          settlementHtml += `
            <div class="flex items-center space-x-1.5 text-emerald-600 font-bold text-[11px] mt-1 bg-emerald-50/50 p-1 px-2 rounded-lg border border-emerald-100/30">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>👈 Receive ${symbol}${s.amount.toFixed(2)} from ${s.from}</span>
            </div>
          `;
        }
      });
    } else {
      settlementHtml = `
        <div class="flex items-center space-x-1.5 text-slate-500 font-bold text-[11px] mt-1 bg-slate-50 p-1 px-2 rounded-lg border border-slate-200/30">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          <span>0 (No payments needed)</span>
        </div>
      `;
    }
    
    // Build expenses breakdown html for this participant
    let expensesHtml = '';
    if (participant.myExpenses && participant.myExpenses.length > 0) {
      expensesHtml = participant.myExpenses.map(exp => `
        <div class="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
          <div class="flex items-center space-x-2">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
            <span class="text-[11px] text-slate-600 font-medium truncate max-w-[160px]">${exp.title || exp.description || 'Expense'}</span>
          </div>
          <span class="text-[11px] font-black text-slate-700 ml-2">${symbol}${(exp.totalAmount || exp.amount || 0).toFixed(2)}</span>
        </div>
      `).join('');
    } else {
      expensesHtml = `<p class="text-[11px] text-slate-400 italic py-1">No expenses paid directly</p>`;
    }

    balanceDiv.innerHTML = `
      <div class="flex flex-col space-y-3">

        <!-- Name + Balance Header -->
        <div class="flex justify-between items-start">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl ${isCreditor ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'} flex items-center justify-center font-bold text-base shadow-sm">
              ${participant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h5 class="font-bold text-slate-800 text-sm">${participant.name}</h5>
              <p class="text-[10px] text-slate-400 font-medium mt-0.5">${participant.myExpenses.length} expense(s) paid</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-black text-base ${isCreditor ? 'text-emerald-600' : 'text-rose-600'}">
              ${isCreditor ? '+' : '-'}${symbol}${Math.abs(participant.balance).toFixed(2)}
            </p>
            <p class="text-[9px] font-bold uppercase tracking-wider ${isCreditor ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'} px-2 py-0.5 rounded-full inline-block mt-0.5">
              ${isCreditor ? 'Receives' : 'Owes'}
            </p>
          </div>
        </div>

        <!-- Expenses They Paid -->
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p class="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2">Expenses Paid by ${participant.name}</p>
          ${expensesHtml}
          <div class="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
            <span class="text-[10px] font-black text-slate-500 uppercase">Total Paid</span>
            <span class="text-sm font-black text-slate-800">${symbol}${participant.totalSpent.toFixed(2)}</span>
          </div>
        </div>

        <!-- Trip Split Info -->
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-white border border-slate-100 rounded-xl px-2 py-2 text-center">
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Expenses</p>
            <p class="text-xs font-black text-slate-800 mt-0.5">${symbol}${totalExpense.toFixed(2)}</p>
          </div>
          <div class="bg-white border border-slate-100 rounded-xl px-2 py-2 text-center">
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Members</p>
            <p class="text-xs font-black text-slate-800 mt-0.5">${totalParticipants}</p>
          </div>
          <div class="bg-indigo-600 rounded-xl px-2 py-2 text-center">
            <p class="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">Each Share</p>
            <p class="text-xs font-black text-white mt-0.5">${symbol}${perPersonShare.toFixed(2)}</p>
          </div>
        </div>

        <!-- Calculation Row -->
        <div class="bg-indigo-50 rounded-xl px-3 py-2.5">
          <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Your Calculation</p>
          <p class="text-[10px] text-slate-500 mb-1.5">${symbol}${totalExpense.toFixed(2)} &divide; ${totalParticipants} members = ${symbol}${perPersonShare.toFixed(2)} per person</p>
          <div class="flex items-center justify-between bg-white rounded-lg px-2 py-1.5">
            <span class="text-[10px] text-slate-600">Paid <span class="font-black">${symbol}${participant.totalSpent.toFixed(2)}</span></span>
            <span class="text-slate-300 font-bold">-</span>
            <span class="text-[10px] text-slate-600">Share <span class="font-black">${symbol}${participant.expectedShare.toFixed(2)}</span></span>
            <span class="text-slate-300 font-bold">=</span>
            <span class="text-[10px] font-black ${isCreditor ? 'text-emerald-600' : 'text-rose-600'}">${isCreditor ? '+' : '-'}${symbol}${Math.abs(participant.balance).toFixed(2)}</span>
          </div>
        </div>

        <!-- Settlement -->
        <div class="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
          <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Settlement for You</p>
          <div>${settlementHtml}</div>
        </div>

        <!-- Share Button -->
        <div class="pt-1 border-t border-slate-100 flex justify-end">
          <button onclick="shareIndividualOnWhatsApp(${participant.id})" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100/50">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            <span>Share details</span>
          </button>
        </div>
      </div>
    `;
    splitDetails.appendChild(balanceDiv);
  });

  // Display settlement plan section
  const settlementHeader = document.createElement('h3');
  settlementHeader.className = 'text-lg font-bold text-slate-800 mt-8 mb-4';
  settlementHeader.textContent = 'Settlement Plan';
  splitDetails.appendChild(settlementHeader);

  // Fetch role and paid settlements list
  const currentTripData = await getTrip(currentTripId);
  const myRole = currentTripData ? (currentTripData.myRole || 'viewer') : 'viewer';
  const isAdmin = myRole === 'owner' || myRole === 'editor';
  const paidSettlements = currentTripData ? (currentTripData.paid_settlements || []) : [];

  // Calculate summary stats
  const totalSettlementAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  const paidAmount = settlements
    .filter(s => paidSettlements.includes(`${s.from}-->${s.to}`))
    .reduce((sum, s) => sum + s.amount, 0);
  const pendingAmount = totalSettlementAmount - paidAmount;
  const progressPct = totalSettlementAmount > 0 ? Math.round((paidAmount / totalSettlementAmount) * 100) : (settlements.length === 0 ? 100 : 0);
  const isFullySettled = settlements.length === 0 || progressPct === 100;

  // ── Summary Bar (TOP of section) ──────────────────────────────────────────
  const summaryBar = document.createElement('div');
  summaryBar.className = 'mb-5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden';
  summaryBar.innerHTML = `
    <div class="px-4 pt-4 pb-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Progress</p>
        <span class="text-xs font-black px-2 py-0.5 rounded-full ${isFullySettled ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}">${progressPct}% ${isFullySettled ? '✅' : 'done'}</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
        <div class="h-2.5 rounded-full transition-all duration-700 ${isFullySettled ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width:${progressPct}%"></div>
      </div>
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="bg-emerald-50 rounded-xl p-2.5 text-center border border-emerald-100">
          <p class="text-[9px] text-emerald-600 font-black uppercase tracking-wider mb-1">Settled</p>
          <p class="text-sm font-black text-emerald-700">${symbol}${paidAmount.toFixed(0)}</p>
        </div>
        <div class="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
          <p class="text-[9px] text-amber-600 font-black uppercase tracking-wider mb-1">Pending</p>
          <p class="text-sm font-black text-amber-700">${symbol}${pendingAmount.toFixed(0)}</p>
        </div>
        <div class="bg-indigo-50 rounded-xl p-2.5 text-center border border-indigo-100">
          <p class="text-[9px] text-indigo-600 font-black uppercase tracking-wider mb-1">Total</p>
          <p class="text-sm font-black text-indigo-700">${symbol}${totalSettlementAmount.toFixed(0)}</p>
        </div>
      </div>
    </div>
    <div class="border-t border-slate-100 px-4 py-3 bg-slate-50/60">
      <p class="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2">Expenses vs Settlements</p>
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-500 font-semibold">Total Trip Expenses</span>
          <span class="font-black text-slate-700">${symbol}${totalExpense.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-500 font-semibold">Total to Settle</span>
          <span class="font-black text-slate-700">${symbol}${totalSettlementAmount.toFixed(2)}</span>
        </div>
        <div class="h-px bg-slate-200 my-1"></div>
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-emerald-600 font-bold">Settled So Far</span>
          <span class="font-black text-emerald-600">${symbol}${paidAmount.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-amber-600 font-bold">Still Pending</span>
          <span class="font-black text-amber-600">${symbol}${pendingAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;
  splitDetails.appendChild(summaryBar);

  // ── Settlement Cards ───────────────────────────────────────────────────────
  const settlementContainer = document.createElement('div');
  settlementContainer.className = 'premium-card bg-slate-900 text-white border-none mb-10';

  if (settlements.length === 0) {
    settlementContainer.innerHTML = `
      <div class="flex flex-col items-center py-8 text-emerald-400">
        <svg class="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="font-black text-base">Everything is perfectly balanced!</p>
        <p class="text-emerald-500/70 text-xs font-medium mt-1">No payments needed</p>
      </div>`;
  } else {
    settlementContainer.innerHTML = '<div class="space-y-3"></div>';
    const list = settlementContainer.querySelector('div');

    settlements.forEach(settlement => {
      const settlementKey = `${settlement.from}-->${settlement.to}`;
      const isPaid = paidSettlements.includes(settlementKey);

      let actionHtml = '';
      if (isAdmin) {
        if (isPaid) {
          actionHtml = `
            <button onclick="markSettlementPaid('${settlement.from}', '${settlement.to}', ${settlement.amount}, false)"
              class="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[10px] font-black rounded-xl transition-all">
              <span>↩</span> Undo → Pending
            </button>`;
        } else {
          actionHtml = `
            <button onclick="markSettlementPaid('${settlement.from}', '${settlement.to}', ${settlement.amount}, true)"
              class="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-emerald-500/30">
              <span>✓</span> Mark as Paid
            </button>`;
        }
      } else {
        actionHtml = isPaid
          ? `<span class="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-xl border border-emerald-500/30">✅ Paid</span>`
          : `<span class="px-3 py-1.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-xl border border-amber-500/30 animate-pulse">⏳ Pending</span>`;
      }

      const item = document.createElement('div');
      item.className = `flex flex-col p-4 rounded-2xl border transition-all duration-300 space-y-3 ${isPaid ? 'bg-emerald-900/30 border-emerald-700/30' : 'bg-white/5 border-white/10'}`;
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="text-right">
              <p class="text-xs font-bold text-white">${settlement.from}</p>
              <p class="text-[8px] text-slate-400 uppercase tracking-wider">Pays to</p>
            </div>
            <svg class="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7-7 7M3 12h18"></path></svg>
            <p class="text-xs font-bold text-indigo-400">${settlement.to}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-black ${isPaid ? 'text-emerald-400/50 line-through' : 'text-emerald-400'}">${symbol}${settlement.amount.toFixed(2)}</p>
            ${isPaid ? '<p class="text-[9px] text-emerald-500 font-black uppercase tracking-wider">PAID ✓</p>' : ''}
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

// ── Settlement Action: Admin-only Mark as Paid / Undo ────────────────────────
window.markSettlementPaid = async function(from, to, amount, paid) {
  const trip = await getTrip(currentTripId);
  if (!trip) return;

  const settlementKey = `${from}-->${to}`;
  if (!trip.paid_settlements) trip.paid_settlements = [];

  if (paid) {
    // 1. Add to paid list
    if (!trip.paid_settlements.includes(settlementKey)) {
      trip.paid_settlements.push(settlementKey);
    }

    // 2. Option B: Create a balancing settlement expense in the ledger
    const participants = await getParticipants(currentTripId);
    const fromParticipant = participants.find(p => p.name === from);
    const toParticipant = participants.find(p => p.name === to);

    if (fromParticipant && toParticipant) {
      const settlementExpense = {
        tripId: currentTripId,
        id: Date.now(),
        title: `Settlement: ${from} → ${to}`,
        description: `Settlement: ${from} → ${to}`,
        amount: amount,
        totalAmount: amount,
        paidBy: fromParticipant.id,
        splitMethod: 'exact',
        splitBetween: [toParticipant.id],
        splits: { [toParticipant.id]: amount },
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        isSettlement: true,
        settlementKey: settlementKey
      };

      const storageData = JSON.parse(localStorage.getItem('tripsplit_data'));
      // Remove any old settlement for same pair (avoid duplicates on re-mark)
      storageData.expenses = storageData.expenses.filter(e => !(e.isSettlement && e.settlementKey === settlementKey));
      storageData.expenses.push(settlementExpense);
      localStorage.setItem('tripsplit_data', JSON.stringify(storageData));
    }

    await updateTrip(currentTripId, trip);
    if (window.showToast) window.showToast(`Payment marked as Paid ✅`, 'success');

  } else {
    // Undo: remove from paid list
    trip.paid_settlements = trip.paid_settlements.filter(k => k !== settlementKey);
    await updateTrip(currentTripId, trip);

    // Remove the settlement expense from ledger
    const storageData = JSON.parse(localStorage.getItem('tripsplit_data'));
    storageData.expenses = storageData.expenses.filter(e => !(e.isSettlement && e.settlementKey === settlementKey));
    localStorage.setItem('tripsplit_data', JSON.stringify(storageData));

    if (window.showToast) window.showToast(`Payment reverted to Pending ⏳`, 'info');
  }

  if (typeof triggerBackgroundSync === 'function') {
    triggerBackgroundSync(paid ? `${from} paid ${to}` : `${from} payment reverted`);
  }
  calculateSplit(); // Refresh UI
};

window.renderHomeSettlements = async function() {
  const container = document.getElementById('home-settlements-details');
  if (!container) return;

  if (!currentTripId) {
    container.innerHTML = `<p class="text-slate-400 text-center py-4 italic text-sm">No trip selected.</p>`;
    return;
  }

  const participants = await getParticipants(currentTripId);
  const expenses = await getExpenses(currentTripId);
  const currentTripData = await getTrip(currentTripId);
  const symbol = currentTripData ? (currentTripData.currencySymbol || '₹') : '₹';

  if (participants.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 opacity-40">
        <p class="text-xs font-bold text-slate-500">No participants to split with.</p>
      </div>`;
    return;
  }

  // Calculate Balances and Settlements
  const balances = participants.map(p => ({
    ...p,
    totalSpent: 0,
    expectedShare: 0,
    balance: 0,
    myExpenses: []
  }));

  const totalExpense = expenses.reduce((sum, exp) => sum + (exp.totalAmount || exp.amount || 0), 0);
  const totalMembers = participants.length;
  const perPersonShare = totalMembers > 0 ? totalExpense / totalMembers : 0;

  expenses.forEach(e => {
    const payer = balances.find(p => p.id === e.paidBy);
    if (payer) {
      payer.totalSpent += (e.totalAmount || e.amount || 0);
      payer.myExpenses.push(e);
    }
  });

  balances.forEach(b => {
    b.expectedShare = perPersonShare;
  });

  balances.forEach(b => {
    b.balance = b.totalSpent - b.expectedShare;
  });

  const creditors = balances.filter(p => p.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(p => p.balance < -0.01).sort((a, b) => a.balance - b.balance);

  let settlements = [];
  let i = 0, j = 0;

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

  // Render Settlement Plan content
  container.innerHTML = '';

  const myRole = currentTripData ? (currentTripData.myRole || 'viewer') : 'viewer';
  const canUpdate = myRole === 'owner' || myRole === 'editor';
  const paidSettlements = currentTripData ? (currentTripData.paid_settlements || []) : [];

  const totalSettlementAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  const paidAmount = settlements
    .filter(s => paidSettlements.includes(`${s.from}-->${s.to}`))
    .reduce((sum, s) => sum + s.amount, 0);
  const pendingAmount = totalSettlementAmount - paidAmount;
  const progressPct = totalSettlementAmount > 0 ? Math.round((paidAmount / totalSettlementAmount) * 100) : (settlements.length === 0 ? 100 : 0);
  const isFullySettled = settlements.length === 0 || progressPct === 100;

  // Render Summary Bar
  const summaryBar = document.createElement('div');
  summaryBar.className = 'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4 mb-2';
  summaryBar.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Progress</p>
      <span class="text-xs font-black px-2 py-0.5 rounded-full ${isFullySettled ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}">${progressPct}% ${isFullySettled ? '✅' : 'done'}</span>
    </div>
    <div class="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
      <div class="h-2 rounded-full transition-all duration-700 ${isFullySettled ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width:${progressPct}%"></div>
    </div>
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div class="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100">
        <p class="text-[8px] text-emerald-600 font-black uppercase tracking-wider mb-1">Settled</p>
        <p class="text-xs font-black text-emerald-700">${symbol}${paidAmount.toFixed(0)}</p>
      </div>
      <div class="bg-amber-50 rounded-xl p-2 text-center border border-amber-100">
        <p class="text-[8px] text-amber-600 font-black uppercase tracking-wider mb-1">Pending</p>
        <p class="text-xs font-black text-amber-700">${symbol}${pendingAmount.toFixed(0)}</p>
      </div>
      <div class="bg-indigo-50 rounded-xl p-2 text-center border border-indigo-100">
        <p class="text-[8px] text-indigo-600 font-black uppercase tracking-wider mb-1">Total</p>
        <p class="text-xs font-black text-indigo-700">${symbol}${totalSettlementAmount.toFixed(0)}</p>
      </div>
    </div>
    <div class="border-t border-slate-100 pt-3 mt-1">
      <p class="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-2">Expenses vs Settlements</p>
      <div class="space-y-1 text-[11px]">
        <div class="flex items-center justify-between">
          <span class="text-slate-500 font-semibold">Total Trip Expenses</span>
          <span class="font-black text-slate-700">${symbol}${totalExpense.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500 font-semibold">Total to Settle</span>
          <span class="font-black text-slate-700">${symbol}${totalSettlementAmount.toFixed(2)}</span>
        </div>
        <div class="h-px bg-slate-100 my-1"></div>
        <div class="flex items-center justify-between">
          <span class="text-emerald-600 font-bold">Settled So Far</span>
          <span class="font-black text-emerald-600">${symbol}${paidAmount.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-amber-600 font-bold">Still Pending</span>
          <span class="font-black text-amber-600">${symbol}${pendingAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;
  container.appendChild(summaryBar);

  // Render Settlement Cards
  const settlementContainer = document.createElement('div');
  settlementContainer.className = 'premium-card bg-slate-900 text-white border-none';

  if (settlements.length === 0) {
    settlementContainer.innerHTML = `
      <div class="flex flex-col items-center py-6 text-emerald-400">
        <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="font-black text-sm">Everything is perfectly balanced!</p>
        <p class="text-emerald-500/70 text-[10px] font-medium mt-0.5">No payments needed</p>
      </div>`;
  } else {
    settlementContainer.innerHTML = '<div class="space-y-3"></div>';
    const list = settlementContainer.querySelector('div');

    settlements.forEach(settlement => {
      const settlementKey = `${settlement.from}-->${settlement.to}`;
      const isPaid = paidSettlements.includes(settlementKey);

      let actionHtml = '';
      if (canUpdate) {
        if (isPaid) {
          actionHtml = `
            <button onclick="markSettlementPaidHome('${settlement.from}', '${settlement.to}', ${settlement.amount}, false)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[9px] font-black rounded-lg transition-all">
              <span>↩</span> Undo
            </button>`;
        } else {
          actionHtml = `
            <button onclick="markSettlementPaidHome('${settlement.from}', '${settlement.to}', ${settlement.amount}, true)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[9px] font-black rounded-lg transition-all shadow-md shadow-emerald-500/20">
              <span>✓</span> Paid
            </button>`;
        }
      } else {
        actionHtml = isPaid
          ? `<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[9px] font-black rounded-lg border border-emerald-500/30">✅ Paid</span>`
          : `<span class="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[9px] font-black rounded-lg border border-amber-500/30 animate-pulse">⏳ Pending</span>`;
      }

      const item = document.createElement('div');
      item.className = `flex flex-col p-3.5 rounded-2xl border transition-all duration-300 space-y-2.5 ${isPaid ? 'bg-emerald-900/30 border-emerald-700/30' : 'bg-white/5 border-white/10'}`;
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="text-right">
              <p class="text-[11px] font-bold text-white">${settlement.from}</p>
              <p class="text-[8px] text-slate-400 uppercase tracking-wider">Pays to</p>
            </div>
            <svg class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7-7 7M3 12h18"></path></svg>
            <p class="text-[11px] font-bold text-indigo-400">${settlement.to}</p>
          </div>
          <div class="text-right">
            <p class="text-base font-black ${isPaid ? 'text-emerald-400/50 line-through' : 'text-emerald-400'}">${symbol}${settlement.amount.toFixed(2)}</p>
            ${isPaid ? '<p class="text-[8px] text-emerald-500 font-black uppercase tracking-wider">PAID ✓</p>' : ''}
          </div>
        </div>
        <div class="flex justify-end pt-1.5 border-t border-white/10">
          ${actionHtml}
        </div>
      `;
      list.appendChild(item);
    });
  }

  container.appendChild(settlementContainer);
};

window.markSettlementPaidHome = async function(from, to, amount, paid) {
  await window.markSettlementPaid(from, to, amount, paid);
  if (typeof window.renderHomeSettlements === 'function') {
    await window.renderHomeSettlements();
  }
};

// Load split data when split screen is shown
function loadSplitData() {
  calculateSplit();
}
