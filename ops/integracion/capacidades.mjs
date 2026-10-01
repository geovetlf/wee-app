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
};

const faltan = (vivo, propuesto) => [...vivo].filter((x) => !propuesto.has(x) && !(SUSTITUIDAS[x] && propuesto.has(SUSTITUIDAS[x].por))).sort();
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
  const fila = (clase, vivoTxt, vivo, propuesto) => filas.push({ clase, vivoTxt, vivo: vivo.size, propuesto: propuesto.size, faltan: faltan(vivo, propuesto), sustituidas: sustituidas(vivo, propuesto), nuevas: nuevas(vivo, propuesto) });

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
  '| Capacidad | Vivo (commit) | En producción | En el main propuesto | Se pierde | Sustituido por algo vivo | Nuevo |',
  '|---|---|---|---|---|---|---|',
  ...filas.map((f) => `| ${f.clase} | ${f.vivoTxt} | ${f.vivo} | ${f.propuesto} | ${f.faltan.length ? `**${f.faltan.length}**: ${f.faltan.slice(0, 12).join(', ')}${f.faltan.length > 12 ? '…' : ''}` : 'ninguna'} | ${f.sustituidas.length ? `${f.sustituidas.length} (${f.sustituidas.map((k) => `${k} → ${SUSTITUIDAS[k].por}`).join(', ')})` : '—'} | ${f.nuevas.length}${f.nuevas.length && f.nuevas.length <= 6 ? ` (${f.nuevas.join(', ')})` : ''} |`),
].join('\n');

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const filas = comparar();
  const perdidas = filas.filter((f) => f.faltan.length);
  console.log(enMarkdown(filas));
  console.log(perdidas.length ? `\n✘ Se perderían capacidades en: ${perdidas.map((f) => f.clase).join('; ')}` : '\n✔ No se pierde ninguna capacidad viva.');
  process.exit(perdidas.length ? 1 : 0);
}
