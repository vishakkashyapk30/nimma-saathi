import { DECKS, SLANG, NUMBERS } from './_data.js';
import { SCENARIOS } from './roleplay.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600');
  const scenarios = Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.goal]));
  res.status(200).json({ decks: DECKS, slang: SLANG, numbers: NUMBERS, scenarios });
}
