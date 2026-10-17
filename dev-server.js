// Local dev / Render server: serves /public and routes /api/<name> to api/<name>.js (same handlers Vercel uses)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(root, '.env'))) {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^\w-]/g, '');
    const file = path.join(root, 'api', name + '.js');
    if (name.startsWith('_') || !fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    const mod = await import(pathToFileURL(file).href + '?v=' + fs.statSync(file).mtimeMs);
    return mod.default(req, res);
  }
  let p = path.join(root, 'public', decodeURIComponent(url.pathname));
  if (!p.startsWith(path.join(root, 'public'))) return res.status(403).end();
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'public', 'index.html');
  res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Namma Saathi on http://localhost:' + (process.env.PORT || 3000)));
