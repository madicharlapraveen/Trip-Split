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

        // --- share.google handler: follow redirect, extract place name, geocode ---
        if (query.includes('share.google')) {
            try {
                // Use allorigins to fetch the share.google page (gets final redirect URL in status.url or in location header via HTML)
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(query)}`;
                const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
                if (!response.ok) throw new Error('Proxy failed');
                const data = await response.json();

                // allorigins returns the final URL in data.status.url after following redirects
                const finalUrl = (data.status && data.status.url) ? data.status.url : '';
                const html = data.contents || '';

                let placeName = null;
                let lat = null, lng = null;

                // Try extracting place name from the final redirected Google Search URL: ?q=Place+Name
                const qMatch = finalUrl.match(/[?&]q=([^&]+)/i);
                if (qMatch && qMatch[1]) {
                    placeName = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
                }

                // Also try from HTML body (sometimes the redirect is embedded)
                if (!placeName) {
                    const htmlQMatch = html.match(/[?&]q=([^&"'<\s]+)/i);
                    if (htmlQMatch && htmlQMatch[1]) {
                        placeName = decodeURIComponent(htmlQMatch[1].replace(/\+/g, ' '));
                    }
                }

                // Try @lat,lng in final URL or HTML
                const atMatch = (finalUrl + html).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (atMatch) {
                    lat = parseFloat(atMatch[1]);
                    lng = parseFloat(atMatch[2]);
                }

                if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                    // We have coordinates - reverse geocode them
                    statusDiv.innerHTML = `📍 Coordinates found: <span class="text-indigo-600 font-black">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>. Looking up name... 🌐`;
                    const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, { headers: { 'Accept-Language': 'en' } });
                    const revData = await revRes.json();
                    const shortName = (revData && revData.display_name) ? revData.display_name.split(',')[0] : (placeName || `Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
                    document.getElementById('place-search').value = shortName;
                    document.getElementById('place-name').value = shortName;
                    document.getElementById('place-lat').value = lat;
                    document.getElementById('place-lng').value = lng;
                    const latManual = document.getElementById('place-lat-manual');
                    const lngManual = document.getElementById('place-lng-manual');
                    if (latManual) latManual.value = lat;
                    if (lngManual) lngManual.value = lng;
                    statusDiv.innerHTML = `📍 Pinned: <span class="text-indigo-600 font-black">${shortName}</span> (${lat.toFixed(4)}, ${lng.toFixed(4)}) ✅`;
                    if (window.showToast) window.showToast(`Location: ${shortName}`, 'success');
                    return;
                }

                if (placeName) {
                    // Forward the extracted place name to normal geocoding search
                    statusDiv.innerHTML = `🔍 Found place name: <span class="text-indigo-600 font-black">${placeName}</span>. Searching... 🌐`;
                    const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1&addressdetails=1`, {
                        headers: { 'Accept-Language': 'en' }
                    });
                    const geoResults = await geoResponse.json();

                    if (geoResults && geoResults.length > 0) {
                        const best = geoResults[0];
                        const foundLat = parseFloat(best.lat);
                        const foundLng = parseFloat(best.lon);
                        const foundName = best.display_name ? best.display_name.split(',')[0] : placeName;

                        document.getElementById('place-search').value = foundName;
                        document.getElementById('place-name').value = foundName;
                        document.getElementById('place-lat').value = foundLat;
                        document.getElementById('place-lng').value = foundLng;
                        const latManual = document.getElementById('place-lat-manual');
                        const lngManual = document.getElementById('place-lng-manual');
                        if (latManual) latManual.value = foundLat;
                        if (lngManual) lngManual.value = foundLng;

                        statusDiv.innerHTML = `📍 Pinned: <span class="text-indigo-600 font-black">${foundName}</span> (${foundLat.toFixed(4)}, ${foundLng.toFixed(4)}) ✅`;
                        if (window.showToast) window.showToast(`Location: ${foundName}`, 'success');
                        return;
                    } else {
                        // Nominatim didn't find it — fall through to normal text search with the extracted name
                        statusDiv.textContent = `Searching for "${placeName}"...`;
                        // Replace query with place name and fall through to normal geocoding below
                        document.getElementById('place-search').value = placeName;
                        query = placeName;
                        // Don't return — fall through to run the normal geocoding below
                    }
                } else {
                    throw new Error('Could not extract place name or coordinates from share.google link.');
                }
            } catch (err) {
                console.error('share.google resolve failed:', err);
                statusDiv.innerHTML = `⚠️ Couldn't resolve share link. <span class="text-[10px] text-slate-500 block">💡 Try searching by name instead, or paste coordinates directly (e.g. 12.9716, 77.5946)</span>`;
                if (window.showToast) window.showToast('Could not resolve share link', 'error');
                return;
            }
        }

        // --- maps.app.goo.gl / goo.gl/maps handler: use AllOrigins to fetch HTML and extract @lat,lng ---
        if (query.includes('maps.app.goo.gl') || query.includes('goo.gl/maps')) {
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(query)}`;
                const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
                if (!response.ok) {
                    throw new Error(`Proxy request failed: ${response.statusText}`);
                }
                const data = await response.json();
                const html = data.contents || '';

                let lat = null;
                let lng = null;

                // Strategy 1: Find og:url meta tag
                const ogUrlMatch = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i) || 
                                   html.match(/<meta\s+content="([^"]+)"\s+property="og:url"/i) ||
                                   html.match(/property="og:url"\s+content="([^"]+)"/i) ||
                                   html.match(/content="([^"]+)"\s+property="og:url"/i);
                
                if (ogUrlMatch && ogUrlMatch[1]) {
                    const ogUrl = ogUrlMatch[1];
                    const parsed = parseCoordinatesFromLinkOrText(ogUrl);
                    if (parsed) {
                        lat = parsed.lat;
                        lng = parsed.lng;
                    }
                }

                // Strategy 2: Look for @lat,lng directly in the HTML
                if (lat === null || lng === null) {
                    const atMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (atMatch) {
                        lat = parseFloat(atMatch[1]);
                        lng = parseFloat(atMatch[2]);
                    }
                }

                // Strategy 3: Look for markers or center in static map URLs
                if (lat === null || lng === null) {
                    const staticMatch = html.match(/markers=(-?[\d.]+)%2C(-?[\d.]+)/i) || 
                                        html.match(/markers=(-?[\d.]+),(-?[\d.]+)/i) ||
                                        html.match(/center=(-?[\d.]+)%2C(-?[\d.]+)/i) ||
                                        html.match(/center=(-?[\d.]+),(-?[\d.]+)/i);
                    if (staticMatch) {
                        lat = parseFloat(staticMatch[1]);
                        lng = parseFloat(staticMatch[2]);
                    }
                }

                // Strategy 4: Look for any place URL format inside the HTML
                if (lat === null || lng === null) {
                    const pathCoordsRegex = /\/place\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
                    const pathMatch = html.match(pathCoordsRegex);
                    if (pathMatch) {
                        lat = parseFloat(pathMatch[1]);
                        lng = parseFloat(pathMatch[2]);
                    }
                }

                if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                    statusDiv.innerHTML = `📍 Link resolved to: <span class="text-indigo-600 font-black">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>. Reverse geocoding name... 🌐`;
                    try {
                        const revResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
                            headers: { 'Accept-Language': 'en' }
                        });
                        const res = await revResponse.json();
                        
                        if (res && res.display_name) {
                            const shortName = res.display_name.split(',')[0] || 'Pinned Location';
                            document.getElementById('place-search').value = shortName;
                            document.getElementById('place-name').value = shortName;
                            document.getElementById('place-lat').value = lat;
                            document.getElementById('place-lng').value = lng;
                            
                            const latManual = document.getElementById('place-lat-manual');
                            const lngManual = document.getElementById('place-lng-manual');
                            if (latManual) latManual.value = lat;
                            if (lngManual) lngManual.value = lng;
                            
                            statusDiv.innerHTML = `📍 Pinned to: <span class="text-indigo-600 font-black">${shortName}</span> (${lat.toFixed(4)}, ${lng.toFixed(4)}) ✅`;
                            if (window.showToast) window.showToast(`Location detected: ${shortName}!`, 'success');
                        } else {
                            const fallbackName = `Custom Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                            document.getElementById('place-search').value = fallbackName;
                            document.getElementById('place-name').value = fallbackName;
                            document.getElementById('place-lat').value = lat;
                            document.getElementById('place-lng').value = lng;
                            statusDiv.innerHTML = `📍 Pinned to custom coordinates ✅`;
                        }
                    } catch (err) {
                        const fallbackName = `Custom Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`; 
                        document.getElementById('place-search').value = fallbackName;
                        document.getElementById('place-name').value = fallbackName;
                        document.getElementById('place-lat').value = lat;
                        document.getElementById('place-lng').value = lng;
                        statusDiv.innerHTML = `📍 Pinned to custom coordinates (offline fallback) ✅`;
                        console.error(err);
                    }
                    return;
                } else {
                    throw new Error("Could not extract coordinates from link page content.");
                }
            } catch (err) {
                console.error('Failed to resolve Google Maps short link:', err);
                statusDiv.innerHTML = `⚠️ Failed to resolve short link automatically. <br><span class="text-[10px] text-red-500 font-bold block mb-1">CORS or bot protection blocked resolution.</span><span class="text-[9px] text-slate-500">💡 Tip: Search by name, or long-press the location in Google Maps to copy the raw coordinates (e.g. 11.3709, 76.6590) and paste them here directly!</span>`;
                if (window.showToast) window.showToast('Could not resolve Google Maps share link', 'error');
                return;
            }
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
                    <input type="text" id="place-search" class="flex-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold" placeholder="Search place OR paste Google Maps link / coordinates...">
                    <button type="button" onclick="searchGeocodingLocation()" class="px-5 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs shadow-sm">
                        Find Stop
                    </button>
                </div>
                <div id="search-results-list" class="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 hidden max-h-48 overflow-y-auto no-scrollbar z-50"></div>
                <div id="search-status" class="text-[10px] text-slate-400 font-bold mt-1.5 px-1">Search by name, paste coordinates (e.g. 11.4102, 76.6950 or 11°24'36"N 76°41'42"E), or paste a Google Maps link!</div>
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

    // Clear coordinates when the user starts typing a new query in the search box
    document.getElementById('place-search').addEventListener('input', () => {
        document.getElementById('place-lat').value = '';
        document.getElementById('place-lng').value = '';
        const statusDiv = document.getElementById('search-status');
        if (statusDiv) {
            statusDiv.innerHTML = `⚠️ Search query changed. Tap <b>Find Stop</b> or submit to update location pin!`;
        }
    });

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