import { handle, sarvam, speak, LANGS } from './_sarvam.js';

export const SCENARIOS = {
  auto: { who: 'Raju, a chatty Bengaluru auto-rickshaw driver at Majestic', goal: 'get to Indiranagar by meter or for a fair price (he first asks ₹250)' },
  darshini: { who: 'Manju, a fast-talking waiter at a busy Basavanagudi darshini', goal: 'order breakfast (dosa/idli/coffee), ask for less spice and pay the bill' },
  shop: { who: 'Lakshmamma, a shopkeeper on Commercial Street selling silk scarves', goal: 'ask the price of a scarf and bargain it down politely' },
  directions: { who: 'a friendly uncle at a Jayanagar bus stop', goal: 'ask the way to Lalbagh and which bus to take' },
  metro: { who: 'a Namma Metro ticket-counter staffer at MG Road station', goal: 'buy a ticket to Whitefield and ask which platform' },
};

function parseJson(s = '') {
  s = s.replace(/<think>[\s\S]*?<\/think>/g, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Saathi lost the script — try again');
  return JSON.parse(s.slice(a, b + 1));
}

// turns: [{ role: 'character'|'user', text }]
export default handle(async ({ scenario = 'auto', turns = [], reply = '', lang = 'en-IN' }) => {
  const sc = SCENARIOS[scenario] || SCENARIOS.auto;
  const langName = LANGS[lang] || 'English';
  const userTurns = turns.filter((t) => t.role === 'user').length + (reply ? 1 : 0);
  const sys = `You are role-playing ${sc.who} so a beginner traveller can practise spoken Kannada. Learner's goal: ${sc.goal}.
Speak SIMPLE, short, colloquial Bengaluru Kannada (1 sentence, max ~12 words), stay in character, be warm and a little funny. If the learner replies in ${langName} instead of Kannada, still respond in Kannada but nudge them in feedback.
Return ONLY a JSON object, no prose, with keys:
"reply_kn": your line in Kannada script,
"reply_roman": the same line romanized for an English reader,
"reply_meaning": its meaning in ${langName},
"feedback": one short encouraging sentence in ${langName} about the learner's last line (empty string if the scene just started),
"score": integer 0-10 rating the learner's last line for being understandable Kannada (null if just started),
"hint_kn": a simple Kannada line the learner could say next, "hint_roman": its romanization, "hint_meaning": its meaning in ${langName},
"done": true when the goal is achieved or after about 5 learner turns (now ${userTurns}).`;
  const messages = [{ role: 'system', content: sys }];
  for (const t of turns.slice(-12)) messages.push({ role: t.role === 'user' ? 'user' : 'assistant', content: String(t.text).slice(0, 400) });
  messages.push({ role: 'user', content: reply ? `Learner says: ${reply}` : 'Start the scene with your opening line.' });

  let out;
  for (let i = 0; i < 2 && !out; i++) {
    const d = await sarvam('/v1/chat/completions', { model: 'sarvam-105b', messages, temperature: 0.6, max_tokens: 2500 });
    try { out = parseJson(d.choices?.[0]?.message?.content); } catch (e) { if (i) throw e; }
  }
  out.audio = await speak(out.reply_kn || '', 'kn-IN').catch(() => null);
  return out;
});
