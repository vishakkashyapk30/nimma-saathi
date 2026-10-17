import { DECKS } from './_data.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400');
  res.status(200).json(DECKS);
}
