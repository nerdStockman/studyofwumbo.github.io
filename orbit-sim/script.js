const orbitCanvas = document.getElementById('orbitCanvas');
const ctx = orbitCanvas.getContext('2d');
const plotCanvas = document.getElementById('plotCanvas');
const ptx = plotCanvas.getContext('2d');

// Controls
const rSlider = document.getElementById('radiusSlider');
const rValue = document.getElementById('radiusValue');
const sSlider = document.getElementById('speedSlider');
const sValue = document.getElementById('speedValue');

let innerRadius = parseFloat(rSlider.value);
let speedFactor = parseFloat(sSlider.value);

// --- Utility: compute true mean distance (Planet 1 fixed, Planet 2 sampled N times)
function computeTrueMeanDistance(r, samples = 30) {
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const theta = (2 * Math.PI * i) / samples;
    const dist = Math.sqrt(1 + r*r - 2*r*Math.cos(theta)); // in AU
    sum += dist;
  }
  return sum / samples;
}

let trueMeanDist = computeTrueMeanDistance(innerRadius);

// --- Button handlers ---
document.getElementById('mercuryBtn').onclick = () => setRadius(0.387);
document.getElementById('venusBtn').onclick   = () => setRadius(0.723);
document.getElementById('marsBtn').onclick    = () => setRadius(1.524);

rSlider.addEventListener('input', () => {
  innerRadius = parseFloat(rSlider.value);
  updateRadiusText();
  trueMeanDist = computeTrueMeanDistance(innerRadius);
  resetSim();
});

sSlider.addEventListener('input', () => {
  speedFactor = parseFloat(sSlider.value);
  sValue.textContent = `${speedFactor.toFixed(2)} years/sec`;
});

function setRadius(r) {
  innerRadius = r;
  rSlider.value = r;
  updateRadiusText();
  trueMeanDist = computeTrueMeanDistance(innerRadius);
  resetSim();
}

function updateRadiusText() {
  rValue.textContent = `${innerRadius.toFixed(2)} AU`;
}

// --- Simulation setup ---
const AU = 200;
const center = {x: orbitCanvas.width / 2, y: orbitCanvas.height / 2};
let simYears = 0;
let lastTimestamp = null;

let distanceHistory = [];
const maxPoints = 2000;

function omega(r) { return 2 * Math.PI * Math.pow(r, -1.5); }

function resetSim() {
  simYears = 0;
  lastTimestamp = null;
  distanceHistory = [];
}

// --- Load star image for center ---
const starImg = new Image();
starImg.src = "../star.png";

// --- Animation loop ---
function animate(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const elapsed = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  simYears += elapsed * speedFactor;

  drawScene(timestamp / 1000); // pass real time (s) for pulsing
  requestAnimationFrame(animate);
}

// --- Draw main scene ---
function drawScene(realTime) {
  ctx.clearRect(0, 0, orbitCanvas.width, orbitCanvas.height);

  // Orbit rings
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(center.x, center.y, AU, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center.x, center.y, AU * innerRadius, 0, 2 * Math.PI);
  ctx.stroke();

  // Pulsing glow for center star
  const pulse = 0.6 + 0.4 * Math.sin(realTime * 2.0);
  ctx.shadowColor = `rgba(255, 223, 128, ${pulse})`;
  ctx.shadowBlur = 25 * pulse;
  const starSize = 32;

  if (starImg.complete) {
    ctx.drawImage(starImg, center.x - starSize / 2, center.y - starSize / 2, starSize, starSize);
  } else {
    ctx.fillStyle = '#ffe58a';
    ctx.beginPath();
    ctx.arc(center.x, center.y, 6, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Planet positions
  const ω_outer = omega(1);
  const ω_inner = omega(innerRadius);
  const x_outer = center.x + AU * Math.cos(ω_outer * simYears);
  const y_outer = center.y + AU * Math.sin(ω_outer * simYears);
  const x_inner = center.x + AU * innerRadius * Math.cos(ω_inner * simYears);
  const y_inner = center.y + AU * innerRadius * Math.sin(ω_inner * simYears);

  // Connection line
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(x_outer, y_outer);
  ctx.lineTo(x_inner, y_inner);
  ctx.stroke();

  // Planet 1 (blue)
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(x_outer, y_outer, 6, 0, 2 * Math.PI);
  ctx.fill();

  // Planet 2 (yellow)
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(x_inner, y_inner, 5, 0, 2 * Math.PI);
  ctx.fill();

  // Record distance for plot trace
  const dx = x_outer - x_inner;
  const dy = y_outer - y_inner;
  const dist = Math.sqrt(dx * dx + dy * dy) / AU;
  distanceHistory.push({ t: simYears, d: dist });
  if (distanceHistory.length > maxPoints) distanceHistory.shift();

  drawPlot();
}

// --- Distance plot ---
function drawPlot() {
  ptx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
  if (distanceHistory.length < 2) return;

  const windowYears = speedFactor * 8;
  const tMax = simYears;
  const tMin = tMax - windowYears;
  const visible = distanceHistory.filter(p => p.t >= tMin);

  const maxDist = 2.0;
  const scaleY = plotCanvas.height / maxDist;
  const scaleX = plotCanvas.width / windowYears;
  const xFromT = t => (t - tMin) * scaleX;

  // Axis
  ptx.strokeStyle = 'rgba(255,255,255,0.2)';
  ptx.beginPath();
  ptx.moveTo(0, plotCanvas.height - 1);
  ptx.lineTo(plotCanvas.width, plotCanvas.height - 1);
  ptx.stroke();

  // Trace
  ptx.strokeStyle = '#facc15';
  ptx.beginPath();
  visible.forEach((p, i) => {
    const x = xFromT(p.t);
    const y = plotCanvas.height - p.d * scaleY;
    if (i === 0) ptx.moveTo(x, y);
    else ptx.lineTo(x, y);
  });
  ptx.stroke();

  // Mean line (true mean, not rolling)
  const yMean = plotCanvas.height - trueMeanDist * scaleY;
  ptx.strokeStyle = '#b66dff';
  ptx.setLineDash([4, 4]);
  ptx.beginPath();
  ptx.moveTo(0, yMean);
  ptx.lineTo(plotCanvas.width, yMean);
  ptx.stroke();
  ptx.setLineDash([]);

  // Labels
  ptx.font = '14px Inter';
  ptx.fillStyle = '#e0c3ff';
  ptx.textAlign = 'left';
  ptx.fillText('Distance between Planet 1 and Planet 2', 10, 18);

  ptx.font = '12px Inter';
  ptx.fillStyle = '#b9b3d0';
  ptx.fillText(`Mean distance ≈ ${trueMeanDist.toFixed(3)} AU`, 10, 35);
}

requestAnimationFrame(animate);
