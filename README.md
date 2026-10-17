# Nimma Saathi

Nimma Saathi ("your companion" in Kannada) is a web app that helps travellers in Bengaluru get past the Kannada language barrier. It helps you talk to locals right now, and it helps you learn Kannada at your own pace.

It is built on the Sarvam AI platform. Sarvam models handle all speech, translation, vision and language work.

## The problem

Bengaluru is known for a strong Kannada language identity. Visitors from other states and countries often struggle with simple daily tasks:

- asking an auto driver to use the meter
- ordering at a darshini (a small local restaurant)
- reading signboards, bus boards and menus
- asking for directions or help

Phrasebooks are static. Translation apps do not teach you anything, and they know nothing about the city. Nimma Saathi combines three things in one place: an interpreter, a local guide and a language coach.

## Features

| Feature | What it does |
|---|---|
| Talk to locals | Two-way voice interpreter. You speak in your language and the app says it aloud in Kannada, with Kannada script and an English-letter pronunciation. The local replies in Kannada and you see the meaning. "Show local" displays a line in large text so the other person can read it. |
| Ask Saathi (agent) | An AI agent that uses tools. You describe a situation ("the auto driver will not use the meter") and it plans an answer, translates the exact lines you need, saves useful phrases to your phrasebook and remembers facts about your trip. |
| Role-play | Practise real scenes: an auto ride, a darshini breakfast, street shopping, asking the way and buying a metro ticket. The AI plays the local in Kannada with audio. You reply by voice or text and get a score, feedback and a hint for every line. |
| Learn Kannada | Flashcard decks with spaced repetition, normal and slow audio, and a pronunciation check (you speak and the app scores how close you were). Streaks and XP track progress. "My phrases" collects every phrase you used in real conversations. |
| Read a sign | Take a photo of a signboard, bus board or menu. Sarvam Vision reads the Kannada text and the app translates it. |
| Fare check | Estimates a fair auto fare from Bengaluru meter rates (including the night rate), tells you if a quoted price is fair, and gives you ready Kannada lines to bargain. Also teaches Kannada numbers. |
| My trip | Save where you are staying, your food preferences and other notes. The agent reads these before every answer, so its advice fits your trip. |
| Emergency | One-tap call to 112 plus key emergency phrases in large text. |
| Slang of the day | A daily Bengaluru slang word (maga, sakkath, bombat and others) with audio. |

Supported traveller languages: English, Hindi, Tamil, Telugu, Malayalam, Bengali, Marathi, Gujarati, Punjabi and Odia.

## Tech stack

The app is intentionally simple. It has no framework, no build step and no npm dependencies.

| Layer | Technology |
|---|---|
| Frontend | Plain HTML, CSS and JavaScript (ES modules). Hand-drawn SVG illustrations of Bengaluru landmarks (Vidhana Soudha, the High Court, Cubbon Park and UB City) in a brutalist design style. |
| Backend | Node.js serverless functions (one file per endpoint in `api/`). They keep the API key on the server. |
| Hosting | Vercel (serverless functions plus static files). A small Node server (`dev-server.js`) runs the same code locally. |
| Storage | The browser's localStorage holds the profile, trip details, phrasebook and learning progress. There is no database. |

### Sarvam AI models used

| Model | Used for |
|---|---|
| Saaras v4 (speech to text) | All voice input. It is given a list of Bengaluru place names (Koramangala, Majestic, Silk Board and others) so that it recognises them correctly. Falls back to Saaras v3 and Saarika v2.5. |
| Bulbul v3 (text to speech) | Kannada audio, including a slower speed for learners. Falls back to Bulbul v2. |
| Mayura (translate) | Translation between the traveller's language and Kannada. |
| Transliterate | Kannada script to English letters, so you can read the pronunciation. |
| Sarvam-105B (chat, tool calling) | The Ask Saathi agent and the role-play characters. |
| Sarvam Vision (Document AI) | Reading text from photos of signs and menus. |

## How the agent works

1. The browser sends your message, recent chat history and trip details to `api/agent.js`.
2. The server calls Sarvam-105B with four tools: `translate_to_kannada`, `situation_playbook`, `save_phrase` and `remember`.
3. When the model asks for a tool, the server runs it and sends back the result. This repeats for up to 5 steps.
4. The final answer comes back to the browser together with phrase cards (with audio buttons), saved phrases and new trip memories. The steps the agent took are shown above its reply.

## Directory structure

```
.
├── api/                  Serverless functions (one endpoint per file)
│   ├── _sarvam.js        Shared helpers: Sarvam API calls, translate, transliterate, speech to text, text to speech
│   ├── _vision.js        Sarvam Vision (Document AI) job flow and a small ZIP reader
│   ├── _data.js          Curated phrase decks, Bengaluru tips, slang words and Kannada numbers
│   ├── agent.js          Ask Saathi agent (tool-calling loop)
│   ├── talk.js           Two-way interpreter (voice or text in, Kannada text and audio out)
│   ├── roleplay.js       Role-play scenes, scoring and hints
│   ├── read.js           Sign and menu reader (photo to text to translation)
│   ├── stt.js            Speech to text (used by voice input and the pronunciation check)
│   ├── tts.js            Text to speech (normal and slow)
│   └── phrases.js        Serves decks, slang, numbers and scenarios to the app
├── public/               Static frontend
│   ├── index.html        Page layout and SVG landmark illustrations
│   ├── styles.css        Brutalist Bengaluru theme
│   ├── app.js            All client logic: tabs, recording, agent chat, role-play, learning, tools
│   └── favicon.svg       Auto-rickshaw icon
├── dev-server.js         Local server that serves public/ and routes /api/* to the same functions
├── vercel.json           Vercel function settings
└── package.json
```

Files in `api/` that start with an underscore are shared helpers, not endpoints.

## Run it locally

You need Node.js 18 or newer and a Sarvam API key from https://dashboard.sarvam.ai.

1. Create a file named `.env` in the project root:
   ```
   SARVAM_API=your_sarvam_api_key
   ```
2. Start the server:
   ```
   npm start
   ```
3. Open http://localhost:3000 in Chrome or Edge.

The microphone works on localhost and on HTTPS sites only.

## Deploy to Vercel

1. Install the Vercel CLI (`npm i -g vercel`) and log in (`vercel login`).
2. Add the API key as an environment variable: `vercel env add SARVAM_API production`
3. Deploy: `vercel deploy --prod`

The `.env` file is ignored by git, so the key never goes into the repository.
