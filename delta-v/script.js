function fuelMass(deltaV, finalMass, exhaustVelocity) {
  if (deltaV < 0 || finalMass < 0 || exhaustVelocity <= 0) return NaN;
  return finalMass * (Math.exp(deltaV / exhaustVelocity) - 1);
}

function formatNumber(v) {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  return v.toFixed(1);
}

function updateScenario(letter) {
  const dv = +document.getElementById(`dv${letter}`).value;
  const dry = +document.getElementById(`dry${letter}`).value;
  const ve = +document.getElementById(`ve${letter}`).value;

  const fuel = fuelMass(dv, dry, ve);
  document.getElementById(`fuel${letter}`).textContent = formatNumber(fuel);
}

function niceCeil(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const scaled = value / base;

  if (scaled <= 1) return 1 * base;
  if (scaled <= 2) return 2 * base;
  if (scaled <= 5) return 5 * base;
  return 10 * base;
}

function setupPlot(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  const left = 82;
  const right = w - 32;
  const top = 32;
  const bottom = h - 74;

  return {
    canvas,
    ctx,
    w,
    h,
    left,
    right,
    top,
    bottom,
    plotW: right - left,
    plotH: bottom - top
  };
}

function drawGridAndAxes(plot) {
  const { ctx, left, right, top, bottom, plotW, plotH } = plot;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const x = left + (i / 5) * plotW;
    const y = bottom - (i / 5) * plotH;

    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(185, 179, 208, 0.8)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
}

function drawTickLabels(plot, xMax, yMax, xScale, yScale) {
  const { ctx, left, bottom } = plot;

  ctx.fillStyle = "#b9b3d0";
  ctx.font = "12px Inter, system-ui, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "middle";

  ctx.textAlign = "center";
  for (let i = 0; i <= 5; i++) {
    const xValue = (i / 5) * xMax;
    const x = xScale(xValue);
    ctx.fillText(formatNumber(xValue), x, bottom + 22);
  }

  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const yValue = (i / 5) * yMax;
    const y = yScale(yValue);
    ctx.fillText(formatNumber(yValue), left - 12, y);
  }
}

function drawAxisTitles(plot, xTitle, yTitle) {
  const { ctx, h, left, right, top, bottom } = plot;

  ctx.fillStyle = "#e0c3ff";
  ctx.font = "600 17px Inter, system-ui, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(xTitle, (left + right) / 2, h - 24);

  ctx.save();
  ctx.translate(26, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yTitle, 0, 0);
  ctx.restore();
}

function drawPlotMessage(plot, message) {
  const { ctx, left, h } = plot;

  ctx.fillStyle = "#b9b3d0";
  ctx.font = "15px Inter, system-ui, Segoe UI, Roboto, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(message, left, h / 2);
}

function drawDryMassPlot() {
  const plot = setupPlot("plotCanvas");
  if (!plot) return;

  const { ctx, w, h, left, bottom, plotW, plotH } = plot;
  ctx.clearRect(0, 0, w, h);

  const dv = +document.getElementById("dvA").value;
  const currentDry = +document.getElementById("dryA").value;
  const ve = +document.getElementById("veA").value;

  if (dv < 0 || currentDry < 0 || ve <= 0) {
    drawPlotMessage(plot, "Enter positive values to draw the plot.");
    return;
  }

  const maxDry = niceCeil(Math.max(10, currentDry * 2));
  const maxFuel = niceCeil(fuelMass(dv, maxDry, ve));

  function xScale(dry) {
    return left + (dry / maxDry) * plotW;
  }

  function yScale(fuel) {
    return bottom - (fuel / maxFuel) * plotH;
  }

  drawGridAndAxes(plot);
  drawTickLabels(plot, maxDry, maxFuel, xScale, yScale);

  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 3;
  ctx.beginPath();

  for (let i = 0; i <= 160; i++) {
    const dry = (i / 160) * maxDry;
    const fuel = fuelMass(dv, dry, ve);
    const x = xScale(dry);
    const y = yScale(fuel);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  drawAxisTitles(plot, "Dry Mass, m_dry (tons)", "Fuel Mass, m_fuel (tons)");
}

function drawDeltaVPlot() {
  const plot = setupPlot("deltaVPlotCanvas");
  if (!plot) return;

  const { ctx, w, h, left, bottom, plotW, plotH } = plot;
  ctx.clearRect(0, 0, w, h);

  const currentDeltaV = +document.getElementById("dvA").value;
  const dry = +document.getElementById("dryA").value;
  const ve = +document.getElementById("veA").value;

  if (currentDeltaV < 0 || dry < 0 || ve <= 0) {
    drawPlotMessage(plot, "Enter positive values to draw the plot.");
    return;
  }

  const maxDeltaV = niceCeil(Math.max(10, currentDeltaV * 2));
  const maxFuel = niceCeil(fuelMass(maxDeltaV, dry, ve));

  function xScale(deltaV) {
    return left + (deltaV / maxDeltaV) * plotW;
  }

  function yScale(fuel) {
    return bottom - (fuel / maxFuel) * plotH;
  }

  drawGridAndAxes(plot);
  drawTickLabels(plot, maxDeltaV, maxFuel, xScale, yScale);

  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 3;
  ctx.beginPath();

  for (let i = 0; i <= 160; i++) {
    const deltaV = (i / 160) * maxDeltaV;
    const fuel = fuelMass(deltaV, dry, ve);
    const x = xScale(deltaV);
    const y = yScale(fuel);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  drawAxisTitles(plot, "Delta-v, Δv (km/s)", "Fuel Mass, m_fuel (tons)");
}

function updateAll() {
  updateScenario("A");
  updateScenario("B");
  drawDryMassPlot();
  drawDeltaVPlot();
}

document.querySelectorAll("input").forEach(input => {
  input.addEventListener("input", updateAll);
});

updateAll();