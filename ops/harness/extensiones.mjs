#!/usr/bin/env node
/*
 * LAS EXTENSIONES DEL WEË HARNESS (F3) — `ops/harness/extensiones.mjs`.
 *
 *   node ops/harness/extensiones.mjs listar                   (el registro: cada extensión, su estado y por qué)
 *   node ops/harness/extensiones.mjs validar [archivo.json]   (un manifiesto, o todo el registro; sale 1 si algo no vale)
 *   node ops/harness/extensiones.mjs ejecutar <id> <aporte>   (una comprobación de una extensión activa, por la puerta)
 *
 * Una extensión es DATOS: un manifiesto JSON en `ops/harness/extensiones/<id>.json`. No trae código: el
 * Harness nunca importa ni evalúa nada de una extensión. El manifiesto dice qué aporta (capacidades de un
 * catálogo cerrado), qué necesita (permisos de un catálogo cerrado: lo que no está, se niega) y para qué
 * versión del Harness es. Lo que una extensión ejecuta son las órdenes que declara, como argv y sin shell,
 * y TODA acción pasa por `autorizar`: la extensión está activa, la acción está en su manifiesto, la lista
 * blanca del permiso la admite y la guardia de siempre (`.claude/hooks/guardia.mjs`, `analizarTexto`) no
 * la pregunta ni la niega. Lo que la guardia pregunta o niega es del dueño: una extensión no lo hace nunca.
 * Nada de lo que hay aquí aprueba despliegues, hace merge o push, toca IAM o secretos, ni apaga puertas.
 *
 * Las «capacidades» de aquí son puntos de extensión del Harness, no las del producto (docs/CAPABILITY-MAP.md,
 * ops/integracion/capacidades.mjs). Activar o desactivar es cambiar `estado` en el manifiesto, por PR.
 * `WEE_EXTENSIONES=off` las apaga todas. Funciona sin Claude Code: Node y git, nada más.
 * Lo fija functions/test/harness-extensiones.test.mjs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analizarTexto } from '../../.claude/hooks/guardia.mjs';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CARPETA = 'ops/harness/extensiones';
export const CACHE = 'ops/harness/.cache';
/** La versión del contrato de extensiones. Un manifiesto pide `^x.y.z`: la misma mayor y no menos que eso. */
export const VERSION_DEL_HARNESS = '1.0.0';

/** Lo único que una extensión puede pedir. Cualquier otro permiso se rechaza (deny-by-default). */
export const PERMISOS = Object.freeze({
  'leer-repositorio': 'leer los documentos que declara (nunca secretos: lo decide la guardia)',
  'leer-git': 'órdenes de git de solo lectura (log, show, diff, status…)',
  'ejecutar-pruebas': 'correr una suite de functions/test o el revisor determinista (ops/revision/baseline.mjs)',
  'escribir-cache': `escribir sus informes, solo en ${CACHE}/<id>/ (ignorado por git)`,
});

/** Lo que NUNCA se concede a una extensión, aunque lo pida: es del dueño, por las políticas de siempre. */
export const PRIVILEGIADOS = Object.freeze([
  'aprobar-despliegue', 'desplegar', 'merge', 'push', 'modificar-iam', 'leer-secretos', 'modificar-secretos',
  'desactivar-guardia', 'desactivar-puertas', 'saltar-revision', 'modificar-politicas', 'ejecutar-cualquier-orden',
]);

/** Los puntos de extensión, el permiso que exige cada uno (basta uno de la lista) y sus campos. */
export const CAPACIDADES = Object.freeze({
  comprobacion: Object.freeze({ permisos: Object.freeze(['ejecutar-pruebas', 'leer-git']), campos: Object.freeze(['id', 'descripcion', 'argv']) }),
  contexto: Object.freeze({ permisos: Object.freeze(['leer-repositorio']), campos: Object.freeze(['id', 'descripcion', 'archivos', 'documentos']) }),
  informe: Object.freeze({ permisos: Object.freeze(['escribir-cache']), campos: Object.freeze(['id', 'descripcion', 'archivo']) }),
});

const CAMPOS = ['id', 'nombre', 'version', 'descripcion', 'compatibilidad', 'estado', 'permisos', 'capacidades'];
const OBLIGATORIOS = ['id', 'nombre', 'version', 'compatibilidad', 'estado', 'permisos', 'capacidades'];
const ID = /^[a-z][a-z0-9-]{2,40}$/;
const APORTE = /^[a-z][a-z0-9-]{1,40}$/;
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const ARG = /^[A-Za-z0-9._/@^~:+-]+$/;
const RUTA = /^[A-Za-z0-9._/@+-]+$/;
const SUITE = /^functions\/test\/[a-z0-9][a-z0-9-]*\.test\.mjs$/;
const SUBORDENES_GIT = new Set(['log', 'show', 'diff', 'status', 'rev-parse', 'ls-files', 'merge-base', 'cat-file', 'describe', 'blame']);
const FLAGS_GIT_PROHIBIDOS = ['--output', '--ext-diff', '--textconv', '--exec', '--upload-pack', '--open-files-in-pager'];
const SECRETO_EN_ENTORNO = /TOKEN|SECRET|KEY|PASSWORD|PASSWD|CREDENTIAL|PRIVATE/i;

const esObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const versionDe = (v) => { const m = SEMVER.exec(String(v)); return m ? m.slice(1).map(Number) : null; };
const congelar = (x) => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) congelar(v); } return x; };

/** ¿Vale para esta versión del Harness? Solo rangos `^x.y.z`: la misma mayor y no menos que x.y.z. */
export const compatible = (rango, version = VERSION_DEL_HARNESS) => {
  const r = /^\^(\d+\.\d+\.\d+)$/.exec(String(rango || ''));
  const minimo = r && versionDe(r[1]);
  const actual = versionDe(version);
  if (!minimo || !actual || minimo[0] !== actual[0]) return false;
  for (let i = 1; i < 3; i++) if (actual[i] !== minimo[i]) return actual[i] > minimo[i];
  return true;
};

/** Una ruta del repositorio, normalizada; null si sale de él o trae algo raro. */
export const rutaDelRepo = (ruta) => {
  const r = String(ruta || '').replace(/\\/g, '/');
  if (!r || !RUTA.test(r) || r.startsWith('/')) return null;
  const n = path.posix.normalize(r);
  return n === '.' || n.split('/').includes('..') ? null : n;
};

const dentroDeSuCache = (ruta, id) => {
  const n = rutaDelRepo(ruta);
  const carpeta = `${CACHE}/${id}/`;
  return Boolean(n && ID.test(String(id || '')) && n.startsWith(carpeta) && n.length > carpeta.length);
};

/**
 * Qué permiso cubre una orden (argv), o null: deny-by-default. Solo hay tres formas de orden posibles:
 * git de lectura, una suite de functions/test, y el revisor determinista sin tocar su baseline.
 */
export const permisoDeLaOrden = (argv, id) => {
  if (!Array.isArray(argv) || argv.length === 0 || argv.length > 12 || !argv.every((a) => typeof a === 'string' && ARG.test(a))) return null;
  const [programa, ...resto] = argv;
  if (programa === 'git') {
    if (!SUBORDENES_GIT.has(resto[0]) || resto.slice(1).some((a) => FLAGS_GIT_PROHIBIDOS.includes(a))) return null;
    return 'leer-git';
  }
  if (programa !== 'node') return null;
  if (resto.length === 1 && SUITE.test(resto[0])) return 'ejecutar-pruebas';
  if (resto[0] !== 'ops/revision/baseline.mjs') return null;
  const opciones = resto.slice(1);
  if (opciones.length === 0 || (opciones.length === 1 && opciones[0] === '--validar')) return 'ejecutar-pruebas';
  if (opciones.length === 2 && ['--json', '--md', '--sarif'].includes(opciones[0]) && dentroDeSuCache(opciones[1], id)) return 'ejecutar-pruebas';
  return null;
};

/** ¿Lo pregunta o lo niega la guardia de siempre? Devuelve el motivo, o null si no tiene nada que decir. */
const objecionDeLaGuardia = (texto, analizar = analizarTexto) => {
  const g = analizar('Bash', texto);
  if (g && g.decision === 'deny') return `la guardia lo niega: ${g.motivo}`;
  if (g && g.decision === 'ask') return `la guardia lo pregunta, y eso es del dueño, no de una extensión: ${g.motivo}`;
  return null;
};

/** El contrato de un manifiesto. `{ valido, errores }`; nada que no esté en el contrato se acepta. */
export const validarManifiesto = (m, { analizar = analizarTexto } = {}) => {
  if (!esObjeto(m)) return { valido: false, errores: ['el manifiesto no es un objeto JSON'] };
  const errores = [];
  for (const c of Object.keys(m)) if (!CAMPOS.includes(c)) errores.push(`campo desconocido: ${c} (fuera del contrato no se acepta nada)`);
  for (const c of OBLIGATORIOS) if (!(c in m)) errores.push(`falta el campo ${c}`);
  if ('id' in m && !ID.test(String(m.id))) errores.push(`id no válido: ${m.id}`);
  if ('nombre' in m && (typeof m.nombre !== 'string' || m.nombre.trim().length < 3 || m.nombre.length > 80)) errores.push('nombre no válido (de 3 a 80 caracteres)');
  if ('version' in m && !versionDe(m.version)) errores.push(`versión no válida: ${m.version} (x.y.z)`);
  if ('descripcion' in m && (typeof m.descripcion !== 'string' || m.descripcion.length > 400)) errores.push('descripción no válida (hasta 400 caracteres)');
  if ('compatibilidad' in m && (!esObjeto(m.compatibilidad) || Object.keys(m.compatibilidad).join() !== 'harness'
    || !/^\^\d+\.\d+\.\d+$/.test(String(m.compatibilidad.harness)))) errores.push('compatibilidad no válida: { "harness": "^x.y.z" }');
  if ('estado' in m && !['activa', 'inactiva'].includes(m.estado)) errores.push(`estado no válido: ${m.estado} (activa o inactiva)`);

  const permisos = Array.isArray(m.permisos) ? m.permisos : [];
  if ('permisos' in m && !Array.isArray(m.permisos)) errores.push('permisos tiene que ser una lista');
  if (new Set(permisos).size !== permisos.length) errores.push('hay permisos repetidos');
  for (const p of permisos) {
    if (PRIVILEGIADOS.includes(p)) errores.push(`permiso privilegiado: ${p} — nunca se concede a una extensión; lo hace el dueño por las políticas de siempre`);
    else if (!Object.hasOwn(PERMISOS, p)) errores.push(`permiso desconocido: ${p}`);
  }

  const usados = new Set();
  if ('capacidades' in m && (!esObjeto(m.capacidades) || Object.keys(m.capacidades).length === 0)) errores.push('capacidades: un objeto con al menos una');
  for (const [nombre, aportes] of Object.entries(esObjeto(m.capacidades) ? m.capacidades : {})) {
    const cap = Object.hasOwn(CAPACIDADES, nombre) ? CAPACIDADES[nombre] : null;
    if (!cap) { errores.push(`capacidad desconocida: ${nombre}`); continue; }
    if (!Array.isArray(aportes) || aportes.length === 0) { errores.push(`${nombre}: una lista con al menos un aporte`); continue; }
    if (!cap.permisos.some((p) => permisos.includes(p))) errores.push(`${nombre} exige el permiso ${cap.permisos.join(' o ')}`);
    const ids = new Set();
    for (const a of aportes) {
      if (!esObjeto(a)) { errores.push(`${nombre}: un aporte no es un objeto`); continue; }
      for (const c of Object.keys(a)) if (!cap.campos.includes(c)) errores.push(`${nombre}: campo desconocido ${c}`);
      if (!APORTE.test(String(a.id))) errores.push(`${nombre}: id de aporte no válido: ${a.id}`);
      else if (ids.has(a.id)) errores.push(`${nombre}: aporte repetido: ${a.id}`);
      ids.add(a.id);
      if ('descripcion' in a && (typeof a.descripcion !== 'string' || a.descripcion.length > 300)) errores.push(`${nombre} ${a.id}: descripción no válida`);
      if (nombre === 'comprobacion') {
        const p = permisoDeLaOrden(a.argv, m.id);
        if (!p) errores.push(`comprobacion ${a.id}: esa orden no la cubre ningún permiso (${JSON.stringify(a.argv)})`);
        else if (!permisos.includes(p)) errores.push(`comprobacion ${a.id}: la orden exige el permiso ${p}, que no declara`);
        else {
          const objecion = objecionDeLaGuardia(a.argv.join(' '), analizar);
          if (objecion) errores.push(`comprobacion ${a.id}: ${objecion}`); else usados.add(p);
        }
      } else if (nombre === 'contexto') {
        for (const campo of ['archivos', 'documentos']) {
          if (!Array.isArray(a[campo]) || a[campo].length === 0 || !a[campo].every((r) => rutaDelRepo(r))) errores.push(`contexto ${a.id}: ${campo} tiene que ser una lista de rutas del repositorio`);
        }
        for (const d of Array.isArray(a.documentos) ? a.documentos : []) {
          const objecion = rutaDelRepo(d) && objecionDeLaGuardia(`cat ${rutaDelRepo(d)}`, analizar);
          if (objecion) errores.push(`contexto ${a.id}: ${d}: ${objecion}`);
        }
        if (permisos.includes('leer-repositorio')) usados.add('leer-repositorio');
      } else if (nombre === 'informe') {
        if (typeof a.archivo !== 'string' || !/^[a-z0-9][a-z0-9-]*\.(md|json|txt)$/.test(a.archivo)) errores.push(`informe ${a.id}: archivo tiene que ser un nombre simple .md, .json o .txt`);
        if (permisos.includes('escribir-cache')) usados.add('escribir-cache');
      }
    }
  }
  for (const p of permisos) if (Object.hasOwn(PERMISOS, p) && !usados.has(p)) errores.push(`permiso que ninguna capacidad usa: ${p} (permisos mínimos)`);
  return { valido: errores.length === 0, errores };
};

/**
 * El registro a partir de los manifiestos leídos (`[{ archivo, texto }]`). Puro y congelado. Cada extensión
 * queda en un estado y con sus motivos: rechazada (no cumple el contrato, o su archivo no se llama como su
 * id), en-conflicto (hay otra con su mismo id: ninguna actúa), incompatible (pide otra versión del Harness),
 * inactiva (desactivada en su manifiesto), apagada (WEE_EXTENSIONES=off) o activa. Solo las ACTIVAS actúan.
 */
export const construirRegistro = (entradas, { version = VERSION_DEL_HARNESS, apagadas = false, analizar = analizarTexto } = {}) => {
  const filas = entradas.map(({ archivo, texto }) => {
    let manifiesto;
    try { manifiesto = JSON.parse(texto); } catch { return { archivo, id: null, estado: 'rechazada', motivos: ['no es JSON'] }; }
    const { valido, errores } = validarManifiesto(manifiesto, { analizar });
    if (!valido) return { archivo, id: esObjeto(manifiesto) && typeof manifiesto.id === 'string' ? manifiesto.id : null, estado: 'rechazada', motivos: errores };
    return { archivo, id: manifiesto.id, estado: null, motivos: [], manifiesto };
  });
  const veces = {};
  for (const f of filas) if (f.estado === null) veces[f.id] = (veces[f.id] || 0) + 1;
  for (const f of filas) {
    if (f.estado !== null) continue;
    const nombre = path.posix.basename(String(f.archivo).replace(/\\/g, '/'));
    if (veces[f.id] > 1) Object.assign(f, { estado: 'en-conflicto', motivos: [`hay ${veces[f.id]} extensiones con el id ${f.id}: ninguna actúa`] });
    else if (nombre !== `${f.id}.json`) Object.assign(f, { estado: 'rechazada', motivos: [`el archivo se tiene que llamar ${f.id}.json`] });
    else if (!compatible(f.manifiesto.compatibilidad.harness, version)) Object.assign(f, { estado: 'incompatible', motivos: [`pide el Harness ${f.manifiesto.compatibilidad.harness} y este es ${version}`] });
    else if (f.manifiesto.estado === 'inactiva') Object.assign(f, { estado: 'inactiva', motivos: ['desactivada en su manifiesto'] });
    else if (apagadas) Object.assign(f, { estado: 'apagada', motivos: ['WEE_EXTENSIONES=off: todas apagadas'] });
    else f.estado = 'activa';
  }
  return congelar({ version, extensiones: filas });
};

/** El registro de este repositorio: los `*.json` de `ops/harness/extensiones/`. */
export const cargarRegistro = ({ raiz = RAIZ, entorno = process.env, version = VERSION_DEL_HARNESS, analizar = analizarTexto } = {}) => {
  const carpeta = path.join(raiz, CARPETA);
  const archivos = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((a) => a.endsWith('.json')).sort() : [];
  const entradas = archivos.map((a) => ({ archivo: `${CARPETA}/${a}`, texto: fs.readFileSync(path.join(carpeta, a), 'utf8') }));
  return construirRegistro(entradas, { version, apagadas: String(entorno.WEE_EXTENSIONES || '').toLowerCase() === 'off', analizar });
};

/** Las extensiones activas que aportan una capacidad. */
export const conCapacidad = (registro, capacidad) => registro.extensiones
  .filter((e) => e.estado === 'activa' && Array.isArray(e.manifiesto.capacidades[capacidad]));

/**
 * LA PUERTA. ¿Puede esta extensión hacer esta acción? Deny-by-default y en este orden: está activa en el
 * registro; la acción es de un tipo conocido y está DECLARADA en su manifiesto (una comprobación por su id,
 * un documento suyo, un informe suyo en su carpeta); la lista blanca del permiso la cubre; y la guardia de
 * siempre no la pregunta ni la niega.
 */
export const autorizar = (registro, id, accion, { analizar = analizarTexto } = {}) => {
  const no = (motivo) => ({ permitido: false, motivo });
  const fila = (registro?.extensiones || []).find((e) => e.id === id && e.estado === 'activa');
  if (!fila) return no(`la extensión ${id} no está activa en el registro`);
  const m = fila.manifiesto;
  if (!esObjeto(accion)) return no('acción no válida');
  let permiso;
  let argv = null;
  let ruta = null;
  let texto;
  if (accion.tipo === 'comprobacion') {
    const aporte = (m.capacidades.comprobacion || []).find((a) => a.id === accion.aporte);
    if (!aporte) return no(`${id} no declara la comprobación ${accion.aporte}`);
    permiso = permisoDeLaOrden(aporte.argv, id);
    if (!permiso || !m.permisos.includes(permiso)) return no(`la orden de ${id}/${aporte.id} no la cubren sus permisos`);
    argv = aporte.argv;
    texto = argv.join(' ');
  } else if (accion.tipo === 'leer') {
    ruta = rutaDelRepo(accion.ruta);
    if (!m.permisos.includes('leer-repositorio')) return no(`${id} no tiene el permiso leer-repositorio`);
    if (!ruta || !(m.capacidades.contexto || []).some((a) => a.documentos.includes(ruta))) return no(`${id} solo lee los documentos que declara (${accion.ruta} no)`);
    permiso = 'leer-repositorio';
    texto = `cat ${ruta}`;
  } else if (accion.tipo === 'escribir') {
    ruta = rutaDelRepo(accion.ruta);
    if (!m.permisos.includes('escribir-cache')) return no(`${id} no tiene el permiso escribir-cache`);
    if (!ruta || !(m.capacidades.informe || []).some((a) => `${CACHE}/${id}/${a.archivo}` === ruta)) return no(`${id} solo escribe sus informes declarados, en ${CACHE}/${id}/ (${accion.ruta} no)`);
    permiso = 'escribir-cache';
    texto = `tee ${ruta}`;
  } else {
    return no(`una extensión solo hace lo que declara su manifiesto (comprobacion, leer, escribir); «${accion.tipo}» no`);
  }
  const objecion = objecionDeLaGuardia(texto, analizar);
  if (objecion) return no(objecion);
  return { permitido: true, motivo: permiso, permiso, argv, ruta };
};

/** El entorno sin nada que parezca una credencial: una extensión no hereda tokens ni claves. */
export const entornoSinSecretos = (entorno = process.env) => Object.fromEntries(Object.entries(entorno).filter(([k]) => !SECRETO_EN_ENTORNO.test(k)));

/** Ejecuta una orden ya autorizada: argv tal cual, SIN shell. */
export const ejecutorPorDefecto = (argv, { cwd, env }) => {
  const [programa, ...args] = argv;
  const r = spawnSync(programa === 'node' ? process.execPath : programa, args, { cwd, env, encoding: 'utf8', shell: false, timeout: 15 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  return { codigo: r.status, salida: r.stdout || '', errores: r.stderr || '', error: r.error ? r.error.message : null };
};

/** Hace la acción SOLO si la puerta la autoriza; si no, no se toca nada. */
export const actuar = (registro, id, accion, { raiz = RAIZ, analizar = analizarTexto, ejecutor = ejecutorPorDefecto, entorno = process.env, contenido = '' } = {}) => {
  const p = autorizar(registro, id, accion, { analizar });
  if (!p.permitido) return { ...p, hecho: false };
  if (accion.tipo === 'comprobacion') return { ...p, hecho: true, resultado: ejecutor(p.argv, { cwd: raiz, env: entornoSinSecretos(entorno) }) };
  const destino = path.join(raiz, p.ruta);
  if (accion.tipo === 'leer') return { ...p, hecho: true, resultado: fs.readFileSync(destino, 'utf8') };
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, String(contenido));
  return { ...p, hecho: true };
};

const describir = (e) => {
  if (e.estado !== 'activa' && !e.manifiesto) return `✘ ${e.estado} · ${e.archivo}: ${e.motivos.join(' · ')}`;
  const m = e.manifiesto;
  const aportes = Object.entries(m.capacidades).map(([c, as]) => `${c}: ${as.map((a) => a.id).join(', ')}`).join(' · ');
  return `${e.estado === 'activa' ? '✔' : '·'} ${e.estado} · ${m.id}@${m.version} — ${m.nombre} (${aportes}; permisos: ${m.permisos.join(', ')})${e.estado === 'activa' ? '' : ` — ${e.motivos.join(' · ')}`}`;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [orden, ...resto] = process.argv.slice(2);
  if (!orden || orden === 'listar') {
    const r = cargarRegistro();
    console.log(`# Weë Harness ${r.version} · extensiones (${CARPETA}/)`);
    if (!r.extensiones.length) console.log('· ninguna');
    for (const e of r.extensiones) console.log(describir(e));
  } else if (orden === 'validar') {
    if (resto[0]) {
      let m;
      try { m = JSON.parse(fs.readFileSync(path.resolve(resto[0]), 'utf8')); } catch (e) { console.log(`✘ ${resto[0]}: ${e.message}`); process.exit(1); }
      const { valido, errores } = validarManifiesto(m);
      console.log(valido ? `✔ ${resto[0]}: cumple el contrato` : errores.map((x) => `✘ ${x}`).join('\n'));
      process.exit(valido ? 0 : 1);
    }
    const r = cargarRegistro();
    for (const e of r.extensiones) console.log(describir(e));
    process.exit(r.extensiones.some((e) => ['rechazada', 'en-conflicto'].includes(e.estado)) ? 1 : 0);
  } else if (orden === 'ejecutar') {
    const [id, aporte] = resto;
    const r = actuar(cargarRegistro(), id, { tipo: 'comprobacion', aporte });
    if (!r.permitido) { console.log(`✘ ${r.motivo}`); process.exit(1); }
    process.stdout.write(r.resultado.salida);
    process.stderr.write(r.resultado.errores);
    process.exit(r.resultado.codigo ?? 1);
  } else {
    console.log('uso: node ops/harness/extensiones.mjs listar | validar [archivo.json] | ejecutar <id> <aporte>');
    process.exit(2);
  }
}
