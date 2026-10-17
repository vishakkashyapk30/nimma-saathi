import { handle, sarvam, speak } from './_sarvam.js';

// "Your name in Kannada": romanized name -> Kannada script (Sarvam Transliterate) + audio (Bulbul)
export default handle(async ({ name = '' }) => {
  const input = String(name).replace(/[^\p{L}\s.'-]/gu, '').trim().slice(0, 40);
  if (!input) throw Object.assign(new Error('Type a name first'), { status: 400 });
  const d = await sarvam('/transliterate', { input, source_language_code: 'en-IN', target_language_code: 'kn-IN' });
  const kannada = d.transliterated_text || input;
  const audio = await speak(kannada, 'kn-IN').catch(() => null);
  return { kannada, audio };
});
