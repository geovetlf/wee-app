#!/usr/bin/env node
/*
 * LA AUTOCORRECCIÓN DEL GUARDIAN — `ops/guardian/autocorreccion.mjs`.
 *
 *   node ops/guardian/autocorreccion.mjs --detectar                 solo mira: lista lo que un corrector sabe arreglar
 *   node ops/guardian/autocorreccion.mjs --corregir [--aplicar]     prepara cada corrección aislada, la verifica y la deja lista
 *   node ops/guardian/autocorreccion.mjs --aplicar-clave <clave>    aplica al árbol una corrección ya aceptada
 *   node ops/guardian/autocorreccion.mjs --revertir <clave>         deshace SOLO lo que el Guardian aplicó, y solo si nadie lo tocó
 *   node ops/guardian/autocorreccion.mjs --registro                 el registro (JSONL) de todo lo que hizo
 *
 * El flujo: detectar → identificar archivo y causa → clasificar gravedad y riesgo → preparar la corrección en una copia
 * AISLADA (un worktree propio en la carpeta temporal, con su rama `guardian/auto/<clave>`) → verificar → aceptar SOLO si todo
 * lo obligatorio pasa → revertir SOLO lo que el Guardian creó si algo falla → registrar problema, causa, solución y pruebas.
 *
 * Lo que NO hace, y cómo se comprueba (functions/test/guardian-autocorreccion.test.mjs):
 *  · No modifica ningún control. Las rutas de los controles del Guardian, de la CI, de la guardia y de TODAS las pruebas están en
 *    `PROTEGIDAS`: un corrector que las toque se rechaza, y además la HUELLA de los controles (sha256 de todos sus archivos) debe
 *    salir idéntica antes y después. Dos cerrojos distintos: el de rutas y el de contenido.
 *  · No se otorga permisos ni toca el árbol del usuario hasta que TODO pasó; y aplicar es una orden aparte (`--aplicar`).
 *  · No decide lo que es de una persona: seguridad y permisos, cobros y Credits, datos de usuarios, esquemas, reglas de
 *    producción, secretos, contratos externos y despliegue/infraestructura salen como REQUIERE_HUMANO sin tocar nada.
 *  · No corrige sin una prueba de regresión PERMANENTE: cada corrector nombra la suite y la marca que reproducen su fallo; si no
 *    están en la cadena de `npm test`, no corrige (BLOQUEADA).
 *  · No entra en bucle: UN intento por fallo (la clave sale del corrector y del contenido; un segundo intento del mismo fallo
 *    es YA_INTENTADO), un máximo de correcciones por ejecución, y ninguna ejecución anidada ni dentro de la CI.
 *  · No hace push, ni merge, ni despliegue, ni toca la red: solo git local y archivos.
 *  · Nunca `reset`/`revert` globales: revertir es `git apply -R` del parche que el propio Guardian creó, comprobando antes que los
 *    archivos siguen siendo exactamente los que dejó.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ZONAS_ROJAS } from '../revision/reglas.mjs';
import { coincide } from '../revision/comun.mjs';
import { CORRECTORES } from './correctores.mjs';
import { verificarHuellas } from './huellas.mjs';

export const CONTRATO_REGISTRO = 'wee-guardian-registro@1';
export const MAX_INTENTOS_POR_FALLO = 1;
export const MAX_POR_EJECUCION = 5;
export const MARCA_ANIDADA = 'GUARDIAN_AUTOCORRECCION';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Estados finales de un intento: con uno de estos ya no se vuelve a intentar el mismo fallo (un intento por fallo). */
export const ESTADOS_FINALES = Object.freeze(['ACEPTADA', 'APLICADA', 'RECHAZADA', 'REQUIERE_HUMANO', 'BLOQUEADA', 'INTERRUMPIDA']);

/* ── Lo que la autocorrección NO puede tocar ───────────────────────────────────────────────────────────────── */

/**
 * Los CONTROLES: todo lo que decide si un cambio pasa o no. Superconjunto de PROTECCIONES_PROPIAS de guardian-ci.mjs (lo fija la
 * suite) más todo `functions/test/**` (una prueba que detecta un problema no se edita ni se borra para que una corrección pase),
 * `ops/guardian/**` (este mecanismo, sus huellas y su mapa) y las reglas de seguridad desplegables.
 */
export const PROTEGIDAS = Object.freeze([
  'ops/guardian/**', 'ops/harness/**', 'ops/revision/**', 'ops/permitido.mjs', 'ops/github/**', 'ops/evals/**',
  '.claude/**', '.github/**', 'scripts/ci-*.mjs', 'scripts/escaneo-secretos.mjs', 'scripts/emulators.mjs',
  'functions/test/**', 'firestore.rules', 'storage.rules', 'firebase.json',
]);

/** Lo que exige una decisión humana aunque no sea un control (categorías del encargo). */
export const ESCALADAS = Object.freeze([
  { id: 'seguridad-permisos', globs: ['firestore.rules', 'storage.rules', 'ops/iam/**', 'functions/src/**/auth*', 'functions/src/security/**', 'functions/src/moderation/**', 'functions/src/identity/**', 'functions/src/core/identity*'] },
  { id: 'cobros-creditos', globs: ['functions/src/credits/**', 'functions/src/payments/**', 'functions/src/financial/**', 'functions/src/settlement/**', 'functions/src/core/financial/**', 'ops/reconciliacion/**', 'services/creditsService.ts', 'hooks/useWallet.ts'] },
  { id: 'datos-de-usuarios', globs: ['scripts/migrar-*', 'scripts/limpiar-*', 'scripts/media-legacy.mjs', 'scripts/sembrar-*', 'data/**'] },
  { id: 'esquemas-y-migraciones', globs: ['firestore.indexes.json', 'firestore.rules', 'storage.rules', 'functions/src/**/migrat*'] },
  { id: 'reglas-de-produccion', globs: ['firebase.json', 'ops/produccion.json', 'ops/despliegue/**', 'ops/permitido.mjs', 'public/**'] },
  { id: 'secretos-y-credenciales', globs: ['**/.env', '**/.env.*', '.env', '.env.*', '**/*service-account*', '**/*serviceAccountKey*', '**/*credentials*', '**/.secret*', 'functions/src/secrets.ts'] },
  { id: 'contratos-externos', globs: ['functions/src/core/contracts*', 'functions/src/core/**/contract*', 'functions/src/engine/providers/**', 'functions/src/engine/registry.ts', 'functions/src/engine/router.ts', 'functions/src/index.ts'] },
  { id: 'despliegue-e-infraestructura', globs: ['.github/**', 'vercel.json', 'eas.json', 'netlify.toml', 'app.config.js', 'app.json', 'package.json', 'package-lock.json', 'functions/package.json', 'functions/package-lock.json', 'android/**', 'scripts/no-desplegar.mjs'] },
]);

export const normalizarRuta = (r) => {
  const s = String(r || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!s || s.startsWith('/') || /^[A-Za-z]:/.test(s) || s.split('/').includes('..')) return null;
  return path.posix.normalize(s);
};
export const esProtegida = (rel) => coincide(rel, [...PROTEGIDAS]);
export const categoriasDeRiesgo = (rel) => [...new Set([
  ...ESCALADAS.filter((e) => coincide(rel, e.globs)).map((e) => e.id),
  ...(coincide(rel, [...ZONAS_ROJAS]) ? ['zona-roja'] : []),
])];

/* ── git y archivos ─────────────────────────────────────────────────────────────────────────────────────────── */
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const git = (cwd, args, { permitirFallo = false, entrada } = {}) => {
  const r = spawnSync('git', ['-c', 'core.quotepath=off', '-c', `core.hooksPath=${os.devNull}`, '-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false',
    '-c', 'user.name=Weë Guardian', '-c', 'user.email=guardian@wee.invalid', '-C', cwd, ...args], { encoding: 'utf8', input: entrada, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0 && !permitirFallo) throw new Error(`git ${args.join(' ')} falló: ${String(r.stderr || '').trim()}`);
  return { status: r.status, out: String(r.stdout || ''), err: String(r.stderr || '') };
};
export const archivosSeguidos = (raiz) => git(raiz, ['ls-files', '-z']).out.split('\0').filter(Boolean);
const hashDe = (raiz, rel) => { try { return sha(fs.readFileSync(path.join(raiz, rel))); } catch { return null; } };

/** La HUELLA de los controles: sha256 de (ruta + hash de contenido) de todo archivo seguido que esté en PROTEGIDAS. */
export const huellaDeControles = (raiz) => {
  const archivos = archivosSeguidos(raiz).filter(esProtegida).sort();
  const h = crypto.createHash('sha256');
  let n = 0;
  for (const rel of archivos) { const c = hashDe(raiz, rel); if (c) { h.update(`${rel}\0${c}\n`); n++; } }
  return { huella: h.digest('hex'), archivos: n };
};

/* ── El registro ────────────────────────────────────────────────────────────────────────────────────────────── */
export const estadoPorDefecto = (raiz) => path.join(raiz, 'ops/guardian/.estado');
const rutaRegistro = (estadoDir) => path.join(estadoDir, 'registro.jsonl');
export const leerRegistro = (estadoDir) => {
  let t;
  try { t = fs.readFileSync(rutaRegistro(estadoDir), 'utf8'); } catch { return []; }
  return t.split('\n').filter(Boolean).map((l, i) => { try { return JSON.parse(l); } catch { throw new Error(`registro corrupto en la línea ${i + 1}: no se corrige nada sobre un registro que no se puede leer`); } });
};
export const anotar = (estadoDir, entrada, ahora = () => new Date().toISOString()) => {
  fs.mkdirSync(estadoDir, { recursive: true });
  const e = { contrato: CONTRATO_REGISTRO, ...entrada, cuando: ahora() };
  fs.appendFileSync(rutaRegistro(estadoDir), `${JSON.stringify(e)}\n`);
  return e;
};
/** Cuántos intentos CERRADOS tiene un fallo. APLICADA cuenta solo en un corrector derivado (no pasa antes por ACEPTADA); en los demás ya lo contó ACEPTADA. */
export const intentosCerrados = (registro, clave, corrector) => registro.filter((e) => e.clave === clave && ESTADOS_FINALES.includes(e.estado) && (e.estado !== 'APLICADA' || corrector.ambito === 'derivado')).length;
const ultimaDe = (registro, clave, estados = null) => [...registro].reverse().find((e) => e.clave === clave && (!estados || estados.includes(e.estado))) || null;

/** La clave de UN fallo: el corrector y el contenido exacto de los archivos (o, sin archivos, la causa). Mismo fallo → misma clave. */
export const claveDe = (corrector, hallazgo, hashes) => crypto.createHash('sha256')
  .update(`${corrector.id}\n${hallazgo.archivos.length ? hallazgo.archivos.map((a) => `${a}:${hashes[a]}`).sort().join('\n') : hallazgo.causa}`).digest('hex').slice(0, 16);

/** La clave de un hallazgo tal como la calcula `corregir` (null si un archivo no existe). */
export const claveDelHallazgo = (raiz, corrector, hallazgo) => {
  const archivos = (hallazgo.archivos || []).map(normalizarRuta);
  if (archivos.some((a) => a === null)) return null;
  const hashes = Object.fromEntries(archivos.map((a) => [a, hashDe(raiz, a)]));
  return Object.values(hashes).some((x) => x === null) ? null : claveDe(corrector, { ...hallazgo, archivos }, hashes);
};

/* ── Las comprobaciones del motor (obligatorias) ────────────────────────────────────────────────────────── */

/** Qué exige el motor a cualquier corrector, además de lo suyo. `verificar` añade las que dependen del repositorio. */
const comprobacionesDelMotor = ({ dir, snapshot, hallazgo, controlesAntes }) => {
  const r = [];
  const estado = git(dir, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).out.split('\0').filter(Boolean);
  const cambiados = estado.map((l) => ({ x: l.slice(0, 2), ruta: l.slice(3) }));
  const soloModificados = cambiados.every((c) => /^( M|M |MM)$/.test(c.x));
  const dentro = cambiados.every((c) => hallazgo.archivos.includes(c.ruta));
  r.push({ nombre: 'alcance', ok: cambiados.length > 0 && soloModificados && dentro, detalle: cambiados.length === 0 ? 'la corrección no cambió nada' : !soloModificados ? 'tocó algo que no es una modificación (borrado, renombrado o archivo nuevo)' : !dentro ? `tocó archivos no declarados: ${cambiados.filter((c) => !hallazgo.archivos.includes(c.ruta)).map((c) => c.ruta).join(', ')}` : `${cambiados.length} archivo(s), todos declarados` });
  r.push({ nombre: 'rutas-protegidas', ok: cambiados.every((c) => !esProtegida(c.ruta)), detalle: 'ninguna ruta cambiada es un control del Guardian, de la CI, de la guardia o una prueba' });
  const despues = huellaDeControles(dir);
  r.push({ nombre: 'controles-intactos', ok: despues.huella === controlesAntes.huella, detalle: despues.huella === controlesAntes.huella ? `huella de ${despues.archivos} controles idéntica` : 'la huella de los controles CAMBIÓ' });
  return { comprobaciones: r, cambiados: cambiados.map((c) => c.ruta) };
};

/** Las verificaciones por defecto sobre la copia aislada: sintaxis, huellas de invariantes y mapa de dominios (todo estático y rápido). */
export const verificacionPorDefecto = async ({ dir, cambiados }) => {
  const r = [];
  const { revisarSintaxis } = await import('../../.claude/hooks/guardian-comun.mjs');
  const malas = cambiados.map((rel) => revisarSintaxis(dir, rel)).filter(Boolean);
  r.push({ nombre: 'sintaxis', ok: malas.length === 0, detalle: malas.join(' | ') || `${cambiados.length} archivo(s) con sintaxis válida` });
  const h = verificarHuellas({ raiz: dir });
  r.push({ nombre: 'huellas-de-invariantes', ok: h.ok, detalle: h.ok ? 'ninguna comprobación de los invariantes ha caído' : h.problemas.slice(0, 3).map((p) => p.id).join(', ') });
  const { verificar } = await import('./verificar.mjs');
  const v = await verificar({ raiz: dir, modo: 'estatico' });
  r.push({ nombre: 'mapa-de-dominios', ok: v.resultado === 'PASA', detalle: v.resultado === 'PASA' ? 'mapa, invariantes y huellas conformes' : `${v.problemas.length} problema(s)` });
  return r;
};

/* ── El flujo ───────────────────────────────────────────────────────────────────────────────────────────── */

const lineaDeRegresion = (raiz, corrector) => {
  const { suite, marca } = corrector.regresion || {};
  if (!suite || !marca) return { ok: false, motivo: `el corrector «${corrector.id}» no declara su prueba de regresión` };
  const rel = `functions/test/${suite}.test.mjs`;
  let texto; let paquete;
  try { texto = fs.readFileSync(path.join(raiz, rel), 'utf8'); } catch { return { ok: false, motivo: `la prueba de regresión ${rel} no existe` }; }
  try { paquete = fs.readFileSync(path.join(raiz, 'functions/package.json'), 'utf8'); } catch { return { ok: false, motivo: 'no se puede leer functions/package.json' }; }
  if (!texto.includes(marca)) return { ok: false, motivo: `${rel} no menciona «${marca}»: no reproduce el fallo de este corrector` };
  if (!paquete.includes(`node test/${suite}.test.mjs`)) return { ok: false, motivo: `${rel} no está en la cadena de npm test` };
  return { ok: true };
};

const limpiar = (raiz, { directorio, rama }) => {
  if (directorio) git(raiz, ['worktree', 'remove', '--force', directorio], { permitirFallo: true });
  if (directorio) { try { fs.rmSync(directorio, { recursive: true, force: true }); } catch { /* ya no está */ } }
  git(raiz, ['worktree', 'prune'], { permitirFallo: true });
  if (rama) git(raiz, ['branch', '-D', rama], { permitirFallo: true });
};

const respuesta = (estado, extra = {}) => ({ estado, ...extra });
const procesoVivo = (pid) => { if (!Number.isInteger(pid)) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/**
 * Detecta, con todos los correctores, lo que saben arreglar. Solo lee. `archivos` = los archivos que git sigue.
 */
export const detectar = ({ raiz, correctores = CORRECTORES, libDesfasadoDe = null }) => {
  const archivos = archivosSeguidos(raiz);
  const out = [];
  for (const c of correctores) {
    if (c.ambito === 'derivado' && !libDesfasadoDe) continue;
    for (const h of c.detectar({ raiz, archivos, libDesfasadoDe })) out.push({ corrector: c.id, ...h });
  }
  return out;
};

/** Aplica al árbol del usuario un parche ya ACEPTADO, comprobando que los archivos siguen siendo los que el Guardian vio. */
export const aplicarAceptada = ({ raiz, estadoDir, clave, ahora }) => {
  const registro = leerRegistro(estadoDir);
  const e = ultimaDe(registro, clave, ['ACEPTADA']);
  if (!e) return respuesta('NO_HAY_ACEPTADA', { motivo: `no hay una corrección ACEPTADA con la clave ${clave}` });
  if (ultimaDe(registro, clave, ['APLICADA'])) return respuesta('YA_APLICADA', { clave });
  const parche = path.join(estadoDir, 'parches', `${clave}.patch`);
  let texto;
  try { texto = fs.readFileSync(parche); } catch { return respuesta('FALLO', { motivo: 'el parche aceptado ya no está en disco' }); }
  if (sha(texto) !== e.parcheSha) return respuesta('FALLO', { motivo: 'el parche guardado no coincide con su huella: alguien lo cambió' });
  const distintos = Object.entries(e.antes).filter(([rel, h]) => hashDe(raiz, rel) !== h).map(([rel]) => rel);
  if (distintos.length) return respuesta('CONFLICTO', { motivo: `estos archivos ya no son los que el Guardian vio: ${distintos.join(', ')}; no se toca nada`, archivos: distintos });
  const prueba = git(raiz, ['apply', '--check', parche], { permitirFallo: true });
  if (prueba.status !== 0) return respuesta('CONFLICTO', { motivo: `el parche ya no encaja: ${prueba.err.trim()}` });
  git(raiz, ['apply', parche]);
  const mal = Object.entries(e.despues).filter(([rel, h]) => hashDe(raiz, rel) !== h).map(([rel]) => rel);
  if (mal.length) {
    git(raiz, ['apply', '-R', parche], { permitirFallo: true });
    return respuesta('FALLO', { motivo: `tras aplicar, ${mal.join(', ')} no quedó como se verificó: se deshizo` });
  }
  const entrada = anotar(estadoDir, { clave, corrector: e.corrector, estado: 'APLICADA', archivos: e.archivos, antes: e.antes, despues: e.despues, parche: e.parche, parcheSha: e.parcheSha, reversible: true }, ahora);
  return respuesta('APLICADA', { clave, entrada });
};

/** Deshace SOLO lo que el Guardian aplicó: el parche inverso, y únicamente si los archivos siguen siendo los que dejó. */
export const revertir = ({ raiz, estadoDir, clave, ahora }) => {
  const registro = leerRegistro(estadoDir);
  const e = ultimaDe(registro, clave, ['APLICADA']);
  if (!e) return respuesta('NO_HAY_APLICADA', { motivo: `el Guardian no tiene aplicada ninguna corrección con la clave ${clave}` });
  if (ultimaDe(registro, clave, ['REVERTIDA'])?.cuando >= e.cuando) return respuesta('YA_REVERTIDA', { clave });
  const parche = path.join(estadoDir, 'parches', `${clave}.patch`);
  const cambiados = Object.entries(e.despues).filter(([rel, h]) => hashDe(raiz, rel) !== h).map(([rel]) => rel);
  if (cambiados.length) return respuesta('MODIFICADO_DESPUES', { motivo: `${cambiados.join(', ')} cambió después de la corrección: no se revierte nada (sería pisar trabajo ajeno)`, archivos: cambiados });
  const prueba = git(raiz, ['apply', '-R', '--check', parche], { permitirFallo: true });
  if (prueba.status !== 0) return respuesta('FALLO', { motivo: `el parche inverso no encaja: ${prueba.err.trim()}` });
  git(raiz, ['apply', '-R', parche]);
  const vuelto = Object.entries(e.antes).filter(([rel, h]) => hashDe(raiz, rel) !== h).map(([rel]) => rel);
  const entrada = anotar(estadoDir, { clave, corrector: e.corrector, estado: 'REVERTIDA', archivos: e.archivos, vueltoAlOriginal: vuelto.length === 0 }, ahora);
  return respuesta('REVERTIDA', { clave, entrada, vueltoAlOriginal: vuelto.length === 0 });
};

/**
 * Corrige UN hallazgo con UN corrector, de punta a punta. Devuelve { estado, ... }; estados: ACEPTADA · APLICADA · RECHAZADA ·
 * REQUIERE_HUMANO · BLOQUEADA · YA_INTENTADO · ERROR. Nunca toca el árbol del usuario salvo con `aplicar` y con TODO en verde.
 */
export const corregir = async ({
  raiz, estadoDir = estadoPorDefecto(raiz), corrector, hallazgo, verificar = verificacionPorDefecto, aplicar = false,
  ahora = () => new Date().toISOString(), libDesfasadoDe = null, ejecutar = null, entorno = process.env,
}) => {
  if (entorno[MARCA_ANIDADA]) return respuesta('ERROR', { motivo: 'ejecución anidada: la autocorrección no se llama a sí misma' });
  const registro = leerRegistro(estadoDir);
  const archivos = (hallazgo.archivos || []).map(normalizarRuta);
  if (archivos.some((a) => a === null)) return respuesta('ERROR', { motivo: 'una ruta del hallazgo no es una ruta del repositorio' });
  const h = { ...hallazgo, archivos };
  const hashes = Object.fromEntries(archivos.map((a) => [a, hashDe(raiz, a)]));
  if (Object.values(hashes).some((x) => x === null)) return respuesta('ERROR', { motivo: 'un archivo del hallazgo no existe en el árbol' });
  const clave = claveDe(corrector, h, hashes);
  const base = { clave, corrector: corrector.id, archivos, causa: h.causa, riesgo: corrector.riesgo };

  /* Un intento por fallo: lo ya intentado no se repite (solo se puede APLICAR lo ya aceptado). */
  const previo = ultimaDe(registro, clave, ESTADOS_FINALES);
  const intentos = intentosCerrados(registro, clave, corrector);
  if (previo && intentos >= MAX_INTENTOS_POR_FALLO) {
    if (aplicar && previo.estado === 'ACEPTADA') return aplicarAceptada({ raiz, estadoDir, clave, ahora });
    return respuesta('YA_INTENTADO', { clave, previo: previo.estado });
  }
  const enCurso = ultimaDe(registro, clave, ['EN_CURSO']);
  if (enCurso && !previo) {
    /* Un intento que sigue VIVO (otro proceso, el mismo fallo) no se toca: limpiarlo sería pisar su copia. */
    if (procesoVivo(enCurso.pid) && enCurso.pid !== process.pid) return respuesta('OCUPADA', { clave, motivo: `otro proceso del Guardian (pid ${enCurso.pid}) está corrigiendo este mismo fallo` });
    limpiar(raiz, enCurso);
    anotar(estadoDir, { ...base, estado: 'INTERRUMPIDA', motivo: 'un intento anterior no llegó a terminar; se limpió lo que había creado el Guardian y no se repite solo', rama: enCurso.rama }, ahora);
    return respuesta('YA_INTENTADO', { clave, previo: 'INTERRUMPIDA' });
  }

  /* Riesgo y rutas: antes de crear nada. */
  const propias = archivos.filter(esProtegida);
  if (corrector.riesgo !== 'bajo' || corrector.determinista !== true) {
    anotar(estadoDir, { ...base, estado: 'REQUIERE_HUMANO', categorias: ['corrector-no-determinista-o-de-riesgo'], motivo: 'solo se corrige lo determinista y de bajo riesgo' }, ahora);
    return respuesta('REQUIERE_HUMANO', { clave, categorias: ['corrector-no-determinista-o-de-riesgo'] });
  }
  if (propias.length) {
    anotar(estadoDir, { ...base, estado: 'BLOQUEADA', motivo: `el Guardian no modifica sus controles ni las pruebas: ${propias.join(', ')}`, requiereHumano: true }, ahora);
    return respuesta('BLOQUEADA', { clave, motivo: 'toca controles', archivos: propias });
  }
  const categorias = [...new Set(archivos.flatMap(categoriasDeRiesgo))];
  if (categorias.length) {
    anotar(estadoDir, { ...base, estado: 'REQUIERE_HUMANO', categorias, requiereHumano: true, motivo: 'toca una categoría que decide una persona' }, ahora);
    return respuesta('REQUIERE_HUMANO', { clave, categorias });
  }
  const reg = lineaDeRegresion(raiz, corrector);
  if (!reg.ok) {
    anotar(estadoDir, { ...base, estado: 'BLOQUEADA', motivo: `sin prueba de regresión permanente: ${reg.motivo}`, requiereHumano: true }, ahora);
    return respuesta('BLOQUEADA', { clave, motivo: reg.motivo });
  }

  if (corrector.ambito === 'derivado') return corregirDerivado({ raiz, estadoDir, corrector, hallazgo: h, base, ahora, libDesfasadoDe, ejecutar });

  /* La copia aislada: un worktree propio y una rama propia, que el registro anota ANTES de crearlos. */
  const k8 = clave.slice(0, 8);
  const rama = `guardian/auto/${k8}`;
  const directorio = path.join(os.tmpdir(), `guardian-auto-${k8}-${process.pid}`);
  if (git(raiz, ['rev-parse', '--verify', '--quiet', `refs/heads/${rama}`], { permitirFallo: true }).status === 0) {
    return respuesta('ERROR', { clave, motivo: `la rama ${rama} ya existe y no es de este intento: no se pisa` });
  }
  anotar(estadoDir, { ...base, estado: 'EN_CURSO', rama, directorio, pid: process.pid }, ahora);
  const fallar = (estado, motivo, extra = {}) => {
    limpiar(raiz, { directorio, rama });
    const e = anotar(estadoDir, { ...base, estado, motivo, rama, reversible: true, revertido: 'la copia aislada y su rama se borraron; el árbol no se tocó', ...extra }, ahora);
    return respuesta(estado, { clave, motivo, entrada: e });
  };
  try {
    git(raiz, ['worktree', 'add', '-b', rama, directorio, 'HEAD']);
    for (const rel of archivos) { fs.mkdirSync(path.dirname(path.join(directorio, rel)), { recursive: true }); fs.writeFileSync(path.join(directorio, rel), fs.readFileSync(path.join(raiz, rel))); }
    git(directorio, ['add', '-A']);
    git(directorio, ['commit', '--allow-empty', '--no-verify', '--no-gpg-sign', '-m', `guardian: instantánea previa a ${corrector.id}`]);
    const snapshot = git(directorio, ['rev-parse', 'HEAD']).out.trim();
    const controlesAntes = huellaDeControles(directorio);
    await corrector.corregir({ dir: directorio, hallazgo: h, ejecutar });
    const { comprobaciones, cambiados } = comprobacionesDelMotor({ dir: directorio, snapshot, hallazgo: h, controlesAntes });
    const propias2 = await corrector.comprobar({ dir: directorio, hallazgo: h, libDesfasadoDe });
    const extra = comprobaciones.every((c) => c.ok) ? await verificar({ dir: directorio, raiz, cambiados, hallazgo: h, corrector, snapshot }) : [];
    const todas = [...comprobaciones, ...propias2.map((c) => ({ ...c, nombre: `corrector:${c.nombre}` })), ...extra];
    const malas = todas.filter((c) => !c.ok);
    if (malas.length) return fallar('RECHAZADA', `no pasó: ${malas.map((m) => m.nombre).join(', ')}`, { verificaciones: todas, requiereHumano: true });
    git(directorio, ['add', '-A']);
    git(directorio, ['commit', '--no-verify', '--no-gpg-sign', '-m', `guardian: ${corrector.id} — ${h.causa}`]);
    const commit = git(directorio, ['rev-parse', 'HEAD']).out.trim();
    const parche = git(directorio, ['diff', '--binary', snapshot, commit]).out;
    fs.mkdirSync(path.join(estadoDir, 'parches'), { recursive: true });
    fs.writeFileSync(path.join(estadoDir, 'parches', `${clave}.patch`), parche);
    const despues = Object.fromEntries(archivos.map((a) => [a, hashDe(directorio, a)]));
    limpiar(raiz, { directorio, rama: null });
    const entrada = anotar(estadoDir, { ...base, estado: 'ACEPTADA', rama, commit, parche: `parches/${clave}.patch`, parcheSha: sha(Buffer.from(parche)), antes: hashes, despues, verificaciones: todas, reversible: true, requiereHumano: false }, ahora);
    if (aplicar) return aplicarAceptada({ raiz, estadoDir, clave, ahora });
    return respuesta('ACEPTADA', { clave, rama, commit, entrada });
  } catch (e) {
    return fallar('RECHAZADA', `error durante la corrección: ${String(e.message).slice(0, 300)}`);
  }
};

/** Un artefacto DERIVADO (functions/lib): no hay archivos seguidos ni nada que revertir; se regenera. Se verifica y se registra. */
const corregirDerivado = async ({ raiz, estadoDir, corrector, hallazgo, base, ahora, libDesfasadoDe, ejecutar }) => {
  if (!ejecutar || !libDesfasadoDe) return respuesta('ERROR', { motivo: 'un corrector derivado necesita `ejecutar` y `libDesfasadoDe`' });
  try {
    await corrector.corregir({ dir: raiz, hallazgo, ejecutar });
    const c = await corrector.comprobar({ dir: raiz, hallazgo, libDesfasadoDe });
    const ok = c.every((x) => x.ok);
    const e = anotar(estadoDir, { ...base, estado: ok ? 'APLICADA' : 'RECHAZADA', verificaciones: c, reversible: false, motivoDeIrreversible: 'artefacto derivado y regenerable (gitignored): no hay cambio en el repositorio', requiereHumano: !ok }, ahora);
    return respuesta(e.estado, { clave: base.clave, entrada: e });
  } catch (err) {
    const e = anotar(estadoDir, { ...base, estado: 'RECHAZADA', motivo: `error: ${String(err.message).slice(0, 300)}`, reversible: false, requiereHumano: true }, ahora);
    return respuesta('RECHAZADA', { clave: base.clave, entrada: e });
  }
};

/** Un ciclo: detectar y corregir hasta MAX_POR_EJECUCION hallazgos. Devuelve el resumen. */
export const ciclo = async ({ raiz, estadoDir = estadoPorDefecto(raiz), correctores = CORRECTORES, aplicar = false, max = MAX_POR_EJECUCION, soloDetectar = false, ...resto }) => {
  const hallazgos = detectar({ raiz, correctores, libDesfasadoDe: resto.libDesfasadoDe });
  if (soloDetectar) return { hallazgos, resultados: [], omitidos: 0 };
  const resultados = [];
  /* Lo ya intentado (un intento por fallo) se salta ANTES de contar el máximo: si no, los mismos primeros fallos ocuparían siempre el cupo y el resto no se trataría nunca. */
  const registro = leerRegistro(estadoDir);
  const pendientes = [];
  let yaIntentados = 0;
  for (const h of hallazgos) {
    const corrector = correctores.find((c) => c.id === h.corrector);
    const k = claveDelHallazgo(raiz, corrector, h);
    if (k && intentosCerrados(registro, k, corrector) >= MAX_INTENTOS_POR_FALLO && !(aplicar && ultimaDe(registro, k, ['ACEPTADA']))) yaIntentados++;
    else pendientes.push(h);
  }
  for (const h of pendientes.slice(0, max)) {
    const corrector = correctores.find((c) => c.id === h.corrector);
    resultados.push({ corrector: h.corrector, clave: h.clave, ...(await corregir({ raiz, estadoDir, corrector, hallazgo: h, aplicar, ...resto })) });
  }
  return { hallazgos, resultados, omitidos: Math.max(0, pendientes.length - max), yaIntentados };
};

/* ── CLI ────────────────────────────────────────────────────────────────────────────────────────────────── */
const principal = async () => {
  const args = process.argv.slice(2);
  const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
  const raiz = path.resolve(valor('--raiz') || process.env.GUARDIAN_RAIZ || REPO);
  const estadoDir = path.resolve(valor('--estado') || estadoPorDefecto(raiz));
  const modifica = args.includes('--corregir') || args.includes('--aplicar') || valor('--aplicar-clave') || valor('--revertir');
  if (process.env[MARCA_ANIDADA]) { console.error('✘ Autocorrección: ejecución anidada rechazada'); process.exitCode = 6; return; }
  if (modifica && String(process.env.CI || '').toLowerCase() === 'true') { console.error('✘ Autocorrección: dentro de la CI solo se puede --detectar (nada persiste ni se aplica allí)'); process.exitCode = 6; return; }
  process.env[MARCA_ANIDADA] = '1';
  try {
    if (args.includes('--registro')) { for (const e of leerRegistro(estadoDir)) console.log(JSON.stringify(e)); return; }
    if (valor('--revertir')) { const r = revertir({ raiz, estadoDir, clave: valor('--revertir') }); console.log(JSON.stringify(r)); process.exitCode = ['REVERTIDA', 'YA_REVERTIDA'].includes(r.estado) ? 0 : 6; return; }
    if (valor('--aplicar-clave')) { const r = aplicarAceptada({ raiz, estadoDir, clave: valor('--aplicar-clave') }); console.log(JSON.stringify(r)); process.exitCode = ['APLICADA', 'YA_APLICADA'].includes(r.estado) ? 0 : 6; return; }
    const { libDesfasado } = await import('../../functions/test/_cadena.mjs');
    const ejecutar = async ({ dir }) => { const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build', '--prefix', path.join(dir, 'functions')], { encoding: 'utf8', windowsHide: true, shell: process.platform === 'win32' }); if (r.status !== 0) throw new Error(`npm run build falló: ${String(r.stderr || r.stdout).slice(-300)}`); };
    const r = await ciclo({ raiz, estadoDir, soloDetectar: args.includes('--detectar') || !modifica, aplicar: args.includes('--aplicar'), libDesfasadoDe: libDesfasado, ejecutar });
    if (!r.resultados.length) {
      console.log(r.hallazgos.length ? `${r.hallazgos.length} hallazgo(s) corregible(s) (usa --corregir):` : '✔ Nada que corregir: ningún corrector encuentra su fallo.');
      for (const h of r.hallazgos) console.log(`  · [${h.corrector}] ${h.causa}`);
      return;
    }
    for (const x of r.resultados) console.log(`${['ACEPTADA', 'APLICADA'].includes(x.estado) ? '✔' : '✘'} [${x.corrector}] ${x.estado} ${x.clave}${x.motivo ? ` — ${x.motivo}` : ''}${x.categorias ? ` (${x.categorias.join(', ')})` : ''}`);
    if (r.omitidos) console.log(`… ${r.omitidos} hallazgo(s) más no se tratan en esta ejecución (máximo ${MAX_POR_EJECUCION}).`);
    process.exitCode = r.resultados.every((x) => ['ACEPTADA', 'APLICADA', 'YA_INTENTADO'].includes(x.estado)) ? 0 : 6;
  } catch (e) {
    console.error(`✘ Autocorrección: FALLO — ${e.message}`);
    process.exitCode = 1;
  }
};
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await principal();
