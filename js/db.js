// db.js - Persistent storage management (LocalStorage implementation for reliability)

const STORAGE_KEY = 'tripsplit_data';

// Initialize data structure
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    trips: [],
    participants: [],
    expenses: []
};

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Auto-sync if connected to cloud
    if (typeof triggerBackgroundSync === 'function') {
        triggerBackgroundSync();
    }
}

// Trip operations
async function addTrip(trip) {
    const newTrip = {
        ...trip,
        id: Date.now(),
        createdAt: new Date().toISOString()
    };
    data.trips.push(newTrip);
    saveData();
    return newTrip.id;
}

async function getTrips() {
    return data.trips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getTrip(id) {
    return data.trips.find(t => t.id === id);
}

async function updateTrip(id, updates) {
    const index = data.trips.findIndex(t => t.id === id);
    if (index !== -1) {
        data.trips[index] = { ...data.trips[index], ...updates };
        saveData();
    }
}

async function saveCloudTripBundle(bundle) {
    if (!bundle || !bundle.trip) return;
    
    const tripId = bundle.trip.id;
    
    // Remove existing local data for this trip
    data.trips = data.trips.filter(t => t.id !== tripId);
    data.participants = data.participants.filter(p => p.tripId !== tripId);
    data.expenses = data.expenses.filter(e => e.tripId !== tripId);
    
    // Insert new cloud data
    data.trips.push(bundle.trip);
    if (bundle.participants) data.participants.push(...bundle.participants);
    if (bundle.expenses) data.expenses.push(...bundle.expenses);
    
    saveData();
}

async function deleteTripFromDB(id) {
    data.trips = data.trips.filter(t => t.id !== id);
    data.participants = data.participants.filter(p => p.tripId !== id);
    data.expenses = data.expenses.filter(e => e.tripId !== id);
    saveData();
}

async function duplicateTripFromDB(id) {
    const trip = await getTrip(id);
    if (trip) {
        const newTrip = { 
            ...trip, 
            id: Date.now(), 
            tripName: `${trip.tripName} (Copy)`, 
            createdAt: new Date().toISOString() 
        };
        data.trips.push(newTrip);
        saveData();
        return newTrip.id;
    }
    return null;
}

// Participant operations
async function addParticipant(participant) {
    const newParticipant = {
        ...participant,
        familyCount: participant.familyCount || 1, // Default to 1 (self)
        id: Date.now() + Math.floor(Math.random() * 1000),
        totalSpent: 0
    };
    data.participants.push(newParticipant);
    saveData();
    return newParticipant.id;
}

async function getParticipants(tripId) {
    const tripParticipants = data.participants.filter(p => p.tripId === tripId);
    const tripExpenses = data.expenses.filter(e => e.tripId === tripId);
    
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
        saveData();
    }
}

async function deleteParticipantFromDB(id) {
    data.participants = data.participants.filter(p => p.id !== id);
    data.expenses = data.expenses.filter(e => e.paidBy !== id);
    saveData();
}

// Expense operations
async function addExpense(expense) {
    const newExpense = {
        ...expense,
        id: Date.now() + Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString()
    };
    data.expenses.push(newExpense);
    saveData();
    return newExpense.id;
}

async function getExpenses(tripId) {
    return data.expenses
        .filter(e => e.tripId === tripId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getExpense(id) {
    return data.expenses.find(e => e.id === id);
}

async function updateExpense(id, updates) {
    const index = data.expenses.findIndex(e => e.id === id);
    if (index !== -1) {
        data.expenses[index] = { ...data.expenses[index], ...updates };
        saveData();
    }
}

async function deleteExpenseFromDB(id) {
    data.expenses = data.expenses.filter(e => e.id !== id);
    saveData();
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