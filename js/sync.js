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

async function getUserProfile() {
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
                
                await saveCloudTripBundle(cloudTripRecord.trip_data);
                
                // If the user is currently viewing this trip, refresh the UI silently
                if (currentTripId === cloudTripRecord.trip_data.trip.id) {
                    if (currentScreen === 'expenses') loadExpenses();
                    if (currentScreen === 'split') calculateSplit();
                    if (currentScreen === 'home') { loadHomeData(); loadTripsCapsules(); }
                }
                
                isApplyingCloudUpdate = false;
            }
        })
        .subscribe();
};

async function syncTripToCloud(tripId, actionDesc = "Updated trip") {
    try {
        const trip = await getTrip(tripId);
        if (!trip) throw new Error("Trip not found locally.");

        // Get full data bundle
        const allParticipants = await getParticipants();
        const allExpenses = await getExpenses();
        
        const tripBundle = {
            trip: trip,
            participants: allParticipants.filter(p => p.tripId === tripId),
            expenses: allExpenses.filter(e => e.tripId === tripId)
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

        // We have the bundle. Save it locally.
        await saveCloudTripBundle(tripBundle);
        return tripBundle.trip.id;
    } catch (e) {
        console.error("Join failed:", e);
        throw e;
    }
}

// --- UI Handlers ---


async function handleManagePermissions() {
    if (!currentTripId) return;
    try {
        const trip = await getTrip(currentTripId);
        if (!trip || !trip.share_id) return alert('Sync this trip to the cloud first.');
        
        const perms = await getCloudPermissions(trip.share_id);
        
        let html = `
            <div class="mb-4">
                <h3 class="font-bold text-slate-800">Manage Editors</h3>
                <p class="text-xs text-slate-500">Toggle switch to allow users to edit the trip.</p>
            </div>
            <div class="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
        `;
        
        if (perms.length === 0) {
            html += `<p class="text-xs text-slate-400 italic">No one has joined this trip yet.</p>`;
        } else {
            perms.forEach(p => {
                const isEditor = p.role === 'editor';
                html += `
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                            <p class="font-bold text-sm text-slate-700">${p.device_name || 'Unknown Device'}</p>
                            <p class="text-[10px] text-slate-400">${p.device_id.substring(0,10)}...</p>
                        </div>
                        <button onclick="togglePerm('${trip.share_id}', '${p.device_id}', '${isEditor ? 'viewer' : 'editor'}')" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${isEditor ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}">
                            ${isEditor ? 'Editor' : 'Viewer'}
                        </button>
                    </div>
                `;
            });
        }
        
        html += `<button onclick="hideModal()" class="w-full mt-6 py-4 font-bold text-slate-400">Close</button>`;
        showModal(html);
        
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
