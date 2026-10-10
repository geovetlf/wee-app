/**
 * MC-4 · OPTIMIZADOR DE MEDIOS — EL PLAN DE VARIANTES DE IMAGEN (versión 1).
 *
 * El plan es lógica pura: dice qué derivado merece existir para un material y un
 * uso, y por qué no sale ninguno. Lo que se prueba aquí:
 *
 *   A · El contrato: versión, formatos de salida y ausencia de AVIF.
 *   B · Un destino por uso, con la forma que acepta el contrato de procesamiento.
 *   C · El original y los límites: cuando ya cabe, no se deriva.
 *   D · Transparencia y formatos: el alfa no se pierde y no se declara AVIF.
 *   E · Lo que no se deriva, con su motivo: MIME, animación, tipo, uso y entrada.
 *   F · Todas las combinaciones salen dentro del contrato.
 *   G · Determinismo, y la entrada no se modifica.
 *   H · Pureza: el módulo no toca el disco, la red, Firebase ni Credits.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
/** Quita los comentarios del código para que las comprobaciones de fuente miren solo código. */
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const plan = lib('media/optimizador/plan.js');
const { transformacionValida } = lib('core/media/proceso.js');

let n = 0;
let failures = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const base = (extra = {}) => ({
  tipo: 'image', mime: 'image/jpeg', ancho: 3000, alto: 2000, alfa: false, bytes: 2_000_000, uso: 'muro', ...extra,
});
const motivos = (p) => p.omitidas.map((o) => o.motivo);

/* ═══ A · EL CONTRATO ═══════════════════════════════════════════════════════ */
console.log('\n── A · El contrato del plan ──');
check('A · la versión del plan es la 1', plan.VERSION_DEL_PLAN_DE_IMAGEN === 1);
check('A · los formatos de salida son los del procesador, y solo esos',
  JSON.stringify(plan.FORMATOS_DE_IMAGEN) === JSON.stringify(['jpeg', 'webp', 'png']), JSON.stringify(plan.FORMATOS_DE_IMAGEN));
check('A · el código del plan no declara AVIF en ninguna parte',
  !/avif/i.test(sinComentarios(leer('functions/src/media/optimizador/plan.ts'))));
check('A · los usos son los cinco del encargo', JSON.stringify(plan.USOS_DE_IMAGEN) === JSON.stringify(['muro', 'perfil', 'vista_previa', 'visualizacion', 'original']));

/* ═══ B · UN DESTINO POR USO ════════════════════════════════════════════════ */
console.log('\n── B · Un destino por uso ──');
const esperado = {
  muro: { tipo: 'preview', dimensionMaxima: 1080, calidad: 80 },
  perfil: { tipo: 'thumbnail', dimensionMaxima: 512, calidad: 85 },
  vista_previa: { tipo: 'thumbnail', dimensionMaxima: 400, calidad: 75 },
  visualizacion: { tipo: 'transcoded', dimensionMaxima: 2048, calidad: 90 },
};
for (const [uso, e] of Object.entries(esperado)) {
  const p = plan.planificarVariantesDeImagen(base({ uso }));
  const v = p.variantes[0];
  check(`B · ${uso}: una variante ${e.tipo} de ${e.dimensionMaxima} px, calidad ${e.calidad}, WebP`,
    p.variantes.length === 1 && v.tipo === e.tipo && v.dimensionMaxima === e.dimensionMaxima && v.calidad === e.calidad
    && v.formato === 'webp' && v.conservaAlfa === false && v.uso === uso,
    `tipo=${v?.tipo} max=${v?.dimensionMaxima} q=${v?.calidad} formato=${v?.formato}`);
  check(`B · ${uso}: la transformación cumple el contrato de procesamiento`,
    transformacionValida(v.transformacion) && v.transformacion.ajuste === 'dentro'
    && v.transformacion.ancho === e.dimensionMaxima && v.transformacion.alto === e.dimensionMaxima);
}

/* ═══ C · EL ORIGINAL Y LOS LÍMITES ═════════════════════════════════════════ */
console.log('\n── C · El original, y cuándo ya cabe ──');
const original = plan.planificarVariantesDeImagen(base({ uso: 'original' }));
check('C · el uso «original» no produce derivado y lo dice', original.variantes.length === 0 && JSON.stringify(motivos(original)) === JSON.stringify(['original']));
check('C · el original siempre se conserva', original.conservaOriginal === true);

check('C · un origen que ya cabe no tiene variante (800×600 para el muro)',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ ancho: 800, alto: 600 })))) === JSON.stringify(['cabe_en_destino']));
check('C · el límite es inclusivo: 1080×1080 ya cabe en el muro',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ ancho: 1080, alto: 1080 })))) === JSON.stringify(['cabe_en_destino']));
check('C · un solo píxel de más sí deriva (1081×10 para el muro)',
  plan.planificarVariantesDeImagen(base({ ancho: 1081, alto: 10 })).variantes.length === 1);
check('C · un retrato que pasa del límite por el alto también deriva (600×1100)',
  plan.planificarVariantesDeImagen(base({ ancho: 600, alto: 1100 })).variantes.length === 1);

/* ═══ D · TRANSPARENCIA Y FORMATOS ══════════════════════════════════════════ */
console.log('\n── D · Transparencia y formatos ──');
const png = plan.planificarVariantesDeImagen(base({ mime: 'image/png', alfa: true }));
check('D · un origen con alfa deriva a WebP y conserva el alfa',
  png.variantes.length === 1 && png.variantes[0].formato === 'webp' && png.variantes[0].conservaAlfa === true);
check('D · un JPEG no conserva el alfa: un origen con alfa no se pide como JPEG',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ mime: 'image/png', alfa: true, formato: 'jpeg' })))) === JSON.stringify(['formato_incompatible_con_alfa']));
check('D · JPEG sin alfa se admite como preferencia',
  plan.planificarVariantesDeImagen(base({ formato: 'jpeg' })).variantes[0]?.formato === 'jpeg');
check('D · PNG sin alfa se admite como preferencia',
  plan.planificarVariantesDeImagen(base({ formato: 'png' })).variantes[0]?.formato === 'png');
check('D · AVIF no se acepta como preferencia: entrada inválida, nada que derivar',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ formato: 'avif' })))) === JSON.stringify(['entrada_invalida']));
check('D · un formato fuera del procesador (GIF) tampoco se acepta',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ formato: 'gif' })))) === JSON.stringify(['entrada_invalida']));

/* ═══ E · LO QUE NO SE DERIVA, CON SU MOTIVO ════════════════════════════════ */
console.log('\n── E · Motivos de omisión ──');
for (const mime of ['image/gif', 'image/heic', 'image/avif', 'image/svg+xml']) {
  check(`E · ${mime} no se deriva en la versión 1`, JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ mime })))) === JSON.stringify(['mime_no_admitido']));
}
check('E · una imagen animada no se deriva: perdería la animación',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ animado: true })))) === JSON.stringify(['animado_no_admitido']));
check('E · una imagen fija sí se deriva con el dato «no animada»', plan.planificarVariantesDeImagen(base({ animado: false })).variantes.length === 1);
for (const tipo of ['video', 'audio', 'document', '3d']) {
  check(`E · el tipo ${tipo} no tiene procesador: se omite con su motivo`, JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ tipo })))) === JSON.stringify(['tipo_no_soportado']));
}
check('E · un uso que el plan no conoce se rechaza',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ uso: 'portada' })))) === JSON.stringify(['uso_desconocido']));
const TOPE = 64 * 1024 * 1024;
check('E · un origen por encima del tope del contrato se omite', JSON.stringify(motivos(plan.planificarVariantesDeImagen(base({ bytes: TOPE + 1 })))) === JSON.stringify(['origen_demasiado_grande']));
check('E · un origen justo en el tope todavía se puede derivar', plan.planificarVariantesDeImagen(base({ bytes: TOPE })).variantes.length === 1);
const invalidas = [
  ['ancho cero', base({ ancho: 0 })],
  ['ancho fraccionario', base({ ancho: 1.5 })],
  ['alto como texto', base({ alto: '100' })],
  ['bytes negativos', base({ bytes: -1 })],
  ['alfa como texto', base({ alfa: 'si' })],
  ['sin MIME', base({ mime: undefined })],
  ['animado como texto', base({ animado: 'no' })],
];
for (const [nombre, entrada] of invalidas) {
  check(`E · entrada inválida (${nombre}): falla cerrada`, JSON.stringify(motivos(plan.planificarVariantesDeImagen(entrada))) === JSON.stringify(['entrada_invalida']));
}
check('E · sin entrada no hay nada que hacer, y no se lanza',
  JSON.stringify(motivos(plan.planificarVariantesDeImagen(null))) === JSON.stringify(['entrada_invalida']));

/* ═══ F · TODAS LAS COMBINACIONES, DENTRO DEL CONTRATO ══════════════════════ */
console.log('\n── F · Barrido de combinaciones ──');
const usos = ['muro', 'perfil', 'vista_previa', 'visualizacion', 'original'];
const mimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const formatos = [undefined, 'webp', 'png', 'jpeg'];
const tamanos = [[300, 200], [3000, 2000], [1081, 1081]];
let combinaciones = 0;
let fuera = [];
for (const uso of usos) for (const mime of mimes) for (const alfa of [false, true]) for (const formato of formatos) for (const [ancho, alto] of tamanos) {
  combinaciones++;
  const entrada = base({ uso, mime, alfa, formato, ancho, alto });
  const p = plan.planificarVariantesDeImagen(entrada);
  const ok = p.conservaOriginal === true && p.variantes.every((v) =>
    transformacionValida(v.transformacion)
    && plan.FORMATOS_DE_IMAGEN.includes(v.formato)
    && v.formato !== 'avif'
    && v.dimensionMaxima >= 16 && v.dimensionMaxima <= 4096
    && v.calidad >= 40 && v.calidad <= 95
    && (!v.conservaAlfa || v.formato !== 'jpeg'));
  if (!ok) fuera.push(JSON.stringify(entrada));
}
check(`F · ${combinaciones} combinaciones: ninguna variante sale del contrato ni declara AVIF`, fuera.length === 0, fuera[0] ?? 'ninguna fuera');

/* ═══ G · DETERMINISMO Y ENTRADA INTACTA ════════════════════════════════════ */
console.log('\n── G · Determinismo ──');
const entradaG = base({ uso: 'perfil', alfa: true, mime: 'image/png', ancho: 2000, alto: 1500 });
const antes = JSON.stringify(entradaG);
const p1 = JSON.stringify(plan.planificarVariantesDeImagen(entradaG));
const p2 = JSON.stringify(plan.planificarVariantesDeImagen(entradaG));
check('G · la misma entrada produce siempre el mismo plan', p1 === p2);
check('G · la entrada no se modifica al planificar', JSON.stringify(entradaG) === antes);

/* ═══ H · PUREZA ════════════════════════════════════════════════════════════ */
console.log('\n── H · Pureza del módulo ──');
const codigo = sinComentarios(leer('functions/src/media/optimizador/plan.ts'));
const importes = [...codigo.matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
check('H · el plan solo importa del Core de procesamiento (sin disco, red, Firebase ni Credits)',
  importes.length > 0 && importes.every((i) => i === '../../core/media/proceso'), JSON.stringify(importes));
check('H · no hay acceso a disco, red ni a ningún proveedor en el código del plan',
  !/\bfs\.|readFile|writeFile|fetch\(|https?:|child_process|sharp|firebase|[Cc]redit/.test(codigo));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
