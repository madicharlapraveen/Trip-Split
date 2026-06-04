// ai.js - Smart Import Workflow (No API Key needed)

/**
 * Step 1: Prepare the prompt and open Gemini
 */
window.askGeminiForPlan = async function() {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify the planner.');
    if (!currentTripId) return;

    const trip = await getTrip(currentTripId);
    const tripName = trip.tripName;
    
    // Create a very specific prompt that asks Gemini for a clean format
    const prompt = `I am using TripSplit app to plan my trip: "${tripName}". 
Please suggest a detailed itinerary with 5-7 places to visit. 
Format each stop exactly like this:
STOP: Place Name
TIME: 10:00 AM (or Day 1)
NOTE: Short description or tip

Please provide a clean list.`;

    // Copy to clipboard
    try {
        await navigator.clipboard.writeText(prompt);
        alert('✨ Prompt copied to clipboard!\n\nI will now open Gemini. Just PASTE the prompt there and copy the result back here.');
        window.open('https://gemini.google.com/app', '_blank');
        
        // Show the "Import" button state
        loadTripNotes(); // Refresh to show the Import button if we want
    } catch (err) {
        console.error('Clipboard error:', err);
        alert('Could not copy to clipboard. Please copy this manually: ' + prompt);
    }
}

/**
 * Step 2: Parse the text from Gemini and turn it into bubbles
 */
window.importGeminiPlan = async function() {
    if (!(await canEditCurrentTrip())) return alert('You are a Viewer and cannot modify the planner.');
    if (!currentTripId) return;

    const text = prompt("Paste the itinerary from Gemini here:");
    if (!text) return;

    try {
        const stops = [];
        // Simple but robust regex parser for the format we requested
        const regex = /STOP:\s*(.*?)\nTIME:\s*(.*?)\nNOTE:\s*(.*?)(?=\nSTOP:|$)/gs;
        let match;

        while ((match = regex.exec(text)) !== null) {
            stops.push({
                placeName: match[1].trim(),
                time: match[2].trim(),
                notes: match[3].trim(),
                visited: false,
                id: Date.now() + stops.length
            });
        }

        if (stops.length === 0) {
            // Fallback: try a simpler line-by-line parser if the format is slightly off
            const lines = text.split('\n');
            let currentStop = null;
            
            lines.forEach(line => {
                if (line.includes('STOP:')) {
                    if (currentStop) stops.push(currentStop);
                    currentStop = { placeName: line.replace('STOP:', '').trim(), time: '', notes: '', visited: false, id: Date.now() + stops.length };
                } else if (line.includes('TIME:') && currentStop) {
                    currentStop.time = line.replace('TIME:', '').trim();
                } else if (line.includes('NOTE:') && currentStop) {
                    currentStop.notes = line.replace('NOTE:', '').trim();
                }
            });
            if (currentStop) stops.push(currentStop);
        }

        if (stops.length > 0) {
            const trip = await getTrip(currentTripId);
            const currentItinerary = trip.itinerary || [];
            const updatedItinerary = [...currentItinerary, ...stops];
            
            await updateTrip(currentTripId, { itinerary: updatedItinerary });
            alert(`✅ Successfully imported ${stops.length} stops!`);
            loadTripNotes();
        } else {
            alert("Could not find any stops in the text. Please make sure you copied the full response from Gemini.");
        }
    } catch (error) {
        console.error('Parsing error:', error);
        alert('Error parsing the plan. Please try again.');
    }
}
