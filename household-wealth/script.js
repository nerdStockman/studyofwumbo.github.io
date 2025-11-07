// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const canvas = $("wealthCanvas");
const ctx = canvas.getContext("2d");
const controlsCard = $("controlsCard");
const PLOT_FONT = "13px Inter, system-ui, Segoe UI, Roboto, Arial";

let mode = "federal"; // default
const totalHouseholds = 130_000_000;

// ---------- Color sets ----------
const neonGradient10 = [
  "#41C9FF","#36A9FF","#3C6CFF","#4C45FF","#5D2EFF",
  "#741DFF","#8A13FF","#9B10FF","#C013FF","#E81CFF"
];
const neonGradient5 = [neonGradient10[0], neonGradient10[3], neonGradient10[5], neonGradient10[7], neonGradient10[9]];

// ---------- Group definitions ----------
const federalGroups = [
  { label: "0–50%", width: 0.5, color: neonGradient5[0] },
  { label: "50–90%", width: 0.4, color: neonGradient5[1] },
  { label: "90–99%", width: 0.09, color: neonGradient5[2] },
  { label: "99–99.9%", width: 0.009, color: neonGradient5[3] },
  { label: "Top 0.1%", width: 0.001, color: neonGradient5[4] }
];

const tomGroups = Array.from({ length: 10 }, (_, i) => {
  const lo = i * 10, hi = (i + 1) * 10;
  const label = i === 9 ? "Top 10%" : `${lo}–${hi}%`;
  return { label, width: 0.1, color: neonGradient10[i] };
});

// ---------- Build Controls ----------
function buildControls() {
  controlsCard.innerHTML = "";
  const groups = mode === "federal" ? federalGroups : tomGroups;

  const header = document.createElement("div");
  header.innerHTML = `<strong>Adjust wealth by group ($ / household)</strong>`;
  header.style.gridColumn = "1 / -1";
  controlsCard.appendChild(header);

  const hdr = document.createElement("div");
  hdr.innerHTML = `
    <div class="color-box" style="visibility:hidden;"></div><div></div><div></div>
    <div class="muted col-header" style="text-align:center;">
      <div>$ Wealth Per Household</div></div>
    <div class="muted col-header"><div>Group’s</div><div><strong>Total</strong></div></div>
    <div class="muted col-header"><div>Group’s</div><div><strong>Share</strong></div></div>`;
  hdr.style.display = "contents";
  controlsCard.appendChild(hdr);

  // Build each group (reverse order top-to-bottom)
  groups.slice().reverse().forEach((g, iRev) => {
    const i = groups.length - 1 - iRev;
    const row = document.createElement("div");
    row.style.display = "contents";
    row.innerHTML = `
      <span id="c${i + 1}" class="color-box" style="background:${g.color};"></span>
      <label for="g${i + 1}">${g.label}:</label>
      <input type="range" id="g${i + 1}" min="0" max="200000000" step="1000" value="1230000">
      <input type="text" id="g${i + 1}Box" value="1,230,000">
      <span id="g${i + 1}Total" class="muted total-span"></span>
      <span id="g${i + 1}Pct" class="muted pct-span"></span>`;
    controlsCard.appendChild(row);
  });

  // Totals + 2025 total
  const totals = document.createElement("div");
  totals.style.display = "contents";
  totals.innerHTML = `
    <div class="color-box" style="visibility:hidden;"></div><div></div><div></div>
    <label class="total-label">Total:</label>
    <div id="sumTotal" class="muted total-span">0 T</div>
    <div id="sumPct" class="muted pct-span">100 %</div>`;
  controlsCard.appendChild(totals);

  const yr = document.createElement("div");
  yr.style.display = "contents";
  yr.innerHTML = `
    <div class="color-box" style="visibility:hidden;"></div><div></div><div></div>
    <label>2025 Total:</label>
    <div id="fixedTotal" class="muted total-span">160.24 T</div><div></div>`;
  controlsCard.appendChild(yr);

  // Buttons
  const btns = document.createElement("div");
  btns.style.gridColumn = "1 / -1";
  btns.style.textAlign = "center";
  btns.style.marginTop = "12px";
  btns.innerHTML = `
    <button id="normalizeBtn" class="pink-btn small-btn">Normalize to 2025 Total</button>
    <button id="actualBtn" class="pink-btn">Actual 2025 Distribution</button>`;
  controlsCard.appendChild(btns);

  bindControls(groups);
}

// ---------- Shared logic ----------
function valToTotal(v, f) { return v * totalHouseholds * f; }
let hoverX = null;

function bindControls(groups) {
  const normalizeBtn = $("normalizeBtn");
  const actualBtn = $("actualBtn");
  const sumTotal = $("sumTotal"), sumPct = $("sumPct");

  function getVals() { return groups.map((_, i) => Number($("g" + (i + 1)).value)); }
  function setVals(vs) {
    vs.forEach((v, i) => {
      $("g" + (i + 1)).value = v;
      $("g" + (i + 1) + "Box").value = Number(v).toLocaleString();
    });
  }

  function enforceUp(i) {
    const v = getVals();
    for (let j = i + 1; j < v.length; j++) if (v[j] < v[j - 1]) v[j] = v[j - 1];
    setVals(v);
  }
  function enforceDown(i) {
    const v = getVals();
    for (let j = i - 1; j >= 0; j--) if (v[j] > v[j + 1]) v[j] = v[j + 1];
    setVals(v);
  }
  function enforceAll() {
    const v = getVals();
    for (let i = 1; i < v.length; i++) if (v[i] < v[i - 1]) v[i] = v[i - 1];
    for (let i = v.length - 2; i >= 0; i--) if (v[i] > v[i + 1]) v[i] = v[i + 1];
    setVals(v);
  }

  let lastVals = getVals();

  // Slider and box events
  groups.forEach((g, i) => {
    const s = $("g" + (i + 1));
    const b = $("g" + (i + 1) + "Box");
    s.addEventListener("input", () => {
      b.value = Number(s.value).toLocaleString();
      const newVal = Number(s.value), oldVal = lastVals[i];
      if (newVal > oldVal) enforceUp(i); else if (newVal < oldVal) enforceDown(i);
      lastVals = getVals();
      draw(groups, getVals(), sumTotal, sumPct);
    });
    b.addEventListener("focus", () => { b.value = s.value; setTimeout(() => b.select(), 0); });
    function commitBox() {
      let val = Number(b.value.replace(/,/g, ""));
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0; if (val > 200000000) val = 200000000;
      s.value = val; b.value = Number(val).toLocaleString();
      const oldVal = lastVals[i];
      if (val > oldVal) enforceUp(i); else if (val < oldVal) enforceDown(i);
      lastVals = getVals();
      draw(groups, getVals(), sumTotal, sumPct);
    }
    b.addEventListener("blur", commitBox);
    b.addEventListener("keydown", (e) => { if (e.key === "Enter") b.blur(); });
  });

  // --- Normalize ---
  normalizeBtn.addEventListener("click", () => {
    const vals = getVals();
    const totals = groups.map((g, i) => valToTotal(vals[i], g.width));
    const sum = totals.reduce((a, b) => a + b, 0);
    if (sum <= 0) return;
    const target = 160.23e12;
    const scale = target / sum;
    const newVals = vals.map(v => v * scale);
    setVals(newVals);
    enforceAll();
    lastVals = getVals();
    draw(groups, getVals(), sumTotal, sumPct);
  });

  // --- Actual 2025 ---
  actualBtn.addEventListener("click", () => {
    let preset;
    if (mode === "federal") {
      // Correct 5-group preset (bottom → top)
      preset = [62462, 934615, 4990598, 23179487, 169769231];
    } else {
      // 10-group decile preset
      preset = [12492, 37477, 62462, 87446, 112431, 327346, 732192, 1137038, 1541885, 8275385];
    }
    setVals(preset);
    enforceAll();
    lastVals = getVals();
    draw(groups, getVals(), sumTotal, sumPct);
  });

  enforceAll();
  lastVals = getVals();
  draw(groups, getVals(), sumTotal, sumPct);
}

// ---------- Draw ----------
function valToTotal(v, f) { return v * totalHouseholds * f; }
function draw(groups, vals, sumTotal, sumPct) {
  const maxVal = Math.max(1, ...vals) * 1.1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const M = { left: 125, right: 24, top: 20, bottom: 65 };
  const plotX = M.left, plotY = M.top;
  const plotW = canvas.width - (M.left + M.right);
  const plotH = canvas.height - (M.top + M.bottom);

  // y-grid and labels
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.font = PLOT_FONT;
  const lines = 6;
  for (let i = 0; i <= lines; i++) {
    const t = i / lines, y = plotY + plotH - t * plotH;
    ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + plotW, y); ctx.stroke();
    const val = maxVal * t / 1e6;
    ctx.fillText(val.toPrecision(2) + " M", plotX - 10, y + 4);
  }

  // y label
  ctx.save();
  ctx.translate(25, plotY + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "14px Inter, system-ui, Segoe UI, Roboto, Arial";
  ctx.fillText("$ Wealth Per Household", 0, 0);
  ctx.restore();

  // axes
  ctx.strokeStyle = "#999";
  ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

  // x ticks
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = PLOT_FONT;
  for (let p = 0; p <= 1.0001; p += 0.1) {
    const x = plotX + p * plotW;
    ctx.beginPath(); ctx.moveTo(x, plotY + plotH); ctx.lineTo(x, plotY + plotH + 6); ctx.stroke();
    ctx.fillText((p * 100).toFixed(0) + " %", x, plotY + plotH + 20);
  }
  ctx.font = "14px Inter, system-ui, Segoe UI, Roboto, Arial";
  ctx.fillText("Percentage of the Population", plotX + plotW / 2, plotY + plotH + 45);

  // bars
  let xCursor = plotX;
  groups.forEach((g, i) => {
    const v = vals[i];
    const w = g.width * plotW, h = (v / maxVal) * plotH, y = plotY + plotH - h;
    g.xStart = xCursor; g.xEnd = xCursor + w;
    ctx.fillStyle = g.color;
    ctx.shadowColor = g.color; ctx.shadowBlur = 14;
    ctx.fillRect(xCursor, y, w, h);
    ctx.shadowBlur = 0;
    xCursor += w;
  });

  // totals
  let totalWealth = 0;
  const totals = groups.map((g, i) => { const t = valToTotal(vals[i], g.width); totalWealth += t; return t; });
  groups.forEach((g, i) => $("g" + (i + 1) + "Total").textContent = (totals[i] / 1e12).toFixed(2) + " T");
  const denom = totalWealth || 1;
  groups.forEach((g, i) => $("g" + (i + 1) + "Pct").textContent = (totals[i] / denom * 100).toFixed(1) + " %");
  sumTotal.textContent = (totalWealth / 1e12).toFixed(2) + " T";
  sumPct.textContent = "100 %";

  // hover tooltip
  if (hoverX !== null) {
    const hovered = groups.find(g => hoverX >= g.xStart && hoverX <= g.xEnd);
    if (hovered) {
      const i = groups.indexOf(hovered);
      const val = vals[i];
      const text1 = hovered.label;
      const text2 = "$" + val.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " per Household";
      const boxW = 260, boxH = 42;
      const cx = plotX + plotW / 2, cy = plotY + 25;
      ctx.fillStyle = hovered.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "14px Inter, system-ui, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.fillText(text1, cx, cy - 3);
      ctx.font = "12px Inter, system-ui, Segoe UI, Roboto, Arial";
      ctx.fillText(text2, cx, cy + 13);
    }
  }
}

// ---------- Hover + Toggle ----------
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  hoverX = e.clientX - rect.left;
  const groups = mode === "federal" ? federalGroups : tomGroups;
  const vals = groups.map((_, i) => Number($("g" + (i + 1)).value));
  draw(groups, vals, $("sumTotal"), $("sumPct"));
});
canvas.addEventListener("mouseleave", () => {
  hoverX = null;
  const groups = mode === "federal" ? federalGroups : tomGroups;
  const vals = groups.map((_, i) => Number($("g" + (i + 1)).value));
  draw(groups, vals, $("sumTotal"), $("sumPct"));
});

$("federalBtn").addEventListener("click", () => {
  mode = "federal";
  $("federalBtn").classList.add("active");
  $("tomBtn").classList.remove("active");
  buildControls();
});
$("tomBtn").addEventListener("click", () => {
  mode = "tom";
  $("tomBtn").classList.add("active");
  $("federalBtn").classList.remove("active");
  buildControls();
});

// ---------- Init ----------
buildControls();
