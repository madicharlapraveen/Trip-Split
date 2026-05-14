// share.js - WhatsApp sharing functionality

async function shareOnWhatsApp() {
  if (!currentTripId) {
    alert('Please select a trip first');
    return;
  }

  const splitData = await calculateSplit();
  if (!splitData) return;

  const trip = await getTrip(currentTripId);

  let message = `*${trip.tripName} - Trip Split Summary*\n\n`;
  message += `📊 *Total Expense:* ₹${splitData.totalExpense.toFixed(2)}\n`;
  message += `👥 *Total Members:* ${splitData.totalParticipants}\n`;
  message += `💰 *Per Person Share:* ₹${splitData.perPersonShare.toFixed(2)}\n\n`;

  message += `*Individual Balances:*\n`;
  splitData.balances.forEach(balance => {
    const status = balance.balance >= 0 ? 'Receives' : 'Owes';
    message += `${balance.name}: ${status} ₹${Math.abs(balance.balance).toFixed(2)}\n`;
  });

  message += `\n*Settlement Suggestions:*\n`;
  if (splitData.settlements.length === 0) {
    message += `✅ All settled! No payments needed.\n`;
  } else {
    splitData.settlements.forEach((settlement, index) => {
      message += `${index + 1}. ${settlement.from} → ${settlement.to}: ₹${settlement.amount.toFixed(2)}\n`;
    });
  }

  message += `\n_Sent from TripSplit App_`;

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

  let message = `*${trip.tripName} - Expense Split for ${participant.name}*\n\n`;
  message += `💰 *Total Trip Expense:* ₹${splitData.totalExpense.toFixed(2)}\n`;
  message += `👤 *Your Share:* ₹${balance.expectedShare.toFixed(2)}\n`;
  message += `💵 *You Paid:* ₹${balance.totalSpent.toFixed(2)}\n\n`;
  
  const status = balance.balance >= 0 ? 'RECEIVE' : 'OWE';
  message += `*Result:* You ${status} ₹${Math.abs(balance.balance).toFixed(2)}\n\n`;

  // Filter settlements involving this participant
  const mySettlements = splitData.settlements.filter(s => s.from === participant.name || s.to === participant.name);
  if (mySettlements.length > 0) {
    message += `*Settlements for you:*\n`;
    mySettlements.forEach(s => {
      if (s.from === participant.name) {
        message += `👉 Pay ₹${s.amount.toFixed(2)} to ${s.to}\n`;
      } else {
        message += `👈 Receive ₹${s.amount.toFixed(2)} from ${s.from}\n`;
      }
    });
  } else {
    message += `✅ You are all settled!\n`;
  }

  message += `\n_Sent from TripSplit App_`;

  // Ask for phone number
  const phone = prompt(`Enter phone number for ${participant.name} (with country code, e.g., 919876543210):`, participant.phone || '');
  if (phone === null) return; // Cancelled

  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

// Initialize share functionality
function initShare() {
  document.getElementById('share-whatsapp').addEventListener('click', shareOnWhatsApp);
}