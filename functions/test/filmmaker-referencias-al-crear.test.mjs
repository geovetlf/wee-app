/**
 * CONVERGENCIA · `productions.create` con `references: [{ role, url }]`.
 * Ligera: se cargan las FUENTES con el TypeScript del proyecto, sin red ni Firebase.
 *     node functions/test/filmmaker-referencias-al-crear.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const ts = createRequire(path.join(RAIZ, 'package.json'))('typescript');
const SRC = path.join(RAIZ, 'functions', 'src');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
let fallos = 0; let n = 0;
const check = (nombre, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ` — ${extra}` : '')); if (!cond) fallos++; };
const cargar = (rel, stubs = {}, cache = new Map()) => {
  if (cache.has(rel)) return cache.get(rel).exports;
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, rel), 'utf8'), { compilerOptions: { target: 'ES2022', module: 'commonjs' } }).outputText;
  const m = new Module(rel); m.filename = path.join(SRC, rel); m.paths = []; cache.set(rel, m);
  m.require = (p) => (p in stubs ? stubs[p] : p.startsWith('.') ? cargar(path.posix.join(path.posix.dirname(rel), p) + '.ts', stubs, cache) : require(p));
  m._compile(js, m.filename); return m.exports;
};

const UID = 'uAna';
const url = (carpeta, nombre, uid = UID) => `https://firebasestorage.googleapis.com/v0/b/wee/o/users%2F${uid}%2F${carpeta}%2F${nombre}?alt=media&token=t`;
const direccion = (u, uid) => {
  const m = /\/o\/(users%2F[^?]+)/.exec(u);
  if (!m) return { ok: false };
  const p = decodeURIComponent(m[1]);
  return p.startsWith(`users/${uid}/`) ? { ok: true, url: u, path: p } : { ok: false };
};
const creadas = [];
const crear = async (d) => { creadas.push(d); return { assetId: d.assetId }; };
const M = cargar('productions/referenciasAlCrear.ts', {
  '../engine/http': { direccionDeLaCuenta: direccion },
  '../content': { crearMaterialDesdeUrl: async () => null },
  '../filmmaker/modelo': { derivarId: (base, ocupados) => { for (let k = 2; ; k++) if (!ocupados.has(`${base}-${k}`)) return `${base}-${k}`; } },
});
const mat = (references, extra = {}) => M.materializarReferenciasAlCrear({ uid: UID, accountId: UID, references, ...extra }, { crear, direccion });

console.log('\n── referencias al crear ──');
check('1) sin `references` no hay nada que hacer', (await mat(undefined)).ok && (await mat(undefined)).references.length === 0);
const ok = await mat([{ role: 'character', url: url('creator-inputs', 'a.png') }, { role: 'world', url: url('creator-inputs', 'b.png') }, { role: 'reference', url: url('creator-inputs', 'c.png') }]);
check('2) los tres papeles de la app se traducen: character→character, world→location, reference→general', ok.ok && ok.references.map((r) => r.role).join() === 'character,location,general');
check('3) son imágenes, con el id del material y SIN URL; ids únicos', ok.references.every((r) => r.kind === 'image' && /^asset_[0-9a-f]{32}$/.test(r.assetId) && !('url' in r)) && new Set(ok.references.map((r) => r.id)).size === 3);
const otra = await mat([{ role: 'character', url: url('creator-inputs', 'a.png') }]);
check('4) la misma imagen da el mismo material (crear dos veces lo mismo es crear una)', otra.references[0].assetId === ok.references[0].assetId);
check('5) solo `creator-inputs`: lo generado por Weë se rechaza', (await mat([{ role: 'reference', url: url('ai-generations', 'x.png') }])).reason === 'reference_url_not_allowed');
check('6) una imagen de OTRA cuenta se rechaza', (await mat([{ role: 'reference', url: url('creator-inputs', 'x.png', 'uOtra') }])).reason === 'reference_url_not_allowed');
check('7) una URL de internet se rechaza', (await mat([{ role: 'reference', url: 'https://evil.example/x.png' }])).reason === 'reference_url_not_allowed');
const r8 = await mat([{ role: 'reference', url: url('creator-inputs', 'a.png') }, { role: 'villano', url: url('creator-inputs', 'b.png') }]);
check('8) un papel desconocido se rechaza y dice cuál (índice)', r8.reason === 'reference_role_unknown' && r8.index === 1);
check('9) forma mal: no es lista / elemento sin url / demasiadas', (await mat('x')).reason === 'references_not_a_list' && (await mat([{ role: 'reference' }])).reason === 'reference_malformed' && (await mat(Array.from({ length: 31 }, () => ({ role: 'reference', url: url('creator-inputs', 'a.png') })))).reason === 'references_too_many');
check('10) si el material no se puede crear, se rechaza (nada a medias)', (await M.materializarReferenciasAlCrear({ uid: UID, accountId: UID, references: [{ role: 'reference', url: url('creator-inputs', 'a.png') }] }, { crear: async () => null, direccion })).reason === 'reference_unavailable');
check('11) los ids no chocan con los que la producción ya usa', (await mat([{ role: 'reference', url: url('creator-inputs', 'a.png') }], { ocupados: new Set(['ref-2']) })).references[0].id === 'ref-3');

console.log('\n── cableado ──');
const puerta = leer('functions/src/productions/puerta.ts');
const index = leer('functions/src/productions/index.ts');
check('12) la puerta pasa el uid del principal y solo en `create` toca las referencias', /uid: request\.auth\.uid/.test(puerta) && /materializarReferenciasAlCrear\(\{ uid: ctx\.uid/.test(puerta));
check('13) `crearProduccion` las añade a las de la producción y la integridad las comprueba DESPUÉS', index.indexOf('inicial.prod = { ...inicial.prod, references') > 0 && index.indexOf('inicial.prod = { ...inicial.prod, references') < index.indexOf('const rota = integridad(inicial.prod)'));
check('14) sin `references` el comportamiento es el de siempre (la rama no se ejecuta)', /if \(p\.references && p\.references\.length\)/.test(index));

console.log(fallos ? `\n✘ ${fallos} fallan de ${n}` : `\n✔ ${n} comprobaciones`);
process.exit(fallos ? 1 : 0);
