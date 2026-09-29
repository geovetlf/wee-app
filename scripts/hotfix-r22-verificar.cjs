// R22 · verificación del arreglo mínimo contra lo desplegado (96b3f7a), sin red y sin Firebase: el precio y la
// estimación del adaptador compilados de las dos copias.
// Uso: node scripts/hotfix-r22-verificar.cjs <base> <arreglo>   (docs/FILMMAKER-R22-GENERATEVIDEO.md)
//
// Las dos copias se montan fuera del repositorio desde el código desplegado: `git archive <commit> functions/src
// functions/package.json functions/tsconfig.json` dos veces; en la del arreglo, `git apply -p1` con el parche de docs/;
// en las dos, las dependencias de functions (un enlace a un node_modules) y `tsc -p functions`.
const path = require('path');
const fs = require('fs');
/* Las dos copias: la base (lo desplegado) y el arreglo; por defecto, las de esta carpeta. */
if (process.argv.length < 4) { console.error('uso: node scripts/hotfix-r22-verificar.cjs <base> <arreglo>'); process.exit(2); }
const DIR = { base: path.resolve(process.argv[2]), hotfix: path.resolve(process.argv[3]) };
console.log('base:', DIR.base);
console.log('arreglo:', DIR.hotfix);
const L = (copia, p) => require(path.join(DIR[copia], 'functions/lib', p));
const base = { precio: L('base', 'credits/aiPricing.js'), sd: L('base', 'engine/providers/seedance.js') };
const arreglo = { precio: L('hotfix', 'credits/aiPricing.js'), sd: L('hotfix', 'engine/providers/seedance.js') };
const { DEFAULT_SETTINGS } = L('base', 'engine/registry.js');
const M = base.sd.SEEDANCE_MODEL_IDS;
let fallos = 0; let n = 0;
const check = (nombre, ok, extra = '') => { n++; console.log(`${ok ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`); if (!ok) fallos++; };
const p = (lado, input) => lado.precio.priceVideo(input, DEFAULT_SETTINGS);
const usd = (x) => `USD ${x.usd.toFixed(4)} · ${x.credits} Credits`;
const tabla = [];

/* 1 · Lo normal no cambia: el mismo precio, céntimo a céntimo. */
const NORMALES = [
  { modelId: M.SEEDANCE_2_0_FAST, durationSec: 5, aspectRatio: '16:9', resolution: '720p' },
  { modelId: M.SEEDANCE_2_0_FAST, durationSec: 10, aspectRatio: '9:16', resolution: '480p' },
  { modelId: M.SEEDANCE_2_0, durationSec: 8, aspectRatio: '16:9', resolution: '1080p' },
  { modelId: M.SEEDANCE_2_5, durationSec: 12, aspectRatio: '16:9', resolution: '1080p' },
  { modelId: M.SEEDANCE_2_0_MINI, durationSec: 4, aspectRatio: '1:1', resolution: '720p' },
];
check('lo normal (duración dada, sin vídeo de referencia) cuesta exactamente lo mismo que hoy',
  NORMALES.every((i) => JSON.stringify(p(base, i)) === JSON.stringify(p(arreglo, i))));

/* 2 · `durationSec: -1`: hoy se cotiza como 5 s; con el arreglo, con el máximo del modelo. */
for (const [modelo, res, max] of [[M.SEEDANCE_2_0_FAST, '720p', 15], [M.SEEDANCE_2_0, '720p', 15], [M.SEEDANCE_2_5, '1080p', 30]]) {
  const hoy = p(base, { modelId: modelo, durationSec: -1, aspectRatio: '16:9', resolution: res });
  const cinco = p(base, { modelId: modelo, durationSec: 5, aspectRatio: '16:9', resolution: res });
  const nuevo = p(arreglo, { modelId: modelo, durationSec: -1, aspectRatio: '16:9', resolution: res });
  const techo = p(arreglo, { modelId: modelo, durationSec: max, aspectRatio: '16:9', resolution: res });
  check(`-1 en ${modelo} ${res}: hoy como 5 s; con el arreglo, como ${max} s`, hoy.usd === cinco.usd && nuevo.usd === techo.usd && nuevo.usd > hoy.usd, `${usd(hoy)} → ${usd(nuevo)}`);
  tabla.push([`-1 · ${modelo} ${res}`, usd(hoy), usd(nuevo)]);
}

/* 3 · Vídeos de referencia: hoy cuenta lo que declare quien llama (0 si no dice nada); con el arreglo, el techo. */
for (const [modelo, res] of [[M.SEEDANCE_2_0_FAST, '720p'], [M.SEEDANCE_2_5, '1080p']]) {
  const techo = arreglo.sd.techoDeVideoDeEntrada(modelo);
  const hoySinDecir = p(base, { modelId: modelo, durationSec: 5, aspectRatio: '16:9', resolution: res, inputVideoSec: undefined });
  const hoyDiciendoUno = p(base, { modelId: modelo, durationSec: 5, aspectRatio: '16:9', resolution: res, inputVideoSec: 1 });
  const nuevo = p(arreglo, { modelId: modelo, durationSec: 5, aspectRatio: '16:9', resolution: res, inputVideoSec: techo });
  check(`referencias en ${modelo} ${res}: la entrada se cotiza con su techo (${techo} s), no con lo declarado`, nuevo.usd > hoySinDecir.usd && nuevo.usd > hoyDiciendoUno.usd, `${usd(hoySinDecir)} (sin decir) / ${usd(hoyDiciendoUno)} (dice 1 s) → ${usd(nuevo)}`);
  tabla.push([`5 s + vídeo de referencia · ${modelo} ${res}`, usd(hoySinDecir), usd(nuevo)]);
}
check('los techos son los oficiales: 2.5, 30 s; serie 2.0, 15 s',
  arreglo.sd.techoDeVideoDeEntrada(M.SEEDANCE_2_5) === 30 && [M.SEEDANCE_2_0, M.SEEDANCE_2_0_FAST, M.SEEDANCE_2_0_MINI].every((m) => arreglo.sd.techoDeVideoDeEntrada(m) === 15));

/* 4 · La estimación del adaptador (la que se apunta en el libro antes del coste real) sigue la misma regla. */
(async () => {
  const modelo = { id: M.SEEDANCE_2_0_FAST };
  const pedir = (lado, extra) => lado.sd.buildSeedanceBody({ capability: 'video.reference', input: { prompt: 'Un faro', aspectRatio: '16:9', resolution: '720p', referenceVideos: ['https://storage.test/users/u/v.mp4'], referenceVideoSec: 1, ...extra }, model: modelo, prefs: {} });
  const hoy = await pedir(base, {});
  const nuevo = await pedir(arreglo, {});
  check('el adaptador estima la entrada con el techo aunque quien llama diga 1 s', nuevo.estimatedTokens === arreglo.sd.seedanceTokens('720p', '16:9', 5, 15) && hoy.estimatedTokens === base.sd.seedanceTokens('720p', '16:9', 5, 1), `${hoy.estimatedTokens} → ${nuevo.estimatedTokens} tokens`);
  const hoyMenosUno = await base.sd.buildSeedanceBody({ capability: 'video.generate', input: { prompt: 'Un faro', aspectRatio: '16:9', resolution: '720p', durationSec: -1 }, model: modelo, prefs: {} });
  const nuevoMenosUno = await arreglo.sd.buildSeedanceBody({ capability: 'video.generate', input: { prompt: 'Un faro', aspectRatio: '16:9', resolution: '720p', durationSec: -1 }, model: modelo, prefs: {} });
  check('y -1 lo estima con el máximo; al proveedor le sigue llegando -1 (la petición no cambia)',
    nuevoMenosUno.estimatedTokens === arreglo.sd.seedanceTokens('720p', '16:9', 15, 0) && nuevoMenosUno.body.duration === -1 && JSON.stringify(nuevoMenosUno.body) === JSON.stringify(hoyMenosUno.body),
    `${hoyMenosUno.estimatedTokens} → ${nuevoMenosUno.estimatedTokens} tokens`);

  /* 5 · La puerta: ya no lee los segundos declarados, y cotiza con el techo. */
  const puerta = fs.readFileSync(path.join(DIR.hotfix, 'functions/src/creator/video.ts'), 'utf8');
  check('generateVideo ya no lee `references.videoSeconds` y cotiza la entrada con `techoDeVideoDeEntrada`',
    !/data\.references\.videoSeconds/.test(puerta) && /inputVideoSec: videoRequest\.references\?\.videos\?\.length \? techoDeVideoDeEntrada\(modeloDelPrecio\) : undefined/.test(puerta));
  const antes = fs.readFileSync(path.join(DIR.base, 'functions/src/creator/video.ts'), 'utf8');
  check('y lo de hoy es como se dice: lee lo declarado', /videoSeconds: data\.references\.videoSeconds/.test(antes) && /inputVideoSec: videoRequest\.references\?\.videoSeconds/.test(antes));

  console.log('\nPrecio de lista (DEFAULT_SETTINGS del código; en producción manda la configuración de Firestore):');
  for (const [caso, hoyTxt, nuevoTxt] of tabla) console.log(`  ${caso}: hoy ${hoyTxt} → con el arreglo ${nuevoTxt}`);
  console.log(`\n${fallos ? '✘' : '✔'} R22 sobre 96b3f7a: ${n - fallos}/${n}`);
  process.exit(fallos ? 1 : 0);
})();
