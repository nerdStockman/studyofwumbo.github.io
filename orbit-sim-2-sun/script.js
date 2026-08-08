const orbitCanvas = document.getElementById('orbitCanvas');
const ctx = orbitCanvas.getContext('2d');

// Physical constants
const MU = 1.32712440018e20;        // Sun GM, m^3/s^2
const AU = 1.495978707e11;          // astronomical unit, m
const RSUN = 6.957e8;               // solar radius, m
const DAY = 86400;
const YEAR = 365.25 * DAY;
const R0 = AU;                       // initial orbit fixed at 1 AU

// Controls
const dvSlider = document.getElementById('dvSlider');
const dvValue = document.getElementById('dvValue');
const circularBtn = document.getElementById('circularBtn');
const impactBtn = document.getElementById('impactBtn');
const escapeBtn = document.getElementById('escapeBtn');

// Status/readouts
const statusCard = document.getElementById('statusCard');
const statusTitle = document.getElementById('statusTitle');
const statusText = document.getElementById('statusText');
const circularSpeedValue = document.getElementById('circularSpeedValue');
const postBurnSpeed = document.getElementById('postBurnSpeed');
const energyValue = document.getElementById('energyValue');
const eccentricityValue = document.getElementById('eccentricityValue');
const smaValue = document.getElementById('smaValue');
const periapsisValue = document.getElementById('periapsisValue');
const apoapsisValue = document.getElementById('apoapsisValue');
const vinfValue = document.getElementById('vinfValue');
const periodValue = document.getElementById('periodValue');

const starImg = new Image();
starImg.src = '../star.png';

let draggingArrow = false;
let animationStart = performance.now();

function orbitalParameters() {
  const dv = parseFloat(dvSlider.value) * 1000;
  const vc = Math.sqrt(MU / R0);
  const v = Math.max(0, vc + dv);
  const eps = v * v / 2 - MU / R0;
  const h = R0 * v;

  let e, p, a, rp, ra, vinf = 0, period = NaN;

  if (v < 1e-9) {
    e = 1;
    p = 0;
    a = R0 / 2;
    rp = 0;
    ra = R0;
  } else {
    e = Math.sqrt(Math.max(0, 1 + (2 * eps * h * h) / (MU * MU)));
    p = h * h / MU;

    if (Math.abs(eps) < 1e-3) {
      a = Infinity;
      rp = p / (1 + e);
      ra = Infinity;
    } else if (eps < 0) {
      a = -MU / (2 * eps);
      rp = a * (1 - e);
      ra = a * (1 + e);
      period = 2 * Math.PI * Math.sqrt(a * a * a / MU);
    } else {
      a = -MU / (2 * eps);
      rp = p / (1 + e);
      ra = Infinity;
      vinf = Math.sqrt(2 * eps);
    }
  }

  return { dv, vc, v, eps, h, e, p, a, rp, ra, vinf, period };
}

function classify(P) {
  if (P.v < 1e-6) {
    return { type: 'impact', title: 'Sun impact', text: 'All tangential velocity has been removed; the object falls radially into the Sun.' };
  }
  if (P.eps >= -1e-3) {
    return { type: 'escape', title: 'Solar System escape', text: 'Specific orbital energy is zero or positive, so the object will not return.' };
  }
  if (P.rp <= RSUN) {
    return { type: 'impact', title: 'Sun impact', text: 'The osculating orbit intersects the solar surface.' };
  }
  if (Math.abs(P.dv) < 10) {
    return { type: 'bound', title: 'Circular orbit', text: 'Bound, non-impacting heliocentric orbit.' };
  }
  return { type: 'bound', title: 'Bound elliptical orbit', text: 'The object remains in a closed orbit around the Sun.' };
}

function fmtAU(r, digits = 4) {
  if (!Number.isFinite(r)) return '∞';
  return `${(r / AU).toFixed(digits)} AU`;
}

function updateReadouts(P) {
  const state = classify(P);
  dvValue.textContent = `${(P.dv / 1000).toFixed(2)} km/s`;
  circularSpeedValue.textContent = `${(P.vc / 1000).toFixed(2)} km/s circular speed`;
  postBurnSpeed.textContent = `${(P.v / 1000).toFixed(3)} km/s`;
  energyValue.textContent = `${(P.eps / 1e6).toFixed(3)} MJ/kg`;
  eccentricityValue.textContent = P.e.toFixed(5);
  smaValue.textContent = Number.isFinite(P.a) ? fmtAU(P.a, 4) : '∞';
  periapsisValue.textContent = fmtAU(P.rp, 5);
  apoapsisValue.textContent = Number.isFinite(P.ra) ? fmtAU(P.ra, 4) : '∞';
  vinfValue.textContent = P.eps >= 0 ? `${(P.vinf / 1000).toFixed(3)} km/s` : '0 km/s';
  periodValue.textContent = Number.isFinite(P.period) ? `${(P.period / YEAR).toFixed(3)} yr` : '—';

  statusCard.className = `card status-card ${state.type}`;
  statusTitle.textContent = state.title;
  statusText.textContent = state.text;
}

function closestApproachText(P) {
  if (P.rp <= RSUN) {
    return {
      main: 'Closest approach to Sun surface: 0 km — IMPACT',
      sub: `Osculating periapsis: ${(P.rp / AU).toFixed(5)} AU`
    };
  }

  const altitude = P.rp - RSUN;
  const km = altitude / 1000;
  let value;
  if (km >= 1e6) value = `${(km / 1e6).toFixed(2)} million km`;
  else if (km >= 1000) value = `${Math.round(km).toLocaleString()} km`;
  else value = `${km.toFixed(1)} km`;

  return {
    main: `Closest approach to Sun surface: ${value}`,
    sub: `Periapsis: ${(P.rp / AU).toFixed(5)} AU from Sun center`
  };
}

function drawStar(cx, cy, realTime, scale) {
  const pulse = 0.6 + 0.4 * Math.sin(realTime * 2.0);
  ctx.save();
  ctx.shadowColor = `rgba(255, 223, 128, ${pulse})`;
  ctx.shadowBlur = 28 * pulse;

  // The actual solar radius is tiny at this scale; use a readable symbol while
  // keeping all impact calculations based on the real solar radius.
  const starSize = Math.max(34, 2 * RSUN * scale);
  if (starImg.complete && starImg.naturalWidth > 0) {
    ctx.drawImage(starImg, cx - starSize / 2, cy - starSize / 2, starSize, starSize);
  } else {
    ctx.fillStyle = '#ffe58a';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawOrbitPath(P, cx, cy, scale) {
  const state = classify(P);
  const isImpact = state.type === 'impact';
  const isEscape = state.type === 'escape';

  ctx.save();
  ctx.lineWidth = (isImpact || isEscape) ? 3 : 2.2;
  ctx.setLineDash([8, 7]);
  ctx.strokeStyle = isImpact ? '#ff6b6b' : (isEscape ? '#facc15' : '#e0c3ff');
  ctx.beginPath();

  if (P.v < 1e-6) {
    ctx.moveTo(cx + R0 * scale, cy);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const burnIsPeri = P.v >= P.vc;
  const omega = burnIsPeri ? 0 : Math.PI;
  let thetaMin = 0;
  let thetaMax = 2 * Math.PI;

  // Once impact or escape is inevitable, show only the forward-going half.
  if (isEscape) {
    if (P.e > 1) {
      thetaMin = 0;
      thetaMax = Math.acos(-1 / P.e) - 0.002;
    } else {
      thetaMin = 0;
      thetaMax = Math.PI - 0.002;
    }
  } else if (isImpact) {
    thetaMin = burnIsPeri ? 0 : Math.PI;
    thetaMax = burnIsPeri ? Math.PI : 2 * Math.PI;
  }

  const maxR = 4.0 * R0;
  const N = 1800;
  let started = false;

  for (let i = 0; i <= N; i++) {
    const th = thetaMin + (thetaMax - thetaMin) * i / N;
    const den = 1 + P.e * Math.cos(th);
    if (den <= 0) { started = false; continue; }

    const r = P.p / den;
    if (!Number.isFinite(r) || r > maxR) { started = false; continue; }

    const angle = th + omega;
    const x = cx + r * Math.cos(angle) * scale;
    const y = cy - r * Math.sin(angle) * scale;

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }

    if (isImpact && r <= RSUN) break;
  }

  ctx.stroke();
  ctx.restore();
}

function drawArrow(P, ox, oy) {
  const maxVisual = 175;
  const arrowLen = Math.max(-maxVisual, Math.min(maxVisual, (P.dv / 1000) * 5));
  const color = arrowLen >= 0 ? '#7dd3fc' : '#f59e0b';

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox, oy - arrowLen);
  ctx.stroke();

  if (Math.abs(arrowLen) > 3) {
    const dir = Math.sign(arrowLen);
    const ay = oy - arrowLen;
    ctx.beginPath();
    ctx.moveTo(ox, ay);
    ctx.lineTo(ox - 8, ay + dir * 14);
    ctx.lineTo(ox + 8, ay + dir * 14);
    ctx.closePath();
    ctx.fill();
  }

  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('drag Δv', ox + 14, oy - arrowLen / 2);
  ctx.restore();
}

function drawScene(timestamp) {
  const P = orbitalParameters();
  updateReadouts(P);

  const W = orbitCanvas.width;
  const H = orbitCanvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const displayRadius = Math.min(W, H) * 0.34;
  const scale = displayRadius / R0;
  const ox = cx + displayRadius;
  const oy = cy;

  ctx.clearRect(0, 0, W, H);

  // Initial 1 AU circular orbit
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, displayRadius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();

  drawOrbitPath(P, cx, cy, scale);
  drawStar(cx, cy, timestamp / 1000, scale);

  // Static spacecraft/object at 1 AU
  ctx.save();
  ctx.fillStyle = '#7dd3fc';
  ctx.shadowColor = 'rgba(125,211,252,.75)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(ox, oy, 7, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#b9b3d0';
  ctx.textAlign = 'center';
  ctx.fillText('1 AU', ox, oy + 26);
  ctx.restore();

  drawArrow(P, ox, oy);

  // Closest-approach annotation printed directly on the visual.
  const ca = closestApproachText(P);
  ctx.save();
  const boxX = 22;
  const boxY = H - 78;
  const boxW = 430;
  const boxH = 54;
  ctx.fillStyle = 'rgba(10, 4, 28, 0.72)';
  ctx.strokeStyle = 'rgba(182, 109, 255, 0.38)';
  ctx.lineWidth = 1;
  roundRect(ctx, boxX, boxY, boxW, boxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = classify(P).type === 'impact' ? '#ff9b9b' : '#e0c3ff';
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(ca.main, boxX + 14, boxY + 21);
  ctx.fillStyle = '#b9b3d0';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText(ca.sub, boxX + 14, boxY + 40);
  ctx.restore();

  requestAnimationFrame(drawScene);
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function setDvFromPointer(event) {
  const rect = orbitCanvas.getBoundingClientRect();
  const scaleY = orbitCanvas.height / rect.height;
  const y = (event.clientY - rect.top) * scaleY;
  const oy = orbitCanvas.height / 2;
  let arrowLen = oy - y;
  arrowLen = Math.max(-175, Math.min(125, arrowLen));
  let dv = arrowLen / 5;
  dv = Math.max(parseFloat(dvSlider.min), Math.min(parseFloat(dvSlider.max), dv));
  dvSlider.value = dv.toFixed(2);
}

orbitCanvas.addEventListener('pointerdown', event => {
  const rect = orbitCanvas.getBoundingClientRect();
  const sx = orbitCanvas.width / rect.width;
  const sy = orbitCanvas.height / rect.height;
  const x = (event.clientX - rect.left) * sx;
  const y = (event.clientY - rect.top) * sy;
  const displayRadius = Math.min(orbitCanvas.width, orbitCanvas.height) * 0.34;
  const ox = orbitCanvas.width / 2 + displayRadius;
  const oy = orbitCanvas.height / 2;

  if (Math.hypot(x - ox, y - oy) < 190) {
    draggingArrow = true;
    orbitCanvas.setPointerCapture(event.pointerId);
    setDvFromPointer(event);
  }
});

orbitCanvas.addEventListener('pointermove', event => {
  if (draggingArrow) setDvFromPointer(event);
});

orbitCanvas.addEventListener('pointerup', () => { draggingArrow = false; });
orbitCanvas.addEventListener('pointercancel', () => { draggingArrow = false; });

dvSlider.addEventListener('input', () => {});

circularBtn.addEventListener('click', () => {
  dvSlider.value = '0';
});

impactBtn.addEventListener('click', () => {
  const vc = Math.sqrt(MU / R0);
  const va = Math.sqrt((2 * MU * RSUN) / (R0 * (R0 + RSUN)));
  dvSlider.value = ((va - vc) / 1000).toFixed(2);
});

escapeBtn.addEventListener('click', () => {
  const vc = Math.sqrt(MU / R0);
  const vesc = Math.sqrt(2 * MU / R0);
  dvSlider.value = ((vesc - vc) / 1000).toFixed(2);
});

requestAnimationFrame(drawScene);
