// ===== Nimma Saathi · Bengaluru effects: sounds, petals, splash, interactive skyline =====
(() => {
  const $ = (s) => document.querySelector(s);
  let ctx;
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

  // --- tiny synth -----------------------------------------------------------
  function tone({ type = 'square', f = 440, f2, t = 0.15, at = 0, vol = 0.12, lp }) {
    const a = ac(), now = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + t);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    let node = o;
    if (lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(g); g.connect(a.destination); o.start(now); o.stop(now + t + 0.05);
  }
  function noise({ t = 0.4, at = 0, vol = 0.08, hp = 800 }) {
    const a = ac(), len = a.sampleRate * t, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(a.currentTime + at);
  }
  const sound = {
    honk: () => { tone({ f: 392, t: 0.13, lp: 1800 }); tone({ f: 392, t: 0.2, at: 0.18, lp: 1800 }); },
    busHorn: () => { tone({ type: 'sawtooth', f: 220, t: 0.5, vol: 0.08, lp: 900 }); tone({ type: 'sawtooth', f: 277, t: 0.5, vol: 0.06, lp: 900 }); },
    moo: () => tone({ type: 'sawtooth', f: 160, f2: 95, t: 0.9, vol: 0.12, lp: 600 }),
    ding: () => { tone({ type: 'sine', f: 880, t: 0.15, vol: 0.15 }); tone({ type: 'sine', f: 1320, t: 0.25, at: 0.1, vol: 0.12 }); },
    buzz: () => tone({ type: 'square', f: 120, t: 0.3, vol: 0.08, lp: 700 }),
    whoosh: () => noise({ t: 0.6, vol: 0.12, hp: 1200 }),
    chime: () => [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f, t: 0.3, at: i * 0.09, vol: 0.1 })),
    thunder: () => noise({ t: 1.4, vol: 0.18, hp: 60 }),
  };

  // --- gulmohar petal burst -----------------------------------------------
  function petals(x = innerWidth / 2, y = innerHeight / 2.4, n = 36) {
    const colors = ['#E4002B', '#FF6A2B', '#FFD000', '#1E9E57', '#7B3FA0'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'); p.className = 'petal-burst';
      const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 260;
      p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); p.style.setProperty('--dy', Math.sin(ang) * dist + 120 + 'px');
      p.style.setProperty('--r', Math.random() * 720 + 'deg'); p.style.animationDelay = Math.random() * 0.08 + 's';
      document.body.appendChild(p); setTimeout(() => p.remove(), 1700);
    }
  }

  // --- splash: traffic jam that clears on green ----------------------------
  function splash() {
    const sp = $('#splash'); if (!sp) return;
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.has('nosplash')) { sp.remove(); return; }
    const lines = ['Loading Bengaluru… swalpa adjust maadi', 'Stuck at Silk Board, almost there…', 'Asking the auto anna for directions…', 'Brewing filter coffee…'];
    let li = 0; const lt = setInterval(() => { const el = $('#spLine'); if (el) el.textContent = lines[++li % lines.length]; }, 700);
    const steps = [[0, 'red'], [900, 'yellow'], [1600, 'green']];
    steps.forEach(([ms, c]) => setTimeout(() => { sp.dataset.light = c; if (c === 'green') sp.classList.add('go'); }, ms));
    const end = () => { clearInterval(lt); sp.classList.add('out'); setTimeout(() => sp.remove(), 700); };
    const t = setTimeout(end, 2500);
    $('#spSkip').onclick = () => { clearTimeout(t); end(); };
  }

  // --- interactive skyline -------------------------------------------------
  function rain(on = true) {
    const hero = $('#hero'), box = $('#rainfx'); if (!hero || !box) return;
    if (!on) { hero.classList.remove('raining'); box.innerHTML = ''; return; }
    if (hero.classList.contains('raining')) return;
    hero.classList.add('raining'); box.innerHTML = '';
    for (let i = 0; i < 90; i++) {
      const d = document.createElement('i');
      d.style.left = Math.random() * 105 + '%'; d.style.animationDelay = Math.random() * 1.2 + 's'; d.style.animationDuration = 0.5 + Math.random() * 0.4 + 's';
      box.appendChild(d);
    }
    try { sound.thunder(); } catch {}
    window.toastFx?.('Bengaluru rain! Carry an umbrella, traffic just doubled');
    clearTimeout(rain._t); rain._t = setTimeout(() => rain(false), 7000);
  }
  function setNight(on) {
    const hero = $('#hero'); if (!hero) return;
    hero.classList.toggle('night', on);
    const b = $('#fxNight'); if (b) b.textContent = on ? '☀️' : '🌙';
  }
  function hop(el) { el.classList.remove('hopping'); void el.getBoundingClientRect(); el.classList.add('hopping'); }

  function heroInit() {
    const hero = $('#hero'); if (!hero) return;
    const h = new Date().getHours(); setNight(h >= 19 || h < 6 || location.hash.includes('night'));
    hero.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      const act = t.dataset.act;
      try {
        if (act === 'auto') { sound.honk(); hop(t.querySelector('.hop') || t); window.toastFx?.('Poom poom! Meter haaki, anna'); }
        if (act === 'bus') { sound.busHorn(); hop(t); window.toastFx?.('BMTC 500D to Whitefield. Swalpa adjust maadi!'); }
        if (act === 'cow') { sound.moo(); hop(t); window.toastFx?.('The real traffic police of Bengaluru'); }
        if (act === 'rain') rain(true);
        if (act === 'metro') { sound.whoosh(); window.toastFx?.('Namma Metro: mind the gap, ಬಾಗಿಲು ಬಲಕ್ಕೆ ತೆರೆಯುತ್ತದೆ'); }
        if (act === 'vs') { sound.chime(); hero.classList.add('lit'); setTimeout(() => hero.classList.remove('lit'), 3500); petals(e.clientX, e.clientY, 24); window.toastFx?.('Vidhana Soudha, lit up like a Sunday evening'); }
        if (act === 'hc') { sound.ding(); hop(t); window.toastFx?.('Attara Kacheri: the red High Court building facing Vidhana Soudha'); }
      } catch {}
    });
    $('#fxNight')?.addEventListener('click', () => { setNight(!hero.classList.contains('night')); try { sound.ding(); } catch {} });
    $('#fxRain')?.addEventListener('click', () => rain(true));
    $('#fxHonk')?.addEventListener('click', () => { try { sound.honk(); } catch {} hero.querySelectorAll('.veh .hop, .veh.bus').forEach(hop); });
    // parallax
    const layers = [...hero.querySelectorAll('.layer')];
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((l) => { const d = +l.dataset.depth; l.style.transform = `translate(${-x * 24 * d}px, ${-y * 8 * d}px)`; });
    });
    hero.addEventListener('mouseleave', () => layers.forEach((l) => (l.style.transform = '')));
  }

  function setLed(items) {
    const el = $('#ledText'); if (!el || !items?.length) return;
    const txt = items.map(([en, kn, roman]) => `<span class="kn">${kn}</span> <em>${roman}</em> <u>${en}</u>`).join('<b>✦</b>');
    el.innerHTML = txt + '<b>✦</b>' + txt;
    el.style.animationDuration = Math.max(30, items.length * 5) + 's';
  }

  window.fx = { sound, petals, rain, setNight, setLed };
  document.addEventListener('DOMContentLoaded', () => { splash(); heroInit(); });
})();
