import { handle, translate, LANGS } from './_sarvam.js';
import { readImage } from './_vision.js';

// Camera photo of a sign / menu / bus board -> Sarvam Vision OCR -> translation into the traveller's language
export default handle(async ({ image, mime = 'image/jpeg', lang = 'en-IN' }) => {
  if (!image) throw Object.assign(new Error('No image'), { status: 400 });
  const text = (await readImage(Buffer.from(image, 'base64'), mime) || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/<[^>]+>/g, ' ').replace(/[#*_`>|]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return { text: '', translation: '', note: 'No text found — try a closer, steadier photo.' };
  // translate in chunks the API accepts
  const lines = text.split('\n').filter((l) => l.trim());
  const chunks = [];
  let cur = '';
  for (const l of lines) { if ((cur + '\n' + l).length > 800) { chunks.push(cur); cur = l; } else cur = cur ? cur + '\n' + l : l; }
  if (cur) chunks.push(cur);
  const parts = await Promise.all(chunks.slice(0, 4).map((c) => translate(c, 'auto', lang === 'kn-IN' ? 'en-IN' : lang).catch(() => c)));
  return { text, translation: parts.join('\n'), langName: LANGS[lang] };
});
