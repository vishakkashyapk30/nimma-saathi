import { handle, translate, romanize, speak, transcribe } from './_sarvam.js';

// direction "out": traveller -> Kannada (with roman + audio for the local)
// direction "in":  local's Kannada -> traveller's language
export default handle(async ({ audio, mime, text, direction = 'out', lang = 'en-IN', tts = true }) => {
  if (direction === 'out') {
    let heard = text, src = lang;
    if (audio) ({ transcript: heard, language_code: src } = await transcribe(audio, 'unknown', mime));
    if (!heard) return { heard: '', error: "Didn't catch that — speak a little longer and tap stop." };
    const kannada = await translate(heard, !src || src === 'unknown' ? 'auto' : src, 'kn-IN');
    const [roman, wav] = await Promise.all([romanize(kannada), tts ? speak(kannada).catch(() => null) : null]);
    return { heard, kannada, roman, audio: wav };
  }
  let heard = text;
  if (audio) ({ transcript: heard } = await transcribe(audio, 'kn-IN', mime));
  if (!heard) return { heard: '', error: "Didn't catch that — ask them to speak again." };
  const [meaning, roman] = await Promise.all([translate(heard, 'kn-IN', lang), romanize(heard)]);
  return { heard, roman, meaning };
});
