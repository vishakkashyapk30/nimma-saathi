import { handle, speak } from './_sarvam.js';

export default handle(async ({ text, lang = 'kn-IN', slow }) => ({ audio: await speak(text, lang, slow ? 0.8 : undefined) }));
