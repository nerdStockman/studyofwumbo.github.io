const defaults = {
  years: 10,
  marketReturn: 7
};

const fixed = {
  incomeTax: 25,
  gainsTax: 15,
  paycheck: 2333.33,
  expense: 1000
};

const inputs = {
  years: document.getElementById('yearsInput'),
  marketReturn: document.getElementById('returnInput')
};

const labels = {
  years: document.getElementById('yearsValue'),
  marketReturn: document.getElementById('returnValue')
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function brokerageEnding(principal, growthFactor, gainsTaxRate) {
  if (principal <= 0) return Math.max(0, principal);
  const gains = principal * (growthFactor - 1);
  return principal + gains * (1 - gainsTaxRate);
}

function cleanTiny(value) {
  return Math.abs(value) < 0.01 ? 0 : value;
}

function calculateAt(years) {
  const marketReturn = (Number(inputs.marketReturn.value) || 0) / 100;
  const incomeTax = fixed.incomeTax / 100;
  const gainsTax = fixed.gainsTax / 100;
  const paycheck = fixed.paycheck;
  const expense = fixed.expense;
  const growthFactor = Math.pow(1 + marketReturn, years);

  // 1) No HSA
  const baselineTax = paycheck * incomeTax;
  const baselineAfterTaxPay = paycheck - baselineTax;
  const baselineBrokerageInitial = Math.max(0, baselineAfterTaxPay - expense);
  const baselineBrokerageEnding = brokerageEnding(baselineBrokerageInitial, growthFactor, gainsTax);

  // HSA contribution is the qualified medical expense in both HSA scenarios.
  const hsaContribution = expense;
  const hsaTaxablePay = Math.max(0, paycheck - hsaContribution);
  const hsaPaycheckTax = hsaTaxablePay * incomeTax;
  const hsaAfterTaxPay = hsaTaxablePay - hsaPaycheckTax;

  // 2) HSA Direct Pay
  const directHsaWithdrawalYear0 = hsaContribution;
  const directBrokerageInitial = Math.max(0, hsaAfterTaxPay);
  const directBrokerageEnding = brokerageEnding(directBrokerageInitial, growthFactor, gainsTax);

  // 3) HSA Receipt Hoarding
  const hoardBrokerageInitial = Math.max(0, cleanTiny(hsaAfterTaxPay - expense));
  const hoardHsaInitial = hsaContribution;
  const hoardBrokerageEnding = brokerageEnding(hoardBrokerageInitial, growthFactor, gainsTax);
  const hoardHsaEnding = hoardHsaInitial * growthFactor;

  return {
    years,
    marketReturn,
    incomeTax,
    gainsTax,
    paycheck,
    expense,
    baseline: {
      grossPaycheck: paycheck,
      pretaxHsaInvestment: 0,
      paycheckTax: baselineTax,
      afterTaxPaycheck: baselineAfterTaxPay,
      medicalBillPayment: expense,
      hsaWithdrawalYear0: 0,
      brokerageInitial: baselineBrokerageInitial,
      hsaRemainingYear0: 0,
      brokerageEnding: baselineBrokerageEnding,
      hsaEnding: 0,
      ending: baselineBrokerageEnding
    },
    direct: {
      grossPaycheck: paycheck,
      pretaxHsaInvestment: hsaContribution,
      paycheckTax: hsaPaycheckTax,
      afterTaxPaycheck: hsaAfterTaxPay,
      medicalBillPayment: expense,
      hsaWithdrawalYear0: directHsaWithdrawalYear0,
      brokerageInitial: directBrokerageInitial,
      hsaRemainingYear0: 0,
      brokerageEnding: directBrokerageEnding,
      hsaEnding: 0,
      ending: directBrokerageEnding
    },
    hoard: {
      grossPaycheck: paycheck,
      pretaxHsaInvestment: hsaContribution,
      paycheckTax: hsaPaycheckTax,
      afterTaxPaycheck: hsaAfterTaxPay,
      medicalBillPayment: expense,
      hsaWithdrawalYear0: 0,
      brokerageInitial: hoardBrokerageInitial,
      hsaRemainingYear0: hoardHsaInitial,
      brokerageEnding: hoardBrokerageEnding,
      hsaEnding: hoardHsaEnding,
      ending: hoardBrokerageEnding + hoardHsaEnding
    }
  };
}

function calculate() {
  const years = Math.max(0, Number(inputs.years.value) || 0);
  return calculateAt(years);
}

function flowLine(label, value, className = '') {
  return `<div class="flow-line ${className}"><span>${label}</span><strong>${value}</strong></div>`;
}

function signedMoney(value) {
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${money.format(Math.abs(value))}`;
}

function outflow(value) {
  return value > 0 ? `−${money.format(value)}` : money.format(0);
}

function renderYear0(s) {
  return (
    flowLine('Gross paycheck', money.format(s.grossPaycheck)) +
    flowLine('Pre-tax HSA investment', money.format(s.pretaxHsaInvestment)) +
    flowLine('Tax on paycheck', outflow(s.paycheckTax)) +
    flowLine('After-tax paycheck', money.format(s.afterTaxPaycheck)) +
    flowLine('Medical bill payment', outflow(s.medicalBillPayment)) +
    flowLine('Withdrawal from HSA', outflow(s.hsaWithdrawalYear0)) +
    flowLine('Remainder invested in brokerage', money.format(s.brokerageInitial)) +
    flowLine('Remaining in HSA', money.format(s.hsaRemainingYear0))
  );
}

function renderYearEnd(s) {
  return (
    flowLine('After-tax withdrawal from brokerage', money.format(s.brokerageEnding)) +
    flowLine('Tax-free withdrawal from HSA', money.format(s.hsaEnding)) +
    flowLine('Total value', money.format(s.ending), 'total-line')
  );
}

function drawBenefitChart() {
  const canvas = document.getElementById('benefitChart');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(320, rect.width);
  const height = Math.max(240, rect.height);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const years = Math.max(1, Number(inputs.years.value) || 1);
  const points = [];
  for (let year = 0; year <= years; year++) {
    const r = calculateAt(year);
    points.push({
      year,
      direct: r.direct.ending - r.baseline.ending,
      hoard: r.hoard.ending - r.baseline.ending
    });
  }

  const maxValue = Math.max(1, ...points.flatMap(p => [p.direct, p.hoard]));
  const yMax = maxValue * 1.12;
  const pad = { left: 66, right: 24, top: 22, bottom: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const x = year => pad.left + (year / years) * plotW;
  const y = value => pad.top + plotH - (value / yMax) * plotH;

  const styles = getComputedStyle(document.documentElement);
  const directColor = styles.getPropertyValue('--direct').trim() || '#7dd3fc';
  const hoardColor = styles.getPropertyValue('--hoard').trim() || '#facc15';

  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  // Horizontal grid and dollar labels.
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const value = yMax * i / gridLines;
    const py = y(value);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(width - pad.right, py);
    ctx.stroke();

    ctx.fillStyle = '#b9b3d0';
    ctx.textAlign = 'right';
    ctx.fillText(money.format(value), pad.left - 10, py);
  }

  // X-axis labels.
  const xStep = years <= 12 ? 1 : years <= 24 ? 2 : 5;
  for (let year = 0; year <= years; year += xStep) {
    const px = x(year);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = '#b9b3d0';
    ctx.textAlign = 'center';
    ctx.fillText(String(year), px, height - 23);
  }
  if (years % xStep !== 0) {
    ctx.fillStyle = '#b9b3d0';
    ctx.textAlign = 'center';
    ctx.fillText(String(years), x(years), height - 23);
  }

  ctx.fillStyle = '#b9b3d0';
  ctx.textAlign = 'center';
  ctx.fillText('Years', pad.left + plotW / 2, height - 8);

  function plotLine(key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = x(p.year);
      const py = y(p[key]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    points.forEach(p => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x(p.year), y(p[key]), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  plotLine('direct', directColor);
  plotLine('hoard', hoardColor);
}

function update() {
  labels.years.textContent = `${inputs.years.value} ${Number(inputs.years.value) === 1 ? 'year' : 'years'}`;
  labels.marketReturn.textContent = `${Number(inputs.marketReturn.value).toFixed(1)}%`;

  const r = calculate();
  const directAdvantage = r.direct.ending - r.baseline.ending;
  const hoardAdvantage = r.hoard.ending - r.baseline.ending;

  document.getElementById('baselineYear0').innerHTML = renderYear0(r.baseline);
  document.getElementById('directYear0').innerHTML = renderYear0(r.direct);
  document.getElementById('hoardYear0').innerHTML = renderYear0(r.hoard);

  document.getElementById('baselineYearEnd').innerHTML = renderYearEnd(r.baseline);
  document.getElementById('directYearEnd').innerHTML = renderYearEnd(r.direct);
  document.getElementById('hoardYearEnd').innerHTML = renderYearEnd(r.hoard);

  ['baselineEndTitle', 'directEndTitle', 'hoardEndTitle'].forEach(id => {
    document.getElementById(id).textContent = `Year ${r.years}`;
  });

  document.getElementById('directComparison').textContent = `${signedMoney(directAdvantage)} vs baseline`;
  document.getElementById('hoardComparison').textContent = `${signedMoney(hoardAdvantage)} vs baseline`;

  drawBenefitChart();
}

Object.values(inputs).forEach(input => input.addEventListener('input', update));

window.addEventListener('resize', () => {
  clearTimeout(window.__hsaResizeTimer);
  window.__hsaResizeTimer = setTimeout(drawBenefitChart, 80);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  inputs.years.value = defaults.years;
  inputs.marketReturn.value = defaults.marketReturn;
  update();
});

update();
