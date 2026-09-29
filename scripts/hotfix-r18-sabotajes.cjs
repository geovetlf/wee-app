// R18 · batería de sabotajes: cada uno vuelve a meter UN error en el código compilado del arreglo
// (fix/functions/lib/engine/providers/seedance.js) y las pruebas (verificar-r18.cjs) tienen que caer. El archivo y su
// fecha se devuelven siempre. Uso: node scripts/hotfix-r18-sabotajes.cjs <base> <arreglo> [filtro]
//
// Las dos copias se montan fuera del repositorio desde el código desplegado: `git archive <commit> functions/src
// functions/package.json functions/tsconfig.json` dos veces; en la del arreglo, `git apply -p1` con el parche de docs/;
// en las dos, las dependencias de functions (un enlace a un node_modules) y `tsc -p functions`.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
if (process.argv.length < 4) { console.error('uso: node scripts/hotfix-r18-sabotajes.cjs <base> <arreglo> [filtro]'); process.exit(2); }
const BASE = path.resolve(process.argv[2]);
const FIX = path.resolve(process.argv[3]);
const F = path.join(FIX, 'functions/lib/engine/providers/seedance.js');
const cambiar = (de, a) => (s) => (s.includes(de) ? s.split(de).join(a) : s);
const SAB = [
  ['T1 720p 1:1 vuelve al lado corto (720×720)', cambiar("'1:1': [960, 960]", "'1:1': [720, 720]")],
  ['T2 720p 4:3 vuelve a 960×720', cambiar("'4:3': [1112, 834]", "'4:3': [960, 720]")],
  ['T3 720p 21:9 vuelve a 1680×720', cambiar("'21:9': [1470, 630]", "'21:9': [1680, 720]")],
  ['T4 1080p 1:1 vuelve a 1080×1080', cambiar("'1:1': [1440, 1440]", "'1:1': [1080, 1080]")],
  ['T5 4K 21:9 vuelve a 5040×2160', cambiar("'21:9': [4398, 1886]", "'21:9': [5040, 2160]")],
  ['T6 480p 4:3 vuelve a 640×480', cambiar("'4:3': [752, 560]", "'4:3': [640, 480]")],
  ['T7 la serie 2.0 a 480p vuelve a 854×480', cambiar('const PIXELS_480P_16_9_SERIE_2_0 = [864, 496];', 'const PIXELS_480P_16_9_SERIE_2_0 = [854, 480];')],
  ['T8 Seedance 2.5 recibe la medida de la serie 2.0 a 480p', cambiar("(0, exports.specOf)(modelId).key !== 'SEEDANCE_2_5'", 'true')],
  ['T9 `adaptive` vuelve a cotizarse como 16:9', cambiar("if (ratio === 'adaptive')\n        return Math.max(", "if (false)\n        return Math.max(")],
  ['T10 una proporción desconocida pasa a la mayor (cambia un precio que estaba bien)', cambiar(": de('16:9');", ': Math.max(...Object.keys(fila).map((r) => de(r)));')],
  ['T11 3:4 deja de leerse como 4:3', cambiar("ratio === '3:4' ? '4:3' : ", '')],
  /*
   * Quitar la correspondencia 9:16 → 16:9 sería un mutante EQUIVALENTE: una proporción que la tabla no tiene vuelve a
   * 16:9, y 9:16 tiene los mismos píxeles que 16:9 en todas las resoluciones (también la de la serie 2.0 a 480p). El
   * precio no cambiaría, así que no hay nada que detectar. Se rompe de verdad: 9:16 leído como 4:3.
   */
  ['T12 9:16 se lee como 4:3', cambiar("ratio === '9:16' ? '16:9' : ", "ratio === '9:16' ? '4:3' : ")],
  ['T13 otro número de fotogramas (25)', cambiar('const FPS = 24;', 'const FPS = 25;')],
  ['T14 el precio deja de decir de qué modelo es', cambiar(', inputVideoSec, input.modelId);', ', inputVideoSec);')],
  ['T15 la estimación del adaptador deja de decir de qué modelo es', cambiar('seedanceTokens(resolution, ratio, outputSec, inputVideoSec, model.id);', 'seedanceTokens(resolution, ratio, outputSec, inputVideoSec);')],
];
const FILTRO = process.argv[4] ? new RegExp(process.argv[4]) : null;
const original = fs.readFileSync(F, 'utf8');
const fecha = fs.statSync(F);
let detectados = 0;
const elegidos = SAB.filter(([n]) => !FILTRO || FILTRO.test(n));
try {
  for (const [nombre, romper] of elegidos) {
    const roto = romper(original.replace(/\r\n/g, '\n'));
    if (roto === original.replace(/\r\n/g, '\n')) { console.log(`✘ ${nombre}: el sabotaje no cambió nada`); continue; }
    fs.writeFileSync(F, roto);
    const r = spawnSync(process.execPath, [path.join(__dirname, 'hotfix-r18-verificar.cjs'), BASE, FIX], { encoding: 'utf8', timeout: 120_000 });
    const caidas = `${r.stdout}${r.stderr}`.split('\n').filter((l) => l.startsWith('✘ ') && !/R18 sobre/.test(l)).map((l) => (l.match(/^✘ (\d+)\)/) || [])[1]).filter(Boolean);
    const cae = r.status !== 0;
    if (cae) detectados++;
    console.log(`${cae ? '✔' : '✘'} ${nombre}: ${cae ? `detectado (${caidas.join(', ') || 'error al cargar'})` : 'NO detectado'}`);
    fs.writeFileSync(F, original);
  }
} finally {
  fs.writeFileSync(F, original);
  fs.utimesSync(F, fecha.atime, fecha.mtime);
}
console.log(`${detectados}/${elegidos.length} sabotajes detectados`);
process.exit(detectados === elegidos.length ? 0 : 1);
