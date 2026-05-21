// sync.js - Supabase Local-First Sync Engine

const SUPABASE_URL = 'https://zusxxcnbjfsvpqxwhrcu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oo8cHEsC6KH2l4H2P9l5Cw_iwqtYcXn';

// Initialize Supabase client

if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
var supabase = window.supabaseClient;


// Device Identity
function getDeviceId() {
    let deviceId = localStorage.getItem('tripsplit_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('tripsplit_device_id', deviceId);
    }
    return deviceId;
}

// Push Notification Logic
async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            // Replace with actual VAPID key in production
            applicationServerKey: 'BEl62RE_E7MP9S2ASbe76AwJ6E23u6Iq2Zp9I9u0R_G28tA7mR-I9q0R_G28tA7mR-I9q0R_G28tA7mR-I' 
        });

        const deviceId = getDeviceId();
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({ device_id: deviceId, subscription: subscription });

        if (error) throw error;
        console.log('Push subscription saved to cloud');
        return true;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return false;
    }
}

function getDeviceName() {
    let name = localStorage.getItem('tripsplit_device_name');
    if (!name) {
        // Generate a random fun name if they haven't set one
        const adjectives = ['Cool', 'Awesome', 'Swift', 'Smart', 'Quick'];
        const nouns = ['Phone', 'Device', 'Explorer', 'Traveler'];
        name = adjectives[Math.floor(Math.random() * adjectives.length)] + ' ' + 
               nouns[Math.floor(Math.random() * nouns.length)];
        localStorage.setItem('tripsplit_device_name', name);
    }
    return name;
}

function setDeviceName(newName) {
    localStorage.setItem('tripsplit_device_name', newName);
}

// User Profile Management
async function saveUserProfile(profile) {
    const deviceId = getDeviceId();
    const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
            device_id: deviceId, 
            name: profile.name, 
            email: profile.email, 
            mobile: profile.mobile 
        });
    
    if (error) throw error;
    localStorage.setItem('tripsplit_device_name', profile.name);
    localStorage.setItem('tripsplit_user_profile', JSON.stringify(profile));
    return data;
}

window.getUserProfile = async function() {
    const local = localStorage.getItem('tripsplit_user_profile');
    if (local) return JSON.parse(local);
    
    const deviceId = getDeviceId();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('device_id', deviceId)
        .single();
    
    if (data) {
        localStorage.setItem('tripsplit_user_profile', JSON.stringify(data));
        localStorage.setItem('tripsplit_device_name', data.name);
        return data;
    }
    return null;
}

// Generate a random share ID (e.g., GOA-8492)
function generateShareId(tripName) {
    const safeName = tripName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${safeName}-${randomNum}`;
}

// --- Sync Functions & WebSockets ---
let realtimeSubscription = null;
let syncTimeout = null;
let isApplyingCloudUpdate = false;

window.triggerBackgroundSync = function(actionDesc = "Updated trip") {
    if (!currentTripId || isApplyingCloudUpdate) return;
    getTrip(currentTripId).then(trip => {
        if (trip && trip.share_id) {
            clearTimeout(syncTimeout);
            syncTimeout = setTimeout(() => {
                syncTripToCloud(currentTripId, actionDesc).catch(e => console.log("Auto-sync block (expected if viewer):", e.message));
            }, 1000); // 1s debounce
        }
    });
};

window.subscribeToTripUpdates = function(shareId) {
    if (realtimeSubscription) supabase.removeChannel(realtimeSubscription);
    
    if (typeof updateLiveStatusIndicator === 'function') {
        updateLiveStatusIndicator(false);
    }
    
    realtimeSubscription = supabase.channel('public:trips:share_id=eq.' + shareId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `share_id=eq.${shareId}` }, async (payload) => {
            const cloudTripRecord = payload.new;
            if (!cloudTripRecord || !cloudTripRecord.trip_data) return;
            
            const actorName = cloudTripRecord.last_actor_name || 'Someone';
            const myDeviceName = getDeviceName();
            
            // If we didn't cause this update, show a notification and apply it
            if (actorName !== myDeviceName) {
                isApplyingCloudUpdate = true;
                
                // Show Mobile-Style Push Notification
                if (window.showToast) {
                    window.showToast(`${actorName} ${cloudTripRecord.last_action_desc || 'updated the trip'}`, 'info');
                }

                // Show Native System Notification if permission is granted
                if ('Notification' in window && Notification.permission === 'granted') {
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(registration => {
                            registration.showNotification('TripSplit Update', {
                                body: `${actorName} ${cloudTripRecord.last_action_desc || 'updated the trip'}`,
                                icon: './assets/icon-192.png',
                                badge: './assets/icon-192.png',
                                vibrate: [100, 50, 100],
                                tag: 'tripsplit-update',
                                renotify: true,
                                data: {
                                    url: './'
                                }
                            });
                        }).catch(err => {
                            new Notification('TripSplit Update', {
                                body: `${actorName} ${cloudTripRecord.last_action_desc || 'updated the trip'}`,
                                icon: './assets/icon-192.png'
                            });
                        });
                    } else {
                        new Notification('TripSplit Update', {
                            body: `${actorName} ${cloudTripRecord.last_action_desc || 'updated the trip'}`,
                            icon: './assets/icon-192.png'
                        });
                    }
                }
                
                await saveCloudTripBundle(cloudTripRecord.trip_data);
                
                // If the user is currently viewing this trip, refresh the UI silently
                if (String(currentTripId) === String(cloudTripRecord.trip_data.trip.id)) {
                    if (currentScreen === 'expenses') loadExpenses();
                    if (currentScreen === 'split') calculateSplit();
                    if (currentScreen === 'plan') loadTripNotes();
                    if (currentScreen === 'home') { loadHomeData(); loadTripsCapsules(); }
                }
                
                isApplyingCloudUpdate = false;
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                if (typeof updateLiveStatusIndicator === 'function') {
                    updateLiveStatusIndicator(true);
                }
            } else {
                if (typeof updateLiveStatusIndicator === 'function') {
                    updateLiveStatusIndicator(false);
                }
            }
        });
};

async function syncTripToCloud(tripId, actionDesc = "Updated trip") {
    try {
        const trip = await getTrip(tripId);
        if (!trip) throw new Error("Trip not found locally.");

        // Ensure the syncing user is flagged as owner if no role set yet
        if (!trip.myRole || trip.myRole === 'viewer') {
            await updateTrip(tripId, { myRole: 'owner' });
            trip.myRole = 'owner';
        }

        // Get full data bundle
        const allParticipants = await getParticipants(tripId);
        const allExpenses = await getExpenses(tripId);
        
        const tripBundle = {
            trip: trip,
            participants: allParticipants,
            expenses: allExpenses
        };

        if (!trip.share_id) {
            trip.share_id = generateShareId(trip.tripName);
            await updateTrip(tripId, { share_id: trip.share_id });
            tripBundle.trip.share_id = trip.share_id;
        }

        const deviceId = getDeviceId();
        const deviceName = getDeviceName();
        
        const { data, error } = await supabase.rpc('sync_trip', {
            p_share_id: trip.share_id,
            p_device_id: deviceId,
            p_trip_data: tripBundle,
            p_actor_name: deviceName,
            p_action_desc: actionDesc
        });

        if (error) throw new Error(error.message);
        
        // Clear pending sync flag since upload succeeded
        if (typeof clearPendingSync === 'function') {
            clearPendingSync();
        }
        
        // Ensure we are listening for others
        subscribeToTripUpdates(trip.share_id);
        
        return trip.share_id;
    } catch (e) {
        console.error("Sync failed:", e);
        throw e;
    }
}

async function joinTripFromCloud(shareId) {
    try {
        const deviceId = getDeviceId();
        const deviceName = getDeviceName();

        const { data: tripBundle, error } = await supabase.rpc('get_trip_data', {
            p_share_id: shareId,
            p_device_id: deviceId,
            p_device_name: deviceName
        });

        if (error) throw new Error(error.message);
        if (!tripBundle || !tripBundle.trip) throw new Error("Invalid trip data on cloud.");

        // role comes from server permissions table (viewer/editor/owner)
        const serverRole = tripBundle.my_role || 'viewer';
        
        // Save locally with the server-assigned role
        await saveCloudTripBundle(tripBundle, serverRole);
        return tripBundle.trip.id;
    } catch (e) {
        console.error("Join failed:", e);
        throw e;
    }
}

// --- UI Handlers ---

window.showManageEditorsModal = function() {
    return handleManagePermissions();
};

async function handleManagePermissions() {
    if (!currentTripId) return;
    try {
        const trip = await getTrip(currentTripId);
        if (!trip) return;
        
        // If not yet synced to cloud, prompt to sync first
        if (!trip.share_id) {
            showModal(`
                <div class="space-y-4 text-center py-4">
                    <div class="text-4xl">☁️</div>
                    <h3 class="font-bold text-slate-800 text-lg">Sync Required</h3>
                    <p class="text-sm text-slate-500">You need to sync this trip to the cloud before you can manage editors.<br/>Tap the Cloud Sync button on the home screen first.</p>
                    <button onclick="hideModal(); handleCloudSync();" class="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all">Sync to Cloud Now</button>
                    <button onclick="hideModal()" class="w-full py-3 text-slate-400 font-bold">Cancel</button>
                </div>
            `);
            return;
        }
        
        const perms = await getCloudPermissions(trip.share_id);
        
        let memberRows = '';
        if (perms.length === 0) {
            memberRows = `
                <div class="text-center py-8 text-slate-400">
                    <div class="text-3xl mb-2">👥</div>
                    <p class="text-sm font-bold">No members yet</p>
                    <p class="text-xs mt-1">Share Trip ID <span class="font-black text-indigo-600">${trip.share_id}</span> with friends so they can join</p>
                </div>`;
        } else {
            perms.forEach(p => {
                const isEditor = p.role === 'editor';
                const isOwnerRow = p.role === 'owner';
                memberRows += `
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${isOwnerRow ? 'bg-indigo-100 text-indigo-600' : isEditor ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}">
                                ${(p.device_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="font-bold text-sm text-slate-700">${p.device_name || 'Unknown Device'}</p>
                                <p class="text-[10px] text-slate-400">${isOwnerRow ? '👑 Admin' : isEditor ? '✏️ Editor' : '👁️ Viewer'}</p>
                            </div>
                        </div>
                        ${isOwnerRow ? 
                            `<span class="px-3 py-1.5 rounded-lg text-xs font-black bg-indigo-600 text-white">Admin</span>` :
                            `<button onclick="togglePerm('${trip.share_id}', '${p.device_id}', '${isEditor ? 'viewer' : 'editor'}')" 
                                class="px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${isEditor ? 'bg-emerald-500 text-white hover:bg-rose-500' : 'bg-slate-200 text-slate-600 hover:bg-emerald-500 hover:text-white'}">
                                ${isEditor ? '✏️ Editor — Tap to revoke' : '👁️ Viewer — Tap to grant'}
                            </button>`
                        }
                    </div>
                `;
            });
        }
        
        showModal(`
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg">Manage Editors</h3>
                        <p class="text-xs text-slate-400">Trip ID: <span class="font-black text-indigo-600">${trip.share_id}</span></p>
                    </div>
                    <button onclick="hideModal()" class="p-2 text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p class="text-xs font-bold text-amber-700">📋 Rules</p>
                    <p class="text-[10px] text-amber-600 mt-1">Editors can add/edit/delete expenses and plan stops. Their changes sync instantly to all devices. Viewers can only view — they cannot modify anything.</p>
                </div>
                
                <div class="space-y-2 max-h-[50vh] overflow-y-auto">
                    ${memberRows}
                </div>
                <button onclick="hideModal()" class="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Done</button>
            </div>
        `);
        
    } catch (e) {
        alert('Could not fetch permissions: ' + e.message);
    }
}

window.togglePerm = async function(shareId, targetId, newRole) {
    try {
        await updateCloudPermission(shareId, targetId, newRole);
        handleManagePermissions(); // refresh UI
    } catch (e) {
        alert('Failed to update permission: ' + e.message);
    }
};

async function getCloudPermissions(shareId) {
    const deviceId = getDeviceId();
    const { data, error } = await supabase.rpc('get_permissions', {
        p_share_id: shareId,
        p_device_id: deviceId
    });

    if (error) throw new Error(error.message);
    return data;
}

async function updateCloudPermission(shareId, targetDeviceId, role) {
    const deviceId = getDeviceId();
    const { data, error } = await supabase.rpc('set_permission', {
        p_share_id: shareId,
        p_owner_device_id: deviceId,
        p_target_device_id: targetDeviceId,
        p_role: role
    });

    if (error) throw new Error(error.message);
    return true;
}
