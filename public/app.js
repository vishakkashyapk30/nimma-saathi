// ===== Nimma Saathi · client =====
const $ = (s) => document.querySelector(s);
const LANGS = {
  'en-IN': 'English', 'hi-IN': 'हिन्दी Hindi', 'ta-IN': 'தமிழ் Tamil', 'te-IN': 'తెలుగు Telugu', 'ml-IN': 'മലയാളം Malayalam',
  'bn-IN': 'বাংলা Bengali', 'mr-IN': 'मराठी Marathi', 'gu-IN': 'ગુજરાતી Gujarati', 'pa-IN': 'ਪੰਜਾਬੀ Punjabi', 'od-IN': 'ଓଡ଼ିଆ Odia',
};
const langShort = (c) => LANGS[c].split(' ').pop();
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('ns_' + k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem('ns_' + k, JSON.stringify(v)),
};
let profile = store.get('profile', null);
let trip = store.get('trip', { stay: '', diet: '', notes: '', memories: [] });
let myPhrases = store.get('mine', []);
let progress = store.get('progress', {});
let stats = store.get('stats', { xp: 0, streak: 0, last: '' });
let chatHistory = [];
let DATA = { decks: {}, slang: [], numbers: [], scenarios: {} };
const audioCache = new Map();
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function confetti() {
  const colors = ['#6B2FA0', '#00A651', '#FFC72C', '#E0393E'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = '50%'; c.style.top = '40%'; c.style.background = colors[i % 4];
    c.style.setProperty('--dx', (Math.random() * 600 - 300) + 'px'); c.style.setProperty('--dy', (Math.random() * 500 - 250) + 'px');
    document.body.appendChild(c); setTimeout(() => c.remove(), 1400);
  }
}
async function api(path, body) {
  const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => ({ error: 'Network hiccup, please retry' }));
  if (!r.ok || d.error) throw new Error(d.error || 'Request failed');
  return d;
}
function loader(parent, text) {
  const el = document.createElement('div'); el.className = 'loading';
  el.innerHTML = `<div class="track"></div><span>${esc(text)}</span>`;
  parent.appendChild(el); parent.scrollTop = parent.scrollHeight; return el;
}

// ===== Audio =====
function playB64(b64) { if (b64) new Audio('data:audio/wav;base64,' + b64).play().catch(() => {}); }
async function say(kannada, b64, slow) {
  if (!kannada) return;
  const key = (slow ? 'slow:' : '') + kannada;
  if (b64) audioCache.set(key, b64);
  if (!audioCache.has(key)) {
    try { audioCache.set(key, (await api('tts', { text: kannada, slow })).audio); } catch (e) { return toast('Audio failed: ' + e.message); }
  }
  playB64(audioCache.get(key));
}
let rec = null;
async function toggleRecord(btn, onDone, label = 'Listening') {
  if (rec) { rec.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Voice needs Chrome or Safari over HTTPS');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { return toast('Please allow microphone access'); }
  const chunks = []; const mr = new MediaRecorder(stream);
  rec = mr; btn.classList.add('rec');
  const ov = $('#recOverlay'); $('#recLabel').textContent = label; ov.classList.remove('hidden');
  const started = Date.now();
  const tick = setInterval(() => { $('#recTime').textContent = ((Date.now() - started) / 1000).toFixed(1) + 's'; }, 100);
  const cap = setTimeout(() => mr.state === 'recording' && mr.stop(), 20000);
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.onstop = async () => {
    clearTimeout(cap); clearInterval(tick); rec = null; btn.classList.remove('rec'); ov.classList.add('hidden');
    stream.getTracks().forEach((t) => t.stop());
    if (Date.now() - started < 700 || !chunks.length) return toast('Too short. Tap, speak, then tap Stop');
    const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
    onDone({ audio: await toB64(blob), mime: blob.type });
  };
  mr.start(250);
}
async function toB64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
$('#recStop').onclick = () => rec?.stop();

// ===== Phrase cards =====
function savePhrase(p, quiet) {
  if (!p?.kannada || myPhrases.some((m) => m.kannada === p.kannada)) return false;
  myPhrases.unshift({ english: p.english || '', kannada: p.kannada, roman: p.roman || '' });
  store.set('mine', myPhrases.slice(0, 200)); renderDecks();
  try { renderHome(); } catch {}
  if (!quiet) toast('Saved to your Learn deck');
  return true;
}
function sayCard(c, opts = {}) {
  const el = document.createElement('div'); el.className = 'say';
  el.innerHTML = `${opts.noText ? '' : `<div class="en">${esc(c.english)}</div><div class="kannada">${esc(c.kannada)}</div><div class="roman">${esc(c.roman)}</div>`}
    <div class="acts"><button data-a="play">Listen</button><button data-a="slow">Slow</button><button data-a="show">Show local</button><button data-a="save">Save</button></div>`;
  if (opts.noText) el.style.cssText = 'border:0;padding:0;background:none;margin-top:4px';
  el.querySelector('[data-a=play]').onclick = () => say(c.kannada);
  el.querySelector('[data-a=slow]').onclick = () => say(c.kannada, null, true);
  el.querySelector('[data-a=show]').onclick = () => showLocal(c.kannada, c.roman);
  el.querySelector('[data-a=save]').onclick = (e) => { savePhrase(c) || toast('Already in your deck'); e.target.textContent = 'Saved'; };
  return el;
}
function showLocal(kn, roman) {
  $('#scKn').textContent = kn; $('#scRoman').textContent = roman || '';
  $('#showcard').classList.remove('hidden'); say(kn);
}
$('#scPlay').onclick = () => say($('#scKn').textContent);
$('#scClose').onclick = () => $('#showcard').classList.add('hidden');

// ===== Tabs =====
function go(tab) {
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + tab));
}
document.querySelectorAll('#tabs button').forEach((b) => b.onclick = () => go(b.dataset.tab));

// ===== Sheets =====
function openSheet(html, onMount) {
  $('#sheetBody').innerHTML = html; $('#sheet').classList.remove('hidden'); onMount?.($('#sheetBody'));
}
function closeSheet() { $('#sheet').classList.add('hidden'); }
$('#sheet').onclick = (e) => { if (e.target.id === 'sheet') closeSheet(); };

// ===== HOME =====
function renderHome() {
  const day = Math.floor(Date.now() / 864e5);
  $('#helloName').textContent = `Namaskara, ${profile?.name || 'friend'}`;
  $('#helloSub').textContent = trip.stay ? `Staying near ${trip.stay}. Where to today?` : 'Where are we headed today?';
  const s = DATA.slang[day % (DATA.slang.length || 1)];
  if (s) {
    $('#slangCard').innerHTML = `<span class="tag">Bengaluru slang of the day</span>
      <div class="w">${esc(s[0])}<span class="kn">${esc(s[1])}</span></div>
      <button class="btn ghost" id="slangPlay">Listen</button><p>${esc(s[3])}</p>`;
    $('#slangPlay').onclick = () => say(s[1]);
  }
  const facts = [trip.stay && 'Stay: ' + trip.stay, trip.diet && 'Food: ' + trip.diet, trip.notes, ...trip.memories].filter(Boolean);
  $('#agentFacts').innerHTML = facts.length
    ? `<div class="facts">${facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>`
    : `<p class="muted" style="font-size:.84rem;margin-top:6px">Nothing yet. Tell Saathi where you are staying or what you eat, or fill in My trip on Home.</p>`;
  const recent = $('#recentList'); recent.innerHTML = '';
  if (myPhrases.length) myPhrases.slice(0, 6).forEach((p) => recent.appendChild(sayCard(p)));
  else recent.innerHTML = '<p class="recent-empty">Phrases you use in Talk, Ask Saathi and Fare check are saved here automatically, ready to practise.</p>';
  $('#tripCard').innerHTML = facts.length
    ? `<p class="muted" style="font-size:.84rem">Saathi uses this to personalise answers.</p><div class="facts">${facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>`
    : `<p class="muted" style="font-size:.86rem">Tell Saathi where you are staying and what you eat so its answers fit your trip. It also remembers things you mention in chat.</p><button class="btn" style="margin-top:10px" onclick="document.getElementById('tripEdit').click()">Add trip details</button>`;
}
document.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
document.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => ({ reader: openReader, fare: openFare, sos: openSos })[b.dataset.open]());
$('#tripEdit').onclick = () => openSheet(`<h2>My trip</h2>
  <p class="muted" style="font-size:.86rem">Saathi (the agent) reads this before every answer. Example: if you are vegetarian and staying in Indiranagar, "where should I eat?" gets veg places near you and the nearest metro.</p>
  <label>Staying near<input id="tStay" placeholder="e.g. Indiranagar, near 100 Feet Road" value="${esc(trip.stay)}"/></label>
  <label>Food preference<input id="tDiet" placeholder="e.g. vegetarian, no onion" value="${esc(trip.diet)}"/></label>
  <label>Anything else<textarea id="tNotes" rows="2" placeholder="e.g. here for 4 days, love coffee">${esc(trip.notes)}</textarea></label>
  ${trip.memories.length ? `<label>Saathi remembers<div class="facts">${trip.memories.map((m) => `<span class="fact">${esc(m)}</span>`).join('')}</div></label><button class="btn ghost" id="tForget">Clear memories</button>` : ''}
  <button class="btn" id="tSave">Save</button>`, (el) => {
  el.querySelector('#tSave').onclick = () => {
    trip.stay = el.querySelector('#tStay').value.trim(); trip.diet = el.querySelector('#tDiet').value.trim(); trip.notes = el.querySelector('#tNotes').value.trim();
    store.set('trip', trip); closeSheet(); toast('Saved. Saathi will tailor its answers to your trip');
    try { renderHome(); } catch (e) { console.error(e); }
  };
  const f = el.querySelector('#tForget'); if (f) f.onclick = () => { trip.memories = []; store.set('trip', trip); renderHome(); closeSheet(); };
});

// ----- Fare check -----
const ROUTES = [['Custom distance', 0], ['Majestic to MG Road', 5], ['MG Road to Indiranagar', 5], ['Indiranagar to Koramangala', 7], ['Majestic to Malleshwaram', 4],
  ['Jayanagar to Basavanagudi', 3], ['Koramangala to HSR Layout', 5], ['MG Road to Whitefield', 18], ['Majestic to Lalbagh', 5], ['Hebbal to Yeshwanthpur', 7]];
function fareFor(km, night) {
  const base = km <= 2 ? 36 : 36 + (km - 2) * 18; // Bengaluru auto meter: Rs 36 for first 2 km, Rs 18 per km after
  return Math.round(base * (night ? 1.5 : 1));
}
function openFare() {
  const hr = new Date().getHours();
  openSheet(`<h2>Auto fare check</h2>
    <p class="muted" style="font-size:.84rem">Based on Bengaluru meter rates: Rs 36 for the first 2 km, Rs 18 per km after, 1.5x from 10 pm to 5 am. Rates can change, so treat this as a guide.</p>
    <label>Route<select id="fRoute">${ROUTES.map(([n, k], i) => `<option value="${i}">${n}${k ? ` (~${k} km)` : ''}</option>`).join('')}</select></label>
    <div class="grid2">
      <label>Distance (km)<input id="fKm" type="number" min="1" max="60" value="5"/></label>
      <label>Driver is asking (Rs)<input id="fAsk" type="number" min="0" placeholder="e.g. 200"/></label>
    </div>
    <label style="flex-direction:row;align-items:center;gap:8px"><input id="fNight" type="checkbox" ${hr >= 22 || hr < 5 ? 'checked' : ''}/> Night fare (10 pm to 5 am)</label>
    <div id="fOut"></div>
    <h3 class="label">Kannada numbers</h3>
    <div class="nums">${DATA.numbers.map(([n, kn, r]) => `<button data-kn="${esc(kn)}"><b>${esc(kn)}</b>${n} · ${esc(r)}</button>`).join('')}</div>`, (el) => {
    const calc = () => {
      const km = Math.max(1, +el.querySelector('#fKm').value || 1);
      const night = el.querySelector('#fNight').checked;
      const fair = fareFor(km, night);
      const ask = +el.querySelector('#fAsk').value || 0;
      const offer = Math.ceil((fair * 1.1) / 10) * 10;
      let v = `<div class="verdict ok">Fair meter fare<big>about Rs ${fair}</big>Paying up to Rs ${Math.round(fair * 1.15)} is reasonable.</div>`;
      if (ask) {
        const r = ask / fair;
        v = r <= 1.15 ? `<div class="verdict ok">Rs ${ask} is fair<big>Go for it</big>The meter would be about Rs ${fair}.</div>`
          : r <= 1.5 ? `<div class="verdict mid">Rs ${ask} is a bit high<big>Counter with Rs ${offer}</big>The meter would be about Rs ${fair}.</div>`
          : `<div class="verdict bad">Rs ${ask} is overpriced<big>Ask for the meter</big>The meter would be about Rs ${fair}. Offer Rs ${offer} or find another auto.</div>`;
      }
      const out = el.querySelector('#fOut'); out.innerHTML = v;
      [{ english: 'Please put the meter', kannada: 'ಮೀಟರ್ ಹಾಕಿ', roman: 'meter haaki' },
       { english: `I will give Rs ${offer}, will you come?`, kannada: `${offer} ರೂಪಾಯಿ ಕೊಡ್ತೀನಿ, ಬರ್ತೀರಾ?`, roman: `${offer} roopaayi kodteeni, barteeraa?` },
       { english: 'Too much, reduce a little', kannada: 'ತುಂಬಾ ಜಾಸ್ತಿ, ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಿ', roman: 'tumbaa jaasti, swalpa kadime maadi' }]
        .forEach((c) => out.appendChild(sayCard(c)));
    };
    el.querySelector('#fRoute').onchange = (e) => { const k = ROUTES[e.target.value][1]; if (k) el.querySelector('#fKm').value = k; calc(); };
    ['#fKm', '#fAsk', '#fNight'].forEach((s) => el.querySelector(s).oninput = calc);
    el.querySelectorAll('.nums button').forEach((b) => b.onclick = () => say(b.dataset.kn));
    calc();
  });
}

// ----- Sign reader (Sarvam Vision) -----
async function compress(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
}
function openReader() {
  openSheet(`<h2>Read a sign or menu</h2>
    <p class="muted" style="font-size:.84rem">Snap a signboard, bus board or menu. Sarvam Vision reads the Kannada and Saathi translates it.</p>
    <label class="drop" id="rDrop">Tap to take a photo or choose one<input id="rFile" type="file" accept="image/*" capture="environment" hidden/></label>
    <div id="rOut"></div>`, (el) => {
    el.querySelector('#rFile').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const out = el.querySelector('#rOut');
      const blob = await compress(file);
      out.innerHTML = `<img class="photo" src="${URL.createObjectURL(blob)}" alt="Your photo"/>`;
      const l = loader(out, 'Sarvam Vision is reading the sign (about 5 to 15 s)');
      try {
        const d = await api('read', { image: await toB64(blob), mime: 'image/jpeg', lang: profile.lang });
        l.remove();
        if (!d.text) { out.insertAdjacentHTML('beforeend', `<p class="muted">${esc(d.note || 'No text found.')}</p>`); return; }
        out.insertAdjacentHTML('beforeend', `<h3 class="label">What it says</h3><div class="ocr kn">${esc(d.text)}</div>
          <h3 class="label">In ${esc(langShort(profile.lang))}</h3><div class="ocr">${esc(d.translation)}</div>
          <div class="row" style="margin-top:8px"><button class="btn ghost" id="rListen">Listen</button><button class="btn" id="rAsk">Ask Saathi about it</button></div>`);
        out.querySelector('#rListen').onclick = () => say(d.text.slice(0, 400));
        out.querySelector('#rAsk').onclick = () => { closeSheet(); go('agent'); ask(`I just saw this sign/menu in Bengaluru. It says (translated): "${d.translation.slice(0, 500)}". What does it mean for me, and what should I say or do?`); };
      } catch (err) { l.remove(); out.insertAdjacentHTML('beforeend', `<p class="muted">Could not read it: ${esc(err.message)}</p>`); }
    };
  });
}

// ----- Emergency -----
function openSos() {
  openSheet(`<h2>Emergency</h2>
    <a class="sos-call" href="tel:112">Call 112</a>
    <p class="muted" style="font-size:.84rem">Police 100 · Ambulance 108 · Women helpline 1091. Tap Show local to show a phrase in big text.</p>
    <div id="sosList"></div>`, (el) => {
    const list = el.querySelector('#sosList');
    (DATA.decks.emergency?.phrases || []).forEach(([english, kannada, roman]) => list.appendChild(sayCard({ english, kannada, roman })));
  });
}

// ===== TALK =====
const talkFeed = $('#talkFeed');
async function talk(direction, payload) {
  $('#talkEmpty')?.remove();
  const l = loader(talkFeed, direction === 'out' ? 'Translating to Kannada' : 'Understanding the local');
  try {
    const d = await api('talk', { direction, lang: profile.lang, ...payload });
    l.remove();
    if (d.error) return toast(d.error);
    const el = document.createElement('div');
    if (direction === 'out') {
      el.className = 'turn out';
      el.innerHTML = `<div class="who">You said</div><div class="heard">${esc(d.heard)}</div><div class="kannada">${esc(d.kannada)}</div><div class="roman">${esc(d.roman)}</div>`;
      el.appendChild(sayCard({ english: d.heard, kannada: d.kannada, roman: d.roman }, { noText: true }));
      if (d.audio) say(d.kannada, d.audio);
      savePhrase({ english: d.heard, kannada: d.kannada, roman: d.roman }, true);
    } else {
      el.className = 'turn in';
      el.innerHTML = `<div class="who">Local said</div><div class="kannada">${esc(d.heard)}</div><div class="roman">${esc(d.roman)}</div><div class="meaning">${esc(d.meaning)}</div>`;
    }
    talkFeed.appendChild(el); talkFeed.scrollTop = talkFeed.scrollHeight;
  } catch (e) { l.remove(); toast('Oops: ' + e.message); }
}
$('#micYou').onclick = () => toggleRecord($('#micYou'), (a) => talk('out', a), 'Speak in ' + langShort(profile.lang));
$('#micLocal').onclick = () => toggleRecord($('#micLocal'), (a) => talk('in', a), 'ಮಾತಾಡಿ · Local, please speak');
$('#talkForm').onsubmit = (e) => { e.preventDefault(); const t = $('#talkInput').value.trim(); if (!t) return; $('#talkInput').value = ''; talk('out', { text: t }); };
['Please use the meter', 'How much is this?', 'Stop here please', 'Where is the metro station?', 'One filter coffee please', 'I do not speak Kannada'].forEach((q) => {
  const b = document.createElement('button'); b.textContent = q; b.onclick = () => talk('out', { text: q }); $('#talkQuick').appendChild(b);
});

// ===== AGENT =====
const chatFeed = $('#chatFeed');
function addMsg(role, html) {
  const el = document.createElement('div'); el.className = 'msg ' + role;
  el.innerHTML = `${role === 'bot' ? '<div class="avatar"></div>' : ''}<div class="bubble"></div>`;
  el.querySelector('.bubble').innerHTML = html;
  chatFeed.appendChild(el); chatFeed.scrollTop = chatFeed.scrollHeight; return el;
}
const TOOL_LABEL = { translate_to_kannada: 'Translating', situation_playbook: 'Checking playbook', save_phrase: 'Saving to deck', remember: 'Remembering' };
async function ask(message) {
  $('#chatEmpty')?.remove();
  addMsg('user', esc(message));
  const l = loader(chatFeed, 'Saathi is planning and using tools');
  try {
    const d = await api('agent', { message, history: chatHistory, lang: profile.lang, name: profile.name, trip });
    l.remove();
    chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: d.reply });
    const steps = d.steps?.length ? `<div class="steps">${d.steps.map((s, i) => `<span style="animation-delay:${i * .1}s">${TOOL_LABEL[s.tool] || s.tool}${s.args?.topic ? ': ' + esc(s.args.topic) : ''}${s.args?.fact ? ': ' + esc(s.args.fact) : ''}</span>`).join('')}</div>` : '';
    const m = addMsg('bot', steps + esc(d.reply).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'));
    const bubble = m.querySelector('.bubble');
    d.cards?.forEach((c) => bubble.appendChild(sayCard(c)));
    if (d.saved?.length) d.saved.forEach((p) => savePhrase(p, true));
    if (d.memories?.length) { trip.memories = [...new Set([...trip.memories, ...d.memories])].slice(-20); store.set('trip', trip); renderHome(); }
    const note = [d.saved?.length && `${d.saved.length} phrase(s) saved to Learn`, d.memories?.length && 'trip memory updated'].filter(Boolean).join(' · ');
    if (note) toast(note);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  } catch (e) { l.remove(); addMsg('bot', 'Sorry, something went wrong: ' + esc(e.message)); }
}
$('#chatForm').onsubmit = (e) => { e.preventDefault(); const t = $('#chatInput').value.trim(); if (!t) return; $('#chatInput').value = ''; ask(t); };
$('#chatMic').onclick = () => toggleRecord($('#chatMic'), async (a) => {
  try { const d = await api('stt', { ...a, lang: 'unknown' }); if (d.transcript) ask(d.transcript); else toast('Did not catch that'); } catch (e) { toast(e.message); }
}, 'Ask Saathi');
["The auto driver won't use the meter", 'How do I order at a darshini?', "I'm staying in Indiranagar and I'm vegetarian. Where should I eat?", 'Teach me 3 phrases to make friends', 'I lost my wallet, help'].forEach((q) => {
  const b = document.createElement('button'); b.textContent = q; b.onclick = () => ask(q); $('#agentQuick').appendChild(b);
});

// ===== PRACTICE (role-play) =====
const SCENE_META = {
  auto: ['Auto ride', 'Raju the auto driver', 'Beginner', '🛺'], darshini: ['Darshini breakfast', 'Manju the waiter', 'Beginner', '☕'],
  shop: ['Street shopping', 'Lakshmamma, scarf seller', 'Intermediate', '🧣'], directions: ['Asking the way', 'Uncle at the bus stop', 'Beginner', '🚏'],
  metro: ['Metro ticket', 'Ticket counter staff', 'Beginner', '🚇'],
};
let scene = null;
function renderScenes() {
  $('#scenes').innerHTML = '';
  Object.entries(DATA.scenarios).forEach(([id, goal], i) => {
    const [title, who, lvl, ic] = SCENE_META[id] || [id, '', '', '🎭'];
    const b = document.createElement('button'); b.className = 'scene-card'; b.style.animationDelay = i * .05 + 's';
    b.innerHTML = `<span class="who-ic">${ic}</span><b>${esc(title)}</b><small>With ${esc(who)}. Goal: ${esc(goal)}.</small><span class="lvl">${lvl}</span>`;
    b.onclick = () => startScene(id);
    $('#scenes').appendChild(b);
  });
}
function charLine(d) {
  const el = document.createElement('div'); el.className = 'turn in char';
  el.innerHTML = `<div class="who">${esc(SCENE_META[scene.id]?.[1] || 'Local')}</div><div class="kannada">${esc(d.reply_kn)}</div><div class="roman">${esc(d.reply_roman)}</div>
    <div class="meaning muted" style="font-size:.85rem;font-weight:500">${esc(d.reply_meaning)}</div>`;
  el.appendChild(sayCard({ english: d.reply_meaning, kannada: d.reply_kn, roman: d.reply_roman }, { noText: true }));
  $('#sceneFeed').appendChild(el);
}
function showHint(d) {
  const h = $('#hintBox');
  if (!d.hint_kn || d.done) return h.classList.add('hidden');
  h.innerHTML = `<b>Try saying:</b> <span class="kannada">${esc(d.hint_kn)}</span> <span class="muted">(${esc(d.hint_roman)}) · ${esc(d.hint_meaning)}</span>
    <button id="hListen">Listen</button><button id="hUse">Use</button>`;
  h.classList.remove('hidden');
  h.querySelector('#hListen').onclick = () => say(d.hint_kn);
  h.querySelector('#hUse').onclick = () => { $('#sceneInput').value = d.hint_kn; $('#sceneInput').focus(); };
}
async function sceneStep(reply) {
  const feed = $('#sceneFeed');
  if (reply) {
    const me = document.createElement('div'); me.className = 'mine-line'; me.textContent = reply; feed.appendChild(me);
  }
  $('#hintBox').classList.add('hidden');
  const l = loader(feed, 'Waiting for the reply');
  try {
    const d = await api('roleplay', { scenario: scene.id, turns: scene.turns, reply, lang: profile.lang });
    l.remove();
    if (reply) scene.turns.push({ role: 'user', text: reply });
    scene.turns.push({ role: 'character', text: d.reply_kn });
    if (reply && (d.feedback || d.score != null)) {
      const fb = document.createElement('div'); fb.className = 'fb';
      fb.innerHTML = `${d.score != null ? `<b>${d.score}/10</b> · ` : ''}${esc(d.feedback || '')}`;
      feed.appendChild(fb);
      if (d.score != null) { scene.scores.push(+d.score); stats.xp += Math.round(+d.score); store.set('stats', stats); }
      const avg = scene.scores.reduce((a, b) => a + b, 0) / scene.scores.length;
      $('#sceneScore').textContent = `${avg.toFixed(1)}/10`;
    }
    charLine(d);
    if (d.audio) say(d.reply_kn, d.audio);
    showHint(d);
    if (d.done) {
      const end = document.createElement('div'); end.className = 'card'; end.style.textAlign = 'center';
      end.innerHTML = `<b>Scene complete</b><p class="muted" style="font-size:.85rem;margin:4px 0 10px">Average score ${$('#sceneScore').textContent}. Great practice!</p><button class="btn" id="again">Play again</button>`;
      feed.appendChild(end); end.querySelector('#again').onclick = () => startScene(scene.id);
      confetti(); bumpStreak(); store.set('stats', stats);
    }
    feed.scrollTop = feed.scrollHeight;
  } catch (e) { l.remove(); toast(e.message); }
}
function startScene(id) {
  scene = { id, turns: [], scores: [] };
  $('#scenePick').classList.add('hidden'); $('#scene').classList.remove('hidden');
  $('#sceneTitle').textContent = SCENE_META[id]?.[0] || id; $('#sceneScore').textContent = '–';
  $('#sceneGoal').textContent = `You are talking to ${SCENE_META[id]?.[1] || 'a local'}. Goal: ${DATA.scenarios[id] || ''}.`;
  $('#sceneFeed').innerHTML = ''; sceneStep('');
}
$('#sceneBack').onclick = () => { $('#scene').classList.add('hidden'); $('#scenePick').classList.remove('hidden'); };
$('#sceneForm').onsubmit = (e) => { e.preventDefault(); const t = $('#sceneInput').value.trim(); if (!t || !scene) return; $('#sceneInput').value = ''; sceneStep(t); };
$('#sceneMic').onclick = () => toggleRecord($('#sceneMic'), async (a) => {
  try { const d = await api('stt', { ...a, lang: 'unknown' }); if (d.transcript) sceneStep(d.transcript); else toast('Did not catch that'); } catch (e) { toast(e.message); }
}, 'Reply in Kannada');

// ===== LEARN =====
function bumpStreak() {
  const today = new Date().toDateString();
  if (stats.last !== today) {
    const y = new Date(Date.now() - 864e5).toDateString();
    stats.streak = stats.last === y ? stats.streak + 1 : 1; stats.last = today;
  }
}
function renderStats() {
  $('#stStreak').textContent = stats.streak; $('#stXp').textContent = stats.xp;
  $('#stLearned').textContent = Object.values(progress).filter((b) => b >= 3).length;
  $('#sbStreak').textContent = stats.streak; $('#sbXp').textContent = stats.xp; $('#sbSaved').textContent = myPhrases.length;
}
function deckList() {
  const list = Object.entries(DATA.decks).map(([id, d]) => ({ id, ...d, items: d.phrases.map(([english, kannada, roman]) => ({ english, kannada, roman })) }));
  list.sort((a, b) => a.level - b.level);
  const numbers = { id: 'numbers', title: 'Numbers', level: 1, items: DATA.numbers.map(([n, kannada, roman]) => ({ english: String(n), kannada, roman })), tips: ['Numbers are key for fares and bargaining.'] };
  const slang = { id: 'slang', title: 'Bengaluru slang', level: 3, items: DATA.slang.map(([w, kannada, roman, meaning]) => ({ english: meaning.split('.')[0], kannada, roman })), tips: ['Use slang with friends, not officials.'] };
  return [{ id: 'mine', title: 'My phrases', level: 0, mine: true, items: myPhrases, tips: ['Phrases from your real conversations land here automatically.'] }, ...list, numbers, slang];
}
function renderDecks() {
  const box = $('#decks'); if (!box) return; box.innerHTML = '';
  deckList().forEach((d, i) => {
    const done = d.items.filter((p) => (progress[p.kannada] || 0) >= 3).length;
    const pct = d.items.length ? Math.round((done / d.items.length) * 100) : 0;
    const b = document.createElement('button'); b.className = 'deck' + (d.mine ? ' mine' : ''); b.style.animationDelay = i * .04 + 's';
    const icon = d.icon || { mine: '⭐', numbers: '🔢', slang: '😎' }[d.id] || '📘';
    const sample = d.items[0]?.kannada || '';
    b.innerHTML = `<span class="dk-ic">${icon}</span><h3>${esc(d.title)}</h3><small>${d.mine ? d.items.length + ' saved' : 'Level ' + d.level + ' · ' + d.items.length + ' cards'} · ${pct}% mastered</small>
      <div class="sample">${esc(sample)}</div><div class="bar"><i style="width:${pct}%"></i></div>`;
    b.onclick = () => d.items.length ? study(d) : toast('Use Talk or Saathi and phrases will appear here');
    box.appendChild(b);
  });
  renderStats();
}
function similarity(a, b) {
  const n = (s) => s.replace(/[\s.,!?।'"“”\-]/g, '');
  a = n(a); b = n(b); if (!a || !b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[a.length][b.length] / Math.max(a.length, b.length);
}
function study(deck) {
  const queue = [...deck.items].sort((x, y) => (progress[x.kannada] || 0) - (progress[y.kannada] || 0));
  let idx = 0;
  const el = $('#study'); el.classList.remove('hidden');
  const tip = deck.tips?.[Math.floor(Math.random() * deck.tips.length)] || '';
  const close = () => { el.classList.add('hidden'); renderDecks(); };
  const render = () => {
    if (idx >= queue.length) {
      el.innerHTML = `<div class="top"><b>${esc(deck.title)}</b><button class="btn ghost" id="stClose">Close</button></div>
        <div class="flash"><div class="inner"><div class="face front">Deck done!<small>Come back anytime. Weaker cards show up first.</small></div></div></div>`;
      confetti(); el.querySelector('#stClose').onclick = close; return;
    }
    const p = queue[idx]; const box = progress[p.kannada] || 0;
    el.innerHTML = `<div class="top"><b>${esc(deck.title)} · ${idx + 1}/${queue.length}</b><button class="btn ghost" id="stClose">Close</button></div>
      <small class="muted">Tip: ${esc(tip)}</small>
      <div class="flash" id="fc"><div class="inner">
        <div class="face front">${esc(p.english || p.roman)}<small>Tap to flip · mastery ${box}/4</small></div>
        <div class="face back"><div class="kannada">${esc(p.kannada)}</div><div class="roman">${esc(p.roman)}</div><small>${esc(p.english)}</small></div>
      </div></div>
      <div class="score" id="score"></div>
      <div class="row"><button class="btn ghost" id="stListen">Listen</button><button class="btn ghost" id="stSlow">Slow</button><button class="btn green" id="stSay">Say it</button></div>
      <div class="row"><button class="btn ghost" id="stAgain">Again</button><button class="btn" id="stGot">Got it</button></div>`;
    const fc = el.querySelector('#fc'); fc.onclick = () => fc.classList.toggle('flipped');
    el.querySelector('#stClose').onclick = close;
    el.querySelector('#stListen').onclick = () => { fc.classList.add('flipped'); say(p.kannada); };
    el.querySelector('#stSlow').onclick = () => { fc.classList.add('flipped'); say(p.kannada, null, true); };
    el.querySelector('#stSay').onclick = (e) => toggleRecord(e.currentTarget, async (a) => {
      const s = el.querySelector('#score'); s.className = 'score'; s.textContent = 'Checking your pronunciation';
      try {
        const d = await api('stt', { ...a, lang: 'kn-IN' });
        const pct = Math.round(similarity(d.transcript || '', p.kannada) * 100);
        s.className = 'score ' + (pct >= 70 ? 'good' : pct >= 40 ? 'meh' : 'bad');
        s.textContent = `${pct >= 70 ? 'Sakkath!' : pct >= 40 ? 'Almost there' : 'Try again'} ${pct}% · heard "${d.transcript || '...'}"`;
        fc.classList.add('flipped');
        if (pct >= 70) { stats.xp += 5; confetti(); store.set('stats', stats); renderStats(); }
      } catch (err) { s.textContent = err.message; }
    }, 'Say it in Kannada');
    const next = () => { bumpStreak(); store.set('progress', progress); store.set('stats', stats); renderStats(); idx++; render(); };
    el.querySelector('#stAgain').onclick = () => { progress[p.kannada] = 0; queue.push(p); next(); };
    el.querySelector('#stGot').onclick = () => { progress[p.kannada] = Math.min(4, box + 1); stats.xp += 10; next(); };
  };
  render();
}

// ===== Profile / onboarding =====
$('#talkClear').onclick = () => { talkFeed.querySelectorAll('.turn, .loading').forEach((n) => n.remove()); };
function applyProfile() {
  $('#langLabel').textContent = langShort(profile.lang);
  $('#nameLabel').textContent = profile.name || 'Profile';
  $('#youLang').textContent = langShort(profile.lang);
  renderHome();
}
function openProfile(first) {
  openSheet(`<div class="auto-big" style="text-align:center"><svg viewBox="0 0 64 48" style="width:80px"><use href="#auto-sym"/></svg></div>
    <h2>${first ? 'Welcome to Bengaluru' : 'Your profile'} <span class="kn muted">ಸ್ವಾಗತ</span></h2>
    <p class="muted" style="font-size:.86rem">Nimma Saathi is your interpreter, guide and Kannada coach.</p>
    <label>Your name<input id="pName" placeholder="e.g. Priya" value="${esc(profile?.name || '')}"/></label>
    <label>Language you speak<select id="pLang">${Object.entries(LANGS).map(([c, n]) => `<option value="${c}" ${profile?.lang === c ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <button class="btn" id="pGo">${first ? "Let's go" : 'Save'}</button>`, (el) => {
    el.querySelector('#pGo').onclick = () => {
      profile = { name: el.querySelector('#pName').value.trim() || 'friend', lang: el.querySelector('#pLang').value };
      store.set('profile', profile); applyProfile(); closeSheet();
      if (first) { toast(`Namaskara ${profile.name}!`); confetti(); }
    };
  });
}
$('#profileBtn').onclick = () => openProfile(false);

(async () => {
  // #demo skips onboarding, #tab=<name> opens a tab (handy for demos and screenshots)
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.has('demo') && !profile) profile = { name: 'Priya', lang: 'en-IN' };
  if (hash.get('tab')) setTimeout(() => go(hash.get('tab')), 0);
  const first = !profile;
  if (first) profile = { name: '', lang: 'en-IN' };
  try { DATA = { ...DATA, ...(await api('phrases')) }; } catch { toast('Could not load phrasebook'); }
  ['decks', 'scenarios'].forEach((k) => { if (!DATA[k] || typeof DATA[k] !== 'object') DATA[k] = {}; });
  ['slang', 'numbers'].forEach((k) => { if (!Array.isArray(DATA[k])) DATA[k] = []; });
  if (!Array.isArray(trip.memories)) trip.memories = [];
  applyProfile(); renderDecks(); renderScenes();
  $('#numStrip').innerHTML = DATA.numbers.map(([n, kn, r]) => `<button data-kn="${esc(kn)}"><b>${esc(kn)}</b>${n} · ${esc(r)}</button>`).join('');
  $('#numStrip').querySelectorAll('button').forEach((b) => b.onclick = () => say(b.dataset.kn));
  if (first) openProfile(true);
})();
