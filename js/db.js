// db.js - Persistent storage management (LocalStorage implementation for reliability)

const STORAGE_KEY = 'tripsplit_data';

// ── Safe UUID Generator ──────────────────────────────────────────────────────
// Uses crypto.randomUUID() when available (all modern browsers + PWA contexts).
// Falls back to a timestamp + random hex string that is globally unique enough.
function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID(); // e.g. '550e8400-e29b-41d4-a716-446655440000'
    }
    // Fallback: timestamp (13 chars) + 9 random hex chars = 22-char unique string
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}
// ─────────────────────────────────────────────────────────────────────────────

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
        id: generateId(),      // ← UUID, never collides
        myRole: 'owner',
        share_id: null,        // ← New trips always start local (no cloud link)
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
            id: generateId(),                         // Fresh UUID — never same as original
            tripName: `${trip.tripName} (Copy)`,
            // ── Strip ALL cloud/sync metadata so the copy is a fresh local trip ──
            share_id: null,                           // No cloud link — prevents overwriting original
            myRole: 'owner',                          // The duplicator is always owner of the copy
            pendingSync: false,
            // ── Reset timestamps ──────────────────────────────────────────────
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

// ======= Data Integrity Sanitizer =======
// Runs once on app startup to fix any legacy ID collisions from old Date.now() usage.
// Safe to run on clean data — it only acts if duplicates are actually found.
window.sanitizeDataIntegrity = function() {
    let dirty = false;

    // 1. Deduplicate trips by ID — keep the one with the latest updatedAt
    const tripMap = new Map();
    data.trips.forEach(t => {
        const existing = tripMap.get(String(t.id));
        if (!existing || new Date(t.updatedAt) > new Date(existing.updatedAt)) {
            tripMap.set(String(t.id), t);
            if (existing) dirty = true; // Found a duplicate
        } else {
            dirty = true;
        }
    });
    if (dirty) {
        data.trips = Array.from(tripMap.values());
    }

    // 2. Deduplicate participants by ID
    let pDirty = false;
    const pMap = new Map();
    data.participants.forEach(p => {
        if (!pMap.has(String(p.id))) {
            pMap.set(String(p.id), p);
        } else {
            pDirty = true;
        }
    });
    if (pDirty) {
        data.participants = Array.from(pMap.values());
        dirty = true;
    }

    // 3. Deduplicate expenses by ID
    let eDirty = false;
    const eMap = new Map();
    data.expenses.forEach(e => {
        if (!eMap.has(String(e.id))) {
            eMap.set(String(e.id), e);
        } else {
            eDirty = true;
        }
    });
    if (eDirty) {
        data.expenses = Array.from(eMap.values());
        dirty = true;
    }

    // 4. Remove orphaned participants (tripId points to a non-existent trip)
    const validTripIds = new Set(data.trips.map(t => String(t.id)));
    const beforePCount = data.participants.length;
    data.participants = data.participants.filter(p => validTripIds.has(String(p.tripId)));
    if (data.participants.length !== beforePCount) dirty = true;

    // 5. Remove orphaned expenses
    const beforeECount = data.expenses.length;
    data.expenses = data.expenses.filter(e => validTripIds.has(String(e.tripId)));
    if (data.expenses.length !== beforeECount) dirty = true;

    // 6. Fix duplicate share_ids — if two local trips share the same share_id, 
    //    clear it from all but the one that is 'owner'
    const shareIdMap = new Map();
    data.trips.forEach(t => {
        if (t.share_id) {
            if (!shareIdMap.has(t.share_id)) {
                shareIdMap.set(t.share_id, [t]);
            } else {
                shareIdMap.get(t.share_id).push(t);
            }
        }
    });
    shareIdMap.forEach((trips, shareId) => {
        if (trips.length > 1) {
            dirty = true;
            // Keep share_id only on the owner trip (or first one found)
            const ownerTrip = trips.find(t => t.myRole === 'owner') || trips[0];
            trips.forEach(t => {
                if (t.id !== ownerTrip.id) {
                    const idx = data.trips.findIndex(dt => String(dt.id) === String(t.id));
                    if (idx !== -1) {
                        data.trips[idx].share_id = null; // Clear duplicate share_id
                        data.trips[idx].myRole = 'owner';
                        console.warn(`[Integrity] Cleared duplicate share_id '${shareId}' from trip '${data.trips[idx].tripName}'`);
                    }
                }
            });
        }
    });

    if (dirty) {
        console.warn('[Integrity] Data issues found and repaired. Saving clean data...');
        data.pendingSync = false; // Don't auto-sync integrity fix
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
        console.log('[Integrity] Data check passed. No issues found.');
    }

    return dirty; // returns true if repairs were made
};


// Participant operations
async function addParticipant(participant) {
    touchTrip(participant.tripId);
    const newParticipant = {
        ...participant,
        familyCount: participant.familyCount || 1,
        id: generateId(),   // ← UUID, safe even in tight async loops
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
        id: generateId(),   // ← UUID, safe even in tight async loops
        description: expense.title || expense.description || '',
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