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

  const totalExpense = splitData.totalExpense;
  const totalParticipants = splitData.totalParticipants;
  const perPersonShare = splitData.perPersonShare;

  let message = `*${trip.tripName} - Expense Split for ${participant.name}*\n\n`;
  message += `🧮 Total Expenses ÷ (${totalParticipants} Members) = ₹${perPersonShare.toFixed(2)}\n\n`;
  
  message += `👤 *Your Details:*\n`;
  message += `   - Paid / Spent: ₹${balance.totalSpent.toFixed(2)}\n`;
  
  const expectedShareStr = balance.expectedShare.toFixed(2);
  message += `   - Share: -₹${expectedShareStr}\n`;
  
  const status = balance.balance >= 0 ? 'Receives' : 'Owes';
  const resultSign = balance.balance >= 0 ? '+' : '-';
  message += `   - Total Result: ₹${balance.totalSpent.toFixed(2)} - ₹${expectedShareStr} = ${resultSign}₹${Math.abs(balance.balance).toFixed(2)} (${status})\n\n`;

  message += `💳 *Settlement for You:*\n`;
  if (Math.abs(balance.balance) < 0.01) {
    message += `✅ All settled! No payments needed.\n`;
  } else if (balance.balance < 0) {
    message += `👉 Pay ₹${Math.abs(balance.balance).toFixed(2)} to ADMIN\n`;
  } else {
    message += `👈 Receive ₹${Math.abs(balance.balance).toFixed(2)} from ADMIN\n`;
  }

  message += `\nSent from TripSplit App a product of AiSpace.co.in`;

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