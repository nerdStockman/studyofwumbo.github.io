const $ = (id) => document.getElementById(id);

const els = {
  minSpeed: $('minSpeed'),
  maxSpeed: $('maxSpeed'),
  minIncline: $('minIncline'),
  maxIncline: $('maxIncline'),
  targetDistance: $('targetDistance'),
  generateBtn: $('generateBtn'),
  setupMessage: $('setupMessage'),
  randomCard: $('randomCard'),
  gridCard: $('gridCard'),
  minDifficulty: $('minDifficulty'),
  maxDifficulty: $('maxDifficulty'),
  allowPartial: $('allowPartial'),
  allowCompleted: $('allowCompleted'),
  randomBtn: $('randomBtn'),
  randomMessage: $('randomMessage'),
  randomResult: $('randomResult'),
  resultMain: $('resultMain'),
  resultDifficulty: $('resultDifficulty'),
  gridMount: $('gridMount'),
  progressText: $('progressText'),
  resetBtn: $('resetBtn'),
  saveBtn: $('saveBtn'),
  loadBtn: $('loadBtn'),
  loadFileInput: $('loadFileInput'),
  saveMessage: $('saveMessage'),
  legend: $('legend'),
  distanceModal: $('distanceModal'),
  distanceModalCombo: $('distanceModalCombo'),
  distanceInput: $('distanceInput'),
  distanceHint: $('distanceHint'),
  distanceSaveBtn: $('distanceSaveBtn'),
  distanceClearBtn: $('distanceClearBtn'),
  distanceCancelBtn: $('distanceCancelBtn')
};


// Ten-step spectrum matched to the Wumbo household-wealth palette:
// cyan/light blue through royal blue and violet to bright magenta.
const DIFFICULTY_COLORS = [
  '#41c9ff', '#36a9ff', '#3c6cff', '#4c45ff', '#5d2eff',
  '#741dff', '#8a13ff', '#9b10ff', '#c013ff', '#e81cff'
];

let gridItems = [];
let attempts = new Map(); // key -> miles completed; full completion is >= target distance
let selectedKey = null;
let activeModalKey = null;
let currentSetup = null;

function comboKey(speed, incline) {
  return `${speed}|${incline}`;
}

function integerValue(input) {
  return Number.parseInt(input.value, 10);
}

function numericValue(input) {
  return Number.parseFloat(input.value);
}

function difficultyColor(level) {
  return DIFFICULTY_COLORS[Math.max(1, Math.min(10, level)) - 1];
}

// A smooth treadmill workload score used only to rank cells against each other.
// Speed raises the horizontal cost; incline adds a vertical-work term that grows
// with speed. This avoids the walking/running equation discontinuity around 4 mph.
function workloadScore(speedMph, inclinePct) {
  const speedMpm = speedMph * 26.8224;
  const grade = inclinePct / 100;
  const horizontalCost = 0.16 * speedMpm;
  const verticalCost = 1.15 * speedMpm * grade;
  return 3.5 + horizontalCost + verticalCost;
}

function assignDifficultyDeciles(items) {
  const ranked = [...items].sort((a, b) => {
    if (a.workload !== b.workload) return a.workload - b.workload;
    if (a.speed !== b.speed) return a.speed - b.speed;
    return a.incline - b.incline;
  });

  const n = ranked.length;
  ranked.forEach((item, index) => {
    // Rank percentile, giving approximately 10% of cells to each level.
    item.difficulty = Math.min(10, Math.floor((index * 10) / n) + 1);
  });
}

function validateSetup() {
  const minSpeed = integerValue(els.minSpeed);
  const maxSpeed = integerValue(els.maxSpeed);
  const minIncline = integerValue(els.minIncline);
  const maxIncline = integerValue(els.maxIncline);
  const targetDistance = numericValue(els.targetDistance);
  const values = [minSpeed, maxSpeed, minIncline, maxIncline];

  if (values.some(Number.isNaN)) return { error: 'Enter all four treadmill limits.' };
  if (!Number.isFinite(targetDistance) || targetDistance <= 0) return { error: 'Prescribed distance must be greater than 0.' };
  if (minSpeed < 0 || maxSpeed > 20) return { error: 'Speed must be between 0 and 20 mph.' };
  if (minIncline < -10 || maxIncline > 40) return { error: 'Incline must be between -10% and 40%.' };
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
    const a = document.createElement('option');
    a.value = i;
    a.textContent = i;
    const b = document.createElement('option');
    b.value = i;
    b.textContent = i;
    els.minDifficulty.appendChild(a);
    els.maxDifficulty.appendChild(b);
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
      items.push({
        speed,
        incline,
        key: comboKey(speed, incline),
        workload: workloadScore(speed, incline),
        difficulty: 1
      });
    }
  }
  assignDifficultyDeciles(items);
  return items;
}

function generateGrid({ preserveAttempts = false } = {}) {
  const setup = validateSetup();
  els.setupMessage.classList.remove('error');
  if (setup.error) {
    els.setupMessage.textContent = setup.error;
    els.setupMessage.classList.add('error');
    return false;
  }

  currentSetup = setup;
  gridItems = buildGridItems(setup);
  selectedKey = null;
  if (!preserveAttempts) attempts = new Map();

  // Remove attempts that are no longer part of the regenerated grid and clamp
  // saved distances to the current prescribed distance.
  const validKeys = new Set(gridItems.map(item => item.key));
  attempts = new Map([...attempts.entries()]
    .filter(([key]) => validKeys.has(key))
    .map(([key, distance]) => [key, Math.max(0, Math.min(Number(distance) || 0, setup.targetDistance))]));

  renderGrid(setup);
  updateProgress();
  clearRandomResult();
  els.gridCard.classList.remove('hidden');
  els.randomCard.classList.remove('hidden');
  els.setupMessage.textContent = `${gridItems.length} squares generated · difficulty divided into grid percentiles.`;
  updateRangeDimming();
  return true;
}

function renderGrid(setup) {
  const speeds = Array.from({ length: setup.maxSpeed - setup.minSpeed + 1 }, (_, i) => setup.minSpeed + i);
  const inclines = Array.from({ length: setup.maxIncline - setup.minIncline + 1 }, (_, i) => setup.maxIncline - i);
  const itemByKey = new Map(gridItems.map(item => [item.key, item]));
  const grid = document.createElement('div');
  grid.className = 'blackout-grid';
  grid.style.setProperty('--cols', speeds.length);

  const corner = document.createElement('div');
  corner.className = 'corner';
  corner.innerHTML = 'Incline ↑<br>Speed →';
  grid.appendChild(corner);

  speeds.forEach(speed => {
    const h = document.createElement('div');
    h.className = 'speed-header';
    h.textContent = `${speed} mph`;
    grid.appendChild(h);
  });

  inclines.forEach(incline => {
    const y = document.createElement('div');
    y.className = 'incline-header';
    y.textContent = `${incline}%`;
    grid.appendChild(y);

    speeds.forEach(speed => {
      const item = itemByKey.get(comboKey(speed, incline));
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.key = item.key;
      cell.dataset.difficulty = String(item.difficulty);
      cell.style.background = difficultyColor(item.difficulty);
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.innerHTML = `
        <span class="combo">${speed} / ${incline}%</span>
        <span class="difficulty">${item.difficulty}</span>
        <span class="completion-mark"></span>
      `;
      cell.addEventListener('click', () => openDistanceModal(item.key));
      cell.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDistanceModal(item.key);
        }
      });
      grid.appendChild(cell);
    });
  });

  els.gridMount.innerHTML = '';
  els.gridMount.appendChild(grid);
  syncCellStates();
}

function completionFor(key) {
  const distance = attempts.get(key) || 0;
  const target = currentSetup?.targetDistance || 1;
  return Math.max(0, Math.min(1, distance / target));
}

function statusFor(key) {
  const fraction = completionFor(key);
  if (fraction >= 1 - 1e-9) return 'completed';
  if (fraction > 0) return 'partial';
  return 'unattempted';
}

function syncCellStates() {
  document.querySelectorAll('.grid-cell').forEach(cell => {
    const key = cell.dataset.key;
    const status = statusFor(key);
    const fraction = completionFor(key);
    cell.classList.toggle('completed', status === 'completed');
    cell.classList.toggle('partial', status === 'partial');
    cell.classList.toggle('selected', selectedKey === key);

    const mark = cell.querySelector('.completion-mark');
    if (status === 'completed') {
      mark.textContent = '✓';
    } else if (status === 'partial') {
      mark.textContent = `${Math.round(fraction * 100)}%`;
    } else {
      mark.textContent = '';
    }

    const item = gridItems.find(x => x.key === key);
    const distance = attempts.get(key) || 0;
    cell.setAttribute(
      'aria-label',
      `${item.speed} miles per hour at ${item.incline} percent incline, difficulty percentile ${item.difficulty}, ${Math.round(fraction * 100)} percent complete${distance ? `, ${distance} miles recorded` : ''}`
    );
  });
  updateRangeDimming();
}

function updateRangeDimming() {
  const minD = Number(els.minDifficulty.value || 1);
  const maxD = Number(els.maxDifficulty.value || 10);
  document.querySelectorAll('.grid-cell').forEach(cell => {
    const difficulty = Number(cell.dataset.difficulty);
    cell.classList.toggle('outside-range', minD > maxD || difficulty < minD || difficulty > maxD);
  });
}

function updateProgress() {
  const total = gridItems.length;
  let completedCount = 0;
  let partialCount = 0;
  let equivalent = 0;

  gridItems.forEach(item => {
    const fraction = completionFor(item.key);
    equivalent += fraction;
    if (fraction >= 1 - 1e-9) completedCount++;
    else if (fraction > 0) partialCount++;
  });

  const pct = total ? Math.round((equivalent / total) * 100) : 0;
  const partialText = partialCount ? ` · ${partialCount} partial` : '';
  els.progressText.textContent = `${completedCount} of ${total} completed${partialText} · ${pct}% total blackout progress`;
}

function openDistanceModal(key) {
  if (!currentSetup) return;
  const item = gridItems.find(x => x.key === key);
  if (!item) return;

  activeModalKey = key;
  const currentDistance = attempts.get(key) || 0;
  els.distanceModalCombo.textContent = `${item.speed} mph · ${item.incline}% incline · Difficulty ${item.difficulty}`;
  els.distanceInput.max = String(currentSetup.targetDistance);
  els.distanceInput.value = currentDistance ? String(currentDistance) : String(currentSetup.targetDistance);
  els.distanceHint.textContent = `Enter up to ${formatDistance(currentSetup.targetDistance)} mi. Less than the prescribed distance is recorded as a partial completion.`;
  els.distanceModal.classList.remove('hidden');
  window.setTimeout(() => {
    els.distanceInput.focus();
    els.distanceInput.select();
  }, 0);
}

function closeDistanceModal() {
  activeModalKey = null;
  els.distanceModal.classList.add('hidden');
}

function saveDistanceAttempt() {
  if (!activeModalKey || !currentSetup) return;
  const value = numericValue(els.distanceInput);
  if (!Number.isFinite(value) || value < 0 || value > currentSetup.targetDistance) {
    els.distanceHint.textContent = `Enter a distance from 0 to ${formatDistance(currentSetup.targetDistance)} mi.`;
    els.distanceHint.classList.add('error');
    return;
  }
  els.distanceHint.classList.remove('error');
  if (value <= 0) attempts.delete(activeModalKey);
  else attempts.set(activeModalKey, value);
  closeDistanceModal();
  syncCellStates();
  updateProgress();
}

function clearDistanceAttempt() {
  if (activeModalKey) attempts.delete(activeModalKey);
  closeDistanceModal();
  syncCellStates();
  updateProgress();
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

function isEligibleByCompletion(item) {
  const status = statusFor(item.key);
  if (status === 'completed') return els.allowCompleted.checked;
  if (status === 'partial') return els.allowPartial.checked;
  return true;
}

function randomSelect() {
  const minD = Number(els.minDifficulty.value);
  const maxD = Number(els.maxDifficulty.value);
  els.randomMessage.classList.remove('error');

  if (minD > maxD) {
    els.randomMessage.textContent = 'Minimum difficulty cannot exceed maximum difficulty.';
    els.randomMessage.classList.add('error');
    updateRangeDimming();
    return;
  }

  const eligible = gridItems.filter(item =>
    item.difficulty >= minD &&
    item.difficulty <= maxD &&
    isEligibleByCompletion(item)
  );

  if (!eligible.length) {
    selectedKey = null;
    els.randomMessage.textContent = 'No squares match that difficulty range and completion filter.';
    els.randomMessage.classList.add('error');
    syncCellStates();
    return;
  }

  const pick = eligible[Math.floor(Math.random() * eligible.length)];
  selectedKey = pick.key;
  els.randomResult.className = 'random-result';
  els.randomResult.style.background = difficultyColor(pick.difficulty);
  els.resultMain.textContent = `${pick.speed} mph · ${pick.incline}%`;
  els.resultDifficulty.textContent = `Difficulty ${pick.difficulty} · ${eligible.length} eligible square${eligible.length === 1 ? '' : 's'}`;

  const included = ['unattempted'];
  if (els.allowPartial.checked) included.push('partial');
  if (els.allowCompleted.checked) included.push('completed');
  els.randomMessage.textContent = `Selected from ${included.join(', ')} squares.`;
  syncCellStates();
}

function resetCompletions() {
  attempts.clear();
  clearRandomResult();
  updateProgress();
  els.saveMessage.textContent = 'Completion progress cleared.';
}

function buildSavePayload() {
  return {
    format: 'wumbo-treadmill-blackout',
    version: 3,
    savedAt: new Date().toISOString(),
    setup: currentSetup,
    attempts: Object.fromEntries(attempts),
    random: {
      minDifficulty: Number(els.minDifficulty.value),
      maxDifficulty: Number(els.maxDifficulty.value),
      allowPartial: els.allowPartial.checked,
      allowCompleted: els.allowCompleted.checked
    }
  };
}

function saveProgress() {
  if (!currentSetup) return;

  const payload = buildSavePayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `treadmill-blackout-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  els.saveMessage.textContent = `Save file downloaded · ${link.download}`;
}

function applyLoadedPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid save file');
  if (payload.format && payload.format !== 'wumbo-treadmill-blackout') throw new Error('Wrong save format');

  const setup = payload.setup;
  if (!setup) throw new Error('Missing setup');

  els.minSpeed.value = setup.minSpeed;
  els.maxSpeed.value = setup.maxSpeed;
  els.minIncline.value = setup.minIncline;
  els.maxIncline.value = setup.maxIncline;
  els.targetDistance.value = setup.targetDistance ?? 1;

  attempts = new Map(
    Object.entries(payload.attempts || {}).map(([key, distance]) => [key, Number(distance)])
  );

  if (payload.random) {
    els.minDifficulty.value = String(payload.random.minDifficulty ?? 1);
    els.maxDifficulty.value = String(payload.random.maxDifficulty ?? 10);
    els.allowPartial.checked = Boolean(payload.random.allowPartial);
    els.allowCompleted.checked = Boolean(payload.random.allowCompleted);
  }

  if (!generateGrid({ preserveAttempts: true })) throw new Error('Invalid saved setup');
}

function loadProgress() {
  els.loadFileInput.value = '';
  els.loadFileInput.click();
}

async function loadProgressFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const raw = await file.text();
    const payload = JSON.parse(raw);
    applyLoadedPayload(payload);
    els.saveMessage.textContent = `Loaded ${file.name}.`;
  } catch (error) {
    console.error(error);
    els.saveMessage.textContent = 'That file could not be loaded as a Treadmill Blackout save.';
  }
}

function formatDistance(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

populateDifficultySelects();
renderLegend();

els.generateBtn.addEventListener('click', () => generateGrid());
els.randomBtn.addEventListener('click', randomSelect);
els.resetBtn.addEventListener('click', resetCompletions);
els.saveBtn.addEventListener('click', saveProgress);
els.loadBtn.addEventListener('click', loadProgress);
els.loadFileInput.addEventListener('change', loadProgressFile);
els.minDifficulty.addEventListener('change', updateRangeDimming);
els.maxDifficulty.addEventListener('change', updateRangeDimming);
els.allowPartial.addEventListener('change', () => { els.randomMessage.textContent = ''; });
els.allowCompleted.addEventListener('change', () => { els.randomMessage.textContent = ''; });

els.distanceSaveBtn.addEventListener('click', saveDistanceAttempt);
els.distanceClearBtn.addEventListener('click', clearDistanceAttempt);
els.distanceCancelBtn.addEventListener('click', closeDistanceModal);
els.distanceModal.addEventListener('click', event => {
  if (event.target === els.distanceModal) closeDistanceModal();
});
els.distanceInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') saveDistanceAttempt();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !els.distanceModal.classList.contains('hidden')) closeDistanceModal();
});

// Useful initial state while keeping setup editable.
generateGrid();
