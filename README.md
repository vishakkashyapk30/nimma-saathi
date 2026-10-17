# 🛺 Namma Saathi — your agentic Bengaluru buddy

Bengaluru is famous for traffic, filter coffee… and a language barrier. **Namma Saathi** helps travellers talk to locals in Kannada *right now* and learn Kannada *at their own pace*. Built on [Sarvam AI](https://sarvam.ai).

## Features
| Tab | What it does | Sarvam APIs |
|---|---|---|
| 🗣️ **Maathaadu (Talk)** | Two-way live interpreter. Speak or type in your language → Kannada script, romanized pronunciation and audio. "Show local" mode is full-screen, auto-rickshaw style. The local replies in Kannada → you get the meaning. | Saaras v4 STT (with Bengaluru keyterms), Mayura Translate, Transliterate, Bulbul v3 TTS |
| 🛺 **Saathi (Agent)** | Agentic guide with tool calling: `translate_to_kannada`, `situation_playbook` (autos, darshinis, metro/BMTC, emergencies), `save_phrase`. Plans, acts, returns phrase cards with audio and fills your Learn deck. Supports voice input. | sarvam-105b chat completions (native tools), Saaras v4 |
| 📚 **Kalibeku (Learn)** | Self-paced flashcards with spaced repetition, normal or 🐢 slow audio, a pronunciation check (speak → STT → similarity score), streaks and XP. **My phrases** auto-collects everything you used in real conversations. | Bulbul v3 TTS (pace control), Saaras v4 STT |

Speech-to-text tries `saaras:v4` first, then falls back to `saaras:v3` and `saarika:v2.5`. Text-to-speech tries `bulbul:v3`, then `bulbul:v2`.

The Bengaluru theme includes an animated skyline with Vidhana Soudha, a Namma Metro purple-line train, an auto-rickshaw on the road, Cubbon Park gulmohar petals, filter-coffee steam and a ನಮಸ್ಕಾರ shimmer.

## Run locally
```bash
echo SARVAM_API=sk_... > .env
node server.js   # http://localhost:3000
```
No dependencies are needed: Node 18+ only.

## Deploy
- **Vercel:** `vercel --prod`, then set the env var `SARVAM_API`. `api/*.js` are serverless functions and `public/` is static.
- **Render:** Web Service, start command `node server.js`, env var `SARVAM_API`.
