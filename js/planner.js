// planner.js - Trip planning functionality (Itinerary with Leaflet Maps, Route polyline & Directions)

let leafletMap = null;
window.leafletMap = null; // expose globally for showScreen invalidateSize
let mapMarkers = [];
let routeLine = null;

async function loadTripNotes() {
    if (!currentTripId) return;

    const trip = await getTrip(currentTripId);
    if (!trip) return;
    const itinerary = trip.itinerary || [];
    const canEdit = trip.myRole === 'owner' || trip.myRole === 'editor' || !trip.share_id;
    
    const itineraryList = document.getElementById('itinerary-list');
    if (!itineraryList) return;
    itineraryList.innerHTML = '';

    // 1. Handle Map Initialisation or Reset
    const mapElement = document.getElementById('plan-map');
    if (mapElement) {
        if (!leafletMap) {
            leafletMap = L.map('plan-map', {
                zoomControl: false,
                fadeAnimation: true
            });
            window.leafletMap = leafletMap; // expose for external invalidateSize calls
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(leafletMap);
            
            // Add zoom control at bottom-right
            L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);
        }

        // Clear existing markers & route lines
        mapMarkers.forEach(m => leafletMap.removeLayer(m));
        mapMarkers = [];
        if (routeLine) {
            leafletMap.removeLayer(routeLine);
            routeLine = null;
        }
    }

    if (itinerary.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'flex flex-col items-center justify-center py-20 text-slate-400 space-y-4';
        
        let emptyStateContent = `
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <p class="text-sm font-bold">Your roadmap itinerary is empty.</p>
        `;

        if (canEdit) {
            emptyStateContent += `
            <button onclick="showAddPlaceModal()" class="btn-primary px-6 py-3 text-sm rounded-2xl shadow-md">Add First Stop</button>
            `;
        }

        emptyState.innerHTML = emptyStateContent;
        itineraryList.appendChild(emptyState);
        
        // Default center on Ooty or default coords if map present - delayed to avoid 0x0 hidden container projection bug
        if (leafletMap) {
            setTimeout(() => {
                if (leafletMap) {
                    leafletMap.invalidateSize();
                    leafletMap.setView([11.4102, 76.6950], 11);
                }
                checkOfflineTilesCache();
            }, 200);
        }
        return;
    }

    const bounds = [];
    const routeCoords = [];

    // 2. Loop and render stops and pins
    itinerary.forEach((item, index) => {
        const hasCoords = item.lat && item.lng;
        
        if (leafletMap && hasCoords) {
            const latNum = parseFloat(item.lat);
            const lngNum = parseFloat(item.lng);
            bounds.push([latNum, lngNum]);
            routeCoords.push([latNum, lngNum]);

            // Premium circular pin marker with color transition based on visited status
            const markerColorClass = item.visited ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-600 shadow-indigo-200';
            const numberIcon = L.divIcon({
                className: 'custom-map-pin',
                html: `<div class="flex items-center justify-center w-8 h-8 rounded-full ${markerColorClass} border-2 border-white text-white text-xs font-black shadow-lg hover:scale-110 active:scale-95 transition-all">${index + 1}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([latNum, lngNum], { icon: numberIcon }).addTo(leafletMap);
            
            const popupContent = `
                <div class="p-2 space-y-2 text-slate-800" style="min-width: 170px;">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stop #${index + 1}</p>
                    <h4 class="font-bold text-sm text-slate-800 leading-tight">${item.placeName}</h4>
                    ${item.time ? `<p class="text-xs text-slate-500 font-medium">⏰ ${item.time}</p>` : ''}
                    <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&travelmode=driving" target="_blank" class="w-full text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl transition-all shadow-sm shadow-indigo-100 no-underline flex items-center justify-center gap-1">
                            🧭 Google Maps directions
                        </a>
                        <button onclick="toggleVisit(${index}); leafletMap.closePopup();" class="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black rounded-xl transition-all border border-slate-100">
                            ${item.visited ? '❌ Mark Unvisited' : '✅ Mark Visited'}
                        </button>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
            mapMarkers.push(marker);
        }

        // Timeline item container
        const itemDiv = document.createElement('div');
        itemDiv.className = `itinerary-bubble animate-scale-in ${item.visited ? 'visited' : ''}`;
        
        // Directions deep-link button HTML
        const directionsBtnHTML = hasCoords 
            ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=driving" target="_blank" class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Google Maps Directions">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
               </a>`
            : `<button onclick="showEditPlaceModal(${index})" class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all" title="Pin Location on Map">
                 📍
               </button>`;

        itemDiv.innerHTML = `
            <div class="itinerary-dot"></div>
            <div class="itinerary-plate hover:shadow-md transition-shadow duration-300">
                <div class="flex justify-between items-start">
                    <div class="flex-1 cursor-pointer" onclick="panToStop(${index})">
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider">Stop #${index + 1}</span>
                            ${item.time ? `<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${item.time}</span>` : ''}
                        </div>
                        <h4 class="font-bold text-base mt-1.5 ${item.visited ? 'text-slate-400 line-through opacity-60' : 'text-slate-800'}">${item.placeName}</h4>
                        ${hasCoords ? `<p class="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1">📍 Coords: ${parseFloat(item.lat).toFixed(4)}, ${parseFloat(item.lng).toFixed(4)}</p>` : `<p class="text-[10px] text-amber-500 font-bold mt-1">⚠️ Not pinned on map</p>`}
                        ${item.notes ? `<p class="text-xs text-slate-500 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">${item.notes}</p>` : ''}
                    </div>
                    <div class="flex flex-col space-y-2 ml-4">
                        <div class="flex space-x-1.5">
                            <button onclick="toggleVisit(${index})" class="w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.visited ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100'}" title="${item.visited ? 'Mark Unvisited' : 'Mark Visited'}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            ${directionsBtnHTML}
                        </div>
                        ${canEdit ? `
                        <div class="flex space-x-1.5">
                            <button onclick="showEditPlaceModal(${index})" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100" title="Edit details & location">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button onclick="deletePlace(${index})" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100" title="Remove stop">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        itineraryList.appendChild(itemDiv);
    });

    // 3. Draw dashed route lines
    if (leafletMap && routeCoords.length > 1) {
        routeLine = L.polyline(routeCoords, {
            color: '#4f46e5',
            weight: 3.5,
            opacity: 0.8,
            dashArray: '6, 8',
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(leafletMap);
    }

    // 4. Auto adjust map view to fit all bounds beautifully
    if (leafletMap) {
        // Force refresh leaflet size to handle hidden section transitions and compute bounds perfectly
        setTimeout(() => {
            if (leafletMap) {
                leafletMap.invalidateSize();
                if (bounds.length > 0) {
                    leafletMap.fitBounds(bounds, { padding: [50, 50] });
                } else {
                    leafletMap.setView([11.4102, 76.6950], 11);
                }
            }
            checkOfflineTilesCache();
        }, 200);
    }
}

// Pan & Zoom to specific stop marker
window.panToStop = function(index) {
    if (!leafletMap) return;
    getTrip(currentTripId).then(trip => {
        const item = trip.itinerary && trip.itinerary[index];
        if (item && item.lat && item.lng) {
            leafletMap.setView([parseFloat(item.lat), parseFloat(item.lng)], 14, { animate: true });
            
            // Highlight marker popup
            const marker = mapMarkers[index];
            if (marker) {
                setTimeout(() => {
                    marker.openPopup();
                }, 300);
            }
        }
    });
};

// Check and update dynamic offline caching badge
async function checkOfflineTilesCache() {
    const badge = document.getElementById('map-offline-badge');
    if (!badge) return;
    try {
        const keys = await caches.keys();
        if (keys.includes('tripsplit-map-tiles')) {
            badge.classList.remove('scale-0');
            badge.classList.add('scale-100');
        } else {
            badge.classList.remove('scale-100');
            badge.classList.add('scale-0');
        }
    } catch (e) {
        console.warn('Offline cache API missing or error:', e);
    }
}

window.toggleManualCoords = function() {
    const container = document.getElementById('manual-coords-inputs');
    if (container) {
        container.classList.toggle('hidden');
    }
};

window.syncManualCoords = function() {
    const latManual = document.getElementById('place-lat-manual');
    const lngManual = document.getElementById('place-lng-manual');
    const latHidden = document.getElementById('place-lat');
    const lngHidden = document.getElementById('place-lng');
    const statusDiv = document.getElementById('search-status');
    
    if (latManual && lngManual && latHidden && lngHidden) {
        latHidden.value = latManual.value;
        lngHidden.value = lngManual.value;
        
        if (latManual.value && lngManual.value) {
            statusDiv.innerHTML = `📍 Custom pinned: <span class="text-indigo-600 font-black">${parseFloat(latManual.value).toFixed(4)}, ${parseFloat(lngManual.value).toFixed(4)}</span> ✅`;
        } else {
            statusDiv.textContent = 'Enter custom latitude & longitude to map stop!';
        }
    }
};

// Search location using OpenStreetMap free geocoding database (Nominatim)
async function searchGeocodingLocation() {
    const query = document.getElementById('place-search').value.trim();
    if (!query) return;

    const statusDiv = document.getElementById('search-status');
    const resultsDiv = document.getElementById('search-results-list');
    
    statusDiv.textContent = 'Searching location database... 🌐';
    resultsDiv.innerHTML = '';
    resultsDiv.classList.add('hidden');

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
            headers: {
                'Accept-Language': 'en'
            }
        });
        const results = await response.json();
        
        if (results.length === 0) {
            statusDiv.textContent = 'No matching locations found. ❌';
            return;
        }

        statusDiv.textContent = `Found ${results.length} matches. Tap to select! 👇`;
        resultsDiv.classList.remove('hidden');

        results.forEach(res => {
            const shortName = res.display_name.split(',')[0];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'w-full text-left p-3 hover:bg-indigo-50 text-xs text-slate-700 font-bold transition-all border-b border-slate-50 last:border-none flex flex-col gap-0.5';
            btn.innerHTML = `
                <span class="font-extrabold text-indigo-600 truncate">${shortName}</span>
                <span class="text-[10px] text-slate-400 font-medium truncate">${res.display_name}</span>
            `;
            btn.onclick = () => {
                document.getElementById('place-search').value = shortName;
                document.getElementById('place-name').value = shortName; // Auto-populate place name field
                document.getElementById('place-lat').value = res.lat;
                document.getElementById('place-lng').value = res.lon;
                
                // Update manual inputs if visible
                const latManual = document.getElementById('place-lat-manual');
                const lngManual = document.getElementById('place-lng-manual');
                if (latManual) latManual.value = res.lat;
                if (lngManual) lngManual.value = res.lon;
                
                resultsDiv.classList.add('hidden');
                resultsDiv.innerHTML = '';
                statusDiv.innerHTML = `📍 Pinned to: <span class="text-indigo-600 font-black">${shortName}</span> ✅`;
            };
            resultsDiv.appendChild(btn);
        });
    } catch (err) {
        statusDiv.textContent = 'Error fetching database. Try again. ⚠️';
        console.error(err);
    }
}

// Add stop modal form
window.showAddPlaceModal = async function() {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify the planner.');
    if (!currentTripId) {
        showTripSelectionModal();
        return;
    }

    const content = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-extrabold text-slate-800">Add Next Stop</h3>
            <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        <form id="add-place-form" class="space-y-5">
            <!-- Search & Geolocation Pin -->
            <div class="relative">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">🔍 Search & Pin Location</label>
                <div class="flex gap-2">
                    <input type="text" id="place-search" class="flex-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="E.g. Eiffel Tower, Taj Mahal...">
                    <button type="button" onclick="searchGeocodingLocation()" class="px-5 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs shadow-sm">
                        Find Stop
                    </button>
                </div>
                <div id="search-results-list" class="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 hidden max-h-48 overflow-y-auto no-scrollbar z-50"></div>
                <div id="search-status" class="text-[10px] text-slate-400 font-bold mt-1.5 px-1">Search to automatically map pins and route directions!</div>
                <input type="hidden" id="place-lat" value="">
                <input type="hidden" id="place-lng" value="">
                
                <div class="mt-2.5 flex justify-between items-center px-1">
                    <span class="text-[9px] text-slate-400 font-semibold">Offline or place not found?</span>
                    <button type="button" onclick="toggleManualCoords()" class="text-[9px] text-indigo-600 font-bold hover:underline transition-all">
                        🛠️ Enter Coordinates Manually
                    </button>
                </div>
                <div id="manual-coords-inputs" class="grid grid-cols-2 gap-3 mt-3 hidden animate-scale-in">
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Latitude</label>
                        <input type="number" step="any" id="place-lat-manual" class="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. 11.4102" oninput="syncManualCoords()">
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Longitude</label>
                        <input type="number" step="any" id="place-lng-manual" class="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. 76.6950" oninput="syncManualCoords()">
                    </div>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Display Name</label>
                <input type="text" id="place-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="E.g. Eiffel Tower" required>
            </div>
            
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Time / Day schedule</label>
                <input type="text" id="place-time" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="E.g. 10:00 AM or Day 1">
            </div>
            
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guidelines / Notes</label>
                <textarea id="place-notes" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" rows="2" placeholder="Any reminder details?"></textarea>
            </div>

            <div class="flex space-x-3 pt-4">
                <button type="submit" class="flex-1 btn-primary py-4 rounded-2xl">Add to Roadmap</button>
                <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
            </div>
        </form>
    `;
    showModal(content);

    // Support keyboard search on Enter key inside search box
    document.getElementById('place-search').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchGeocodingLocation();
        }
    });

    document.getElementById('add-place-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const placeName = document.getElementById('place-name').value.trim();
        const time = document.getElementById('place-time').value.trim();
        const notes = document.getElementById('place-notes').value.trim();
        const lat = document.getElementById('place-lat').value;
        const lng = document.getElementById('place-lng').value;

        if (placeName) {
            const trip = await getTrip(currentTripId);
            const itinerary = trip.itinerary || [];
            itinerary.push({
                placeName,
                time,
                notes,
                lat,
                lng,
                visited: false,
                id: Date.now()
            });
            
            await updateTrip(currentTripId, { itinerary });
            hideModal();
            loadTripNotes();
            if (window.showToast) window.showToast('Added roadmap stop! 📍', 'success');
        }
    });
};

// Edit stop modal form
window.showEditPlaceModal = async function(index) {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify the planner.');
    if (!currentTripId) return;
    const trip = await getTrip(currentTripId);
    const item = trip.itinerary && trip.itinerary[index];
    if (!item) return;

    const content = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-extrabold text-slate-800">Edit Stop Details</h3>
            <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        <form id="edit-place-form" class="space-y-5">
            <!-- Search & Geolocation Pin -->
            <div class="relative">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">🔍 Search & Update Pin Location</label>
                <div class="flex gap-2">
                    <input type="text" id="place-search" class="flex-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="E.g. Eiffel Tower..." value="${item.placeName}">
                    <button type="button" onclick="searchGeocodingLocation()" class="px-5 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs shadow-sm">
                        Find Stop
                    </button>
                </div>
                <div id="search-results-list" class="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 hidden max-h-48 overflow-y-auto no-scrollbar z-50"></div>
                <div id="search-status" class="text-[10px] text-slate-400 font-bold mt-1.5 px-1">
                    ${item.lat ? `📍 Pinned to: <span class="text-indigo-600 font-black">${parseFloat(item.lat).toFixed(4)}, ${parseFloat(item.lng).toFixed(4)}</span> ✅` : `⚠️ Currently not pinned to map`}
                </div>
                <input type="hidden" id="place-lat" value="${item.lat || ''}">
                <input type="hidden" id="place-lng" value="${item.lng || ''}">
                
                <div class="mt-2.5 flex justify-between items-center px-1">
                    <span class="text-[9px] text-slate-400 font-semibold">Offline or place not found?</span>
                    <button type="button" onclick="toggleManualCoords()" class="text-[9px] text-indigo-600 font-bold hover:underline transition-all">
                        🛠️ Enter Coordinates Manually
                    </button>
                </div>
                <div id="manual-coords-inputs" class="grid grid-cols-2 gap-3 mt-3 ${item.lat ? '' : 'hidden'} animate-scale-in">
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Latitude</label>
                        <input type="number" step="any" id="place-lat-manual" class="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. 11.4102" value="${item.lat || ''}" oninput="syncManualCoords()">
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Longitude</label>
                        <input type="number" step="any" id="place-lng-manual" class="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. 76.6950" value="${item.lng || ''}" oninput="syncManualCoords()">
                    </div>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                <input type="text" id="place-name" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" value="${item.placeName}" required>
            </div>
            
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Time / Day schedule</label>
                <input type="text" id="place-time" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" value="${item.time || ''}" placeholder="E.g. 10:00 AM">
            </div>
            
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guidelines / Notes</label>
                <textarea id="place-notes" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" rows="2" placeholder="Any details?">${item.notes || ''}</textarea>
            </div>

            <div class="flex space-x-3 pt-4">
                <button type="submit" class="flex-1 btn-primary py-4 rounded-2xl">Save Changes</button>
                <button type="button" onclick="hideModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Cancel</button>
            </div>
        </form>
    `;
    showModal(content);

    document.getElementById('place-search').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchGeocodingLocation();
        }
    });

    document.getElementById('edit-place-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const placeName = document.getElementById('place-name').value.trim();
        const time = document.getElementById('place-time').value.trim();
        const notes = document.getElementById('place-notes').value.trim();
        const lat = document.getElementById('place-lat').value;
        const lng = document.getElementById('place-lng').value;

        if (placeName) {
            const trip = await getTrip(currentTripId);
            const itinerary = trip.itinerary || [];
            if (itinerary[index]) {
                itinerary[index] = {
                    ...itinerary[index],
                    placeName,
                    time,
                    notes,
                    lat,
                    lng
                };
                await updateTrip(currentTripId, { itinerary });
                hideModal();
                loadTripNotes();
                if (window.showToast) window.showToast('Updated stop details! 📝', 'success');
            }
        }
    });
};

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

// Initialize planner
function initPlanner() {
    const addPlaceBtn = document.getElementById('add-place-btn');
    if (addPlaceBtn) {
        addPlaceBtn.addEventListener('click', showAddPlaceModal);
    }
}