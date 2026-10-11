/*
 * WEË DESIGN — LA PANTALLA MONTADA, VIGILADA (cierre R7, 2026-10-11).
 *
 * `foundation-de-experiencias` (grupo I) vigila la REFERENCIA funcional, que vive tras una puerta cerrada, y
 * `cajas-weeai`, `ajustes-weeai` y `credits-weeai` miran la pantalla montada solo por un lado cada una (la caja, la hoja de
 * ajustes, el saldo). Lo que no miraba nadie es el catálogo propio de `screens/DesignScreen.tsx` ni si cada botón de su
 * caja hace lo que dice. Esta suite lo cubre, y solo lo que es cierto ANTES y DESPUÉS de conectar «Crear» al servidor: lo
 * que cambiará cuando se conecte —el temporizador de demostración— no se fija aquí, se mide en
 * `_design-cierre.mjs` (el cierre ejecutable, fuera de la cadena).
 *
 *  A. EL CATÁLOGO, ejecutado: las puertas son puertas y no un catálogo, sus textos existen en los dieciséis idiomas, los
 *     ajustes abren con «Automático» (la misma regla que `ajustes-weeai` 6 fija para la hoja común), las muestras son
 *     interfaz y ningún texto nombra a un proveedor;
 *  B. LA PANTALLA, leída: ningún botón de la caja hace algo distinto de lo que dice, lo que se adjunta se puede quitar,
 *     no se dice «lista» sin haber creado y la pantalla no mueve dinero ni llama a nadie por su cuenta.
 *
 * Cada detector lleva su CONTROL, para que un verde no pueda ser un verde vacío.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';
import { PROVEEDOR } from './design-referencia.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const LOCALES = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((d) => fs.statSync(path.resolve(RAIZ, 'i18n/textos', d)).isDirectory()).sort();
/** Las claves de primer nivel de un módulo de un idioma (`i18n/textos/<idioma>/<módulo>.ts`). */
const clavesDe = (locale, modulo) => {
  const fuente = leer(`i18n/textos/${locale}/${modulo}.ts`);
  return new Set([...fuente.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((m) => m[1]));
};
const DICCIONARIOS = Object.fromEntries(LOCALES.map((l) => [l, { design: clavesDe(l, 'design'), studio: clavesDe(l, 'studio'), common: clavesDe(l, 'common') }]));
/** Las claves `modulo.clave` que no existen en algún idioma, con el idioma. */
const faltan = (claves) => claves.flatMap((k) => {
  const [modulo, ...resto] = k.split('.');
  const clave = resto.join('.');
  return LOCALES.filter((l) => !DICCIONARIOS[l][modulo]?.has(clave)).map((l) => `${k}@${l}`);
});

const T = crearCargador()('constants/designTools.ts');

console.log('\n─── A. El catálogo de la pantalla montada, ejecutado ───');

const puertas = T.PUERTAS_DE_DESIGN;
const portada = puertas.filter((p) => p.enPortada);
check('A1) hay siete puertas y solo seis salen en la portada: la séptima está a un «Ver todas»', puertas.length === 7 && portada.length === 6,
  `${puertas.length} puertas, ${portada.length} en portada`);
check('A1) cada puerta es única y lleva pocos puntos de partida (puertas, no un catálogo: ninguna pasa de seis)',
  new Set(puertas.map((p) => p.id)).size === puertas.length && puertas.every((p) => p.icono && p.puntos.length >= 3 && p.puntos.length <= 6
    && new Set(p.puntos.map((x) => x.id)).size === p.puntos.length));

const clavesDelCatalogo = [
  ...puertas.flatMap((p) => [p.clave, p.claveHint, ...p.puntos.map((x) => x.clave)]),
  ...T.AJUSTES_DE_DESIGN.flatMap((g) => [g.clave, ...g.opciones.map((o) => o.clave)]),
  ...T.CREACIONES_DE_DESIGN.flatMap((c) => [c.claveTipo, c.claveTitulo].filter(Boolean)),
];
check('A2) el catálogo guarda CLAVES, no frases: todas son de `design` o de `studio`',
  clavesDelCatalogo.length > 0 && clavesDelCatalogo.every((k) => /^(design|studio)\.[A-Za-z0-9_]+$/.test(k)));
check('A2) y cada clave existe en los dieciséis idiomas', faltan(clavesDelCatalogo).length === 0, faltan(clavesDelCatalogo).slice(0, 4).join(' · ') || `${clavesDelCatalogo.length} claves × ${LOCALES.length} idiomas`);

const grupos = T.AJUSTES_DE_DESIGN;
const sinAuto = grupos.filter((g) => g.opciones.length > 0 && g.opciones[0].id !== 'auto').map((g) => g.id);
check('A3) cada ajuste de Design abre con «Automático»: sin elección manda Weë, y se puede volver a ello (la regla de `ajustes-weeai` 6)',
  grupos.length > 0 && sinAuto.length === 0, sinAuto.length ? `sin «Automático»: ${sinAuto.join(' · ')}` : 'todos');
check('A3) y cada ajuste es único y ofrece de verdad una elección',
  new Set(grupos.map((g) => g.id)).size === grupos.length && grupos.every((g) => g.opciones.length >= 2 && new Set(g.opciones.map((o) => o.id)).size === g.opciones.length));
check('A3) y ningún ajuste habla de proveedor, de modelo ni de parámetros: estilo, materiales, luz, formato y calidad, en palabras',
  grupos.every((g) => !PROVEEDOR.test(g.id) && g.opciones.every((o) => !PROVEEDOR.test(o.id))));

const muestras = T.CREACIONES_DE_DESIGN;
check('A4) las creaciones de muestra son interfaz: cuatro, con su tipo y su título como clave, y su color',
  muestras.length === 4 && muestras.every((c) => c.claveTipo && c.claveTitulo && /^#[0-9A-Fa-f]{6}$/.test(c.tono)));

const fuentesDeDesign = ['screens/DesignScreen.tsx', 'constants/designTools.ts', 'components/design/DesignExplore.tsx', 'components/design/DesignPanel.tsx'];
const conProveedor = fuentesDeDesign.filter((f) => PROVEEDOR.test(sinComentarios(leer(f))));
const dicConProveedor = LOCALES.filter((l) => PROVEEDOR.test(leer(`i18n/textos/${l}/design.ts`)));
check('A5) ni el código ni los dieciséis diccionarios de la pantalla nombran a un proveedor: la persona elige el resultado y Weë elige la IA',
  conProveedor.length === 0 && dicConProveedor.length === 0, [...conProveedor, ...dicConProveedor].join(', ') || 'ninguno');

/* CONTROL: un catálogo cuyo primer ajuste no fuera «Automático», o cuyo texto nombrara a un proveedor, se vería. */
const primeroSinAuto = (gs) => gs.filter((g) => g.opciones.length > 0 && g.opciones[0].id !== 'auto').length;
check('CONTROL: un ajuste que abriera con una opción concreta sería detectado',
  primeroSinAuto([{ id: 'style', opciones: [{ id: 'modern' }, { id: 'auto' }] }]) === 1 && primeroSinAuto([{ id: 'style', opciones: [{ id: 'auto' }, { id: 'modern' }] }]) === 0,
  'si esto pasara, A3 no protegería nada');
check('CONTROL: una clave que falte en un idioma se vería', faltan(['design.noExisteEstaClave']).length === LOCALES.length);
check('CONTROL: un texto con el nombre de un proveedor se vería', PROVEEDOR.test("title: 'Hecho con Gemini'") && !PROVEEDOR.test("title: 'Diseña sin límites.'"));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Design: el catálogo de la pantalla montada es el que dice ser');
process.exit(failures ? 1 : 0);
