// ===== Namma Saathi — client =====
const $ = (s) => document.querySelector(s);
const LANGS = {
  'en-IN': 'English', 'hi-IN': 'हिन्दी Hindi', 'ta-IN': 'தமிழ் Tamil', 'te-IN': 'తెలుగు Telugu', 'ml-IN': 'മലയാളം Malayalam',
  'bn-IN': 'বাংলা Bengali', 'mr-IN': 'मराठी Marathi', 'gu-IN': 'ગુજરાતી Gujarati', 'pa-IN': 'ਪੰਜਾਬੀ Punjabi', 'od-IN': 'ଓଡ଼ିଆ Odia',
};
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('ns_' + k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem('ns_' + k, JSON.stringify(v)),
};
let profile = store.get('profile', null);
let myPhrases = store.get('mine', []);
let progress = store.get('progress', {}); // kannada -> box (0..4)
let stats = store.get('stats', { xp: 0, streak: 0, last: '' });
let chatHistory = [];
let DECKS = {};
const audioCache = new Map();

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUTO_SVG = '<svg viewBox="0 0 64 48"><use href="#auto-sym"/></svg>';

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
function confetti() {
  const colors = ['#ffcc00', '#d7263d', '#1e9e57', '#8e44ad'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = '50%'; c.style.top = '45%'; c.style.background = colors[i % 4];
    c.style.setProperty('--dx', (Math.random() * 600 - 300) + 'px'); c.style.setProperty('--dy', (Math.random() * 500 - 300) + 'px');
    document.body.appendChild(c); setTimeout(() => c.remove(), 1500);
  }
}
async function api(path, body) {
  const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => ({ error: 'Network hiccup' }));
  if (!r.ok || d.error) throw new Error(d.error || 'Request failed');
  return d;
}
function loader(parent, text = 'Saathi is on the way') {
  const el = document.createElement('div'); el.className = 'loading';
  el.innerHTML = `<div class="dots">${text}…</div>${AUTO_SVG}`;
  parent.appendChild(el); parent.scrollTop = parent.scrollHeight; return el;
}

// ===== Audio: playback (cached) =====
function playB64(b64) { if (b64) new Audio('data:audio/wav;base64,' + b64).play().catch(() => {}); }
async function say(kannada, b64, slow) {
  const key = (slow ? 'slow:' : '') + kannada;
  if (b64) audioCache.set(key, b64);
  if (!audioCache.has(key)) {
    try { audioCache.set(key, (await api('tts', { text: kannada, slow })).audio); } catch (e) { return toast('Audio failed: ' + e.message); }
  }
  playB64(audioCache.get(key));
}

// ===== Audio: recording (raw webm/ogg/mp4 straight to Saaras — no lossy conversion) =====
let rec = null;
async function toggleRecord(btn, onDone, label = 'Listening…') {
  if (rec) { rec.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Voice needs Chrome/Safari over HTTPS');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { return toast('Please allow microphone access 🎤'); }
  const chunks = [];
  const mr = new MediaRecorder(stream);
  rec = mr; btn.classList.add('rec');
  const ov = $('#recOverlay'); $('#recLabel').textContent = label; ov.classList.remove('hidden');
  const started = Date.now();
  const tick = setInterval(() => { $('#recTime').textContent = ((Date.now() - started) / 1000).toFixed(1) + 's'; }, 100);
  const cap = setTimeout(() => mr.state === 'recording' && mr.stop(), 20000);
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.onstop = async () => {
    clearTimeout(cap); clearInterval(tick); rec = null; btn.classList.remove('rec'); ov.classList.add('hidden');
    stream.getTracks().forEach((t) => t.stop());
    if (Date.now() - started < 700 || !chunks.length) return toast('Too short — tap, speak, then tap stop');
    const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
    const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    onDone({ audio: btoa(bin), mime: blob.type });
  };
  mr.start(250);
}
$('#recStop').onclick = () => rec?.stop();

// ===== Phrasebook =====
function savePhrase(p, quiet) {
  if (!p?.kannada || myPhrases.some((m) => m.kannada === p.kannada)) return false;
  myPhrases.unshift({ english: p.english || '', kannada: p.kannada, roman: p.roman || '' });
  store.set('mine', myPhrases.slice(0, 200)); renderDecks();
  if (!quiet) toast('⭐ Saved to your Learn deck');
  return true;
}
function sayCard(c) {
  const el = document.createElement('div'); el.className = 'say';
  el.innerHTML = `<div class="en">${esc(c.english)}</div><div class="kannada">${esc(c.kannada)}</div><div class="roman">${esc(c.roman)}</div>
    <div class="acts"><button data-a="play">🔊</button><button data-a="slow" title="Slow">🐢</button><button data-a="show">📢 Show local</button><button data-a="save">⭐</button></div>`;
  el.querySelector('[data-a=play]').onclick = () => say(c.kannada);
  el.querySelector('[data-a=slow]').onclick = () => say(c.kannada, null, true);
  el.querySelector('[data-a=show]').onclick = () => showLocal(c.kannada, c.roman);
  el.querySelector('[data-a=save]').onclick = (e) => { savePhrase(c) || toast('Already in your deck'); e.target.textContent = '✅ Saved'; };
  return el;
}
function showLocal(kn, roman) {
  $('#scKn').textContent = kn; $('#scRoman').textContent = roman || '';
  $('#showcard').classList.remove('hidden'); say(kn);
}
$('#scPlay').onclick = () => say($('#scKn').textContent);
$('#scClose').onclick = () => $('#showcard').classList.add('hidden');

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
      const c = sayCard({ english: d.heard, kannada: d.kannada, roman: d.roman }); c.querySelector('.en').remove(); c.querySelector('.kannada').remove(); c.querySelector('.roman').remove();
      c.style.cssText = 'box-shadow:none;padding:0;border:0;background:none';
      el.appendChild(c);
      if (d.audio) say(d.kannada, d.audio);
      savePhrase({ english: d.heard, kannada: d.kannada, roman: d.roman }, true);
    } else {
      el.className = 'turn in';
      el.innerHTML = `<div class="who">Local said</div><div class="kannada">${esc(d.heard)}</div><div class="roman">${esc(d.roman)}</div><div class="meaning">“${esc(d.meaning)}”</div>`;
    }
    talkFeed.appendChild(el); talkFeed.scrollTop = talkFeed.scrollHeight;
  } catch (e) { l.remove(); toast('Oops: ' + e.message); }
}
$('#micYou').onclick = () => toggleRecord($('#micYou'), (a) => talk('out', a), 'Speak in ' + LANGS[profile.lang].split(' ').pop());
$('#micLocal').onclick = () => toggleRecord($('#micLocal'), (a) => talk('in', a), 'ಮಾತಾಡಿ · Local, please speak');
$('#talkForm').onsubmit = (e) => { e.preventDefault(); const t = $('#talkInput').value.trim(); if (!t) return; $('#talkInput').value = ''; talk('out', { text: t }); };
['Please use the meter', 'How much is this?', 'Stop here please', 'Where is the metro station?', 'One filter coffee please', 'I don\'t speak Kannada'].forEach((q) => {
  const b = document.createElement('button'); b.textContent = q; b.onclick = () => talk('out', { text: q }); $('#talkQuick').appendChild(b);
});

// ===== AGENT =====
const chatFeed = $('#chatFeed');
function addMsg(role, html) {
  const el = document.createElement('div'); el.className = 'msg ' + role;
  el.innerHTML = `${role === 'bot' ? '<div class="avatar">🛺</div>' : ''}<div class="bubble"></div>`;
  el.querySelector('.bubble').innerHTML = html;
  chatFeed.appendChild(el); chatFeed.scrollTop = chatFeed.scrollHeight; return el;
}
const TOOL_LABEL = { translate_to_kannada: '🔤 translating', situation_playbook: '📖 checking playbook', save_phrase: '⭐ saving to deck' };
async function ask(message) {
  $('#chatEmpty')?.remove(); $('#agentQuick').classList.add('hidden');
  addMsg('user', esc(message));
  const l = loader(chatFeed, 'Saathi is thinking & using tools');
  try {
    const d = await api('agent', { message, history: chatHistory, lang: profile.lang, name: profile.name });
    l.remove();
    chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: d.reply });
    const steps = d.steps?.length ? `<div class="steps">${d.steps.map((s, i) => `<span style="animation-delay:${i * .12}s">${TOOL_LABEL[s.tool] || s.tool}${s.args?.topic ? ': ' + esc(s.args.topic) : ''}</span>`).join('')}</div>` : '';
    const m = addMsg('bot', steps + esc(d.reply).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'));
    const bubble = m.querySelector('.bubble');
    d.cards?.forEach((c) => bubble.appendChild(sayCard(c)));
    if (d.saved?.length) { d.saved.forEach((p) => savePhrase(p, true)); toast(`⭐ Saathi saved ${d.saved.length} phrase(s) to your deck`); }
    chatFeed.scrollTop = chatFeed.scrollHeight;
  } catch (e) { l.remove(); addMsg('bot', 'Ayyo! ' + esc(e.message)); }
}
$('#chatForm').onsubmit = (e) => { e.preventDefault(); const t = $('#chatInput').value.trim(); if (!t) return; $('#chatInput').value = ''; ask(t); };
$('#chatMic').onclick = () => toggleRecord($('#chatMic'), async (a) => {
  try { const d = await api('stt', { ...a, lang: 'unknown' }); if (d.transcript) ask(d.transcript); else toast('Did not catch that'); } catch (e) { toast(e.message); }
}, 'Ask Saathi…');
['Auto driver won\'t use the meter 😤', 'How do I order at a darshini?', 'Get me from Majestic to Indiranagar', 'Teach me 3 phrases to make friends', 'I lost my wallet, help!'].forEach((q) => {
  const b = document.createElement('button'); b.textContent = q; b.onclick = () => ask(q); $('#agentQuick').appendChild(b);
});

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
}
function deckList() {
  const list = Object.entries(DECKS).map(([id, d]) => ({ id, ...d, items: d.phrases.map(([english, kannada, roman]) => ({ english, kannada, roman })) }));
  list.sort((a, b) => a.level - b.level);
  return [{ id: 'mine', title: 'My phrases', icon: '⭐', level: 0, mine: true, items: myPhrases, tips: ['Phrases you used in Talk and Saathi chats land here automatically.'] }, ...list];
}
function renderDecks() {
  const box = $('#decks'); box.innerHTML = '';
  deckList().forEach((d, i) => {
    const done = d.items.filter((p) => (progress[p.kannada] || 0) >= 3).length;
    const pct = d.items.length ? Math.round((done / d.items.length) * 100) : 0;
    const b = document.createElement('button'); b.className = 'deck' + (d.mine ? ' mine' : ''); b.style.animationDelay = i * 0.06 + 's';
    b.innerHTML = `<div class="ic">${d.icon}</div><h3>${esc(d.title)}</h3><small>${d.mine ? d.items.length + ' saved' : 'Level ' + d.level + ' · ' + d.items.length + ' phrases'}</small><div class="bar"><i style="width:${pct}%"></i></div>`;
    b.onclick = () => d.items.length ? study(d) : toast('Use Talk or Saathi — phrases will appear here!');
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
  // self-paced spaced repetition: weakest boxes first
  const queue = [...deck.items].sort((x, y) => (progress[x.kannada] || 0) - (progress[y.kannada] || 0));
  let idx = 0;
  const el = $('#study'); el.classList.remove('hidden');
  const tip = deck.tips?.[Math.floor(Math.random() * deck.tips.length)] || '';
  const render = () => {
    if (idx >= queue.length) {
      el.innerHTML = `<div class="top"><b>${deck.icon} ${esc(deck.title)}</b><button class="ghost" id="stClose">✕</button></div>
        <div class="flash"><div class="inner"><div class="face front">🎉 Deck done!<small>Come back anytime — weaker cards show up first.</small></div></div></div>`;
      confetti(); el.querySelector('#stClose').onclick = close; return;
    }
    const p = queue[idx]; const box = progress[p.kannada] || 0;
    el.innerHTML = `<div class="top"><b>${deck.icon} ${esc(deck.title)} · ${idx + 1}/${queue.length}</b><button class="ghost" id="stClose">✕</button></div>
      <small>💡 ${esc(tip)}</small>
      <div class="flash" id="fc"><div class="inner">
        <div class="face front">${esc(p.english || p.roman)}<small>tap to flip · mastery ${'🌼'.repeat(box)}${'·'.repeat(4 - box)}</small></div>
        <div class="face back"><div class="kannada">${esc(p.kannada)}</div><div class="roman">${esc(p.roman)}</div><small>${esc(p.english)}</small></div>
      </div></div>
      <div class="score" id="score"></div>
      <div class="row"><button class="cta" id="stListen">🔊 Listen</button><button class="ghost" id="stSlow">🐢 Slow</button><button class="cta green" id="stSay">🎤 Say it</button></div>
      <div class="row"><button class="ghost" id="stAgain">🔁 Again</button><button class="cta" id="stGot">✅ Got it</button></div>`;
    const fc = el.querySelector('#fc'); fc.onclick = () => fc.classList.toggle('flipped');
    el.querySelector('#stClose').onclick = close;
    el.querySelector('#stListen').onclick = () => { fc.classList.add('flipped'); say(p.kannada); };
    el.querySelector('#stSlow').onclick = () => { fc.classList.add('flipped'); say(p.kannada, null, true); };
    el.querySelector('#stSay').onclick = (e) => toggleRecord(e.currentTarget, async (a) => {
      const s = el.querySelector('#score'); s.className = 'score'; s.textContent = 'Checking your pronunciation…';
      try {
        const d = await api('stt', { ...a, lang: 'kn-IN' });
        const pct = Math.round(similarity(d.transcript || '', p.kannada) * 100);
        s.className = 'score ' + (pct >= 70 ? 'good' : pct >= 40 ? 'meh' : 'bad');
        s.textContent = `${pct >= 70 ? '🔥 Sakkath!' : pct >= 40 ? '👍 Almost!' : '🙂 Try again'} ${pct}% — heard “${d.transcript || '…'}”`;
        fc.classList.add('flipped');
        if (pct >= 70) { stats.xp += 5; confetti(); store.set('stats', stats); renderStats(); }
      } catch (err) { s.textContent = err.message; }
    });
    el.querySelector('#stAgain').onclick = () => { progress[p.kannada] = 0; queue.push(p); next(); };
    el.querySelector('#stGot').onclick = () => { progress[p.kannada] = Math.min(4, box + 1); stats.xp += 10; next(); };
  };
  const next = () => { bumpStreak(); store.set('progress', progress); store.set('stats', stats); renderStats(); idx++; render(); };
  const close = () => { el.classList.add('hidden'); renderDecks(); };
  render();
}

// ===== Tabs, onboarding, petals =====
document.querySelectorAll('#tabs button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
});
const sel = $('#obLang');
Object.entries(LANGS).forEach(([code, name]) => sel.add(new Option(name, code)));
function applyProfile() {
  $('#langLabel').textContent = LANGS[profile.lang].split(' ').pop();
  $('#youLang').textContent = LANGS[profile.lang];
}
function openOnboard() {
  if (profile) { $('#obName').value = profile.name; sel.value = profile.lang; }
  $('#onboard').classList.remove('hidden');
}
$('#obGo').onclick = () => {
  profile = { name: $('#obName').value.trim() || 'Guru', lang: sel.value };
  store.set('profile', profile); applyProfile(); $('#onboard').classList.add('hidden');
  toast(`Namaskara ${profile.name}! 🌼`); confetti();
};
$('#profileBtn').onclick = openOnboard;
setInterval(() => {
  if (document.hidden) return;
  const p = document.createElement('div'); p.className = 'petal' + (Math.random() > .6 ? ' y' : '');
  p.style.left = Math.random() * 100 + 'vw'; p.style.animationDuration = 7 + Math.random() * 6 + 's';
  p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
  $('#petals').appendChild(p); setTimeout(() => p.remove(), 13000);
}, 2600);

(async () => {
  if (profile) applyProfile(); else { profile = { name: 'Guru', lang: 'en-IN' }; openOnboard(); }
  try { DECKS = await api('phrases'); } catch { DECKS = {}; }
  renderDecks();
})();
