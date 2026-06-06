// planner.js - Trip planning functionality (Itinerary with Leaflet Maps, Route polyline & Directions)

let leafletMap = null;
window.leafletMap = null; // expose globally for showScreen invalidateSize
let mapMarkers = [];
let routeLine = null;
let loadTripNotesCallId = 0;

// Haversine formula to compute great-circle distance between two points on sphere
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

async function loadTripNotes() {
    if (!currentTripId) return;

    const callId = ++loadTripNotesCallId;

    const trip = await getTrip(currentTripId);
    if (!trip) return;
    if (callId !== loadTripNotesCallId) return; // Abort if a newer call has started
    const itinerary = trip.itinerary || [];
    const canEdit = trip.myRole === 'owner' || trip.myRole === 'editor' || !trip.share_id;
    let totalTripDistance = 0;

    // Show/hide the Add Stop header button based on role
    const addPlaceHeaderBtn = document.getElementById('add-place-btn');
    if (addPlaceHeaderBtn) {
        addPlaceHeaderBtn.style.display = canEdit ? '' : 'none';
    }
    
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

    // Fetch road distances in parallel for all consecutive stops that have coordinates
    const distancePromises = [];
    for (let i = 0; i < itinerary.length - 1; i++) {
        const item = itinerary[i];
        const nextItem = itinerary[i + 1];
        if (item.lat && item.lng && nextItem.lat && nextItem.lng) {
            distancePromises.push((async () => {
                const lat1 = parseFloat(item.lat);
                const lon1 = parseFloat(item.lng);
                const lat2 = parseFloat(nextItem.lat);
                const lon2 = parseFloat(nextItem.lng);
                
                // Baseline: compute straight-line Haversine distance
                const haversineDist = calculateHaversineDistance(lat1, lon1, lat2, lon2);
                
                try {
                    // Try fetching actual road driving distance from OSRM with a strict 1.5s timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1500);
                    
                    const response = await fetch(
                        `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);
                    
                    const data = await response.json();
                    if (data && data.routes && data.routes[0]) {
                        const roadDist = data.routes[0].distance / 1000; // convert meters to km
                        return { index: i, distance: roadDist, isRoad: true };
                    }
                } catch (e) {
                    console.warn(`OSRM road routing failed for leg ${i}, falling back to Haversine:`, e.message);
                }
                
                return { index: i, distance: haversineDist, isRoad: false };
            })());
        } else {
            distancePromises.push(Promise.resolve({ index: i, distance: null, isRoad: false }));
        }
    }

    const resolvedDistances = await Promise.all(distancePromises);
    if (callId !== loadTripNotesCallId) return; // Abort if a newer call has started
    const distanceMap = {};
    resolvedDistances.forEach(d => {
        if (d) distanceMap[d.index] = { distance: d.distance, isRoad: d.isRoad };
    });

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
                        ${canEdit ? `
                        <button onclick="toggleVisit(${index}); leafletMap.closePopup();" class="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black rounded-xl transition-all border border-slate-100">
                            ${item.visited ? '❌ Mark Unvisited' : '✅ Mark Visited'}
                        </button>
                        ` : ''}
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
                            <button ${canEdit ? `onclick="toggleVisit(${index})"` : ''} class="w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.visited ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'} ${canEdit ? 'hover:bg-emerald-50 hover:text-emerald-600' : 'cursor-default'}" title="${item.visited ? (canEdit ? 'Mark Unvisited' : 'Visited') : (canEdit ? 'Mark Visited' : 'Not Visited')}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            ${directionsBtnHTML}
                        </div>
                        ${canEdit ? `
                        <div class="flex space-x-1.5">
                            <button onclick="showEditPlaceModal(${index})" class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all border border-indigo-100/30 shadow-sm" title="Edit stop details & location">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button onclick="deletePlace(${index})" class="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100" title="Remove stop">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                        <div class="flex space-x-1.5">
                            <button onclick="moveStop(${index}, -1)" class="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100 ${index === 0 ? 'opacity-30 pointer-events-none' : ''}" title="Move stop up">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"></path></svg>
                            </button>
                            <button onclick="moveStop(${index}, 1)" class="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100 ${index === itinerary.length - 1 ? 'opacity-30 pointer-events-none' : ''}" title="Move stop down">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        itineraryList.appendChild(itemDiv);

        // Compute and render location-to-location distance to next stop
        if (index < itinerary.length - 1) {
            const nextItem = itinerary[index + 1];
            const distInfo = distanceMap[index];
            if (distInfo && distInfo.distance !== null) {
                const dist = distInfo.distance;
                totalTripDistance += dist;

                const distDiv = document.createElement('div');
                distDiv.className = 'my-2 pl-[52px] flex items-center gap-2 animate-scale-in relative';
                distDiv.innerHTML = `
                    <div class="absolute left-6 top-[-10px] bottom-[-10px] w-0.5 border-l border-dashed border-slate-300"></div>
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-black text-[10px] tracking-wide shadow-sm">
                        <span>🚗</span>
                        <span>Next Stop: <span class="font-extrabold text-indigo-600">${dist.toFixed(1)} km</span> <span class="text-[8px] text-slate-400 font-semibold">(${distInfo.isRoad ? 'road route' : 'straight line'})</span></span>
                        <a href="https://www.google.com/maps/dir/?api=1&origin=${item.lat},${item.lng}&destination=${nextItem.lat},${nextItem.lng}&travelmode=driving" target="_blank" class="text-indigo-500 hover:text-indigo-700 underline no-underline ml-1">
                            Directions ↗
                        </a>
                    </div>
                `;
                itineraryList.appendChild(distDiv);
            } else {
                // Render standard connector line for non-geocoded consecutive stops
                const distDiv = document.createElement('div');
                distDiv.className = 'h-6 pl-[52px] relative';
                distDiv.innerHTML = `
                    <div class="absolute left-6 top-[-10px] bottom-[-10px] w-0.5 border-l border-dashed border-slate-200"></div>
                `;
                itineraryList.appendChild(distDiv);
            }
        }
    });

    // Update dynamically calculated total distance in header subtitle
    const subtitle = document.getElementById('planner-subtitle');
    if (subtitle) {
        if (totalTripDistance > 0) {
            subtitle.innerHTML = `Offline-Ready Pinned Map • 🗺️ Total: <span class="text-indigo-600 font-extrabold">${totalTripDistance.toFixed(1)} km</span>`;
        } else {
            subtitle.textContent = 'Offline-Ready Pinned Map';
        }
    }

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

// Parse copy-pasted coordinates or mapping links (Google Maps, Apple Maps, OpenStreetMap, Geo URI)
function parseCoordinatesFromLinkOrText(text) {
    if (!text) return null;
    
    // Normalize curly quotes, double single quotes, and trim
    let cleanText = text.replace(/[\u201D\u201C\u201F\u201E”‟]/g, '"').replace(/''/g, '"').trim();

    // 1.1 DMS format (e.g. 11°24'36.7"N 76°41'42.0"E or 11° 24' 36.7" N, 76° 41' 42.0" E)
    const dmsRegex = /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([NSns])\s*[,\s]*\s*(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([EWew])/;
    const dmsMatch = cleanText.match(dmsRegex);
    if (dmsMatch) {
        const latDeg = parseFloat(dmsMatch[1]);
        const latMin = parseFloat(dmsMatch[2]);
        const latSec = parseFloat(dmsMatch[3]);
        const latDir = dmsMatch[4].toUpperCase();

        const lngDeg = parseFloat(dmsMatch[5]);
        const lngMin = parseFloat(dmsMatch[6]);
        const lngSec = parseFloat(dmsMatch[7]);
        const lngDir = dmsMatch[8].toUpperCase();

        let lat = latDeg + (latMin / 60) + (latSec / 3600);
        if (latDir === 'S') lat = -lat;

        let lng = lngDeg + (lngMin / 60) + (lngSec / 3600);
        if (lngDir === 'W') lng = -lng;

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }

    // 1.2 Decimal coordinates with direction suffix (e.g. 11.4102° N, 76.6950° E or 11.4102 N 76.6950 E)
    const dirCoordsRegex = /^(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])\s*[,\s]+\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])$/;
    const dirCoordsMatch = cleanText.match(dirCoordsRegex);
    if (dirCoordsMatch) {
        let lat = parseFloat(dirCoordsMatch[1]);
        const latDir = dirCoordsMatch[2].toUpperCase();
        let lng = parseFloat(dirCoordsMatch[3]);
        const lngDir = dirCoordsMatch[4].toUpperCase();

        if (latDir === 'S' && lat > 0) lat = -lat;
        if (lngDir === 'W' && lng > 0) lng = -lng;

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }

    // 1. Raw coordinates (e.g. "15.2993, 74.1240" or "15.2993 74.1240" or "15.2993,74.1240")
    const rawCoordsRegex = /^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/;
    const rawMatch = cleanText.match(rawCoordsRegex);
    if (rawMatch) {
        const lat = parseFloat(rawMatch[1]);
        const lng = parseFloat(rawMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }

    // 2. Geo URI: "geo:15.2993,74.1240"
    if (cleanText.startsWith('geo:')) {
        const geoMatch = cleanText.match(/geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
        if (geoMatch) {
            return { lat: parseFloat(geoMatch[1]), lng: parseFloat(geoMatch[2]) };
        }
    }

    // 3. Google Maps share links containing "@lat,lng" (e.g. @15.2993,74.1240)
    const googleAtRegex = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
    const atMatch = cleanText.match(googleAtRegex);
    if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // 4. URL parameters (query=lat,lng or q=lat,lng or ll=lat,lng)
    const queryRegex = /[?&](?:query|q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
    const queryMatch = text.match(queryRegex);
    if (queryMatch) {
        return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };
    }

    // 5. OpenStreetMap: "#map=19/15.2993/74.1240"
    const osmRegex = /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/;
    const osmMatch = text.match(osmRegex);
    if (osmMatch) {
        return { lat: parseFloat(osmMatch[1]), lng: parseFloat(osmMatch[2]) };
    }

    // 6. Generic place paths: "/place/15.2993,74.1240"
    const pathCoordsRegex = /\/place\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
    const pathMatch = text.match(pathCoordsRegex);
    if (pathMatch) {
        return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };
    }

    // 7. Loose coordinate search in text (must contain decimal points to avoid matching zip codes / IDs)
    const looseCoordsRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    const looseMatch = text.match(looseCoordsRegex);
    if (looseMatch) {
        const lat = parseFloat(looseMatch[1]);
        const lng = parseFloat(looseMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }

    return null;
}

// Helper to resolve coordinates from search input, manual inputs, or silent geocoding fallback on submit
async function resolveStopCoordinates(searchVal, nameVal, latManualVal, lngManualVal) {
    // 1. Check manual inputs first
    if (latManualVal && lngManualVal) {
        const lat = parseFloat(latManualVal);
        const lng = parseFloat(lngManualVal);
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat: lat.toString(), lng: lng.toString() };
        }
    }

    // 2. Parse search value for direct coordinates/links
    if (searchVal) {
        const parsed = parseCoordinatesFromLinkOrText(searchVal);
        if (parsed) {
            return { lat: parsed.lat.toString(), lng: parsed.lng.toString() };
        }
    }

    // 3. Parse name value for direct coordinates/links
    if (nameVal) {
        const parsed = parseCoordinatesFromLinkOrText(nameVal);
        if (parsed) {
            return { lat: parsed.lat.toString(), lng: parsed.lng.toString() };
        }
    }

    // 4. Silent geocoding fallback for search value text
    if (searchVal) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchVal)}&limit=1`, {
                headers: {
                    'Accept-Language': 'en'
                }
            });
            const results = await response.json();
            if (results && results.length > 0) {
                return { lat: results[0].lat, lng: results[0].lon };
            }
        } catch (err) {
            console.warn('Silent geocoding for searchVal failed:', err);
        }
    }

    // 5. Silent geocoding fallback for name value text
    if (nameVal) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nameVal)}&limit=1`, {
                headers: {
                    'Accept-Language': 'en'
                }
            });
            const results = await response.json();
            if (results && results.length > 0) {
                return { lat: results[0].lat, lng: results[0].lon };
            }
        } catch (err) {
            console.warn('Silent geocoding for nameVal failed:', err);
        }
    }

    return { lat: '', lng: '' };
}

// Search location using OpenStreetMap free geocoding database (Nominatim)
async function searchGeocodingLocation() {
    const query = document.getElementById('place-search').value.trim();
    if (!query) return;

    const statusDiv = document.getElementById('search-status');
    const resultsDiv = document.getElementById('search-results-list');
    
    statusDiv.textContent = 'Searching location database... 🌐';
    resultsDiv.innerHTML = '';
    resultsDiv.classList.add('hidden');
    
    // Friendly helper for shortened/share Google Maps URLs
    if (query.includes('maps.app.goo.gl') || query.includes('goo.gl/maps') || query.includes('share.google')) {
        statusDiv.textContent = 'Resolving Google Maps share link... 🌐⏳';

        // --- share.google handler ---
        if (query.includes('share.google')) {
            statusDiv.innerHTML = `
                <div class="p-3 bg-rose-50 rounded-xl border border-rose-100 mb-2">
                    <p class="text-sm font-bold text-rose-600 flex items-center gap-2">
                        <span>⚠️</span> Google blocked automatic link reading
                    </p>
                    <p class="text-xs text-rose-500 mt-1 leading-relaxed">
                        Google no longer allows third-party apps to read Maps share links automatically. 
                        Please type the <strong>Name of the Place</strong> (e.g., "Green Bliss Villa") directly into the search bar.
                    </p>
                </div>
            `;
            if (window.showToast) window.showToast('Google blocked automatic link resolution', 'error');
            return;
        }

        // --- maps.app.goo.gl / goo.gl/maps handler ---
        if (query.includes('maps.app.goo.gl') || query.includes('goo.gl/maps')) {
            statusDiv.innerHTML = `
                <div class="p-3 bg-rose-50 rounded-xl border border-rose-100 mb-2">
                    <p class="text-sm font-bold text-rose-600 flex items-center gap-2">
                        <span>⚠️</span> Google blocked automatic link reading
                    </p>
                    <p class="text-xs text-rose-500 mt-1 leading-relaxed">
                        Google no longer allows third-party apps to read Maps share links automatically. 
                        Please type the <strong>Name of the Place</strong> (e.g., "Green Bliss Villa") directly into the search bar.
                    </p>
                </div>
            `;
            if (window.showToast) window.showToast('Google blocked automatic link resolution', 'error');
            return;
        }
    }

    // Direct Coordinates & Map Links Auto-Parsing and Reverse Geocoding
    const parsedCoords = parseCoordinatesFromLinkOrText(query);
    if (parsedCoords) {
        statusDiv.innerHTML = `📍 Parsed coordinates: <span class="text-indigo-600 font-black">${parsedCoords.lat.toFixed(4)}, ${parsedCoords.lng.toFixed(4)}</span>. Reverse geocoding name... 🌐`;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedCoords.lat}&lon=${parsedCoords.lng}&zoom=18`, {
                headers: {
                    'Accept-Language': 'en'
                }
            });
            const res = await response.json();
            
            if (res && res.display_name) {
                const shortName = res.display_name.split(',')[0] || 'Pinned Location';
                document.getElementById('place-search').value = shortName;
                document.getElementById('place-name').value = shortName; // Auto-populate place name field
                document.getElementById('place-lat').value = parsedCoords.lat;
                document.getElementById('place-lng').value = parsedCoords.lng;
                
                // Update manual inputs if visible
                const latManual = document.getElementById('place-lat-manual');
                const lngManual = document.getElementById('place-lng-manual');
                if (latManual) latManual.value = parsedCoords.lat;
                if (lngManual) lngManual.value = parsedCoords.lng;
                
                statusDiv.innerHTML = `📍 Pinned to: <span class="text-indigo-600 font-black">${shortName}</span> (${parsedCoords.lat.toFixed(4)}, ${parsedCoords.lng.toFixed(4)}) ✅`;
                if (window.showToast) window.showToast(`Location detected: ${shortName}!`, 'success');
            } else {
                const fallbackName = `Custom Pin (${parsedCoords.lat.toFixed(4)}, ${parsedCoords.lng.toFixed(4)})`;
                document.getElementById('place-search').value = fallbackName;
                document.getElementById('place-name').value = fallbackName;
                document.getElementById('place-lat').value = parsedCoords.lat;
                document.getElementById('place-lng').value = parsedCoords.lng;
                statusDiv.innerHTML = `📍 Pinned to custom coordinates ✅`;
            }
        } catch (err) {
            const fallbackName = `Custom Pin (${parsedCoords.lat.toFixed(4)}, ${parsedCoords.lng.toFixed(4)})`;
            document.getElementById('place-search').value = fallbackName;
            document.getElementById('place-name').value = fallbackName;
            document.getElementById('place-lat').value = parsedCoords.lat;
            document.getElementById('place-lng').value = parsedCoords.lng;
            statusDiv.innerHTML = `📍 Pinned to custom coordinates (offline fallback) ✅`;
            console.error(err);
        }
        return;
    }

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
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-extrabold text-slate-800">📍 Add Stop</h3>
            <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        <form id="add-place-form" class="space-y-3">

            <!-- Unified Search Bar -->
            <div>
                <div class="relative flex gap-2">
                    <div class="relative flex-1">
                        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        </span>
                        <input type="text" id="place-search"
                            class="w-full pl-10 pr-10 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-400 focus:bg-white focus:ring-0 outline-none transition-all text-sm font-semibold"
                            placeholder="Search any place, restaurant, hotel..."
                            autocomplete="off">
                        <div id="place-search-spinner" class="absolute right-3.5 top-1/2 -translate-y-1/2 hidden">
                            <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    </div>
                    <button type="button" id="btn-switch-gmaps" title="Search on Google Maps"
                        class="px-3.5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl hover:border-orange-300 hover:bg-orange-50 transition-all flex-shrink-0" >
                        <img src="https://www.google.com/favicon.ico" class="w-4 h-4" alt="G">
                    </button>
                </div>
                <!-- Autocomplete dropdown -->
                <div id="place-autocomplete-list" class="relative">
                    <div id="place-autocomplete-inner" class="absolute left-0 right-0 top-0 bg-white rounded-2xl shadow-2xl border border-slate-100 hidden max-h-52 overflow-y-auto z-50 mt-1"></div>
                </div>
                <div id="search-status" class="text-[10px] text-slate-400 font-semibold mt-1 px-1 min-h-[16px]">
                    Type to search any place • Tap 🌐 to search on Google Maps
                </div>
                <input type="hidden" id="place-lat" value="">
                <input type="hidden" id="place-lng" value="">
            </div>

            <!-- Map Area: switches between OSM picker and Google Maps embed -->
            <div id="map-section">
                <div class="flex items-center justify-between mb-1.5">
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider" id="map-label">🗺️ Tap map to pin</label>
                    <div class="flex gap-1">
                        <button type="button" id="btn-osm-view" onclick="switchToOSMView()"
                            class="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-100 text-indigo-700 transition-all">OSM</button>
                        <button type="button" id="btn-gmaps-view" onclick="switchToGoogleView(document.getElementById('place-search').value)"
                            class="px-2 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-orange-700 transition-all">Google Maps</button>
                    </div>
                </div>
                <div id="picker-map-container" style="height:230px;border-radius:16px;overflow:hidden;background:#e5e7eb;position:relative;">
                    <div id="picker-map" style="height:100%;width:100%;"></div>
                    <div id="picker-map-hint" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:white;font-size:10px;font-weight:700;padding:5px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;">
                        Tap anywhere to pin location
                    </div>
                </div>
                <!-- Coordinate paste box (shows when in Google Maps view) -->
                <div id="coord-paste-box" class="hidden mt-2">
                    <div class="flex gap-2 items-center">
                        <input type="text" id="coord-paste-input"
                            class="flex-1 px-3 py-2.5 bg-amber-50 border-2 border-amber-200 rounded-xl text-xs font-semibold focus:border-amber-400 focus:ring-0 outline-none transition-all"
                            placeholder="Paste coordinates or Google Maps URL here...">
                        <button type="button" id="coord-paste-btn"
                            class="px-3 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all flex-shrink-0">Pin It</button>
                    </div>
                    <p class="text-[9px] text-amber-600 font-semibold mt-1 px-1">
                        📋 On Google Maps: tap a place → tap "Share" → copy link, or long-press → copy coordinates
                    </p>
                </div>
            </div>

            <!-- Place name, Time, Notes -->
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Display Name <span class="text-rose-400">*</span></label>
                <input type="text" id="place-name" class="w-full p-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="E.g. Valarmathi Mess" required>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time / Day</label>
                    <input type="text" id="place-time" class="w-full p-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="10:00 AM">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                    <input type="text" id="place-notes-short" class="w-full p-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="Any notes...">
                </div>
            </div>
            <input type="hidden" id="place-notes" value="">

            <div class="flex space-x-3 pt-1">
                <button type="submit" class="flex-1 btn-primary py-4 rounded-2xl text-sm">Add to Roadmap ➜</button>
                <button type="button" onclick="hideModal()" class="px-6 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm">✕</button>
            </div>
        </form>
    `;
    showModal(content);

    // Sync notes short → hidden
    document.getElementById('place-notes-short')?.addEventListener('input', function() {
        const h = document.getElementById('place-notes');
        if (h) h.value = this.value;
    });


    // --- Initialize the mini picker map ---
    let pickerMap = null;
    let pickerMarker = null;

    function setPinOnPickerMap(lat, lng, name) {
        if (!pickerMap) return;
        if (pickerMarker) pickerMap.removeLayer(pickerMarker);
        const icon = L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;background:#4f46e5;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(79,70,229,0.5);display:flex;align-items:center;justify-content:center;">
                     <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                   </div>`,
            iconSize: [28, 28], iconAnchor: [14, 14]
        });
        pickerMarker = L.marker([lat, lng], { icon }).addTo(pickerMap);
        if (name) pickerMarker.bindPopup(`<b class="text-xs">${name}</b>`).openPopup();
        document.getElementById('place-lat').value = lat;
        document.getElementById('place-lng').value = lng;
        const hint = document.getElementById('picker-map-hint');
        if (hint) hint.style.display = 'none';
    }

    // Switch to Google Maps embed view
    window.switchToGoogleView = function(query) {
        const q = (query || '').trim() || 'India';
        const gmapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed&hl=en`;
        const container = document.getElementById('picker-map-container');
        if (container) {
            container.innerHTML = `
                <iframe src="${gmapsUrl}" style="width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe>
                <button onclick="window.switchToOSMView()" style="position:absolute;top:8px;left:8px;background:rgba(79,70,229,0.92);color:white;border:none;border-radius:10px;padding:5px 11px;font-size:10px;font-weight:700;cursor:pointer;z-index:999;box-shadow:0 2px 8px rgba(0,0,0,0.3);">← OSM Map</button>
                <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:white;font-size:9px;font-weight:700;padding:4px 8px;border-radius:8px;">Google Maps</div>`;
        }
        document.getElementById('coord-paste-box')?.classList.remove('hidden');
        const lbl = document.getElementById('map-label');
        if (lbl) lbl.textContent = '🔍 Find on Google Maps';
        const osmBtn = document.getElementById('btn-osm-view');
        const gBtn = document.getElementById('btn-gmaps-view');
        if (osmBtn) { osmBtn.className = 'px-2 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-500 transition-all'; }
        if (gBtn) { gBtn.className = 'px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-100 text-orange-700 transition-all'; }
        pickerMap = null; pickerMarker = null;
        const statusDiv = document.getElementById('search-status');
        if (statusDiv) statusDiv.innerHTML = `🗺️ Find the place on Google Maps above → paste the URL or coordinates in the box below`;
    };

    // Switch back to OSM map
    window.switchToOSMView = function() {
        const container = document.getElementById('picker-map-container');
        if (container) {
            container.innerHTML = `
                <div id="picker-map" style="height:100%;width:100%;"></div>
                <div id="picker-map-hint" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:white;font-size:10px;font-weight:700;padding:5px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;">Tap anywhere to pin location</div>`;
        }
        document.getElementById('coord-paste-box')?.classList.add('hidden');
        const lbl = document.getElementById('map-label');
        if (lbl) lbl.textContent = '🗺️ Tap map to pin';
        const osmBtn = document.getElementById('btn-osm-view');
        const gBtn = document.getElementById('btn-gmaps-view');
        if (osmBtn) { osmBtn.className = 'px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-100 text-indigo-700 transition-all'; }
        if (gBtn) { gBtn.className = 'px-2 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-orange-700 transition-all'; }
        pickerMap = null; pickerMarker = null;
        setTimeout(() => initPickerMap(), 100);
    };

    // Wire the Google Maps button
    document.getElementById('btn-switch-gmaps')?.addEventListener('click', () => {
        const q = document.getElementById('place-search').value.trim();
        window.switchToGoogleView(q);
    });

    // Wire the coord paste button
    document.getElementById('coord-paste-btn')?.addEventListener('click', async () => {
        const raw = document.getElementById('coord-paste-input').value.trim();
        if (!raw) return;
        const parsed = parseCoordinatesFromLinkOrText(raw);
        const statusDiv = document.getElementById('search-status');
        if (parsed) {
            const { lat, lng } = parsed;
            window.switchToOSMView();
            setTimeout(async () => {
                if (statusDiv) statusDiv.textContent = 'Reverse geocoding... 🌐';
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`, { headers: { 'Accept-Language': 'en' } });
                    const data = await res.json();
                    const name = data.display_name ? data.display_name.split(',').slice(0,2).join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    document.getElementById('place-search').value = name;
                    document.getElementById('place-name').value = name.split(',')[0];
                    document.getElementById('place-lat').value = lat;
                    document.getElementById('place-lng').value = lng;
                    if (statusDiv) statusDiv.innerHTML = `📍 Pinned: <b>${name.split(',')[0]}</b> ✅`;
                    setPinOnPickerMap(lat, lng, name.split(',')[0]);
                } catch(e) {
                    document.getElementById('place-lat').value = lat;
                    document.getElementById('place-lng').value = lng;
                    if (statusDiv) statusDiv.innerHTML = `📍 Pinned at ${lat.toFixed(4)}, ${lng.toFixed(4)} ✅`;
                    setPinOnPickerMap(lat, lng, null);
                }
            }, 350);
        } else {
            if (statusDiv) statusDiv.innerHTML = `⚠️ Could not parse coordinates. Try format: <b>12.9716, 77.5946</b>`;
        }
    });

    // Allow pressing Enter on the paste input
    document.getElementById('coord-paste-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('coord-paste-btn')?.click(); }
    });

    function initPickerMap() {
        const el = document.getElementById('picker-map');
        if (!el || pickerMap) return;

        let defaultCenter = [20.5937, 78.9629];
        pickerMap = L.map('picker-map', { zoomControl: false, attributionControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(pickerMap);
        L.control.zoom({ position: 'bottomright' }).addTo(pickerMap);
        pickerMap.setView(defaultCenter, 5);

        if (typeof currentTripId !== 'undefined') {
            getTrip(currentTripId).then(trip => {
                if (trip && trip.itinerary && trip.itinerary.length > 0) {
                    const last = trip.itinerary[trip.itinerary.length - 1];
                    if (last.lat && last.lng && pickerMap) {
                        pickerMap.setView([parseFloat(last.lat), parseFloat(last.lng)], 13);
                    }
                }
            });
        }

        pickerMap.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            const statusDiv = document.getElementById('search-status');
            if (statusDiv) statusDiv.textContent = 'Reverse geocoding... 🌐';
            setPinOnPickerMap(lat, lng, null);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`, { headers: { 'Accept-Language': 'en' } });
                const data = await res.json();
                const name = data.display_name ? data.display_name.split(',').slice(0, 2).join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                document.getElementById('place-search').value = name;
                document.getElementById('place-name').value = name.split(',')[0];
                if (statusDiv) statusDiv.innerHTML = `📍 Pinned: <b>${name.split(',')[0]}</b> (${lat.toFixed(4)}, ${lng.toFixed(4)}) ✅`;
                setPinOnPickerMap(lat, lng, name.split(',')[0]);
            } catch(err) {
                const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                document.getElementById('place-search').value = name;
                if (statusDiv) statusDiv.textContent = `📍 Pinned at ${name}`;
            }
        });
    }

    setTimeout(() => initPickerMap(), 100);

    // --- Live Autocomplete Search ---
    let searchDebounce = null;
    const searchInput = document.getElementById('place-search');
    const autocompleteList = document.getElementById('place-autocomplete-inner');
    const spinner = document.getElementById('place-search-spinner');

    function hideAutocomplete() {
        if (autocompleteList) {
            autocompleteList.classList.add('hidden');
            autocompleteList.innerHTML = '';
        }
    }

    async function doAutocomplete(query) {
        if (query.length < 2) { hideAutocomplete(); return; }

        // Check if it's coordinates
        const parsed = parseCoordinatesFromLinkOrText(query);
        if (parsed) {
            const { lat, lng } = parsed;
            const statusDiv = document.getElementById('search-status');
            if (statusDiv) statusDiv.textContent = 'Resolving coordinates... 🌐';
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`, { headers: { 'Accept-Language': 'en' } });
                const data = await res.json();
                const name = data.display_name ? data.display_name.split(',').slice(0,2).join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                document.getElementById('place-name').value = name.split(',')[0];
                document.getElementById('place-lat').value = lat;
                document.getElementById('place-lng').value = lng;
                if (statusDiv) statusDiv.innerHTML = `📍 Pinned: <b>${name.split(',')[0]}</b> ✅`;
                if (pickerMap) { pickerMap.setView([lat, lng], 15); setPinOnPickerMap(lat, lng, name.split(',')[0]); }
            } catch(e) {
                document.getElementById('place-lat').value = lat;
                document.getElementById('place-lng').value = lng;
            }
            hideAutocomplete();
            return;
        }

        // Detect Google Maps / share links
        if (query.includes('share.google') || query.includes('maps.app.goo.gl') || query.includes('goo.gl/maps')) {
            const statusDiv = document.getElementById('search-status');
            if (statusDiv) statusDiv.innerHTML = `⚠️ <b>Google share links are blocked by Google.</b> Please type the place name instead (e.g. "Green Bliss Villa").`;
            hideAutocomplete();
            return;
        }

        spinner.classList.remove('hidden');
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
            const results = await res.json();
            spinner.classList.add('hidden');

    // Helper to handle selecting a search result
    function selectResult(lat, lng, displayName) {
        const firstName = displayName.split(',')[0].trim();
        searchInput.value = displayName.split(',').slice(0, 2).join(', ');
        document.getElementById('place-name').value = firstName;
        document.getElementById('place-lat').value = lat;
        document.getElementById('place-lng').value = lng;
        const statusDiv = document.getElementById('search-status');
        if (statusDiv) statusDiv.innerHTML = `📍 Pinned: <b>${firstName}</b> (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}) ✅`;
        if (pickerMap) {
            pickerMap.setView([lat, lng], 16);
            setPinOnPickerMap(lat, lng, firstName);
        }
        hideAutocomplete();
    }

    function renderResults(results, source) {
        if (!results || results.length === 0) return false;
        const typeEmoji = { city:'🏙️', town:'🏘️', village:'🌾', hotel:'🏨', restaurant:'🍽️', 
                            tourism:'🏛️', natural:'🌿', amenity:'📌', suburb:'🏘️', county:'🗺️' };
        autocompleteList.innerHTML = results.map((r, i) => {
            const emoji = typeEmoji[r.type] || typeEmoji[r.class] || '📍';
            const name1 = r.display_name.split(',').slice(0, 2).join(', ');
            const country = r.display_name.split(',').pop().trim();
            const badge = source === 'photon' ? '' : '';
            return `<div class="autocomplete-item px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors" data-idx="${i}" data-lat="${r.lat}" data-lng="${r.lon || r.lng}" data-name="${r.display_name.replace(/"/g,'&quot;')}">
                <div class="flex items-center gap-2.5">
                    <span class="text-base flex-shrink-0">${emoji}</span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-bold text-slate-800 truncate">${name1}</p>
                        <p class="text-[10px] text-slate-400 truncate">${country}</p>
                    </div>
                </div>
            </div>`;
        }).join('');
        autocompleteList.classList.remove('hidden');
        autocompleteList.querySelectorAll('.autocomplete-item').forEach(el => {
            el.addEventListener('mousedown', ev => {
                ev.preventDefault();
                selectResult(parseFloat(el.dataset.lat), parseFloat(el.dataset.lng), el.dataset.name);
            });
        });
        return true;
    }

    function showNotFoundState(query) {
        // Auto-switch to Google Maps to find the place
        hideAutocomplete();
        window.switchToGoogleView(query);
        // Show a quick hint in autocomplete about adding city name
        if (autocompleteList) {
            autocompleteList.innerHTML = `
                <div class="px-4 pt-3 pb-3">
                    <p class="text-xs font-bold text-orange-600 mb-2">🗺️ Showing on Google Maps</p>
                    <p class="text-[10px] text-slate-500 mb-2 leading-relaxed">"${query}" not in OpenStreetMap. Use Google Maps above to find it, then paste the URL/coordinates in the box below the map.</p>
                    <button id="hint-add-city" class="w-full text-left px-3 py-2.5 bg-indigo-50 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">
                        💡 Try: <span class="font-black">${query}, [City Name]</span>
                    </button>
                </div>`;
            autocompleteList.classList.remove('hidden');
            document.getElementById('hint-add-city')?.addEventListener('mousedown', ev => {
                ev.preventDefault();
                searchInput.value = query + ', ';
                searchInput.focus();
                hideAutocomplete();
            });
        }
    }


    async function doAutocomplete(query) {
        if (query.length < 2) { hideAutocomplete(); return; }

        // Check if it's raw coordinates or a Google Maps URL with @lat,lng
        const parsed = parseCoordinatesFromLinkOrText(query);
        if (parsed) {
            const { lat, lng } = parsed;
            const statusDiv = document.getElementById('search-status');
            if (statusDiv) statusDiv.textContent = 'Resolving coordinates... 🌐';
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`, { headers: { 'Accept-Language': 'en' } });
                const data = await res.json();
                const name = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                document.getElementById('place-name').value = name.split(',')[0];
                document.getElementById('place-lat').value = lat;
                document.getElementById('place-lng').value = lng;
                if (statusDiv) statusDiv.innerHTML = `📍 Pinned: <b>${name.split(',')[0]}</b> ✅`;
                if (pickerMap) { pickerMap.setView([lat, lng], 15); setPinOnPickerMap(lat, lng, name.split(',')[0]); }
            } catch(e) {
                document.getElementById('place-lat').value = lat;
                document.getElementById('place-lng').value = lng;
            }
            hideAutocomplete();
            return;
        }

        // Detect Google Maps share links — inform user
        if (query.includes('share.google') || query.includes('maps.app.goo.gl') || query.includes('goo.gl/maps')) {
            const statusDiv = document.getElementById('search-status');
            if (statusDiv) statusDiv.innerHTML = `⚠️ <b>Google share links are blocked by Google.</b> Type the place name instead.`;
            hideAutocomplete();
            return;
        }

        spinner.classList.remove('hidden');
        const statusDiv = document.getElementById('search-status');
        if (statusDiv) statusDiv.textContent = 'Searching...';

        let found = false;

        try {
            // SOURCE 1: Nominatim (OpenStreetMap)
            const r1 = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1&accept-language=en`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const d1 = await r1.json();
            if (d1 && d1.length > 0) {
                found = renderResults(d1, 'nominatim');
            }
        } catch(e) { /* try next source */ }

        if (!found) {
            try {
                // SOURCE 2: Photon by Komoot — uses OSM data with better local POI coverage
                const r2 = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`);
                const d2 = await r2.json();
                if (d2.features && d2.features.length > 0) {
                    // Convert Photon format to Nominatim-like format
                    const converted = d2.features.map(f => {
                        const p = f.properties;
                        const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
                        return {
                            display_name: parts.join(', '),
                            lat: f.geometry.coordinates[1],
                            lon: f.geometry.coordinates[0],
                            lng: f.geometry.coordinates[0],
                            type: p.osm_value || 'place',
                            class: p.osm_key || 'place'
                        };
                    });
                    found = renderResults(converted, 'photon');
                }
            } catch(e) { /* try next source */ }
        }

        spinner.classList.add('hidden');

        if (!found) {
            if (statusDiv) statusDiv.innerHTML = `⚠️ Not found in map database`;
            showNotFoundState(query);
        } else {
            if (statusDiv) statusDiv.textContent = 'Select a result below, or click on the map';
        }
    }


    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        const q = searchInput.value.trim();
        document.getElementById('place-lat').value = '';
        document.getElementById('place-lng').value = '';
        if (!q) { hideAutocomplete(); return; }
        searchDebounce = setTimeout(() => doAutocomplete(q), 400);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideAutocomplete();
        if (e.key === 'Enter') { e.preventDefault(); doAutocomplete(searchInput.value.trim()); }
    });

    document.addEventListener('click', (e) => {
        if (!autocompleteList.contains(e.target) && e.target !== searchInput) hideAutocomplete();
    }, { once: false });


    document.getElementById('add-place-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const placeName = document.getElementById('place-name').value.trim();
        const time = document.getElementById('place-time').value.trim();
        const notes = document.getElementById('place-notes').value.trim();
        
        let lat = document.getElementById('place-lat').value;
        let lng = document.getElementById('place-lng').value;

        // Fallback: if coordinate fields are empty, resolve them from search, manual inputs, or silent geocoding
        if (!lat || !lng) {
            const searchVal = document.getElementById('place-search').value.trim();
            const latManual = document.getElementById('place-lat-manual') ? document.getElementById('place-lat-manual').value.trim() : '';
            const lngManual = document.getElementById('place-lng-manual') ? document.getElementById('place-lng-manual').value.trim() : '';
            
            const resolved = await resolveStopCoordinates(searchVal, placeName, latManual, lngManual);
            lat = resolved.lat;
            lng = resolved.lng;
        }

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
            if (window.showToast) window.showToast('Stop added to roadmap! 📍', 'success');
            // Auto-sync to cloud for editors and owners
            if (typeof syncTripToCloud === 'function') {
                syncTripToCloud(currentTripId, 'Added plan stop').catch(e => console.log('Auto-sync (plan add):', e.message));
            }
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
                    <input type="text" id="place-search" class="flex-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="Search place OR paste Google Maps link / coordinates..." value="${item.placeName}">
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

    // Clear coordinates when the user starts typing a new query in the search box
    document.getElementById('place-search').addEventListener('input', () => {
        document.getElementById('place-lat').value = '';
        document.getElementById('place-lng').value = '';
        const statusDiv = document.getElementById('search-status');
        if (statusDiv) {
            statusDiv.innerHTML = `⚠️ Search query changed. Tap <b>Find Stop</b> or submit to update location pin!`;
        }
    });

    document.getElementById('edit-place-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const placeName = document.getElementById('place-name').value.trim();
        const time = document.getElementById('place-time').value.trim();
        const notes = document.getElementById('place-notes').value.trim();
        
        let lat = document.getElementById('place-lat').value;
        let lng = document.getElementById('place-lng').value;

        // Fallback: if coordinate fields are empty, resolve them from search, manual inputs, or silent geocoding
        if (!lat || !lng) {
            const searchVal = document.getElementById('place-search').value.trim();
            const latManual = document.getElementById('place-lat-manual') ? document.getElementById('place-lat-manual').value.trim() : '';
            const lngManual = document.getElementById('place-lng-manual') ? document.getElementById('place-lng-manual').value.trim() : '';
            
            const resolved = await resolveStopCoordinates(searchVal, placeName, latManual, lngManual);
            lat = resolved.lat;
            lng = resolved.lng;
        }

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
                if (window.showToast) window.showToast('Stop updated! 📝', 'success');
                // Auto-sync to cloud for editors and owners
                if (typeof syncTripToCloud === 'function') {
                    syncTripToCloud(currentTripId, 'Edited plan stop').catch(e => console.log('Auto-sync (plan edit):', e.message));
                }
            }
        }
    });
};

async function toggleVisit(index) {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify the planner.');
    const trip = await getTrip(currentTripId);
    const itinerary = trip.itinerary || [];
    if (itinerary[index]) {
        itinerary[index].visited = !itinerary[index].visited;
        await updateTrip(currentTripId, { itinerary });
        loadTripNotes();
        if (typeof syncTripToCloud === 'function') {
            syncTripToCloud(currentTripId, 'Toggled stop visit').catch(e => console.log('Auto-sync (toggle visit):', e.message));
        }
    }
}

async function deletePlace(index) {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify the planner.');
    if (confirm('Remove this place from your roadmap?')) {
        const trip = await getTrip(currentTripId);
        const itinerary = trip.itinerary || [];
        itinerary.splice(index, 1);
        await updateTrip(currentTripId, { itinerary });
        loadTripNotes();
        if (window.showToast) window.showToast('Stop removed from roadmap.', 'info');
        if (typeof syncTripToCloud === 'function') {
            syncTripToCloud(currentTripId, 'Deleted plan stop').catch(e => console.log('Auto-sync (plan delete):', e.message));
        }
    }
}

// Move a stop up (-1) or down (+1) in the itinerary order
window.moveStop = async function(index, direction) {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify the planner.');
    const trip = await getTrip(currentTripId);
    const itinerary = trip.itinerary || [];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= itinerary.length) return;
    // Swap
    [itinerary[index], itinerary[newIndex]] = [itinerary[newIndex], itinerary[index]];
    await updateTrip(currentTripId, { itinerary });
    loadTripNotes();
    if (typeof syncTripToCloud === 'function') {
        syncTripToCloud(currentTripId, 'Reordered plan stops').catch(e => console.log('Auto-sync (reorder):', e.message));
    }
};

// Initialize planner
function initPlanner() {
    const addPlaceBtn = document.getElementById('add-place-btn');
    if (addPlaceBtn) {
        addPlaceBtn.addEventListener('click', showAddPlaceModal);
    }
}