/* ============================================================
   CardioSense — app.js
   Backend: Flask  POST http://localhost:5000/predict
   Content-Type: application/x-www-form-urlencoded (FormData)
   Accept: application/json
   Response: { success, risk: "high"|"low", result, confidence }
   Fields: age, sex, cp, trestbps, chol, fbs, restecg,
           thalach, exang, oldpeak, slope, ca, thal
   ============================================================ */

const API_BASE = '';

/* ── TYPEWRITER ── */
const typewriterLines = [
  'Detect cardiovascular risk before symptoms emerge.',
  'AI-powered. Clinically calibrated. Instantly accessible.',
  '13 clinical parameters. One definitive risk score.',
  'Early detection saves lives — start your assessment today.',
];
let twLine = 0, twChar = 0, twDeleting = false, twPause = 0;
const twEl = document.getElementById('typewriter');

function typewriter() {
  if (!twEl) return;
  const current = typewriterLines[twLine];
  if (twPause > 0) { twPause--; setTimeout(typewriter, 50); return; }
  if (!twDeleting) {
    twEl.textContent = current.slice(0, ++twChar);
    if (twChar === current.length) { twPause = 50; twDeleting = true; }
    setTimeout(typewriter, 55);
  } else {
    twEl.textContent = current.slice(0, --twChar);
    if (twChar === 0) { twDeleting = false; twLine = (twLine + 1) % typewriterLines.length; twPause = 10; }
    setTimeout(typewriter, 28);
  }
}
setTimeout(typewriter, 1800);

/* ── SCROLL UTIL ── */
function scrollToAssess() {
  document.getElementById('assess').scrollIntoView({ behavior: 'smooth' });
}

/* ── MULTI-STEP FORM ── */
let currentPage = 1;

function goToPage(num) {
  // Validate current page before advancing
  if (num > currentPage) {
    const pageEl = document.getElementById(`page-${currentPage}`);
    const inputs = pageEl.querySelectorAll('input[required], select[required]');
    for (const inp of inputs) {
      if (!inp.value || inp.value === '') {
        inp.focus();
        inp.classList.add('error-shake');
        setTimeout(() => inp.classList.remove('error-shake'), 500);
        showToast('Please fill in all fields before continuing.');
        return;
      }
    }
  }
// Disable inputs in current page
  
  document.getElementById(`page-${currentPage}`).classList.remove('active');
  document.querySelectorAll('.form-step').forEach(s => {
    s.classList.remove('active', 'done');
    const stepNum = parseInt(s.dataset.step);
    if (stepNum < num) s.classList.add('done');
    if (stepNum === num) s.classList.add('active');
  });

  currentPage = num;
  const nextPage = document.getElementById(`page-${num}`);
  nextPage.classList.add('active','page-enter');
  setTimeout(() => nextPage.classList.remove('page-enter'), 400);
}

/* ── TOAST ── */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ── TOGGLE BUTTONS ── */
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.field;
    document.querySelectorAll(`.toggle-btn[data-field="${field}"]`)
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const hidden = document.querySelector(`input[name="${field}"]`);
    if (hidden) hidden.value = btn.dataset.val;
  });
});

/* ── FORM SUBMIT → Flask API ── */
const form       = document.getElementById('risk-form');
const submitBtn  = document.getElementById('submit-btn');
const btnText    = document.getElementById('btn-text');
const btnLoader  = document.getElementById('btn-loader');
const resultPanel = document.getElementById('result-panel');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Build FormData — Flask reads request.form, not JSON
  const formData = new FormData(form);

  // Loading state
  submitBtn.disabled = true;
  btnText.textContent = 'Analysing…';
  btnLoader.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        // DO NOT set Content-Type — let browser set multipart boundary for FormData
        // Flask reads request.form from URL-encoded or multipart
      },
      body: new URLSearchParams(formData), // send as application/x-www-form-urlencoded
    });

    const result = await res.json();
    console.log("Response received:", result);

    if (!result.success) {
      // Validation errors from Flask
      const msgs = result.errors
        ? result.errors.map(e => e.message).join('\n')
        : 'Validation failed. Please check your inputs.';
      showError(msgs);
      return;
    }

    showResult(result);

  } catch (err) {
    console.error('API error:', err);
    showError(`Could not reach backend at ${API_BASE}/predict\n\nMake sure Flask is running:\n  python app.py`);
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Analyse Risk';
    btnLoader.classList.add('hidden');
  }
});

/* ── RENDER RESULT ── */
// Flask returns: { success: true, risk: "high"|"low", result: "...", confidence: 87.3 }
function showResult(data) {
  const isHigh   = data.risk === 'high';
  const level    = isHigh ? 'High' : 'Low';
  const score    = { Critical: 92, High: 70, Moderate: 45, Low: 18 }[level];
  const color    = { Critical: '#e8112d', High: '#f97316', Moderate: '#f59e0b', Low: '#22c55e' }[level];

  // Hide form, show result
  form.style.display = 'none';
  resultPanel.classList.remove('hidden');

  // Animate gauge  (arc length ~251)
  const offset = 251 - (score / 100) * 251;
  setTimeout(() => {
    document.getElementById('gauge-arc').style.strokeDashoffset = offset;
  }, 80);

  // Count-up percentage
  const pctEl   = document.getElementById('gauge-pct');
  const labelEl = document.getElementById('gauge-risk-label');
  let current = 0;
  const counter = setInterval(() => {
    current = Math.min(current + Math.ceil(score / 55), score);
    pctEl.textContent = current + '%';
    if (current >= score) {
      clearInterval(counter);
      pctEl.textContent = level;
      labelEl.textContent = ' RISK LEVEL';
      labelEl.setAttribute('fill', color);
    }
  }, 20);

  // Details
  const detailsEl = document.getElementById('result-details');
  const confidence = data.confidence !== null ? `<span class="conf-badge">The Model is ${data.confidence}% confident in this result</span>` : '';

  detailsEl.innerHTML = `
    <p class="risk-headline" style="color:${color}">${level} Risk</p>
    <p class="risk-desc">${data.result}</p>
    ${confidence}
    ${getRecommendations(data.risk)}
  `;

  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function getRecommendations(risk) {
  if (risk === 'high') {
    return `<div class="risk-factors">
      <span class="risk-factor-tag">Consult a cardiologist</span>
      <span class="risk-factor-tag">Lifestyle assessment needed</span>
      <span class="risk-factor-tag">Monitor BP &amp; cholesterol</span>
      <span class="risk-factor-tag">Consider stress test</span>
    </div>`;
  }
  return `<div class="risk-factors">
    <span class="risk-factor-tag" style="border-color:rgba(34,197,94,0.3);color:#4ade80">Maintain healthy habits</span>
    <span class="risk-factor-tag" style="border-color:rgba(34,197,94,0.3);color:#4ade80">Annual check-ups advised</span>
    <span class="risk-factor-tag" style="border-color:rgba(34,197,94,0.3);color:#4ade80">Stay active</span>
  </div>`;
}

function showError(msg) {
  form.style.display = 'none';
  resultPanel.classList.remove('hidden');
  document.getElementById('result-details').innerHTML = `
    <p class="risk-headline" style="color:#f59e0b">⚠ Connection Error</p>
    <p class="risk-desc" style="white-space:pre-line">${msg}</p>
  `;
  document.getElementById('gauge-pct').textContent = '!';
  document.getElementById('gauge-risk-label').textContent = 'CHECK SERVER';
}

/* ── RESET ── */
function resetForm() {
  form.reset();
  form.style.display = '';
  resultPanel.classList.add('hidden');

  // Reset pages
  document.querySelectorAll('.form-page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-1').classList.add('active');
  currentPage = 1;

  // Reset step indicators
  document.querySelectorAll('.form-step').forEach(s => {
    s.classList.remove('active', 'done');
    if (s.dataset.step === '1') s.classList.add('active');
  });

  // Reset toggles
  const defaults = { sex: '1', fbs: '0', exang: '0' };
  for (const [field, val] of Object.entries(defaults)) {
    document.querySelectorAll(`.toggle-btn[data-field="${field}"]`)
      .forEach(b => b.classList.toggle('active', b.dataset.val === val));
    const hidden = document.querySelector(`input[name="${field}"]`);
    if (hidden) hidden.value = val;
  }

  // Reset gauge
  document.getElementById('gauge-arc').style.strokeDashoffset = '251';
  document.getElementById('gauge-pct').textContent = '—';
  document.getElementById('gauge-risk-label').textContent = 'CALCULATING';
  document.getElementById('gauge-risk-label').setAttribute('fill', 'rgba(240,237,232,0.5)');

  document.getElementById('assess').scrollIntoView({ behavior: 'smooth' });
}

/* ── SCROLL ANIMATIONS ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.service-card').forEach(card => {
  card.style.animationPlayState = 'paused';
  observer.observe(card);
});

/* ── NAV ACTIVE STATE ── */
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document.querySelectorAll('.pill-link').forEach(l => l.classList.remove('active-link'));
      const a = document.querySelector(`.pill-link[href="#${entry.target.id}"]`);
      if (a) a.classList.add('active-link');
    }
  });
}, { threshold: 0.4 });

['assess', 'services', 'emergency'].forEach(id => {
  const el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});

// Active pill style
const navStyle = document.createElement('style');
navStyle.textContent = `
  .pill-link.active-link { color: var(--text) !important; border-color: var(--border) !important; background: rgba(255,255,255,0.05) !important; }
`;
document.head.appendChild(navStyle);