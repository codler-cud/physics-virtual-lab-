/* ============================================
   SIMULATION ENGINE
   Interactive optical bench with precision scale
   ============================================ */

// --- State ---
let observations = [];
let currentObs = 1;
let laserOn = false;
let dpr = window.devicePixelRatio || 2;

// --- Canvas refs ---
let benchCanvas, benchCtx;
let screenCanvas, screenCtx;

// --- Physics constants ---
const ACTUAL_RHO = 6000; // lines/cm
const GRATING_D = 1 / ACTUAL_RHO; // cm

function initSimulation() {
    benchCanvas = document.getElementById('bench-canvas');
    benchCtx = benchCanvas.getContext('2d');
    screenCanvas = document.getElementById('screen-canvas');
    screenCtx = screenCanvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Restore any saved observations
    observations = loadObservations();
    currentObs = observations.length + 1;
    rebuildTableFromState();

    updateSimulation();
}

function resizeCanvas() {
    // High-DPI rendering for crisp visuals
    dpr = window.devicePixelRatio || 2;

    const container = benchCanvas.parentElement;
    const benchW = container.clientWidth;
    const benchH = benchCanvas.clientHeight || 280;

    benchCanvas.width = benchW * dpr;
    benchCanvas.height = benchH * dpr;
    benchCanvas.style.width = benchW + 'px';
    benchCanvas.style.height = benchH + 'px';
    benchCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const screenW = screenCanvas.clientWidth || container.clientWidth;
    const screenH = screenCanvas.clientHeight || 200;

    screenCanvas.width = screenW * dpr;
    screenCanvas.height = screenH * dpr;
    screenCanvas.style.width = screenW + 'px';
    screenCanvas.style.height = screenH + 'px';
    screenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    updateSimulation();
}

// --- Laser Toggle ---
function toggleLaser() {
    laserOn = document.getElementById('laser-toggle').checked;
    const badge = document.getElementById('laser-status-badge');
    if (laserOn) {
        badge.textContent = 'ON';
        badge.className = 'laser-status on';
    } else {
        badge.textContent = 'OFF';
        badge.className = 'laser-status off';
    }
    updateSimulation();
}

function updateSimulation() {
    const D = parseFloat(document.getElementById('slider-D').value);
    const lambda_nm = parseFloat(document.getElementById('slider-lambda').value);

    document.getElementById('readout-D').textContent = D;
    document.getElementById('readout-lambda').textContent = lambda_nm;

    const lambda_cm = lambda_nm * 1e-7;
    const sinTheta = lambda_cm / GRATING_D;
    const theta = Math.asin(Math.min(sinTheta, 1));
    const x_theory = D * Math.tan(theta);

    document.getElementById('readout-theta').textContent = laserOn ? (theta * 180 / Math.PI).toFixed(2) : '--';

    drawBench(D, lambda_nm, x_theory);
    drawScreen(lambda_nm, x_theory, D);
}

// --- Main Bench Drawing ---
function drawBench(D, lambda_nm, x_theory) {
    const W = benchCanvas.width / dpr;
    const H = benchCanvas.height / dpr;
    const ctx = benchCtx;
    ctx.clearRect(0, 0, W, H);

    const midY = H * 0.45;
    const laserX = 60;
    const gratingX = W * 0.25;
    const screenX = W * 0.85;

    // Bench rail
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(30, midY + 50);
    ctx.lineTo(W - 30, midY + 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.fillStyle = '#78716c';
    ctx.textAlign = 'center';

    // --- Laser ---
    const laserGrad = ctx.createLinearGradient(laserX - 25, midY - 14, laserX + 25, midY + 14);
    laserGrad.addColorStop(0, '#44403c');
    laserGrad.addColorStop(1, '#292524');
    ctx.fillStyle = laserGrad;
    roundRect(ctx, laserX - 25, midY - 14, 50, 28, 6);
    ctx.fill();

    // Laser aperture (glows when on)
    ctx.fillStyle = laserOn ? '#ef4444' : '#78716c';
    ctx.shadowBlur = laserOn ? 10 : 0;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(laserX + 25, midY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#78716c';
    ctx.fillText('LASER', laserX, midY + 50 + 18);

    // --- Grating ---
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gratingX, midY - 35);
    ctx.lineTo(gratingX, midY + 35);
    ctx.stroke();

    // Grating lines
    for (let i = -5; i <= 5; i++) {
        ctx.strokeStyle = 'rgba(168, 162, 158, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gratingX - 3, midY + i * 6);
        ctx.lineTo(gratingX + 3, midY + i * 6);
        ctx.stroke();
    }

    ctx.fillStyle = '#78716c';
    ctx.fillText('GRATING', gratingX, midY + 50 + 18);

    // --- Screen ---
    ctx.fillStyle = '#f5f5f4';
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 2;
    roundRect(ctx, screenX - 4, midY - 60, 8, 120, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78716c';
    ctx.fillText('SCREEN', screenX, midY + 50 + 18);

    // --- D arrow ---
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(gratingX, midY + 70);
    ctx.lineTo(screenX, midY + 70);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#c2410c';
    ctx.font = '700 12px Outfit, sans-serif';
    ctx.fillText('D = ' + D + ' cm', (gratingX + screenX) / 2, midY + 85);

    // --- Laser Beams (only when ON) ---
    if (laserOn) {
        const hue = Math.round(((lambda_nm - 400) / 300) * -120 + 360) % 360;
        const beamColor = `hsl(${hue}, 100%, 50%)`;
        const beamGlow = `hsla(${hue}, 100%, 50%, 0.3)`;

        ctx.shadowBlur = 12;
        ctx.shadowColor = beamGlow;
        ctx.strokeStyle = beamColor;
        ctx.lineWidth = 2;

        // To grating
        ctx.beginPath();
        ctx.moveTo(laserX + 29, midY);
        ctx.lineTo(gratingX, midY);
        ctx.stroke();

        // Central beam
        ctx.beginPath();
        ctx.moveTo(gratingX, midY);
        ctx.lineTo(screenX, midY);
        ctx.stroke();

        // Diffracted beams
        const pixelsPerCm = (screenX - gratingX) / D;
        const spotOffset = x_theory * pixelsPerCm;

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gratingX, midY);
        ctx.lineTo(screenX, midY - spotOffset);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(gratingX, midY);
        ctx.lineTo(screenX, midY + spotOffset);
        ctx.stroke();

        // Spots on screen
        ctx.shadowBlur = 18;
        ctx.fillStyle = beamColor;

        ctx.beginPath();
        ctx.arc(screenX, midY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX, midY - spotOffset, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX, midY + spotOffset, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    } else {
        // Laser OFF label
        ctx.fillStyle = '#a8a29e';
        ctx.font = '500 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Turn on the laser to begin', (gratingX + screenX) / 2, midY - 5);
    }
}

// --- Screen close-up with ruler ---
function drawScreen(lambda_nm, x_theory, D) {
    const W = screenCanvas.width / dpr;
    const H = screenCanvas.height / dpr;
    const ctx = screenCtx;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, W, H);

    if (!laserOn) {
        // Dark screen with "Laser OFF" label
        ctx.fillStyle = '#44403c';
        ctx.font = '500 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Laser is OFF — No pattern visible', W / 2, H / 2);
        return;
    }

    const midX = W / 2;
    const midY = H * 0.45;

    // Scale: -10 to +10 cm, centered at 0
    const halfRange = 10; // cm on each side
    const pxPerCm = W / (halfRange * 2);

    // Ruler baseline
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(W, H - 40);
    ctx.stroke();

    ctx.font = '600 9px Outfit, sans-serif';
    ctx.textAlign = 'center';

    // Draw ticks from -10 to +10 (200 mm ticks total)
    for (let mm = -halfRange * 10; mm <= halfRange * 10; mm++) {
        const cmVal = mm / 10; // actual cm value (-10 to +10)
        const px = midX + cmVal * pxPerCm;
        const isCm = mm % 10 === 0;
        const isHalf = mm % 5 === 0;

        ctx.strokeStyle = isCm ? (mm === 0 ? '#fbbf24' : '#a8a29e') : '#44403c';
        ctx.lineWidth = isCm ? (mm === 0 ? 2 : 1.5) : 0.5;
        ctx.beginPath();
        ctx.moveTo(px, H - 40);
        ctx.lineTo(px, H - 40 + (isCm ? 18 : isHalf ? 12 : 6));
        ctx.stroke();

        if (isCm) {
            const label = Math.abs(cmVal); // show 0,1,2...10 on both sides
            ctx.fillStyle = mm === 0 ? '#fbbf24' : '#a8a29e';
            ctx.fillText(label, px, H - 8);
        }
    }

    // CM label
    ctx.fillStyle = '#78716c';
    ctx.font = '500 8px Lato, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('cm', W - 5, H - 8);
    ctx.textAlign = 'center';

    // Spots — positioned directly as ±x_theory from center
    const hue = Math.round(((lambda_nm - 400) / 300) * -120 + 360) % 360;
    const spotColor = `hsl(${hue}, 100%, 55%)`;

    const spotLeftPx = midX - x_theory * pxPerCm;
    const spotRightPx = midX + x_theory * pxPerCm;

    // Glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = spotColor;
    ctx.fillStyle = spotColor;

    // Central max (at 0)
    ctx.beginPath();
    ctx.arc(midX, midY, 7, 0, Math.PI * 2);
    ctx.fill();

    // First order spots
    ctx.beginPath();
    ctx.arc(spotLeftPx, midY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(spotRightPx, midY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Measurement guide lines
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;

    [spotLeftPx, midX, spotRightPx].forEach(px => {
        ctx.beginPath();
        ctx.moveTo(px, midY + 12);
        ctx.lineTo(px, H - 40);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // Value labels — show direct distance from center
    ctx.font = '700 10px Outfit, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('x₁ ≈ ' + x_theory.toFixed(1), spotLeftPx, midY + 28);
    ctx.fillText('0', midX, midY - 16);
    ctx.fillText('x₂ ≈ ' + x_theory.toFixed(1), spotRightPx, midY + 28);

    // Title
    ctx.fillStyle = '#78716c';
    ctx.font = '600 10px Outfit, sans-serif';
    ctx.fillText('SCREEN VIEW  •  Center is 0. Read x₁ and x₂ as distance from center.', W / 2, 16);
}

// --- Observation Table ---
function lockRow() {
    if (currentObs > 3) return;

    const dEl = document.getElementById('inp-d-' + currentObs);
    const x1El = document.getElementById('inp-x1-' + currentObs);
    const x2El = document.getElementById('inp-x2-' + currentObs);

    if (!dEl || !x1El || !x2El) return;

    const D = parseFloat(dEl.value);
    const x1 = parseFloat(x1El.value);
    const x2 = parseFloat(x2El.value);

    if (isNaN(D) || isNaN(x1) || isNaN(x2) || D <= 0) {
        alert('Please enter valid values for D, x₁, and x₂.');
        return;
    }

    // Disable inputs
    dEl.disabled = true;
    x1El.disabled = true;
    x2El.disabled = true;

    // Change button
    const btn = document.getElementById('lock-btn-' + currentObs);
    btn.textContent = '✓ Locked';
    btn.disabled = true;
    btn.style.background = '#0d9488';

    // Store
    observations.push({ D, x1, x2, lambda: parseFloat(document.getElementById('slider-lambda').value) });
    saveObservations(observations);

    currentObs++;

    if (currentObs <= 3) {
        addTableRow(currentObs);
    } else {
        // Show proceed
        document.getElementById('obs-status').textContent = 'All 3 observations recorded!';
        document.getElementById('obs-status').style.color = '#0d9488';
        document.getElementById('proceed-results-btn').style.display = 'inline-flex';
    }
}

function addTableRow(num) {
    const defaults = { 1: 15, 2: 20, 3: 25 };
    const tbody = document.getElementById('obs-tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${num}</td>
        <td><input type="number" id="inp-d-${num}" value="${defaults[num] || 15}" min="5" max="50"></td>
        <td><input type="number" id="inp-x1-${num}" step="0.1" placeholder="Read x₁"></td>
        <td><input type="number" id="inp-x2-${num}" step="0.1" placeholder="Read x₂"></td>
        <td><button class="btn btn-primary btn-sm" id="lock-btn-${num}" onclick="lockRow()">Lock ✓</button></td>
    `;
    tbody.appendChild(row);
}

function rebuildTableFromState() {
    if (observations.length === 0) return;

    const tbody = document.getElementById('obs-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    observations.forEach((obs, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td><input type="number" value="${obs.D}" disabled></td>
            <td><input type="number" value="${obs.x1}" disabled></td>
            <td><input type="number" value="${obs.x2}" disabled></td>
            <td><button class="btn btn-sm" style="background:#0d9488;color:white;" disabled>✓ Locked</button></td>
        `;
        tbody.appendChild(row);
    });

    if (observations.length < 3) {
        currentObs = observations.length + 1;
        addTableRow(currentObs);
    } else {
        document.getElementById('obs-status').textContent = 'All 3 observations recorded!';
        document.getElementById('obs-status').style.color = '#0d9488';
        document.getElementById('proceed-results-btn').style.display = 'inline-flex';
    }
}

function resetObservations() {
    observations = [];
    currentObs = 1;
    clearObservations();

    const tbody = document.getElementById('obs-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    addTableRow(1);

    document.getElementById('obs-status').textContent = '';
    document.getElementById('proceed-results-btn').style.display = 'none';
}

// --- Utility ---
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', initSimulation);
