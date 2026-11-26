/*
 * MEDIOS LIGEROS PARA EL TELÉFONO — copias; los originales no se tocan. Sin red y sin proveedores.
 *
 *   node scripts/demo/optimizar-medios.mjs [carpeta=demo-medios]
 *
 *  · Vídeos: el índice (`moov`) pasa delante de los datos, para que el reproductor empiece sin tener que saltar al final
 *    del archivo. Los fotogramas son los mismos: solo se reordena y se corrigen sus desplazamientos.
 *  · Imágenes: WebP al tamaño al que se ven, con Chrome. `ligero` es lo que se ve grande y `mini` la miniatura.
 *
 * El registro apunta a las copias; `archivo` sigue nombrando el original.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CONTENEDORES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);

/** Las cajas de primer nivel de un MP4. Pura. */
export const cajasDe = (b) => {
  const cajas = [];
  for (let p = 0; p + 8 <= b.length;) {
    const n = b.readUInt32BE(p);
    if (n < 8 || p + n > b.length) throw new Error(`Caja no válida en ${p}`);
    cajas.push({ tipo: b.toString('latin1', p + 4, p + 8), inicio: p, largo: n });
    p += n;
  }
  return cajas;
};

const sumarDesplazamientos = (b, desde, hasta, suma) => {
  for (let p = desde; p + 8 <= hasta;) {
    const n = b.readUInt32BE(p);
    if (n < 8) throw new Error('Caja no válida dentro de moov');
    const t = b.toString('latin1', p + 4, p + 8);
    if (CONTENEDORES.has(t)) sumarDesplazamientos(b, p + 8, p + n, suma);
    else if (t === 'stco') {
      const c = b.readUInt32BE(p + 12);
      for (let i = 0; i < c; i++) b.writeUInt32BE(b.readUInt32BE(p + 16 + i * 4) + suma, p + 16 + i * 4);
    } else if (t === 'co64') {
      const c = b.readUInt32BE(p + 12);
      for (let i = 0; i < c; i++) b.writeBigUInt64BE(b.readBigUInt64BE(p + 16 + i * 8) + BigInt(suma), p + 16 + i * 8);
    }
    p += n;
  }
};

/** El MP4 con `moov` justo detrás de `ftyp`. Pura; si ya lo tiene delante de `mdat`, lo devuelve igual. */
export const moovDelante = (b) => {
  const cajas = cajasDe(b);
  const moov = cajas.find((c) => c.tipo === 'moov');
  const mdat = cajas.find((c) => c.tipo === 'mdat');
  const ftyp = cajas.find((c) => c.tipo === 'ftyp');
  if (!moov || !mdat || !ftyp) throw new Error('MP4 sin ftyp, moov o mdat');
  if (moov.inicio < mdat.inicio) return b;
  const copia = Buffer.from(b.subarray(moov.inicio, moov.inicio + moov.largo));
  sumarDesplazamientos(copia, 8, copia.length, moov.largo);
  return Buffer.concat([
    b.subarray(ftyp.inicio, ftyp.inicio + ftyp.largo),
    copia,
    ...cajas.filter((c) => c !== moov && c !== ftyp).map((c) => b.subarray(c.inicio, c.inicio + c.largo)),
  ]);
};

/** El ancho de la copia grande y de la miniatura de cada ranura. Pura. */
export const anchosDe = (id) => {
  if (/^(avatar|perfil)-/.test(id)) return { ligero: 320, mini: 120 };
  if (/^cover-/.test(id)) return { ligero: 1080, mini: null };
  if (/^(fashion|design)-/.test(id)) return { ligero: 640, mini: null };
  if (/^hero-/.test(id)) return { ligero: 960, mini: null };
  if (/^post-/.test(id)) return { ligero: 1080, mini: 400 };
  return { ligero: 720, mini: 360 };
};

const conChrome = async (trabajo) => {
  const puerto = 9511;
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-opt-'));
  const exe = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const ch = spawn(exe, [`--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, '--headless=new', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  const json = (u) => new Promise((ok, ko) => http.get(u, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { ok(JSON.parse(d)); } catch (e) { ko(e); } }); }).on('error', ko));
  let ws;
  for (let i = 0; i < 100 && !ws; i++) {
    try { ws = (await json(`http://127.0.0.1:${puerto}/json/version`)).webSocketDebuggerUrl; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  const so = new WebSocket(ws);
  await new Promise((r) => { so.onopen = r; });
  let id = 0;
  const pend = new Map();
  so.onmessage = (e) => { const d = JSON.parse(e.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const cdp = (m, p = {}, sid) => new Promise((ok) => { const n = ++id; pend.set(n, ok); so.send(JSON.stringify({ id: n, method: m, params: p, sessionId: sid })); });
  const { result: { targetId } } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const evaluar = async (e) => {
    const r = await cdp('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 200));
    return r.result?.result?.value;
  };
  try { return await trabajo(evaluar); } finally { ch.kill(); }
};

const principal = async (carpeta) => {
  const rutaRegistro = path.join(carpeta, 'registro.json');
  const registro = JSON.parse(fs.readFileSync(rutaRegistro, 'utf8'));
  let antes = 0;
  let despues = 0;
  for (const [id, r] of Object.entries(registro)) {
    if (!/\.mp4$/.test(r.archivo)) continue;
    const salida = moovDelante(fs.readFileSync(path.join(carpeta, r.archivo)));
    r.ligero = `r-${id}.mp4`;
    fs.writeFileSync(path.join(carpeta, r.ligero), salida);
  }
  await conChrome(async (evaluar) => {
    for (const [id, r] of Object.entries(registro)) {
      if (!/\.(jpg|jpeg|png|webp)$/.test(r.archivo)) continue;
      const original = fs.readFileSync(path.join(carpeta, r.archivo));
      const tipo = r.archivo.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const { ligero, mini } = anchosDe(id);
      antes += original.length;
      for (const [campo, ancho] of [['ligero', ligero], ['mini', mini]]) {
        if (!ancho) continue;
        const dato = await evaluar(`(async () => { const i = new Image(); i.src = 'data:${tipo};base64,${original.toString('base64')}'; await i.decode(); const w = Math.min(${ancho}, i.width); const c = document.createElement('canvas'); c.width = w; c.height = Math.round(i.height * w / i.width); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); return c.toDataURL('image/webp', 0.8); })()`);
        const nombre = `${campo === 'mini' ? 'm' : 'l'}-${id}.webp`;
        const bytes = Buffer.from(dato.split(',')[1], 'base64');
        fs.writeFileSync(path.join(carpeta, nombre), bytes);
        r[campo] = nombre;
        if (campo === 'ligero') despues += bytes.length;
      }
    }
  });
  fs.writeFileSync(rutaRegistro, JSON.stringify(registro, null, 2));
  console.log(`Imágenes: ${Math.round(antes / 1048576)} MB → ${Math.round(despues / 1048576)} MB. Vídeos con el índice delante.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await principal(path.resolve(process.argv[2] || 'demo-medios'));
  process.exit(0);
}
