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
  const sym = trip ? (trip.currencySymbol || '₹') : '₹';

  let message = `${trip.tripName} - Expense Split Summary\n\n`;
  message += `Total Expenses : ${sym}${totalExpense.toFixed(2)}\n`;
  message += `Members :   ${totalParticipants}\n`;
  message += `Each Share: ${sym}${perPersonShare.toFixed(2)}\n\n`;

  message += `INDIVIDUAL BALANCES\n`;
  message += `────────────────────────\n\n`;

  splitData.balances.forEach(balance => {
    const status = balance.balance >= 0 ? 'Receives' : 'Owes';
    const resultSign = balance.balance >= 0 ? '+' : '-';
    message += `${balance.name}:\n`;
    message += `  Paid / Spent: ${sym}${balance.totalSpent.toFixed(2)}\n`;
    message += `  Result: ${resultSign}${sym}${Math.abs(balance.balance).toFixed(2)} (${status})\n\n`;
  });

  message += `────────────────────────\n`;
  message += `SETTLEMENT PLAN\n\n`;

  const payers = splitData.balances.filter(b => b.balance <= -0.01);
  const receivers = splitData.balances.filter(b => b.balance >= 0.01);

  if (payers.length === 0 && receivers.length === 0) {
    message += `All settled! No payments needed.\n`;
  } else {
    payers.forEach(p => {
      message += `● ${p.name} Pay ${sym}${Math.abs(p.balance).toFixed(2)} to ADMIN\n`;
    });
    message += `\n`;
    receivers.forEach(r => {
      message += `● ${r.name} Receive ${sym}${Math.abs(r.balance).toFixed(2)} from ADMIN\n`;
    });
  }

  message += `\nSent from TripSplit App a product of AiSpace.co.in`;

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