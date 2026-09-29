// R18 · pruebas del parche aislado de la tabla de píxeles, sin red y sin Firebase: el precio y la estimación del
// adaptador compilados de la base (lo que corre hoy, 7f11d51) y del arreglo. La tabla esperada está transcrita de la
// documentación oficial de ModelArk («Width and height pixel values corresponding to different aspect ratios») y los
// ejemplos de precio, de su página de precios (docs.byteplus.com/en/docs/ModelArk/1544106).
// Uso: node scripts/hotfix-r18-verificar.cjs <base> <arreglo> [--tabla]   (docs/FILMMAKER-R18-TABLA-DE-PIXELES.md)
//
// Las dos copias se montan fuera del repositorio desde el código desplegado: `git archive <commit> functions/src
// functions/package.json functions/tsconfig.json` dos veces; en la del arreglo, `git apply -p1` con el parche de docs/;
// en las dos, las dependencias de functions (un enlace a un node_modules) y `tsc -p functions`.
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (args.length < 2) { console.error('uso: node scripts/hotfix-r18-verificar.cjs <base> <arreglo> [--tabla]'); process.exit(2); }
const DIR = { base: path.resolve(args[0]), fix: path.resolve(args[1]) };
const L = (lado, p) => require(path.join(DIR[lado], 'functions/lib', p));
const base = { precio: L('base', 'credits/aiPricing.js'), sd: L('base', 'engine/providers/seedance.js') };
const fix = { precio: L('fix', 'credits/aiPricing.js'), sd: L('fix', 'engine/providers/seedance.js') };
const { DEFAULT_SETTINGS } = L('base', 'engine/registry.js');
const M = base.sd.SEEDANCE_MODEL_IDS;
let fallos = 0; let n = 0;
const check = (nombre, ok, extra = '') => { n++; console.log(`${ok ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`); if (!ok) fallos++; };

/* ── La tabla OFICIAL (transcrita de la documentación): ancho × alto por serie, resolución y proporción ── */
const COMUN = {
  '720p': { '16:9': [1280, 720], '4:3': [1112, 834], '1:1': [960, 960], '3:4': [834, 1112], '9:16': [720, 1280], '21:9': [1470, 630] },
  '1080p': { '16:9': [1920, 1080], '4:3': [1664, 1248], '1:1': [1440, 1440], '3:4': [1248, 1664], '9:16': [1080, 1920], '21:9': [2206, 946] },
};
const OFICIAL = {
  '2.5': {
    '480p': { '16:9': [854, 480], '4:3': [752, 560], '1:1': [640, 640], '3:4': [560, 752], '9:16': [480, 854], '21:9': [992, 432] },
    ...COMUN,
  },
  '2.0': {
    '480p': { '16:9': [864, 496], '4:3': [752, 560], '1:1': [640, 640], '3:4': [560, 752], '9:16': [496, 864], '21:9': [992, 432] },
    ...COMUN,
    '4k': { '16:9': [3840, 2160], '4:3': [3326, 2494], '1:1': [2880, 2880], '3:4': [2494, 3326], '9:16': [2160, 3840], '21:9': [4398, 1886] },
  },
};
const MODELOS = [
  { id: M.SEEDANCE_2_5, serie: '2.5', res: ['480p', '720p', '1080p'] },
  { id: M.SEEDANCE_2_0, serie: '2.0', res: ['480p', '720p', '1080p', '4k'] },
  { id: M.SEEDANCE_2_0_FAST, serie: '2.0', res: ['480p', '720p'] },
  { id: M.SEEDANCE_2_0_MINI, serie: '2.0', res: ['480p', '720p'] },
];
const PROPORCIONES = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'];
const porSegundo = ([w, h]) => Math.round((w * h * 24) / 1024);
/* La fórmula oficial redondea el total, no cada segundo. */
const tokensDe = ([w, h], seg) => Math.round((seg * w * h * 24) / 1024);
const precio = (lado, modelId, resolution, ratio, durationSec = 5, extra = {}) => lado.precio.priceVideo({ modelId, resolution, aspectRatio: ratio, durationSec, ...extra }, DEFAULT_SETTINGS);

/* 1 · La tabla del arreglo es la oficial, modelo a modelo, resolución a resolución y proporción a proporción. */
const distintos = [];
for (const m of MODELOS) for (const r of m.res) for (const p of PROPORCIONES) {
  const esperado = porSegundo(OFICIAL[m.serie][r][p]);
  const dado = fix.sd.seedanceTokens(r, p, 1, 0, m.id);
  if (dado !== esperado) distintos.push(`${m.id} ${r} ${p}: ${dado} ≠ ${esperado}`);
}
check('la tabla del arreglo es la oficial en los cuatro modelos, cada resolución y las seis proporciones', distintos.length === 0, distintos.slice(0, 3).join(' · '));

/* 2 · Los ejemplos de precio publicados por BytePlus (5 s, 16:9), redondeados como en su página. */
const EJEMPLOS = [
  [M.SEEDANCE_2_5, '480p', 0.514, 3], [M.SEEDANCE_2_5, '720p', 1.156, 3], [M.SEEDANCE_2_5, '1080p', 2.843, 3],
  [M.SEEDANCE_2_0, '480p', 0.35, 2], [M.SEEDANCE_2_0, '720p', 0.76, 2], [M.SEEDANCE_2_0, '1080p', 1.87, 2], [M.SEEDANCE_2_0, '4k', 3.89, 2],
  [M.SEEDANCE_2_0_FAST, '480p', 0.28, 2], [M.SEEDANCE_2_0_FAST, '720p', 0.60, 2],
  [M.SEEDANCE_2_0_MINI, '480p', 0.18, 2], [M.SEEDANCE_2_0_MINI, '720p', 0.38, 2],
];
const noCuadran = EJEMPLOS.filter(([m, r, usd, d]) => Number(precio(fix, m, r, '16:9').usd.toFixed(d)) !== usd).map(([m, r]) => `${m} ${r}`);
check('los once ejemplos de precio publicados salen exactos con el arreglo', noCuadran.length === 0, noCuadran.join(', '));
const hoyNoCuadran = EJEMPLOS.filter(([m, r, usd, d]) => Number(precio(base, m, r, '16:9').usd.toFixed(d)) !== usd).map(([m, r]) => `${m} ${r}`);
check('y la tabla de hoy falla justo en los de 480p de la serie 2.0 (854×480 en vez de 864×496)',
  hoyNoCuadran.length > 0 && hoyNoCuadran.every((x) => /480p/.test(x) && !x.startsWith(M.SEEDANCE_2_5)), hoyNoCuadran.join(', '));

/* 3 · Lo que ya estaba bien no cambia: 16:9 y 9:16 en 720p, 1080p y 4K, y 480p en Seedance 2.5. */
const cambiaronBien = [];
for (const m of MODELOS) for (const r of m.res) for (const p of ['16:9', '9:16']) {
  if (r === '480p' && m.serie === '2.0') continue;
  if (JSON.stringify(precio(base, m.id, r, p)) !== JSON.stringify(precio(fix, m.id, r, p))) cambiaronBien.push(`${m.id} ${r} ${p}`);
}
check('una petición que hoy se cotiza bien cuesta exactamente lo mismo (16:9 y 9:16; 480p en 2.5)', cambiaronBien.length === 0, cambiaronBien.join(', '));

/* 4 · Lo que estaba mal cambia, y al oficial: 1:1, 4:3, 3:4 y 21:9 en todo, y 480p 16:9/9:16 en la serie 2.0. */
const tabla = [];
const noCambiaron = [];
for (const m of MODELOS) for (const r of m.res) for (const p of PROPORCIONES) {
  const bien = !['1:1', '4:3', '3:4', '21:9'].includes(p) && !(r === '480p' && m.serie === '2.0');
  if (bien) continue;
  const hoy = precio(base, m.id, r, p);
  const nuevo = precio(fix, m.id, r, p);
  const oficial = (tokensDe(OFICIAL[m.serie][r][p], 5) * nuevo.detail.usdPerMillionTokens) / 1e6;
  if (!(hoy.usd !== nuevo.usd && Math.abs(nuevo.usd - oficial) < 1e-9)) noCambiaron.push(`${m.id} ${r} ${p}`);
  tabla.push({ modelo: m.id, res: r, prop: p, hoy: hoy.usd, oficial: nuevo.usd, dif: (hoy.usd - nuevo.usd) / nuevo.usd });
}
check('lo que hoy se cotiza mal pasa al precio oficial (1:1, 4:3, 3:4, 21:9; 480p 16:9 y 9:16 de la serie 2.0)', noCambiaron.length === 0 && tabla.length > 0, noCambiaron.slice(0, 3).join(', '));
const pct = (x) => Math.round(x * 10000) / 100;
const cerca = (a, b) => Math.abs(a - b) <= 0.02;
const de = (prop, res, modelo = M.SEEDANCE_2_0) => tabla.find((f) => f.prop === prop && f.res === res && f.modelo === modelo);
check('las diferencias son las que se dicen: 1:1 −43,75 %, 4:3 −25,5 %, 21:9 +30,6 % (720p), 480p 16:9 de la serie 2.0 −4,35 %',
  cerca(pct(de('1:1', '720p').dif), -43.75) && cerca(pct(de('4:3', '720p').dif), -25.47) && cerca(pct(de('21:9', '720p').dif), 30.61) && cerca(pct(de('16:9', '480p').dif), -4.35),
  `1:1 ${pct(de('1:1', '720p').dif)} · 4:3 ${pct(de('4:3', '720p').dif)} · 21:9 ${pct(de('21:9', '720p').dif)} · 480p ${pct(de('16:9', '480p').dif)}`);

/* 5 · `adaptive` (la proporción la pone la entrada): la mayor de su resolución, un techo. */
const mayor = (serie, r) => Math.max(...PROPORCIONES.map((p) => porSegundo(OFICIAL[serie][r][p])));
const adaptivos = MODELOS.flatMap((m) => m.res.map((r) => [m, r])).filter(([m, r]) => fix.sd.seedanceTokens(r, 'adaptive', 1, 0, m.id) !== mayor(m.serie, r));
check('`adaptive` se cotiza con la mayor de su resolución (hoy, como 16:9)', adaptivos.length === 0 && base.sd.seedanceTokens('720p', 'adaptive', 1, 0) === porSegundo([1280, 720]),
  adaptivos.map(([m, r]) => `${m.id} ${r}`).join(', '));

/* 6 · Una proporción que no existe se cotiza como 16:9 —lo que el adaptador manda—, igual que hoy; y sin proporción, igual. */
const raras = ['5:4', 'cuadrado', ''];
const rarasCambian = MODELOS.flatMap((m) => raras.map((p) => [m, p])).filter(([m, p]) => JSON.stringify(precio(base, m.id, '720p', p || undefined)) !== JSON.stringify(precio(fix, m.id, '720p', p || undefined)));
check('una proporción desconocida o ausente cuesta lo mismo que hoy (16:9)', rarasCambian.length === 0, rarasCambian.map(([m, p]) => `${m.id} «${p}»`).join(', '));

/* 7 · R22 sigue: -1 al máximo del modelo y los vídeos de referencia al techo (en 16:9, idéntico a hoy). */
const r22 = [M.SEEDANCE_2_0_FAST, M.SEEDANCE_2_5].every((m) => JSON.stringify(precio(base, m, '720p', '16:9', -1)) === JSON.stringify(precio(fix, m, '720p', '16:9', -1))
  && JSON.stringify(precio(base, m, '720p', '16:9', 5, { inputVideoSec: base.sd.techoDeVideoDeEntrada(m) })) === JSON.stringify(precio(fix, m, '720p', '16:9', 5, { inputVideoSec: fix.sd.techoDeVideoDeEntrada(m) })));
check('R22 sigue igual: -1 y los vídeos de referencia se cotizan con su techo', r22 && precio(fix, M.SEEDANCE_2_0_FAST, '720p', '16:9', -1).detail.estimatedTokens === tokensDe([1280, 720], 15));

/* 8 · Solo cambia seedance.ts: ni otro adaptador, ni el precio de imagen, texto o voz. */
const listar = (d) => { const out = []; const rec = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) rec(p); else out.push(p); } }; rec(d); return out.map((p) => path.relative(d, p).split(path.sep).join('/')).sort(); };
const srcBase = path.join(DIR.base, 'functions/src');
const srcFix = path.join(DIR.fix, 'functions/src');
const cambiados = listar(srcBase).filter((f) => fs.readFileSync(path.join(srcBase, f), 'utf8') !== fs.readFileSync(path.join(srcFix, f), 'utf8'));
check('el arreglo cambia un solo archivo: engine/providers/seedance.ts', JSON.stringify(cambiados) === JSON.stringify(['engine/providers/seedance.ts']) && JSON.stringify(listar(srcBase)) === JSON.stringify(listar(srcFix)), cambiados.join(', '));
const imagen = (lado) => { try { return JSON.stringify(lado.precio.priceImage({ capability: 'image.generate', count: 1, quality: 'standard', aspectRatio: '1:1' }, DEFAULT_SETTINGS)); } catch (e) { return `error: ${e.message}`; } };
check('el precio de una imagen (1:1) no cambia', imagen(base) === imagen(fix), imagen(fix).slice(0, 80));

/* 9 · La petición al proveedor no cambia; la estimación del adaptador sigue la tabla oficial. */
(async () => {
  const cuerpos = [];
  for (const p of ['16:9', '1:1', '4:3', '21:9', '9:16']) {
    const pedir = (lado) => lado.sd.buildSeedanceBody({ capability: 'video.generate', input: { prompt: 'Un faro', aspectRatio: p, resolution: '720p', durationSec: 5 }, model: { id: M.SEEDANCE_2_0_FAST }, prefs: {} });
    const [b, f] = [await pedir(base), await pedir(fix)];
    cuerpos.push({ p, igual: JSON.stringify(b.body) === JSON.stringify(f.body), estimado: f.estimatedTokens === tokensDe(OFICIAL['2.0']['720p'][p], 5) });
  }
  check('al proveedor le llega la misma petición; el adaptador estima con la tabla oficial', cuerpos.every((c) => c.igual && c.estimado), JSON.stringify(cuerpos.filter((c) => !c.igual || !c.estimado)));
  /* A 480p 16:9 la estimación depende del modelo: 2.5 entrega 854×480 y la serie 2.0, 864×496. */
  const a480 = async (id) => (await fix.sd.buildSeedanceBody({ capability: 'video.generate', input: { prompt: 'Un faro', aspectRatio: '16:9', resolution: '480p', durationSec: 5 }, model: { id }, prefs: {} })).estimatedTokens;
  check('y a 480p 16:9 estima según el modelo (2.5: 854×480; serie 2.0: 864×496)',
    (await a480(M.SEEDANCE_2_5)) === tokensDe([854, 480], 5) && (await a480(M.SEEDANCE_2_0_FAST)) === tokensDe([864, 496], 5));

  if (process.argv.includes('--tabla')) {
    console.log('\nPrecio de lista de 5 s (USD), hoy → oficial, y cuánto se desvía hoy:');
    for (const f of tabla) console.log(`  ${f.modelo} · ${f.res} · ${f.prop}: ${f.hoy.toFixed(4)} → ${f.oficial.toFixed(4)} (${pct(f.dif) > 0 ? '+' : ''}${pct(f.dif)} %)`);
  }
  console.log(`\n${fallos ? '✘' : '✔'} R18 sobre 7f11d51: ${n - fallos}/${n}`);
  process.exit(fallos ? 1 : 0);
})();
