/**
 * LA REVISIÓN HUMANA DE UN IDIOMA, DE PRINCIPIO A FIN. Ver docs/I18N-REVISION.md.
 *
 *   node scripts/i18n-revision.mjs exportar <idioma> [--salida archivo.csv] [--solo-pendientes]
 *   node scripts/i18n-revision.mjs importar <idioma> <archivo.csv> --revisor "Nombre Apellido" [--tipo humana|agente] [--aplicar]
 *   node scripts/i18n-revision.mjs estado <idioma>
 *   node scripts/i18n-revision.mjs comparar <idioma>
 *
 * EXPORTAR deja un CSV (se abre en Excel, Numbers o Google Sheets) con cada texto del idioma, su original español, el
 * inglés, dónde se usa y su estado de revisión. Quien revisa marca `revisada` y, si algo está mal, escribe la
 * `correccion` y una `nota`.
 *
 * IMPORTAR comprueba cada corrección (mismos {{huecos}}, mismas marcas de Weë, mismos saltos de línea) y, sin
 * `--aplicar`, solo enseña lo que cambiaría. Con `--aplicar` escribe las correcciones en el diccionario y apunta en
 * `i18n/revision/<idioma>/registro.json` el antes, el después, QUIÉN revisó, de qué TIPO es la revisión y cuándo.
 * Una revisión de un agente de IA se apunta como `agente` y NUNCA cuenta como revisión humana.
 *
 * Después de aplicar: `node test/_cadena.mjs` (desde functions/) y `node scripts/i18n-huella.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  RAIZ, aCsv, aplanar, aplicarEnFuente, archivoDeLaClave, cargarDiccionarios, estadoDeRevision, huellaDelValor, leerCsv, problemasDeLaCorreccion,
} from './i18n-lib.mjs';

const [, , orden, idioma, ...resto] = process.argv;
const opcion = (nombre) => { const i = resto.indexOf(nombre); return i >= 0 ? resto[i + 1] : undefined; };
const tiene = (nombre) => resto.includes(nombre);
if (!orden || !idioma) {
  console.log('uso: exportar|importar|estado|comparar <idioma> …  (ver la cabecera del script)');
  process.exit(1);
}

const { DICCIONARIOS, SECCIONES_DEL_SERVIDOR } = await cargarDiccionarios();
if (!DICCIONARIOS[idioma]) { console.error(`no hay diccionario «${idioma}»`); process.exit(1); }
const pares = aplanar(DICCIONARIOS[idioma]);
const ES = Object.fromEntries(aplanar(DICCIONARIOS.es));
const EN = Object.fromEntries(aplanar(DICCIONARIOS.en));
const carpeta = path.join(RAIZ, 'i18n/revision', idioma);
const rutaRegistro = path.join(carpeta, 'registro.json');
const registro = fs.existsSync(rutaRegistro) ? JSON.parse(fs.readFileSync(rutaRegistro, 'utf8')) : [];
const ultimo = new Map();
for (const e of registro) if (e.revisada) ultimo.set(e.clave, e);
const estadoDe = (k, v) => {
  const e = ultimo.get(k);
  if (!e) return 'sin revisar';
  if (e.huella !== huellaDelValor(v)) return `cambió desde la revisión del ${e.fecha}`;
  return `${e.tipo === 'humana' ? 'revisión humana' : 'revisión de agente (no humana)'} · ${e.revisor} · ${e.fecha}`;
};

if (orden === 'exportar') {
  /* Dónde se usa cada clave de la app: las pantallas y componentes que la piden. */
  const usos = new Map();
  const listar = (d) => fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
  for (const d of ['screens', 'components', 'hooks', 'navigation', 'contexts', 'utils', 'services', 'constants']) {
    if (!fs.existsSync(path.join(RAIZ, d))) continue;
    for (const f of listar(d)) for (const m of fs.readFileSync(path.join(RAIZ, f), 'utf8').matchAll(/['"`]([a-zA-Z]+\.[a-zA-Z0-9_]+)['"`]/g)) {
      if (!usos.has(m[1])) usos.set(m[1], new Set());
      usos.get(m[1]).add(f);
    }
  }
  const filas = pares
    .map(([clave, actual]) => {
      const base = clave.replace(/_(zero|one|two|few|many|other)$/, '');
      const servidor = SECCIONES_DEL_SERVIDOR.has(clave.split('.')[0]);
      const donde = [...(usos.get(base) || [])].slice(0, 3).join(' · ');
      return {
        clave,
        seccion: servidor ? 'servidor' : 'app',
        archivo: archivoDeLaClave(idioma, clave, SECCIONES_DEL_SERVIDOR),
        contexto: servidor ? `Texto que escribe el servidor (${clave.split('.')[0]})` : donde || '(sin uso directo: clave compuesta o de catálogo)',
        es: ES[clave] ?? ES[base + '_other'] ?? '',
        en: EN[clave] ?? EN[base + '_other'] ?? '',
        actual,
        estado: estadoDe(clave, actual),
        revisada: '',
        correccion: '',
        nota: '',
      };
    })
    .filter((f) => !tiene('--solo-pendientes') || !/^revisión humana/.test(f.estado));
  const salida = opcion('--salida') || path.join(process.cwd(), `revision-${idioma}-${new Date().toISOString().slice(0, 10)}.csv`);
  fs.writeFileSync(salida, aCsv(filas));
  console.log(`${filas.length} textos → ${salida}`);
} else if (orden === 'importar') {
  const archivo = resto[0];
  const revisor = opcion('--revisor');
  const tipo = opcion('--tipo') || 'humana';
  if (!archivo || !revisor || !['humana', 'agente'].includes(tipo)) {
    console.error('importar <idioma> <archivo.csv> --revisor "Nombre" [--tipo humana|agente] [--aplicar]');
    process.exit(1);
  }
  const actuales = Object.fromEntries(pares);
  const filas = leerCsv(fs.readFileSync(archivo, 'utf8'));
  const fecha = new Date().toISOString().slice(0, 10);
  const correcciones = [];
  const revisadas = [];
  const rechazos = [];
  for (const f of filas) {
    if (!(f.clave in actuales)) { rechazos.push(`${f.clave}: ya no existe`); continue; }
    const actual = actuales[f.clave];
    const marcada = /^(s[ií]|x|yes|ja|ok|✓)$/i.test(String(f.revisada).trim());
    const cambio = String(f.correccion ?? '').length > 0 && f.correccion !== actual;
    if (cambio) {
      const problemas = problemasDeLaCorreccion({ actual, correccion: f.correccion, es: ES[f.clave] ?? '' });
      if (problemas.length) { rechazos.push(`${f.clave}: ${problemas.join('; ')}`); continue; }
      correcciones.push({ clave: f.clave, antes: actual, despues: f.correccion.normalize('NFC'), nota: f.nota || '' });
    } else if (marcada) revisadas.push({ clave: f.clave, valor: actual, nota: f.nota || '' });
  }
  for (const c of correcciones) console.log(`± ${c.clave}\n    antes:   ${c.antes}\n    después: ${c.despues}`);
  console.log(`\n${correcciones.length} correcciones · ${revisadas.length} textos revisados sin cambios · ${rechazos.length} rechazados`);
  for (const r of rechazos) console.log(`  ✘ ${r}`);
  if (!tiene('--aplicar')) { console.log('\n(prueba en seco: nada escrito; añade --aplicar)'); process.exit(rechazos.length ? 1 : 0); }
  if (rechazos.length) { console.error('\nhay correcciones rechazadas: corrígelas en el CSV antes de aplicar'); process.exit(1); }
  const porArchivo = new Map();
  for (const c of correcciones) {
    const ruta = archivoDeLaClave(idioma, c.clave, SECCIONES_DEL_SERVIDOR);
    if (!porArchivo.has(ruta)) porArchivo.set(ruta, fs.readFileSync(path.join(RAIZ, ruta), 'utf8'));
    porArchivo.set(ruta, aplicarEnFuente(porArchivo.get(ruta), c.clave.split('.').slice(1).join('.'), c.despues));
  }
  for (const [ruta, fuente] of porArchivo) fs.writeFileSync(path.join(RAIZ, ruta), fuente);
  fs.mkdirSync(carpeta, { recursive: true });
  const nuevas = [
    ...correcciones.map((c) => ({ clave: c.clave, antes: c.antes, despues: c.despues, revisada: true, huella: huellaDelValor(c.despues), revisor, tipo, fecha, nota: c.nota })),
    ...revisadas.map((r) => ({ clave: r.clave, antes: r.valor, despues: r.valor, revisada: true, huella: huellaDelValor(r.valor), revisor, tipo, fecha, nota: r.nota })),
  ];
  fs.writeFileSync(rutaRegistro, JSON.stringify([...registro, ...nuevas], null, 2) + '\n');
  console.log(`\nescrito: ${porArchivo.size} archivos de diccionario y ${nuevas.length} entradas en ${path.relative(RAIZ, rutaRegistro)}`);
  console.log('ahora: (cd functions && node test/_cadena.mjs) y node scripts/i18n-huella.mjs');
} else if (orden === 'estado') {
  const e = estadoDeRevision(pares, registro);
  const pct = (n) => `${((100 * n) / e.total).toFixed(1)} %`;
  console.log(`${idioma}: ${e.total} textos`);
  console.log(`  revisión humana vigente ........ ${e.humanas} (${pct(e.humanas)})`);
  console.log(`  revisión de agente (no humana) . ${e.agente} (${pct(e.agente)})`);
  console.log(`  cambiaron desde su revisión .... ${e.cambiadas}`);
  console.log(`  sin revisar .................... ${e.sinRevisar}`);
} else if (orden === 'comparar') {
  for (const e of registro.filter((x) => x.antes !== x.despues)) console.log(`${e.fecha} · ${e.tipo} · ${e.revisor}\n  ${e.clave}\n    antes:   ${e.antes}\n    después: ${e.despues}${e.nota ? `\n    nota:    ${e.nota}` : ''}`);
} else {
  console.error(`orden desconocida: ${orden}`);
  process.exit(1);
}
