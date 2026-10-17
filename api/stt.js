import { handle, transcribe } from './_sarvam.js';

export default handle(async ({ audio, mime, lang = 'kn-IN' }) => transcribe(audio, lang, mime));
