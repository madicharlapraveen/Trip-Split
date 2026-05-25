// js/recovery.js - Supabase Email OTP Passwordless Account Linking & Recovery

// Trigger passwordless OTP code
window.sendEmailOTP = async function(email) {
    console.log('Sending email OTP to:', email);
    const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            shouldCreateUser: true
        }
    });
    if (error) {
        throw error;
    }
    return data;
};

// Verify the OTP code (tries standard passwordless sign-in, then falls back to new signup confirmation)
window.verifyEmailOTP = async function(email, token) {
    console.log('Verifying OTP code for:', email);
    try {
        // Try type: 'email' (standard passwordless sign-in)
        const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'email'
        });
        if (!error && data && data.user) {
            return data;
        }
        if (error) throw error;
    } catch (err1) {
        console.warn('verifyOtp with type "email" failed, trying type "signup":', err1.message);
        // Try type: 'signup' (fallback for new user creation signup confirmation)
        const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
        });
        if (error) {
            throw error;
        }
        return data;
    }
};

// Query the Supabase profiles table to check if a profile is linked to an email
window.getProfileByEmail = async function(email) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows returned"
        throw error;
    }
    return data;
};

// Link the current device's profile with an email address
window.linkEmailToProfile = async function(email) {
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();
    
    // Fetch local profile if any
    const localProfileStr = localStorage.getItem('tripsplit_user_profile');
    let name = deviceName;
    let mobile = '';
    
    if (localProfileStr) {
        const localProfile = JSON.parse(localProfileStr);
        name = localProfile.name || name;
        mobile = localProfile.mobile || mobile;
    }
    
    const updatedProfile = {
        device_id: deviceId,
        name: name,
        email: email,
        mobile: mobile
    };
    
    const { data, error } = await supabase
        .from('profiles')
        .upsert(updatedProfile);
        
    if (error) {
        throw error;
    }
    
    localStorage.setItem('tripsplit_user_profile', JSON.stringify(updatedProfile));
    return updatedProfile;
};

// Restore account by swapping device identity and fetching cloud trips
window.restoreAccountByEmail = async function(email) {
    const profile = await window.getProfileByEmail(email);
    if (!profile) {
        throw new Error('No saved account found for this email address. Please make sure you enter the correct email.');
    }
    
    const oldDeviceId = profile.device_id;
    if (!oldDeviceId) {
        throw new Error('This profile does not have a linked device ID.');
    }
    
    // Set device credentials to match the old device
    localStorage.setItem('tripsplit_device_id', oldDeviceId);
    localStorage.setItem('tripsplit_device_name', profile.name || 'Explorer');
    localStorage.setItem('tripsplit_user_profile', JSON.stringify(profile));
    
    // Fetch all trips owned by the old device ID
    const { data: ownedTrips, error: ownedError } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_device_id', oldDeviceId);
        
    if (ownedError) throw ownedError;
    
    // Fetch all permission mappings for this device
    const { data: joinedPermissions, error: joinedError } = await supabase
        .from('permissions')
        .select('share_id')
        .eq('device_id', oldDeviceId);
        
    if (joinedError) throw joinedError;
    
    let allTrips = [...(ownedTrips || [])];
    
    if (joinedPermissions && joinedPermissions.length > 0) {
        const joinedShareIds = joinedPermissions.map(p => p.share_id);
        const { data: joinedTrips, error: joinedTripsError } = await supabase
            .from('trips')
            .select('*')
            .in('share_id', joinedShareIds);
            
        if (joinedTripsError) throw joinedTripsError;
        
        if (joinedTrips) {
            // Avoid duplicates
            const ownedShareIds = new Set(allTrips.map(t => t.share_id));
            joinedTrips.forEach(t => {
                if (!ownedShareIds.has(t.share_id)) {
                    allTrips.push(t);
                }
            });
        }
    }
    
    // Write all retrieved trips to local storage
    if (allTrips.length > 0) {
        for (const tripRecord of allTrips) {
            if (tripRecord.trip_data) {
                // saveCloudTripBundle does a full local overwrite and local storage commit
                await saveCloudTripBundle(tripRecord.trip_data);
            }
        }
        
        // Sort trips to find the most recently updated one
        allTrips.sort((a, b) => {
            const dateA = new Date(a.updated_at || (a.trip_data && a.trip_data.trip.updatedAt) || 0);
            const dateB = new Date(b.updated_at || (b.trip_data && b.trip_data.trip.updatedAt) || 0);
            return dateB - dateA;
        });
        
        const mostRecentTripId = allTrips[0].trip_data.trip.id;
        localStorage.setItem('tripsplit_active_trip_id', mostRecentTripId);
        window.currentTripId = mostRecentTripId;
    } else {
        // No trips found in cloud
        localStorage.removeItem('tripsplit_active_trip_id');
        window.currentTripId = null;
    }
    
    return allTrips.length;
};
