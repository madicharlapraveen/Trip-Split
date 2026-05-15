// planner.js - Trip planning functionality (Itinerary Bubbles & Plates)

async function loadTripNotes() {
    if (!currentTripId) return;

    const trip = await getTrip(currentTripId);
    const itinerary = trip.itinerary || [];
    
    const itineraryList = document.getElementById('itinerary-list');
    itineraryList.innerHTML = '';

    if (itinerary.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'flex flex-col items-center justify-center py-20 text-slate-400 space-y-4';
        emptyState.innerHTML = `
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <p class="text-sm font-medium">Your roadmap is empty.</p>
            <button onclick="showAddPlaceModal()" class="btn-primary px-6 py-3 text-sm">Add First Stop</button>
        `;
        itineraryList.appendChild(emptyState);
        return;
    }

    itinerary.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `itinerary-bubble animate-scale-in ${item.visited ? 'visited' : ''}`;
        itemDiv.innerHTML = `
            <div class="itinerary-dot"></div>
            <div class="itinerary-plate">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-bold text-lg ${item.visited ? 'text-emerald-700 line-through opacity-60' : 'text-slate-800'}">${item.placeName}</h4>
                        <div class="flex items-center space-x-2 mt-1">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${item.time || 'Anytime'}</span>
                            ${item.visited ? '<span class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">● Visited</span>' : ''}
                        </div>
                        ${item.notes ? `<p class="text-xs text-slate-500 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">${item.notes}</p>` : ''}
                    </div>
                    <div class="flex flex-col space-y-2 ml-4">
                        <button onclick="toggleVisit(${index})" class="w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.visited ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button onclick="showEditPlaceModal(${index})" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="deletePlace(${index})" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        itineraryList.appendChild(itemDiv);
    });
}

function showAddPlaceModal() {
    if (!currentTripId) {
        showTripSelectionModal();
        return;
    }

    const content = `
        <h3 class="text-xl font-bold mb-6 text-slate-800">Add Next Stop</h3>
        <form id="add-place-form" class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Place Name</label>
                <input type="text" id="place-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="E.g. Eiffel Tower, Dinner at Cafe" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Time / Day</label>
                <input type="text" id="place-time" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="E.g. 10:00 AM or Day 1">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea id="place-notes" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all" rows="2" placeholder="Any reminders?"></textarea>
            </div>
            <div class="flex space-x-3 pt-4">
                <button type="submit" class="flex-1 btn-primary py-4">Add to Plan</button>
                <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
            </div>
        </form>
    `;
    showModal(content);

    document.getElementById('add-place-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const placeName = document.getElementById('place-name').value.trim();
        const time = document.getElementById('place-time').value.trim();
        const notes = document.getElementById('place-notes').value.trim();

        if (placeName) {
            const trip = await getTrip(currentTripId);
            const itinerary = trip.itinerary || [];
            itinerary.push({
                placeName,
                time,
                notes,
                visited: false,
                id: Date.now()
            });
            
            await updateTrip(currentTripId, { itinerary });
            hideModal();
            loadTripNotes();
        }
    });
}

async function toggleVisit(index) {
    const trip = await getTrip(currentTripId);
    const itinerary = trip.itinerary || [];
    if (itinerary[index]) {
        itinerary[index].visited = !itinerary[index].visited;
        await updateTrip(currentTripId, { itinerary });
        loadTripNotes();
    }
}

async function deletePlace(index) {
    if (confirm('Remove this place from your itinerary?')) {
        const trip = await getTrip(currentTripId);
        const itinerary = trip.itinerary || [];
        itinerary.splice(index, 1);
        await updateTrip(currentTripId, { itinerary });
        loadTripNotes();
    }
}

// Initialize planner when plan screen is shown
function initPlanner() {
    const addPlaceBtn = document.getElementById('add-place-btn');
    if (addPlaceBtn) {
        addPlaceBtn.addEventListener('click', showAddPlaceModal);
    }
}