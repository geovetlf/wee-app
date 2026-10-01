/*
 * EL INFORME DE RESERVAS COLGADAS — `ops/reconciliacion/reservas-colgadas.mjs` (H0 #15).
 *
 * Lo que importa: (1) solo LEE —ni una escritura, ni un reembolso, ni una IA—,
 * (2) usa un índice que ya existe (no hay que desplegar nada para correrlo) y
 * (3) cuenta bien: solo reservas de uso abiertas, de más de N horas, por servicio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const r = await import(pathToFileURL(path.join(RAIZ, 'ops/reconciliacion/reservas-colgadas.mjs')).href);
const fuente = fs.readFileSync(path.join(RAIZ, 'ops/reconciliacion/reservas-colgadas.mjs'), 'utf8');
const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

check('1) solo lee: ninguna escritura, transacción, lote, reembolso ni llamada a una IA',
  !/\.(set|update|delete|add|create|commit)\(|runTransaction|\.batch\(|refundCredits\(|completeCredits\(|fetch\(|httpsCallable/.test(codigo));
check('2) lee solo creditTransactions, solo AUTHORIZED, con un límite', /collection\('creditTransactions'\)/.test(codigo)
  && /where\('status', '==', 'AUTHORIZED'\)/.test(codigo) && /\.limit\(limite\)/.test(codigo) && (codigo.match(/collection\(/g) || []).length === 1);
const indices = JSON.parse(fs.readFileSync(path.join(RAIZ, 'firestore.indexes.json'), 'utf8')).indexes;
check('3) la consulta usa un índice que YA existe (status ASC + createdAt DESC): no hay que desplegar nada',
  indices.some((i) => i.collectionGroup === 'creditTransactions' && JSON.stringify(i.fields) === JSON.stringify([{ fieldPath: 'status', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }]))
  && /orderBy\('createdAt', 'desc'\)/.test(codigo));

const AHORA = Date.UTC(2026, 9, 1, 12, 0, 0);
const hace = (h) => ({ toMillis: () => AHORA - h * 3600_000 });
const tx = [
  { id: 'usage_a', type: 'usage', status: 'AUTHORIZED', service: 'ai_video', amount: -40, authorizedAmount: 40, createdAt: hace(30) },
  { id: 'usage_b', type: 'usage', status: 'AUTHORIZED', service: 'ai_video', amount: -20, authorizedAmount: 20, createdAt: hace(3) },
  { id: 'usage_c', type: 'usage', status: 'AUTHORIZED', service: 'brain_search', amount: -1, authorizedAmount: 1, createdAt: hace(5) },
  { id: 'usage_d', type: 'usage', status: 'AUTHORIZED', service: 'ai_image', amount: -8, authorizedAmount: 8, createdAt: hace(0.5) },
  { id: 'usage_e', type: 'usage', status: 'COMPLETED', service: 'ai_image', amount: -8, createdAt: hace(40) },
  { id: 'refund_f', type: 'refund', status: 'AUTHORIZED', amount: 8, createdAt: hace(40) },
  { id: 'usage_g', type: 'usage', status: 'AUTHORIZED', service: 'ai_text', amount: -2, createdAt: null },
];
const c = r.clasificar(tx, AHORA, 2);
check('4) cuenta solo reservas de uso ABIERTAS de más de 2 h: no las recientes, ni las cerradas, ni otros tipos, ni las sin fecha',
  JSON.stringify(c.colgadas.map((t) => t.id)) === JSON.stringify(['usage_a', 'usage_c', 'usage_b']), c.colgadas.map((t) => t.id).join(','));
check('5) y suma bien: 3 reservas y 61 Credits, por servicio y con la edad de la más antigua',
  c.total.reservas === 3 && c.total.credits === 61 && c.porServicio.ai_video.reservas === 2 && c.porServicio.ai_video.credits === 60
  && c.porServicio.ai_video.masAntiguaHoras === 30 && c.porServicio.brain_search.credits === 1, JSON.stringify(c.porServicio));
check('6) con otro umbral cambia lo que cuenta (más de 24 h: solo la de 30 h)', r.clasificar(tx, AHORA, 24).total.reservas === 1);
check('7) sin reservas, nada que contar', r.clasificar([], AHORA).total.reservas === 0 && r.HORAS_POR_DEFECTO === 2);

const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'functions/package.json'), 'utf8'));
check('8) esta suite está en la cadena de `npm test`', /reservas-colgadas\.test\.mjs/.test(pkg.scripts.test));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
