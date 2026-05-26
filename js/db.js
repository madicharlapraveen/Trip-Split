// db.js - Persistent storage management (LocalStorage implementation for reliability)

const STORAGE_KEY = 'tripsplit_data';

// Initialize data structure
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    trips: [],
    participants: [],
    expenses: [],
    templates: []
};
// Ensure templates always exists on older data
if (!data.templates) data.templates = [];


// Global State
// currentTripId is now managed on window.currentTripId via index.html



function saveData(actionDesc = "updated the trip") {
    data.pendingSync = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Auto-sync if connected to cloud
    if (typeof triggerBackgroundSync === 'function') {
        triggerBackgroundSync(actionDesc);
    }
}

// Helper to update the last updated timestamp of a trip
function touchTrip(tripId) {
    if (!tripId) return;
    const index = data.trips.findIndex(t => String(t.id) === String(tripId));
    if (index !== -1) {
        data.trips[index].updatedAt = new Date().toISOString();
    }
}

// Trip operations
async function addTrip(trip) {
    const newTrip = {
        ...trip,
        id: Date.now(),
        myRole: 'owner', // Default role for local trips
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    data.trips.push(newTrip);
    saveData();
    return newTrip.id;
}

async function getTrips() {
    return data.trips.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt);
        const dateB = new Date(b.updatedAt || b.createdAt);
        return dateB - dateA;
    });
}

async function getTrip(id) {
    return data.trips.find(t => String(t.id) === String(id));
}

async function updateTrip(id, updates) {
    const index = data.trips.findIndex(t => String(t.id) === String(id));
    if (index !== -1) {
        data.trips[index] = { 
            ...data.trips[index], 
            ...updates,
            updatedAt: new Date().toISOString()
        };
        saveData("updated trip settings");
    }
}

async function saveCloudTripBundle(bundle, overrideRole) {
    if (!bundle || !bundle.trip) return;
    
    const tripId = bundle.trip.id;
    
    // Role resolution priority:
    // 1. If the existing local trip is 'owner', ALWAYS keep 'owner' — never allow any cloud
    //    operation (echo, realtime, or join) to downgrade the trip creator.
    // 2. If overrideRole is explicitly passed (e.g. from joinTripFromCloud), use it.
    // 3. If the local trip already has a role, preserve it.
    // 4. Default to 'viewer' for brand new unknown devices.
    const existingTrip = data.trips.find(t => String(t.id) === String(tripId));
    let role;
    if (existingTrip && existingTrip.myRole === 'owner') {
        role = 'owner'; // Owner is PERMANENT — never downgrade
    } else {
        role = overrideRole || (existingTrip && existingTrip.myRole) || 'viewer';
    }

    // Remove existing local data for this trip
    data.trips = data.trips.filter(t => String(t.id) !== String(tripId));
    data.participants = data.participants.filter(p => String(p.tripId) !== String(tripId));
    data.expenses = data.expenses.filter(e => String(e.tripId) !== String(tripId));
    
    // Insert new cloud data
    const tripRecord = {
        ...bundle.trip,
        myRole: role,
        updatedAt: new Date().toISOString()
    };
    data.trips.push(tripRecord);
    if (bundle.participants) data.participants.push(...bundle.participants);
    if (bundle.expenses) data.expenses.push(...bundle.expenses);
    
    data.pendingSync = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function deleteTripFromDB(id) {
    data.trips = data.trips.filter(t => String(t.id) !== String(id));
    data.participants = data.participants.filter(p => String(p.tripId) !== String(id));
    data.expenses = data.expenses.filter(e => String(e.tripId) !== String(id));
    saveData("deleted a trip");
}

async function duplicateTripFromDB(id) {
    const trip = await getTrip(id);
    if (trip) {
        const newTrip = { 
            ...trip, 
            id: Date.now(), 
            tripName: `${trip.tripName} (Copy)`, 
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        data.trips.push(newTrip);
        saveData("duplicated a trip");
        return newTrip.id;
    }
    return null;
}

// ======= F6: Trip Template CRUD =======
async function saveTemplateFromTrip(tripId) {
    const trip = await getTrip(tripId);
    if (!trip) return null;
    const participants = await getParticipants(tripId);
    const template = {
        id: Date.now(),
        name: trip.tripName + ' Template',
        estimatedBudget: trip.estimatedBudget || 0,
        currency: trip.currency || 'INR',
        currencySymbol: trip.currencySymbol || '₹',
        itinerary: trip.itinerary || [],
        crew: participants.map(p => ({ name: p.name, familyCount: p.familyCount || 1 })),
        savedAt: new Date().toISOString()
    };
    data.templates.push(template);
    saveData();
    return template.id;
}

async function getTemplates() {
    return data.templates || [];
}

async function deleteTemplateFromDB(id) {
    data.templates = data.templates.filter(t => t.id !== id);
    saveData();
}



// ======= F2: Clear pendingSync after successful cloud push =======
function clearPendingSync() {
    data.pendingSync = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// Participant operations
async function addParticipant(participant) {
    touchTrip(participant.tripId);
    const newParticipant = {
        ...participant,
        familyCount: participant.familyCount || 1, // Default to 1 (self)
        id: Date.now() + Math.floor(Math.random() * 1000),
        totalSpent: 0
    };
    data.participants.push(newParticipant);
    saveData(`added member "${newParticipant.name}"`);
    return newParticipant.id;
}

async function getParticipants(tripId) {
    const tripParticipants = data.participants.filter(p => String(p.tripId) === String(tripId));
    const tripExpenses = data.expenses.filter(e => String(e.tripId) === String(tripId));
    
    return tripParticipants.map(p => {
        const totalSpent = tripExpenses
            .filter(e => e.paidBy === p.id)
            .reduce((sum, e) => sum + e.amount, 0);
        return { ...p, totalSpent };
    });
}

async function getParticipant(id) {
    return data.participants.find(p => p.id === id);
}

async function updateParticipant(id, updates) {
    const index = data.participants.findIndex(p => p.id === id);
    if (index !== -1) {
        data.participants[index] = { ...data.participants[index], ...updates };
        touchTrip(data.participants[index].tripId);
        saveData(`updated member "${data.participants[index].name}"`);
    }
}

async function deleteParticipantFromDB(id) {
    const participant = data.participants.find(p => p.id === id);
    if (participant) {
        touchTrip(participant.tripId);
    }
    data.participants = data.participants.filter(p => p.id !== id);
    data.expenses = data.expenses.filter(e => e.paidBy !== id);
    saveData(`removed member "${participant ? participant.name : 'Unknown'}"`);
}

// Expense operations
async function addExpense(expense) {
    touchTrip(expense.tripId);
    const newExpense = {
        ...expense,
        id: Date.now() + Math.floor(Math.random() * 1000),
        description: expense.title || expense.description || '',  // ensure description field always set
        createdAt: expense.createdAt || new Date().toISOString()
    };
    data.expenses.push(newExpense);
    saveData(`added expense "${newExpense.title}" (₹${newExpense.amount})`);
    return newExpense.id;
}

async function getExpenses(tripId) {
    return data.expenses
        .filter(e => String(e.tripId) === String(tripId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getExpense(id) {
    return data.expenses.find(e => e.id === id);
}

async function updateExpense(id, updates) {
    const index = data.expenses.findIndex(e => e.id === id);
    if (index !== -1) {
        // Ensure description stays in sync with title
        if (updates.title && !updates.description) {
            updates.description = updates.title;
        }
        // Ensure totalAmount is always set correctly
        if (updates.totalPay && !updates.totalAmount) {
            updates.totalAmount = updates.totalPay;
        }
        data.expenses[index] = { ...data.expenses[index], ...updates };
        touchTrip(data.expenses[index].tripId);
        saveData(`updated expense "${data.expenses[index].title}"`);
    }
}

async function deleteExpenseFromDB(id) {
    const expense = data.expenses.find(e => e.id === id);
    if (expense) {
        touchTrip(expense.tripId);
    }
    data.expenses = data.expenses.filter(e => e.id !== id);
    saveData(`deleted expense "${expense ? expense.title : 'Unknown'}"`);
}

// CSV Export/Import functions
async function exportDataToCSV() {
    // Header for combined CSV
    const headers = ['DataType', 'TripID', 'TripName', 'ItemTitle', 'Amount', 'Category', 'PaidBy', 'ParticipantName', 'Phone', 'FamilySize', 'Notes', 'Date'];
    let csvRows = [headers.join(',')];

    const escapeCSV = (str) => {
        if (!str) return '""';
        return `"${String(str).replace(/"/g, '""')}"`;
    };

    // Export Trips
    data.trips.forEach(trip => {
        const row = ['Trip', trip.id, escapeCSV(trip.tripName), '""', '""', '""', '""', '""', '""', '""', escapeCSV(trip.notes), escapeCSV(trip.createdAt)];
        csvRows.push(row.join(','));
    });

    // Export Participants
    data.participants.forEach(p => {
        const row = ['Participant', '""', '""', '""', '""', '""', p.id, escapeCSV(p.name), escapeCSV(p.phone), p.familyCount, '""', '""'];
        csvRows.push(row.join(','));
    });

    // Export Expenses
    data.expenses.forEach(e => {
        const row = ['Expense', '""', '""', escapeCSV(e.title), e.amount, escapeCSV(e.category), e.paidBy, '""', '""', '""', '""', escapeCSV(e.createdAt)];
        csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
}

async function exportTripToCSV(tripId) {
    const trip = await getTrip(tripId);
    if (!trip) return '';

    const participants = await getParticipants(tripId);
    const expenses = await getExpenses(tripId);
    const itinerary = trip.itinerary || [];

    // Calculate Split for Summary
    const totalExpense = expenses.reduce((sum, exp) => sum + (exp.totalAmount || exp.amount), 0);
    const totalParticipants = participants.reduce((sum, p) => sum + (p.familyCount || 1), 0);
    const perPersonShare = totalParticipants > 0 ? totalExpense / totalParticipants : 0;

    const escapeCSV = (str) => {
        if (!str) return '""';
        return `"${String(str).replace(/"/g, '""')}"`;
    };

    let csvContent = [];

    // 1. TRIP INFO
    csvContent.push('SECTION,TRIP SUMMARY');
    csvContent.push(`Trip Name,${escapeCSV(trip.tripName)}`);
    csvContent.push(`Total Budget/Spent,₹${totalExpense.toFixed(2)}`);
    csvContent.push(`Total Participants (incl. Family),${totalParticipants}`);
    csvContent.push(`Standard Share Per Head,₹${perPersonShare.toFixed(2)}`);
    csvContent.push('');

    // 2. PARTICIPANT BREAKDOWN
    csvContent.push('SECTION,PARTICIPANTS & BALANCES');
    csvContent.push('Name,Family Size,Total Spent,Expected Share,Balance,Status');
    participants.forEach(p => {
        const expectedShare = perPersonShare * (p.familyCount || 1);
        const balance = p.totalSpent - expectedShare;
        const status = balance >= 0 ? 'Receives' : 'Owes';
        csvContent.push(`${escapeCSV(p.name)},${p.familyCount || 1},₹${p.totalSpent.toFixed(2)},₹${expectedShare.toFixed(2)},₹${Math.abs(balance).toFixed(2)},${status}`);
    });
    csvContent.push('');

    // 3. EXPENSES
    csvContent.push('SECTION,EXPENSE LOG');
    csvContent.push('Date,Title,Category,Total Amount,Advance Paid,Remaining,Paid By');
    expenses.forEach(e => {
        const payer = participants.find(p => p.id === e.paidBy);
        const payerName = payer ? payer.name : 'Unknown';
        const total = e.totalAmount || e.amount;
        const advance = e.advancePay || 0;
        const remaining = total - advance;
        csvContent.push(`${escapeCSV(new Date(e.createdAt).toLocaleDateString())},${escapeCSV(e.title)},${escapeCSV(e.category)},₹${total.toFixed(2)},₹${advance.toFixed(2)},₹${remaining.toFixed(2)},${escapeCSV(payerName)}`);
    });
    csvContent.push('');

    // 4. PLAN/ITINERARY
    csvContent.push('SECTION,TRIP PLAN');
    csvContent.push('Order,Place Name,Time/Day,Status,Notes');
    itinerary.forEach((item, index) => {
        csvContent.push(`${index + 1},${escapeCSV(item.placeName)},${escapeCSV(item.time)},${item.visited ? 'Visited' : 'Planned'},${escapeCSV(item.notes)}`);
    });

    return csvContent.join('\n');
}

async function importDataFromCSV(csvString) {
    const lines = csvString.split('\n');
    if (lines.length < 1) throw new Error('Invalid CSV file');

    const headers = lines[0].split(',').map(h => h.trim());
    const newData = { trips: [], participants: [], expenses: [] };

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Simple CSV parser (doesn't handle complex quoted commas perfectly, but works for our needs)
        // We'll use a regex to handle quoted values correctly
        const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const row = {};
        headers.forEach((h, index) => {
            let val = (values[index] || '').trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1).replace(/""/g, '"');
            row[h] = val;
        });

        if (row.dataType === 'trip') {
            newData.trips.push({
                id: Number(row.id),
                tripName: row.tripName,
                notes: row.notes,
                createdAt: row.createdAt
            });
        } else if (row.dataType === 'participant') {
            newData.participants.push({
                id: Number(row.id),
                tripId: Number(row.tripId),
                name: row.name,
                phone: row.phone,
                familyCount: Number(row.familyCount)
            });
        } else if (row.dataType === 'expense') {
            newData.expenses.push({
                id: Number(row.id),
                tripId: Number(row.tripId),
                title: row.title,
                amount: Number(row.amount),
                category: row.category,
                paidBy: Number(row.paidBy),
                createdAt: row.createdAt
            });
        }
    }

    if (newData.trips.length > 0 || newData.participants.length > 0 || newData.expenses.length > 0) {
        data = newData;
        saveData();
    } else {
        throw new Error('No valid data found in CSV');
    }
}

// JSON Export/Import functions (Preferred for reliability)
async function exportDataToJSON() {
    return JSON.stringify(data, null, 2);
}

async function importDataFromJSON(jsonString) {
    try {
        const newData = JSON.parse(jsonString);
        
        // Basic validation
        if (!newData.trips || !Array.isArray(newData.trips)) throw new Error('Invalid backup file: Missing trips');
        
        data = newData;
        saveData();
        return true;
    } catch (e) {
        throw new Error('Invalid JSON format: ' + e.message);
    }
}