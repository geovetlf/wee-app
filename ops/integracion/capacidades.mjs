#!/usr/bin/env node
/*
 * PRODUCCIÓN ACTUAL → MAIN PROPUESTO: ¿se pierde alguna capacidad?
 *
 * Orden del dueño (2026-10-01): «Antes de fusionar, genera una comparación clara
 * PRODUCCIÓN ACTUAL → MAIN PROPUESTO y verifica que no se pierda ninguna
 * capacidad existente.»
 *
 * Lo vivo sale de `ops/produccion.json` (verificado en la auditoría H0): las 34
 * funciones, las reglas e índices (c3515b3), las reglas de Storage (ced0585) y las
 * dos webs (wee.zone = bfc622d, wee-app.web.app = afbc2df). Lo propuesto es este
 * árbol. Para cada clase de capacidad se mira que TODO lo vivo siga estando:
 *
 *  · cada función viva, exportada por el código compilado;
 *  · cada pantalla registrada en la navegación de las dos webs;
 *  · cada texto de la interfaz (clave del diccionario español) de las dos webs;
 *  · cada idioma que ofrecen las dos webs;
 *  · cada ruta de las reglas de Firestore y de Storage, y cada índice compuesto.
 *
 * Dos maneras, y solo dos, de que algo vivo no esté: SUSTITUIDO por algo que sí está (abajo), o RETIRADO por una
 * decisión explícita del dueño (`RETIRADAS`), que solo vale para pantallas y textos (un módulo entero o claves sueltas, con
 * nombre exacto) y que NO retira nada en producción.
 *
 * Solo lee git y el árbol. `--md` escribe la comparación en Markdown.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const enRef = (ref, ruta) => { try { return git('show', `${ref}:${ruta}`); } catch { return null; } };
const enArbol = (ruta) => { try { return fs.readFileSync(path.join(RAIZ, ruta), 'utf8'); } catch { return null; } };

/* ── Extractores puros (reciben texto) ─────────────────────────────────── */
export const pantallas = (texto) => new Set([...String(texto || '').matchAll(/<(?:Stack|Tab)\.Screen\s+name="([A-Za-z0-9]+)"/g)].map((m) => m[1]));
export const clavesDeModulo = (texto) => [...String(texto || '').matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*):/gm)].map((m) => m[1]);
export const rutasDeReglas = (texto) => new Set([...String(texto || '').matchAll(/match\s+(\/\S+)\s*\{/g)].map((m) => m[1]));
export const indices = (texto) => new Set((JSON.parse(texto || '{}').indexes || [])
  .map((i) => `${i.collectionGroup}|${i.queryScope || 'COLLECTION'}|${(i.fields || []).map((f) => `${f.fieldPath}:${f.order || f.arrayConfig || f.vectorConfig && 'vector'}`).join(',')}`));

const textosDe = (leer, listar) => {
  const claves = new Set();
  for (const archivo of listar('i18n/textos/es')) {
    if (!archivo.endsWith('.ts') || archivo === 'index.ts') continue;
    const modulo = archivo.slice(0, -3);
    for (const k of clavesDeModulo(leer(`i18n/textos/es/${archivo}`))) claves.add(`${modulo}.${k}`);
  }
  return claves;
};
const listarEnRef = (ref) => (dir) => git('ls-tree', '--name-only', `${ref}:${dir}`).split('\n').filter(Boolean);
const listarEnArbol = (dir) => fs.readdirSync(path.join(RAIZ, dir));
const idiomasEnRef = (ref) => new Set(listarEnRef(ref)('i18n/textos'));
const pantallasDe = (leer) => new Set([...pantallas(leer('navigation/MainStackNavigator.tsx')), ...pantallas(leer('navigation/TabNavigator.tsx')),
  ...pantallas(leer('navigation/AuthStackNavigator.tsx')), ...pantallas(leer('navigation/HomeStackNavigator.tsx')),
  ...pantallas(leer('navigation/InboxStackNavigator.tsx')), ...pantallas(leer('navigation/ProfileStackNavigator.tsx'))]);

/**
 * Lo que ya no está porque se SUSTITUYÓ por algo vivo, con su porqué y con qué. Una sustitución solo vale si lo que
 * la sustituye está en el main propuesto (lo comprueba `comparar`); si no, cuenta como pérdida.
 */
export const SUSTITUIDAS = {
  'wall.reportOffensive': { por: 'moderation.reasonHate', porque: 'c3515b3 (vivo desde 2026-09-20): Denunciar de verdad con ReportSheet y reportContent, en lugar del aviso del muro' },
  'wall.reportOther': { por: 'moderation.reasonOther', porque: 'c3515b3: motivos de ReportSheet' },
  'wall.reportPost': { por: 'moderation.report', porque: 'c3515b3: el botón «Denunciar» de ReportSheet' },
  'wall.reportSent': { por: 'moderation.successTitle', porque: 'c3515b3: «Reporte recibido»' },
  'wall.reportSpam': { por: 'moderation.reasonSpam', porque: 'c3515b3: motivos de ReportSheet' },
  'wall.reportThanks': { por: 'moderation.successBody', porque: 'c3515b3: el agradecimiento tras denunciar' },
  'wall.reportWhy': { por: 'moderation.chooseReason', porque: 'c3515b3: «Selecciona un motivo»' },
  'aiAvatar.generatedWithGemini': { por: 'aiAvatar.generatedWithAi', porque: 'i18n da-DK (2026-10-01): el avatar lo hace «Weë AI»; la persona nunca ve el nombre de un proveedor' },
  'help.a3': { por: 'help.a3_other', porque: 'fallos de UI (2026-10-01): la Ayuda dice el número y los nombres de los especialistas del menú, con su plural' },
  'composer.bizNoAgenda': { por: 'composer.profileNoAgenda', porque: 'i18n da-DK (2026-10-01): el Perfil Biz se eliminó el 2026-09-19; el aviso habla de «este perfil»' },
  /* Compra de Credits por importe (dueño, 2026-11-04): no hay paquetes; el nombre y las etiquetas de paquete los sustituye la compra por importe. */
  'credits.pkgBasic': { por: 'credits.buyButton', porque: 'compra por importe (dueño, 2026-11-04): ya no hay paquete «Básico»; el botón dice los Credits y el precio del importe elegido' },
  'credits.badgePopular': { por: 'credits.buyRate', porque: 'compra por importe (dueño, 2026-11-04): sin paquetes no hay «Popular»; la tienda enseña la tarifa única (US$1 = 100 Credits)' },
  'credits.badgeBestValue': { por: 'credits.buyRate', porque: 'compra por importe (dueño, 2026-11-04): sin paquetes no hay «Mejor valor»; todos los importes tienen la misma tarifa' },
};

/**
 * Lo que ya no está porque el dueño decidió RETIRARLO de Weë, sin sustituto vivo que lo reemplace clave a clave. Es la
 * excepción, no una vía de escape:
 *  · cada retirada nombra su decisión (quién y cuándo), qué la reemplaza como producto y qué pasa en producción;
 *  · solo cubre PANTALLAS (lista exacta) y TEXTOS: un módulo entero del diccionario (`modulo`) o CLAVES SUELTAS con su
 *    nombre exacto `modulo.clave` (`claves`, ampliación del 2026-11-06); nunca funciones, reglas, índices ni idiomas,
 *    que siguen exigiendo «sigue estando» (prueba 7 de la suite);
 *  · una retirada de claves sueltas dice además su `fecha`, su `motivo` y quién la decidió (`decidio`); retirar una
 *    clave NO retira su módulo: cualquier otra clave del mismo módulo que falte sigue contando como pérdida, y la clave
 *    retirada no puede volver a ningún diccionario (prueba 7c de la suite);
 *  · retirar del main propuesto NO es retirar de producción: el servicio publicado sigue vivo, y publicar este main
 *    lo quitaría de las webs, así que eso exige ANTES una decisión explícita de deprecación (`produccion`).
 */
export const RETIRADAS = {
  weebiz: {
    decision: 'dueño, 2026-11-03: «Weebiz es del antiguo proyecto, eliminalo»; confirmado el mismo día: no se restaura nada de WeeBiz; dueño, 2026-11-06: retirada completa y definitiva de Weë (código, rutas, textos, landing y documentación vigente); dueño, 2026-11-06 (definitiva y global): WeeBiz no es un módulo pendiente, existente ni recuperable y no se reconstruye con ese nombre ni con otro',
    reemplazo: 'ninguno: Weë Fashion es la experiencia de Weë AI con el id histórico `business` (no sustituye al directorio); un negocio, si alguna vez existe, será una Página (WeëPages)',
    produccion: 'NO deprecado todavía: el WeeBiz publicado en wee.zone y wee-app.web.app sigue vivo y sus datos (businesses, reviews, businessFollows) intactos; sus reglas, índices y copia de seguridad siguen en este árbol solo para proteger esos datos históricos, hasta una auditoría independiente de seguridad y dependencias; nada de esto invita a reconstruirlo (funciones, reglas e índices no se retiran por esta vía). Desplegar la web desde este main lo quitaría, y cerrar sus reglas al cliente también lo rompería: las dos cosas requieren antes una decisión explícita de deprecación del dueño.',
    pantallas: ['WeeBiz', 'WeeBizCategory', 'WeeBizProducts', 'WeeBizProfile', 'WeeBizRegister'],
    modulo: 'weebiz',
  },
  pildoraPublico: {
    fecha: '2026-11-06',
    decidio: 'el dueño',
    motivo: 'píldora Público retirada del compositor por decisión del dueño',
    decision: 'dueño, 2026-11-06: píldora Público retirada del compositor por decisión del dueño; sus tres textos salen de los 42 diccionarios y quedan como `obsoleta` en i18n/revision/<idioma>/registro.json. La lógica de visibilidad de las publicaciones no cambia',
    reemplazo: 'nada visible la sustituye: el compositor publica con la misma visibilidad de siempre, sin la píldora que la anunciaba',
    produccion: 'NO deprecado todavía en las webs publicadas: wee.zone y wee-app.web.app siguen mostrando la píldora hasta que se publique este main; publicar la web nueva la quita, y eso exige antes su propia autorización (decisión explícita de deprecación al desplegar). Ninguna función, regla ni dato cambia.',
    pantallas: [],
    claves: ['composer.publicVisibility', 'composer.visibilityIs', 'composer.publicExplain'],
  },
};
const retiradaDe = (clase, x) => Object.entries(RETIRADAS).find(([, r]) => (/^Pantallas/.test(clase) && (r.pantallas || []).includes(x))
  || (/^Textos/.test(clase) && ((r.modulo && x.startsWith(`${r.modulo}.`)) || (r.claves || []).includes(x))))?.[0];

const faltan = (vivo, propuesto, clase = '') => [...vivo].filter((x) => !propuesto.has(x) && !(SUSTITUIDAS[x] && propuesto.has(SUSTITUIDAS[x].por)) && !retiradaDe(clase, x)).sort();
const retiradas = (vivo, propuesto, clase) => [...vivo].filter((x) => !propuesto.has(x) && !(SUSTITUIDAS[x] && propuesto.has(SUSTITUIDAS[x].por)) && retiradaDe(clase, x)).sort();
/* Para las pruebas: la regla, con texto de juguete. */
export const _faltanEn = faltan;
const sustituidas = (vivo, propuesto) => [...vivo].filter((x) => !propuesto.has(x) && SUSTITUIDAS[x] && propuesto.has(SUSTITUIDAS[x].por)).sort();
const nuevas = (vivo, propuesto) => [...propuesto].filter((x) => !vivo.has(x)).sort();

export const comparar = () => {
  const mapa = JSON.parse(enArbol('ops/produccion.json'));
  const otro = (d) => mapa.otros.find((o) => o.desplegable === d).commit;
  const WEBS = { 'wee.zone': otro('vercel (wee.zone)'), 'wee-app.web.app': otro('hosting:wee-app') };
  const REGLAS = otro('firestore');
  const STORAGE = otro('storage-rules');
  const require = createRequire(import.meta.url);
  const lib = require(path.join(RAIZ, 'functions/lib/index.js'));
  const exportadas = new Set(Object.entries(lib).filter(([, x]) => x && x.__endpoint).map(([k]) => k));
  const vivas = new Set(mapa.funciones.map((f) => f.funcion));
  const filas = [];
  const fila = (clase, vivoTxt, vivo, propuesto) => filas.push({ clase, vivoTxt, vivo: vivo.size, propuesto: propuesto.size, faltan: faltan(vivo, propuesto, clase), retiradas: retiradas(vivo, propuesto, clase), sustituidas: sustituidas(vivo, propuesto), nuevas: nuevas(vivo, propuesto) });

  fila('Funciones', '34 vivas (ops/produccion.json)', vivas, exportadas);
  const pantallasPropuestas = pantallasDe(enArbol);
  const textosPropuestos = textosDe(enArbol, listarEnArbol);
  const idiomasPropuestos = new Set(listarEnArbol('i18n/textos'));
  for (const [web, ref] of Object.entries(WEBS)) {
    fila(`Pantallas de ${web}`, ref.slice(0, 7), pantallasDe((r) => enRef(ref, r)), pantallasPropuestas);
    fila(`Textos (es) de ${web}`, ref.slice(0, 7), textosDe((r) => enRef(ref, r), listarEnRef(ref)), textosPropuestos);
    fila(`Idiomas de ${web}`, ref.slice(0, 7), idiomasEnRef(ref), idiomasPropuestos);
  }
  fila('Rutas de las reglas de Firestore', REGLAS.slice(0, 7), rutasDeReglas(enRef(REGLAS, 'firestore.rules')), rutasDeReglas(enArbol('firestore.rules')));
  fila('Índices compuestos', REGLAS.slice(0, 7), indices(enRef(REGLAS, 'firestore.indexes.json')), indices(enArbol('firestore.indexes.json')));
  fila('Rutas de las reglas de Storage', STORAGE.slice(0, 7), rutasDeReglas(enRef(STORAGE, 'storage.rules')), rutasDeReglas(enArbol('storage.rules')));
  return filas;
};

export const enMarkdown = (filas, cabecera = '') => [
  cabecera,
  '| Capacidad | Vivo (commit) | En producción | En el main propuesto | Se pierde | Sustituido por algo vivo | Retirado por decisión (no en producción) | Nuevo |',
  '|---|---|---|---|---|---|---|---|',
  ...filas.map((f) => `| ${f.clase} | ${f.vivoTxt} | ${f.vivo} | ${f.propuesto} | ${f.faltan.length ? `**${f.faltan.length}**: ${f.faltan.slice(0, 12).join(', ')}${f.faltan.length > 12 ? '…' : ''}` : 'ninguna'} | ${f.sustituidas.length ? `${f.sustituidas.length} (${f.sustituidas.map((k) => `${k} → ${SUSTITUIDAS[k].por}`).join(', ')})` : '—'} | ${f.retiradas.length ? `${f.retiradas.length} (${[...new Set(f.retiradas.map((x) => retiradaDe(f.clase, x)))].join(', ')})` : '—'} | ${f.nuevas.length}${f.nuevas.length && f.nuevas.length <= 6 ? ` (${f.nuevas.join(', ')})` : ''} |`),
].join('\n');

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const filas = comparar();
  const perdidas = filas.filter((f) => f.faltan.length);
  console.log(enMarkdown(filas));
  console.log(perdidas.length ? `\n✘ Se perderían capacidades en: ${perdidas.map((f) => f.clase).join('; ')}` : '\n✔ No se pierde ninguna capacidad viva.');
  process.exit(perdidas.length ? 1 : 0);
}
