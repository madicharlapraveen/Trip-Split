// presets.js — Offline-first Smart Split Preset Manager (F4)

const PRESETS_KEY = 'tripsplit_presets';

function getPresetsForTrip(tripId) {
  const all = JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
  return all[tripId] || [];
}

function savePreset(tripId, preset) {
  const all = JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
  if (!all[tripId]) all[tripId] = [];
  const idx = all[tripId].findIndex(p => p.id === preset.id);
  if (idx >= 0) all[tripId][idx] = preset;
  else all[tripId].push({ ...preset, id: Date.now() });
  localStorage.setItem(PRESETS_KEY, JSON.stringify(all));
}

function deletePreset(tripId, presetId) {
  const all = JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
  if (all[tripId]) all[tripId] = all[tripId].filter(p => p.id !== presetId);
  localStorage.setItem(PRESETS_KEY, JSON.stringify(all));
}

function getPresetForCategory(tripId, category) {
  return getPresetsForTrip(tripId).find(p => p.category === category) || null;
}

// UI: Show Manage Presets modal
async function showManagePresetsModal() {
  if (!currentTripId) {
    if (window.showToast) window.showToast('Please select a trip first', 'error');
    return;
  }
  const participants = await getParticipants(currentTripId);
  const presets = getPresetsForTrip(currentTripId);

  const categories = ['Food', 'Transport', 'Hotel', 'Fuel', 'Entertainment', 'Shopping', 'Medical', 'Other'];

  let presetListHTML = presets.length === 0
    ? '<p class="text-slate-400 text-sm italic text-center py-4">No presets yet. Add one below.</p>'
    : presets.map(p => {
        const names = p.participantIds.map(id => {
          const found = participants.find(part => part.id === id);
          return found ? found.name : '?';
        }).join(', ');
        return `
          <div class="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
            <div>
              <p class="font-bold text-sm text-slate-800">${p.category}</p>
              <p class="text-xs text-slate-400 mt-0.5">→ ${names || 'No one'}</p>
            </div>
            <button onclick="deletePresetAndRefresh(${currentTripId}, ${p.id})" class="w-8 h-8 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-rose-100 transition-colors">×</button>
          </div>`;
      }).join('');

  const participantCheckboxes = participants.map(p =>
    `<label class="flex items-center gap-2 p-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
      <input type="checkbox" class="preset-check" data-id="${p.id}" style="accent-color: #6366f1; width:16px; height:16px;">
      <span class="text-sm font-bold text-slate-700">${p.name}</span>
    </label>`
  ).join('');

  const content = `
    <div class="flex justify-between items-center mb-5">
      <h3 class="text-xl font-bold text-slate-800">⚡ Split Presets</h3>
      <button onclick="hideModal()" class="text-slate-400 hover:text-slate-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <p class="text-xs text-slate-400 mb-4">When you select a category while adding an expense, the preset people are auto-checked.</p>
    <div class="space-y-2 mb-6">${presetListHTML}</div>
    <div class="border-t border-slate-100 pt-5">
      <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Add New Preset</p>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
          <select id="preset-category" class="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500">
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Split Between</label>
          <div class="grid grid-cols-2 gap-2">${participantCheckboxes}</div>
        </div>
        <button onclick="addPresetFromModal()" class="w-full btn-primary py-4">Save Preset</button>
      </div>
    </div>
  `;
  showModal(content);
}

window.deletePresetAndRefresh = function(tripId, presetId) {
  deletePreset(tripId, presetId);
  showManagePresetsModal();
  if (window.showToast) window.showToast('Preset deleted', 'info');
};

window.addPresetFromModal = function() {
  const category = document.getElementById('preset-category').value;
  const checked = Array.from(document.querySelectorAll('.preset-check:checked')).map(cb => String(cb.dataset.id));
  if (checked.length === 0) {
    if (window.showToast) window.showToast('Select at least one person', 'error');
    return;
  }
  savePreset(currentTripId, { category, participantIds: checked });
  showManagePresetsModal();
  if (window.showToast) window.showToast(`Preset saved for ${category} ⚡`, 'success');
};
