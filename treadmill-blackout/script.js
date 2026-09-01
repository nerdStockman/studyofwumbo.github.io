const $ = (id) => document.getElementById(id);

const els = {
  minSpeed: $('minSpeed'), maxSpeed: $('maxSpeed'), minIncline: $('minIncline'), maxIncline: $('maxIncline'), targetDistance: $('targetDistance'),
  generateBtn: $('generateBtn'), setupMessage: $('setupMessage'), randomCard: $('randomCard'), gridCard: $('gridCard'),
  minDifficulty: $('minDifficulty'), maxDifficulty: $('maxDifficulty'), allowPartial: $('allowPartial'), allowCompleted: $('allowCompleted'),
  randomBtn: $('randomBtn'), randomMessage: $('randomMessage'), randomResult: $('randomResult'), resultMain: $('resultMain'), resultDifficulty: $('resultDifficulty'),
  gridMount: $('gridMount'), progressText: $('progressText'), resetBtn: $('resetBtn'), legend: $('legend'),
  saveBtn: $('saveBtn'), loadBtn: $('loadBtn'), saveMessage: $('saveMessage'),
  distanceModal: $('distanceModal'), distanceModalCombo: $('distanceModalCombo'), distanceInput: $('distanceInput'), distanceHint: $('distanceHint'),
  distanceSaveBtn: $('distanceSaveBtn'), distanceClearBtn: $('distanceClearBtn'), distanceCancelBtn: $('distanceCancelBtn')
};

const SAVE_KEY = 'wumbo-treadmill-blackout-v1';
let gridItems = [];
let progress = new Map(); // key -> miles completed
let selectedKey = null;
let activeEditKey = null;
let currentSetup = null;

// ACSM-style treadmill oxygen-cost estimate, mapped onto a simple 1–10 challenge scale.
// Walking equation below 4 mph; running equation from 4 mph upward.
function difficultyFor(speedMph, inclinePct) {
  const speedMpm = speedMph * 26.8224;
  const grade = inclinePct / 100;
  let vo2;
  if (speedMph < 4) vo2 = 0.1 * speedMpm + 1.8 * speedMpm * grade + 3.5;
  else vo2 = 0.2 * speedMpm + 0.9 * speedMpm * grade + 3.5;
  const mets = Math.max(1, vo2 / 3.5);
  const normalized = Math.sqrt(Math.max(0, (mets - 2) / 16));
  return Math.max(1, Math.min(10, Math.round(1 + normalized * 9)));
}

function difficultyColor(level) {
  const hue = 125 - (level - 1) * 13.4;
  return `hsl(${hue} 78% 62%)`;
}

function comboKey(speed, incline) { return `${speed}|${incline}`; }
function integerValue(input) { return Number.parseInt(input.value, 10); }
function numericValue(input) { return Number.parseFloat(input.value); }
function completedDistance(key) { return progress.get(key) || 0; }
function completionRatio(key) {
  if (!currentSetup?.targetDistance) return 0;
  return Math.min(1, completedDistance(key) / currentSetup.targetDistance);
}
function completionState(key) {
  const ratio = completionRatio(key);
  if (ratio >= 1) return 'completed';
  if (ratio > 0) return 'partial';
  return 'uncompleted';
}

function validateSetup() {
  const minSpeed = integerValue(els.minSpeed);
  const maxSpeed = integerValue(els.maxSpeed);
  const minIncline = integerValue(els.minIncline);
  const maxIncline = integerValue(els.maxIncline);
  const targetDistance = numericValue(els.targetDistance);
  const values = [minSpeed, maxSpeed, minIncline, maxIncline, targetDistance];

  if (values.some(Number.isNaN)) return { error: 'Enter all treadmill limits and a prescribed distance.' };
  if (minSpeed < 0 || maxSpeed > 20) return { error: 'Speed must be between 0 and 20 mph.' };
  if (minIncline < -10 || maxIncline > 40) return { error: 'Incline must be between -10% and 40%.' };
  if (targetDistance <= 0 || targetDistance > 100) return { error: 'Prescribed distance must be greater than 0 and no more than 100 miles.' };
  if (minSpeed > maxSpeed) return { error: 'Minimum speed cannot exceed maximum speed.' };
  if (minIncline > maxIncline) return { error: 'Minimum incline cannot exceed maximum incline.' };

  const count = (maxSpeed - minSpeed + 1) * (maxIncline - minIncline + 1);
  if (count > 500) return { error: 'That grid is very large. Choose limits producing 500 or fewer squares.' };
  return { minSpeed, maxSpeed, minIncline, maxIncline, targetDistance };
}

function populateDifficultySelects() {
  els.minDifficulty.innerHTML = '';
  els.maxDifficulty.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const a = document.createElement('option'); a.value = i; a.textContent = i;
    const b = document.createElement('option'); b.value = i; b.textContent = i;
    els.minDifficulty.appendChild(a); els.maxDifficulty.appendChild(b);
  }
  els.minDifficulty.value = '1';
  els.maxDifficulty.value = '10';
}

function renderLegend() {
  els.legend.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const chip = document.createElement('div');
    chip.className = 'legend-chip';
    chip.style.background = difficultyColor(i);
    chip.textContent = i;
    els.legend.appendChild(chip);
  }
}

function buildGridItems(setup) {
  const items = [];
  for (let incline = setup.minIncline; incline <= setup.maxIncline; incline++) {
    for (let speed = setup.minSpeed; speed <= setup.maxSpeed; speed++) {
      items.push({ speed, incline, difficulty: difficultyFor(speed, incline), key: comboKey(speed, incline) });
    }
  }
  return items;
}

function generateGrid() {
  const setup = validateSetup();
  els.setupMessage.classList.remove('error');
  if (setup.error) {
    els.setupMessage.textContent = setup.error;
    els.setupMessage.classList.add('error');
    return;
  }

  currentSetup = setup;
  gridItems = buildGridItems(setup);
  progress = new Map();
  selectedKey = null;
  renderGrid(setup);
  updateProgress();
  clearRandomResult();
  els.gridCard.classList.remove('hidden');
  els.randomCard.classList.remove('hidden');
  els.setupMessage.textContent = `${gridItems.length} squares generated · ${formatMiles(setup.targetDistance)} mi each.`;
  els.saveMessage.textContent = '';
}

function renderGrid({ minSpeed, maxSpeed, minIncline, maxIncline }) {
  const speeds = Array.from({ length: maxSpeed - minSpeed + 1 }, (_, i) => minSpeed + i);
  const inclines = Array.from({ length: maxIncline - minIncline + 1 }, (_, i) => maxIncline - i);
  const itemMap = new Map(gridItems.map(item => [item.key, item]));
  const grid = document.createElement('div');
  grid.className = 'blackout-grid';
  grid.style.setProperty('--cols', speeds.length);

  const corner = document.createElement('div');
  corner.className = 'corner';
  corner.innerHTML = 'Incline ↑<br>Speed →';
  grid.appendChild(corner);

  speeds.forEach(speed => {
    const h = document.createElement('div'); h.className = 'speed-header'; h.textContent = `${speed} mph`; grid.appendChild(h);
  });

  inclines.forEach(incline => {
    const y = document.createElement('div'); y.className = 'incline-header'; y.textContent = `${incline}%`; grid.appendChild(y);
    speeds.forEach(speed => {
      const item = itemMap.get(comboKey(speed, incline));
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.key = item.key;
      cell.style.background = difficultyColor(item.difficulty);
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-label', `${speed} miles per hour at ${incline} percent incline, difficulty ${item.difficulty}`);
      cell.innerHTML = `<span class="combo">${speed} / ${incline}%</span><span class="difficulty">${item.difficulty}</span>`;
      cell.addEventListener('click', () => openDistanceModal(item.key));
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDistanceModal(item.key); }
      });
      grid.appendChild(cell);
    });
  });

  els.gridMount.innerHTML = '';
  els.gridMount.appendChild(grid);
  syncCellStates();
}

function openDistanceModal(key) {
  const item = gridItems.find(x => x.key === key);
  if (!item || !currentSetup) return;
  activeEditKey = key;
  const existing = completedDistance(key);
  els.distanceModalCombo.textContent = `${item.speed} mph · ${item.incline}% incline · difficulty ${item.difficulty}`;
  els.distanceInput.max = String(currentSetup.targetDistance);
  els.distanceInput.value = existing > 0 ? String(existing) : String(currentSetup.targetDistance);
  els.distanceHint.textContent = `Prescribed distance: ${formatMiles(currentSetup.targetDistance)} mi. Enter less for a partial completion.`;
  els.distanceModal.classList.remove('hidden');
  requestAnimationFrame(() => { els.distanceInput.focus(); els.distanceInput.select(); });
}

function closeDistanceModal() {
  activeEditKey = null;
  els.distanceModal.classList.add('hidden');
}

function saveDistanceAttempt() {
  if (!activeEditKey || !currentSetup) return;
  const distance = numericValue(els.distanceInput);
  if (Number.isNaN(distance) || distance < 0 || distance > currentSetup.targetDistance) {
    els.distanceHint.textContent = `Enter a distance from 0 to ${formatMiles(currentSetup.targetDistance)} miles.`;
    return;
  }
  if (distance <= 0) progress.delete(activeEditKey);
  else progress.set(activeEditKey, distance);
  closeDistanceModal();
  syncCellStates();
  updateProgress();
}

function clearDistanceAttempt() {
  if (activeEditKey) progress.delete(activeEditKey);
  closeDistanceModal();
  syncCellStates();
  updateProgress();
}

function syncCellStates() {
  document.querySelectorAll('.grid-cell').forEach(cell => {
    const key = cell.dataset.key;
    const state = completionState(key);
    const ratio = completionRatio(key);
    cell.classList.toggle('completed', state === 'completed');
    cell.classList.toggle('partial', state === 'partial');
    cell.classList.toggle('selected', selectedKey === key);
    if (state === 'partial') cell.dataset.percent = `${Math.round(ratio * 100)}%`;
    else delete cell.dataset.percent;
    cell.setAttribute('aria-pressed', state === 'completed' ? 'true' : 'false');
  });
}

function updateProgress() {
  const total = gridItems.length;
  let done = 0;
  let partial = 0;
  let equivalent = 0;
  gridItems.forEach(item => {
    const ratio = completionRatio(item.key);
    equivalent += ratio;
    if (ratio >= 1) done++;
    else if (ratio > 0) partial++;
  });
  const pct = total ? Math.round(equivalent / total * 100) : 0;
  const partialText = partial ? ` · ${partial} partial` : '';
  els.progressText.textContent = `${done} of ${total} completed${partialText} · ${pct}% total blackout`;
}

function clearRandomResult() {
  selectedKey = null;
  els.randomResult.className = 'random-result empty';
  els.randomResult.style.background = '';
  els.resultMain.textContent = '—';
  els.resultDifficulty.textContent = 'Pick a difficulty range';
  els.randomMessage.textContent = '';
  els.randomMessage.classList.remove('error');
  syncCellStates();
}

function randomSelect() {
  const minD = Number(els.minDifficulty.value);
  const maxD = Number(els.maxDifficulty.value);
  els.randomMessage.classList.remove('error');
  if (minD > maxD) {
    els.randomMessage.textContent = 'Minimum difficulty cannot exceed maximum difficulty.';
    els.randomMessage.classList.add('error');
    return;
  }

  const eligible = gridItems.filter(item => {
    if (item.difficulty < minD || item.difficulty > maxD) return false;
    const state = completionState(item.key);
    if (state === 'completed') return els.allowCompleted.checked;
    if (state === 'partial') return els.allowPartial.checked;
    return true;
  });

  if (!eligible.length) {
    selectedKey = null;
    els.randomMessage.textContent = 'No eligible squares remain in that difficulty range.';
    els.randomMessage.classList.add('error');
    syncCellStates();
    return;
  }

  const pick = eligible[Math.floor(Math.random() * eligible.length)];
  const state = completionState(pick.key);
  selectedKey = pick.key;
  els.randomResult.className = 'random-result';
  els.randomResult.style.background = difficultyColor(pick.difficulty);
  els.resultMain.textContent = `${pick.speed} mph · ${pick.incline}%`;
  const stateText = state === 'completed' ? 'completed' : state === 'partial' ? `${Math.round(completionRatio(pick.key) * 100)}% complete` : 'not yet attempted';
  els.resultDifficulty.textContent = `Difficulty ${pick.difficulty} · ${stateText}`;
  els.randomMessage.textContent = `Selected from ${eligible.length} eligible square${eligible.length === 1 ? '' : 's'}.`;
  syncCellStates();
  // Deliberately do not scroll the page/grid to the selected cell.
}

function resetCompletions() {
  progress.clear();
  clearRandomResult();
  updateProgress();
  els.saveMessage.textContent = 'Completions reset.';
  els.saveMessage.classList.remove('error');
}

function saveProgressLocally() {
  if (!currentSetup) return;
  const payload = {
    version: 1,
    setup: currentSetup,
    progress: Object.fromEntries(progress),
    random: {
      minDifficulty: els.minDifficulty.value,
      maxDifficulty: els.maxDifficulty.value,
      allowPartial: els.allowPartial.checked,
      allowCompleted: els.allowCompleted.checked
    },
    savedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    els.saveMessage.textContent = `Progress saved locally on this browser · ${new Date().toLocaleString()}`;
    els.saveMessage.classList.remove('error');
  } catch (err) {
    els.saveMessage.textContent = 'Could not save progress in this browser.';
    els.saveMessage.classList.add('error');
  }
}

function loadProgressLocally() {
  els.saveMessage.classList.remove('error');
  let payload;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      els.saveMessage.textContent = 'No locally saved Treadmill Blackout progress was found.';
      els.saveMessage.classList.add('error');
      return;
    }
    payload = JSON.parse(raw);
  } catch (err) {
    els.saveMessage.textContent = 'The local save could not be read.';
    els.saveMessage.classList.add('error');
    return;
  }

  const setup = payload?.setup;
  if (!setup) {
    els.saveMessage.textContent = 'The local save is missing setup information.';
    els.saveMessage.classList.add('error');
    return;
  }

  els.minSpeed.value = setup.minSpeed;
  els.maxSpeed.value = setup.maxSpeed;
  els.minIncline.value = setup.minIncline;
  els.maxIncline.value = setup.maxIncline;
  els.targetDistance.value = setup.targetDistance;
  const validated = validateSetup();
  if (validated.error) {
    els.saveMessage.textContent = 'The saved setup is no longer valid.';
    els.saveMessage.classList.add('error');
    return;
  }

  currentSetup = validated;
  gridItems = buildGridItems(validated);
  const validKeys = new Set(gridItems.map(x => x.key));
  progress = new Map();
  Object.entries(payload.progress || {}).forEach(([key, value]) => {
    const distance = Number(value);
    if (validKeys.has(key) && Number.isFinite(distance) && distance > 0) {
      progress.set(key, Math.min(distance, validated.targetDistance));
    }
  });
  selectedKey = null;

  if (payload.random) {
    els.minDifficulty.value = payload.random.minDifficulty || '1';
    els.maxDifficulty.value = payload.random.maxDifficulty || '10';
    els.allowPartial.checked = Boolean(payload.random.allowPartial);
    els.allowCompleted.checked = Boolean(payload.random.allowCompleted);
  }

  renderGrid(validated);
  updateProgress();
  clearRandomResult();
  els.gridCard.classList.remove('hidden');
  els.randomCard.classList.remove('hidden');
  els.setupMessage.textContent = `${gridItems.length} squares loaded · ${formatMiles(validated.targetDistance)} mi each.`;
  const when = payload.savedAt ? new Date(payload.savedAt).toLocaleString() : 'previously';
  els.saveMessage.textContent = `Loaded local progress saved ${when}.`;
}

function formatMiles(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

populateDifficultySelects();
renderLegend();
els.generateBtn.addEventListener('click', generateGrid);
els.randomBtn.addEventListener('click', randomSelect);
els.resetBtn.addEventListener('click', resetCompletions);
els.saveBtn.addEventListener('click', saveProgressLocally);
els.loadBtn.addEventListener('click', loadProgressLocally);
els.distanceSaveBtn.addEventListener('click', saveDistanceAttempt);
els.distanceClearBtn.addEventListener('click', clearDistanceAttempt);
els.distanceCancelBtn.addEventListener('click', closeDistanceModal);
els.distanceModal.addEventListener('click', e => { if (e.target === els.distanceModal) closeDistanceModal(); });
els.distanceInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveDistanceAttempt(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.distanceModal.classList.contains('hidden')) closeDistanceModal(); });

// Give the page a useful initial state while still leaving setup editable.
generateGrid();
