function fuelMass(deltaV, dryMass, payloadMass, exhaustVelocity) {
  if (
    deltaV < 0 ||
    dryMass < 0 ||
    payloadMass < 0 ||
    exhaustVelocity <= 0
  ) {
    return NaN;
  }

  const finalMass = dryMass + payloadMass;
  const massRatio = Math.exp(deltaV / exhaustVelocity);
  return finalMass * (massRatio - 1);
}

function formatTons(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return "0.0";
  }

  if (Math.abs(value) >= 100) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 0
    });
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function updateScenario(letter) {
  const deltaV = Number(document.getElementById(`dv${letter}`).value);
  const dryMass = Number(document.getElementById(`dry${letter}`).value);
  const payloadMass = Number(document.getElementById(`payload${letter}`).value);
  const exhaustVelocity = Number(document.getElementById(`ve${letter}`).value);

  const fuel = fuelMass(deltaV, dryMass, payloadMass, exhaustVelocity);
  document.getElementById(`fuel${letter}`).textContent = formatTons(fuel);
}

function updateAll() {
  updateScenario("A");
  updateScenario("B");
}

document.querySelectorAll("input").forEach(input => {
  input.addEventListener("input", updateAll);
});

updateAll();