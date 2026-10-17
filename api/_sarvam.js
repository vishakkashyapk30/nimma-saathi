const BASE = 'https://api.sarvam.ai';

export const LANGS = {
  'en-IN': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'ml-IN': 'Malayalam',
  'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi', 'od-IN': 'Odia', 'kn-IN': 'Kannada',
};

function apiKey() {
  const k = (process.env.SARVAM_API || process.env.SARVAM_API_KEY || '').trim();
  if (!k) throw Object.assign(new Error('SARVAM_API env var not set'), { status: 500 });
  return k;
}

export async function sarvam(path, body, form) {
  const headers = { 'api-subscription-key': apiKey() };
  if (!form) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + path, { method: 'POST', headers, body: form || JSON.stringify(body) });
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
  if (!r.ok) {
    const msg = data?.error?.message || data?.message || txt;
    throw Object.assign(new Error(msg), { status: r.status });
  }
  return data;
}

export function handle(fn) {
  return async (req, res) => {
    try {
      let body = req.body || {};
      if (typeof body === 'string') body = JSON.parse(body || '{}');
      res.status(200).json(await fn(body, req));
    } catch (e) {
      console.error(e);
      res.status(e.status && e.status < 500 ? e.status : 500).json({ error: e.message });
    }
  };
}

export async function translate(input, source, target) {
  if (!input?.trim()) return '';
  if (source === target) return input;
  const d = await sarvam('/translate', {
    input: input.slice(0, 900), source_language_code: source || 'auto', target_language_code: target,
  });
  return d.translated_text;
}

export async function romanize(kannada) {
  if (!kannada?.trim()) return '';
  try {
    const d = await sarvam('/transliterate', {
      input: kannada.slice(0, 900), source_language_code: 'kn-IN', target_language_code: 'en-IN',
    });
    return d.transliterated_text;
  } catch (e) {
    console.error('transliterate', e.message);
    return '';
  }
}

// Bulbul v3 (stable) first, v2 as fallback
const TTS_MODELS = [{ model: 'bulbul:v3' }, { model: 'bulbul:v2', speaker: 'anushka' }];
export async function speak(text, lang = 'kn-IN', pace) {
  let lastErr;
  for (const m of TTS_MODELS) {
    try {
      const d = await sarvam('/text-to-speech', { text: text.slice(0, 1400), target_language_code: lang, ...(pace ? { pace } : {}), ...m });
      return d.audios?.[0];
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// Saaras v4 biased with Bengaluru keyterms so place names come out right
const KEYTERMS = ['Majestic', 'Indiranagar', 'Koramangala', 'MG Road', 'Whitefield', 'Jayanagar', 'Malleshwaram', 'Cubbon Park',
  'Lalbagh', 'Electronic City', 'HSR Layout', 'Hebbal', 'Yeshwanthpur', 'Kempegowda', 'Namma Metro', 'BMTC', 'darshini', 'filter coffee',
  'masala dosa', 'idli vada', 'auto', 'meter', 'swalpa adjust maadi', 'Vidhana Soudha', 'Basavanagudi', 'Marathahalli', 'Silk Board'];
const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' };
export async function transcribe(b64, lang = 'unknown', mime = 'audio/wav') {
  const buf = Buffer.from(b64, 'base64');
  const type = String(mime).split(';')[0] || 'audio/wav';
  const attempts = [
    { model: 'saaras:v4', keyterms: true },
    { model: 'saaras:v3', mode: 'transcribe' },
    { model: 'saarika:v2.5' },
  ];
  let lastErr;
  for (const a of attempts) {
    const form = new FormData();
    form.append('file', new Blob([buf], { type }), 'audio.' + (EXT[type] || 'webm'));
    form.append('model', a.model);
    form.append('language_code', lang);
    if (a.mode) form.append('mode', a.mode);
    if (a.keyterms) form.append('keyterms', JSON.stringify(KEYTERMS));
    try {
      const d = await sarvam('/speech-to-text', null, form);
      return { transcript: d.transcript || '', language_code: d.language_code || lang, model: a.model };
    } catch (e) { console.error('stt', a.model, e.message); lastErr = e; }
  }
  throw lastErr;
}
