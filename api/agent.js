import { handle, sarvam, translate, romanize, LANGS } from './_sarvam.js';
import { DECKS } from './_data.js';

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'translate_to_kannada',
      description: 'Translate a short sentence the traveller wants to say into Kannada. Returns Kannada script and romanized pronunciation. Use this for EVERY Kannada phrase you give the user — never invent Kannada yourself.',
      parameters: { type: 'object', properties: { text: { type: 'string', description: 'Sentence in English or the user\'s language' } }, required: ['text'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'situation_playbook',
      description: 'Get street-smart Bengaluru tips and verified phrases for a situation.',
      parameters: { type: 'object', properties: { topic: { type: 'string', enum: Object.keys(DECKS) } }, required: ['topic'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_phrase',
      description: 'Save a useful phrase into the traveller\'s personal Learn deck so they can practise it later.',
      parameters: {
        type: 'object',
        properties: { english: { type: 'string' }, kannada: { type: 'string' }, roman: { type: 'string' } },
        required: ['english', 'kannada'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember',
      description: 'Store a durable fact about the traveller\'s trip (where they stay, diet, dates, plans, preferences) so future answers are personalised. Use whenever the user reveals such a fact.',
      parameters: { type: 'object', properties: { fact: { type: 'string', description: 'Short fact, e.g. "Staying in Indiranagar"' } }, required: ['fact'] },
    },
  },
];

const strip = (s) => (s || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

export default handle(async ({ message, history = [], lang = 'en-IN', name = 'friend', trip = {} }) => {
  if (!message?.trim()) throw Object.assign(new Error('empty message'), { status: 400 });
  const langName = LANGS[lang] || 'English';
  const cards = [], saved = [], steps = [], memories = [];
  const tripFacts = [
    trip.stay && `Staying at/near: ${trip.stay}`, trip.diet && `Food preference: ${trip.diet}`, trip.notes && `Notes: ${trip.notes}`,
    ...(trip.memories || []).slice(-15),
  ].filter(Boolean).map((f) => '- ' + String(f).slice(0, 200)).join('\n');

  const tools = {
    async translate_to_kannada({ text }) {
      const kannada = await translate(text, 'auto', 'kn-IN');
      const roman = await romanize(kannada);
      const card = { english: text, kannada, roman };
      cards.push(card);
      return card;
    },
    async situation_playbook({ topic }) {
      const d = DECKS[topic] || DECKS.survival;
      return { tips: d.tips, phrases: d.phrases.map(([english, kannada, roman]) => ({ english, kannada, roman })) };
    },
    async save_phrase({ english, kannada, roman }) {
      saved.push({ english, kannada, roman: roman || '' });
      cards.push({ english, kannada, roman: roman || '' });
      return { ok: true };
    },
    async remember({ fact }) {
      if (fact) memories.push(String(fact).slice(0, 200));
      return { ok: true };
    },
  };

  const messages = [
    {
      role: 'system',
      content: `You are "Saathi", a warm, witty Bengaluru local guide helping ${name}, a traveller who speaks ${langName}, overcome the Kannada language barrier.
Goals: (1) solve their real situation (autos, darshinis, metro/BMTC, directions, shopping, emergencies) with practical street-smart advice; (2) give them the exact Kannada lines to say; (3) help them learn at their own pace.
Rules:
- Reply in ${langName}. Keep replies short (max ~6 lines), friendly, with a pinch of Bengaluru humour.
- Whenever you suggest something to say, call translate_to_kannada for each line (max 3). Never write Kannada script yourself — the app shows the tool results as cards with audio.
- Use situation_playbook when the question matches a topic.
- Call save_phrase for the 1-2 most useful phrases so they land in the user's Learn deck, and mention you saved them.
- Call remember when the user reveals trip facts (where they stay, diet, plans), and use known facts to personalise advice (e.g. nearest metro to their stay, veg-only food).
- In emergencies, lead with 112.
What you know about this traveller's trip:
${tripFacts || '- nothing yet'}`,
    },
    ...history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content).slice(0, 1500) })),
    { role: 'user', content: message },
  ];

  let reply = '';
  for (let i = 0; i < 5; i++) {
    const d = await sarvam('/v1/chat/completions', {
      model: 'sarvam-105b', messages, tools: TOOLS, temperature: 0.4, max_tokens: 2500,
    });
    const msg = d.choices?.[0]?.message || {};
    if (msg.tool_calls?.length) {
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
        steps.push({ tool: call.function.name, args });
        let result;
        try { result = await (tools[call.function.name] || (async () => ({ error: 'unknown tool' })))(args); }
        catch (e) { result = { error: e.message }; }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }
    reply = strip(msg.content);
    break;
  }
  if (!reply) reply = cards.length ? 'Here you go — tap 🔊 to hear it!' : 'Swalpa adjust maadi — I got a bit lost. Try asking again?';

  // de-duplicate cards by kannada text
  const seen = new Set();
  const uniq = cards.filter((c) => c.kannada && !seen.has(c.kannada) && seen.add(c.kannada)).slice(0, 5);
  return { reply, cards: uniq, saved, steps, memories };
});
