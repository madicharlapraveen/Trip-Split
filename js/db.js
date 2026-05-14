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
    const headers = ['dataType', 'id', 'tripId', 'tripName', 'notes', 'name', 'phone', 'familyCount', 'title', 'amount', 'category', 'paidBy', 'createdAt'];
    let csvRows = [headers.join(',')];

    // Export Trips
    data.trips.forEach(trip => {
        const row = ['trip', trip.id, '', trip.tripName, `"${(trip.notes || '').replace(/"/g, '""')}"`, '', '', '', '', '', '', '', trip.createdAt];
        csvRows.push(row.join(','));
    });

    // Export Participants
    data.participants.forEach(p => {
        const row = ['participant', p.id, p.tripId, '', '', '', `"${(p.name || '').replace(/"/g, '""')}"`, `"${(p.phone || '').replace(/"/g, '""')}"`, p.familyCount, '', '', '', ''];
        csvRows.push(row.join(','));
    });

    // Export Expenses
    data.expenses.forEach(e => {
        const row = ['expense', e.id, e.tripId, '', '', '', '', '', '', `"${(e.title || '').replace(/"/g, '""')}"`, e.amount, e.category, e.paidBy, e.createdAt];
        csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
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