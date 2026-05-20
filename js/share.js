// share.js - WhatsApp sharing functionality

async function shareOnWhatsApp() {
  if (!currentTripId) {
    alert('Please select a trip first');
    return;
  }

  const splitData = await calculateSplit();
  if (!splitData) return;

  const trip = await getTrip(currentTripId);
  const totalExpense = splitData.totalExpense;
  const totalParticipants = splitData.totalParticipants;
  const perPersonShare = splitData.perPersonShare;

  let message = `*${trip.tripName} - Trip Split Summary*\n\n`;
  message += `📊 *Total Expense:* ₹${totalExpense.toFixed(2)}\n`;
  message += `👥 *Total Members:* ${totalParticipants}\n`;
  message += `🧮 *Average Share Calculation:* ₹${totalExpense.toFixed(2)} ÷ ${totalParticipants} people = ₹${perPersonShare.toFixed(2)} per head\n\n`;

  message += `👤 *Individual Balances & Details:*\n`;
  splitData.balances.forEach(balance => {
    const status = balance.balance >= 0 ? 'Receives' : 'Owes';
    const resultSign = balance.balance >= 0 ? '+' : '-';
    message += `*${balance.name}*:\n`;
    message += `   - Paid / Spent: ₹${balance.totalSpent.toFixed(2)}\n`;
    message += `   - Expected Share: ₹${balance.expectedShare.toFixed(2)}\n`;
    message += `   - Result (Paid - Share): ${resultSign}₹${Math.abs(balance.balance).toFixed(2)} (${status})\n`;
    
    // Settlements involving this specific person
    const mySettlements = splitData.settlements.filter(s => s.from === balance.name || s.to === balance.name);
    if (mySettlements.length > 0) {
      message += `   - Settlement for You:\n`;
      mySettlements.forEach(s => {
        if (s.from === balance.name) {
          message += `     👉 Pay ₹${s.amount.toFixed(2)} to ${s.to}\n`;
        } else {
          message += `     👈 Receive ₹${s.amount.toFixed(2)} from ${s.from}\n`;
        }
      });
    } else {
      message += `   - Settlement for You: 0 (No payments needed)\n`;
    }
    message += `\n`;
  });

  message += `💳 *Overall Settlement Plan:*\n`;
  if (splitData.settlements.length === 0) {
    message += `✅ All settled! No payments needed.\n`;
  } else {
    splitData.settlements.forEach((settlement, index) => {
      message += `${index + 1}. ${settlement.from} → ${settlement.to}: ₹${settlement.amount.toFixed(2)}\n`;
    });
  }

  message += `\n\nSent from TripSplit App a product of AiSpace.co.in`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

async function shareIndividualOnWhatsApp(participantId) {
  const trip = await getTrip(currentTripId);
  const participant = await getParticipant(participantId);
  const splitData = await calculateSplit();

  if (!participant || !splitData) return;

  const balance = splitData.balances.find(b => b.id === participantId);
  if (!balance) return;

  const sym = trip.currencySymbol || 'Rs.';
  const totalExpense = splitData.totalExpense;
  const totalParticipants = splitData.totalParticipants;
  const perPersonShare = splitData.perPersonShare;
  const individualBalance = balance.totalSpent - perPersonShare;
  const isCreditor = individualBalance >= 0;

  // ── Header ──────────────────────────────────────────
  let message = `*${trip.tripName} - Expense Split*\n`;
  message += `--------------------------------\n`;
  message += `Dear ${participant.name},\n\n`;

  // ── Trip Totals ──────────────────────────────────────
  message += `Total Expenses : ${sym}${totalExpense.toFixed(2)}\n`;
  message += `Members        : ${totalParticipants}\n`;
  message += `Each Share     : ${sym}${perPersonShare.toFixed(2)}\n`;
  message += `\n`;

  // ── Expenses paid by this person ────────────────────
  message += `Expenses Paid by You (${participant.name})\n`;
  message += `--------------------------------\n`;

  if (balance.myExpenses && balance.myExpenses.length > 0) {
    balance.myExpenses.forEach(exp => {
      const amt = (exp.totalAmount || exp.amount || 0).toFixed(2);
      const desc = (exp.title || exp.description || 'Expense').padEnd(22, ' ');
      message += `  * ${desc} ${sym}${amt}\n`;
    });
  } else {
    message += `  No expenses paid directly\n`;
  }

  message += `--------------------------------\n`;
  message += `  Total Paid          : ${sym}${balance.totalSpent.toFixed(2)}\n`;
  message += `\n`;

  // ── Calculation ──────────────────────────────────────
  message += `Your Calculation\n`;
  message += `--------------------------------\n`;
  message += `  ${sym}${totalExpense.toFixed(2)} / ${totalParticipants} members = ${sym}${perPersonShare.toFixed(2)} per person\n\n`;
  const sign = isCreditor ? '+' : '-';
  message += `  Paid ${sym}${balance.totalSpent.toFixed(2)} - Share ${sym}${perPersonShare.toFixed(2)} = ${sign}${sym}${Math.abs(individualBalance).toFixed(2)}\n`;
  message += `\n`;

  // ── Settlement ───────────────────────────────────────
  message += `Settlement for You\n`;
  message += `--------------------------------\n`;
  if (Math.abs(individualBalance) < 0.01) {
    message += `  All settled! No payments needed.\n`;
  } else if (isCreditor) {
    message += `  You will Receive ${sym}${Math.abs(individualBalance).toFixed(2)} from ADMIN\n`;
  } else {
    message += `  Pay ${sym}${Math.abs(individualBalance).toFixed(2)} to ADMIN\n`;
  }

  // ── Footer ───────────────────────────────────────────
  message += `\n\nSent from TripSplit App\na product of AiSpace.co.in`;

  // Ask for phone number
  const phone = prompt(`Enter phone number for ${participant.name} (with country code, e.g., 919876543210):`, participant.phone || '');
  if (phone === null) return; // Cancelled

  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

// Initialize share functionality
function initShare() {
  const shareBtn = document.getElementById('share-whatsapp');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareOnWhatsApp);
  }
}