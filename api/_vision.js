// Sarvam Vision (Doc AI "digitise") — read text from one image (signboard / bus board / menu).
// Flow (doc-ai v1, as used by sarvamai SDK >= 1.1):
//   POST /doc-ai/v1/job/digitise   multipart: file, language        -> { job_id, status, run_id }
//   GET  /doc-ai/v1/job/{id}/status                                 -> { status, usage, ... }
//   GET  /doc-ai/v1/job/{id}/download-url -> { method, url, headers } -> ZIP with .md/.json
//   (fallback) GET /doc-ai/v1/job/{id}/results?format=html          -> { documents:[{ pages:[{ content }] }] }
import { inflateRawSync } from 'node:zlib';

const BASE = 'https://api.sarvam.ai';
const POLL_MS = 1500;
const TIMEOUT_MS = 50000;
const TERMINAL = new Set(['completed', 'partially_completed', 'failed', 'rejected']);

function apiKey() {
  const k = (process.env.SARVAM_API || process.env.SARVAM_API_KEY || '').trim();
  if (!k) throw Object.assign(new Error('SARVAM_API env var not set'), { status: 500 });
  return k;
}

async function call(method, path, { form, query } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const r = await fetch(url, { method, headers: { 'api-subscription-key': apiKey() }, body: form });
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
  if (!r.ok) {
    const detail = data?.detail || data?.error?.message || data?.message || data?.title || txt;
    const extra = Array.isArray(data?.errors) ? ' ' + data.errors.map((e) => `${e.location || ''}: ${e.message || ''}`).join('; ') : '';
    throw Object.assign(new Error(`Sarvam Vision ${method} ${path} -> ${r.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}${extra}`), { status: r.status });
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- minimal ZIP reader (central directory; methods 0=stored, 8=deflate) ----
export function unzip(buf) {
  const files = {};
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Invalid ZIP: no end-of-central-directory');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    const lNameLen = buf.readUInt16LE(local + 26), lExtraLen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + csize);
    if (method === 0) files[name] = raw;
    else if (method === 8) files[name] = inflateRawSync(raw);
  }
  return files;
}

function textFromJson(node, out = []) {
  if (typeof node === 'string') return out;
  if (Array.isArray(node)) { node.forEach((x) => textFromJson(x, out)); return out; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'text' || k === 'content') && typeof v === 'string' && v.trim()) out.push(v.trim());
      else textFromJson(v, out);
    }
  }
  return out;
}

function textFromZip(buf) {
  const files = unzip(buf);
  const names = Object.keys(files).sort();
  const md = names.filter((n) => n.toLowerCase().endsWith('.md'));
  if (md.length) return md.map((n) => files[n].toString('utf8')).join('\n\n').trim();
  const json = names.filter((n) => n.toLowerCase().endsWith('.json'));
  return json.flatMap((n) => { try { return textFromJson(JSON.parse(files[n].toString('utf8'))); } catch { return []; } }).join('\n').trim();
}

async function downloadText(jobId) {
  const d = await call('GET', `/doc-ai/v1/job/${encodeURIComponent(jobId)}/download-url`);
  const r = await fetch(d.url, { method: d.method || 'GET', headers: d.headers || {} });
  if (!r.ok) throw new Error(`Sarvam Vision output download failed: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.readUInt32LE(0) === 0x04034b50) return textFromZip(buf);
  return buf.toString('utf8').trim();
}

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp' };

export async function readImage(buffer, mime = 'image/jpeg', language = 'kn-IN') {
  if (!buffer?.length) throw Object.assign(new Error('Empty image'), { status: 400 });
  const type = String(mime || 'image/jpeg').split(';')[0].trim().toLowerCase();
  const deadline = Date.now() + TIMEOUT_MS;

  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), 'image.' + (EXT[type] || 'jpg'));
  if (language) form.append('language', language);
  const job = await call('POST', '/doc-ai/v1/job/digitise', { form });
  const jobId = job.job_id;
  if (!jobId) throw new Error('Sarvam Vision: no job_id returned');

  let status = job.status;
  while (!TERMINAL.has(String(status).toLowerCase())) {
    if (Date.now() > deadline) throw Object.assign(new Error(`Sarvam Vision timed out (job ${jobId}, last status ${status})`), { status: 504 });
    await sleep(POLL_MS);
    status = (await call('GET', `/doc-ai/v1/job/${encodeURIComponent(jobId)}/status`)).status;
  }
  status = String(status).toLowerCase();
  if (status === 'failed' || status === 'rejected') throw new Error(`Sarvam Vision job ${status} (job ${jobId})`);

  // Primary: output ZIP (contains .md). Note: /results?format=md returns 400 "job produced html",
  // so the results endpoint is only a fallback, with HTML stripped to text.
  try {
    const text = await downloadText(jobId);
    if (text) return text;
  } catch (e) {
    console.error('vision download', e.message);
  }
  const res = await call('GET', `/doc-ai/v1/job/${encodeURIComponent(jobId)}/results`, { query: { format: 'html' } });
  return (res.documents || [])
    .flatMap((d) => d.pages || [])
    .map((p) => htmlToText(p.content || ''))
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function htmlToText(html) {
  return html
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
