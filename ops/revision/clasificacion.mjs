/*
 * LA CLASIFICACIÓN CONTRA LA BASELINE — el corazón de `baseline.mjs`, sin línea de órdenes.
 *
 * La baseline (`ops/revision/baseline.json`) dice qué hallazgos ya se conocían en el CORTE y qué se decidió de
 * cada uno. Su forma:
 *
 *   { version: 1, corte: '<commit>', generado: '<ISO>', reglas: { '<regla>': <version> },
 *     entradas: [{ id, regla, estado, severidad, huella?, origen: 'detector'|'auditoria-2026-10-01', titulo, desde,
 *                  motivo?, responsable?, fecha?, revisar_en?, referencia?, pregunta?, cuenta? }],
 *     pendientes?: [...] }   ← solo en una PROPUESTA: lo que espera una decisión humana (no cuenta como baseline)
 *
 * Estados de un hallazgo: PREEXISTENTE, NUEVO, NUEVA REGLA, CORREGIDO, REAPARECIDO, ACEPTADO COMO DEUDA,
 * INCIERTO, FALSO POSITIVO. En la baseline solo viven los DECIDIDOS (PREEXISTENTE, CORREGIDO, ACEPTADO COMO DEUDA,
 * INCIERTO, FALSO POSITIVO); NUEVO, NUEVA REGLA y REAPARECIDO son lo que el revisor ve hoy.
 *
 * Clasificación de un hallazgo de hoy:
 *   - su id está en la baseline (o, si el id cambió, su huella dentro de la misma regla y archivo) → el estado
 *     de la baseline; si estaba CORREGIDO y vuelve → REAPARECIDO; `tipos/any` → NUEVO solo si la cuenta SUBE;
 *   - no está: la regla entró después de la baseline (no está en `reglas` o con versión menor) → NUEVA REGLA;
 *     el archivo del ancla (o uno relacionado) cambió desde el corte → NUEVO; si no → NUEVA REGLA (código viejo
 *     que una regla ve por primera vez).
 * Entradas que ya no aparecen → CORREGIDO, SALVO las de una auditoría (hallazgos de IA sin detector): esas no
 * se cierran solas, necesitan un cierre explícito en la baseline.
 *
 * Puerta: 1 si hay un NUEVO de severidad alta o bloqueante, cualquier REAPARECIDO o cualquier `higiene/*`
 * (salvo un FALSO POSITIVO decidido); 0 si no.
 */
import fs from 'node:fs';
import path from 'node:path';
import { git, existeCommit, leerJson } from './comun.mjs';
import { SEVERIDADES, reglaPorId } from './reglas.mjs';

export const ESTADOS = ['PREEXISTENTE', 'NUEVO', 'NUEVA REGLA', 'CORREGIDO', 'REAPARECIDO', 'ACEPTADO COMO DEUDA', 'INCIERTO', 'FALSO POSITIVO'];
export const ESTADOS_DE_BASELINE = ['PREEXISTENTE', 'CORREGIDO', 'ACEPTADO COMO DEUDA', 'INCIERTO', 'FALSO POSITIVO'];
export const RE_ORIGEN_AUDITORIA = /^auditoria-\d{4}-\d{2}-\d{2}$/;

export const esDeAuditoria = (e) => RE_ORIGEN_AUDITORIA.test(e?.origen || '');

/** La ruta de un id `<dominio>/<regla>/<ruta>#<ancla>`. */
export const rutaDeId = (id, regla) => {
  const resto = id.startsWith(`${regla}/`) ? id.slice(regla.length + 1) : id;
  const i = resto.indexOf('#');
  return i < 0 ? resto : resto.slice(0, i);
};

const lleno = (v) => typeof v === 'string' && v.trim().length > 0;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}/;

/** Valida una baseline. Devuelve la lista de errores (vacía = válida). */
export const validarBaseline = (b) => {
  const errores = [];
  if (!b || typeof b !== 'object') return ['la baseline no es un objeto JSON'];
  if (b.version !== 1) errores.push(`version debe ser 1 (es ${JSON.stringify(b.version)})`);
  if (!lleno(b.corte)) errores.push('falta `corte` (el commit desde el que se cuenta)');
  if (b.reglas !== undefined && (typeof b.reglas !== 'object' || Array.isArray(b.reglas))) errores.push('`reglas` debe ser { id: version }');
  if (!Array.isArray(b.entradas)) { errores.push('`entradas` debe ser una lista'); return errores; }
  const vistos = new Set();
  b.entradas.forEach((e, i) => {
    const donde = `entradas[${i}]${e?.id ? ` (${e.id})` : ''}`;
    if (!e || typeof e !== 'object') { errores.push(`${donde}: no es un objeto`); return; }
    if (!lleno(e.id)) errores.push(`${donde}: falta id`);
    else if (vistos.has(e.id)) errores.push(`${donde}: id repetido`);
    else vistos.add(e.id);
    if (!lleno(e.regla)) errores.push(`${donde}: falta regla`);
    else if (lleno(e.id) && !e.id.startsWith(`${e.regla}/`)) errores.push(`${donde}: el id no empieza por su regla`);
    if (!ESTADOS.includes(e.estado)) errores.push(`${donde}: estado desconocido ${JSON.stringify(e.estado)}`);
    else if (!ESTADOS_DE_BASELINE.includes(e.estado)) errores.push(`${donde}: ${e.estado} no es un estado decidido; en la baseline solo ${ESTADOS_DE_BASELINE.join(', ')}`);
    if (!SEVERIDADES.includes(e.severidad)) errores.push(`${donde}: severidad desconocida ${JSON.stringify(e.severidad)}`);
    if (e.origen !== 'detector' && !RE_ORIGEN_AUDITORIA.test(e.origen || '')) errores.push(`${donde}: origen debe ser 'detector' o 'auditoria-AAAA-MM-DD'`);
    if (!lleno(e.titulo)) errores.push(`${donde}: falta titulo`);
    if (!lleno(e.desde) || !RE_FECHA.test(e.desde)) errores.push(`${donde}: falta desde (fecha ISO)`);
    if (e.estado === 'ACEPTADO COMO DEUDA') {
      for (const campo of ['motivo', 'responsable', 'fecha', 'revisar_en', 'referencia']) if (!lleno(e[campo])) errores.push(`${donde}: ACEPTADO COMO DEUDA exige ${campo}`);
      if (lleno(e.fecha) && !RE_FECHA.test(e.fecha)) errores.push(`${donde}: fecha no es ISO`);
      if (lleno(e.revisar_en) && !RE_FECHA.test(e.revisar_en)) errores.push(`${donde}: revisar_en no es ISO`);
    }
    if (e.estado === 'INCIERTO' && !lleno(e.pregunta)) errores.push(`${donde}: INCIERTO exige pregunta`);
    if (e.estado === 'FALSO POSITIVO' && !lleno(e.motivo)) errores.push(`${donde}: FALSO POSITIVO exige motivo`);
    if (e.cuenta !== undefined && !(Number.isInteger(e.cuenta) && e.cuenta >= 0)) errores.push(`${donde}: cuenta debe ser un entero ≥ 0`);
  });
  return errores;
};

/** Una baseline vacía (la primera vez): ninguna regla conocida, nada decidido. */
export const baselineVacia = (corte) => ({ version: 1, corte: corte || null, generado: null, reglas: {}, entradas: [] });

/** Los archivos que cambiaron desde el corte hasta la copia de trabajo (incluidos los `git add -N`). */
export const cambiadosDesdeCorte = (raiz, corte) => {
  if (!corte || !existeCommit(raiz, corte)) return null;
  const salida = git(raiz, ['diff', '--name-only', '-z', '--no-renames', corte]);
  return new Set(String(salida).split('\0').filter(Boolean));
};

/**
 * Clasifica los hallazgos de hoy contra una baseline.
 * `contexto`: { cambiados: Set|null (null = no se sabe: todo cuenta como cambiado), reglasActivas: Set de reglas
 * que corrieron, archivos: Set|null (alcance parcial) }.
 */
export const clasificar = (hallazgos, baseline, contexto = {}) => {
  const cambiados = contexto.cambiados ?? null;
  const reglasActivas = contexto.reglasActivas ?? null;
  const archivosEnAlcance = contexto.archivos ?? null;
  const entradas = baseline.entradas || [];
  const porId = new Map(entradas.map((e) => [e.id, e]));
  const porHuella = new Map();
  for (const e of entradas) {
    if (!e.huella) continue;
    const k = `${e.regla}|${rutaDeId(e.id, e.regla)}|${e.huella}`;
    if (!porHuella.has(k)) porHuella.set(k, []);
    porHuella.get(k).push(e);
  }
  const usadas = new Set();
  const conMapaDeReglas = baseline.reglas && typeof baseline.reglas === 'object' && Object.keys(baseline.reglas).length > 0;
  const reglaPosterior = (id) => {
    const r = reglaPorId.get(id);
    if (!r) return false;
    if (conMapaDeReglas) return !(id in baseline.reglas) || Number(baseline.reglas[id]) < r.version;
    return !baseline.generado || r.desde > String(baseline.generado).slice(0, 10);
  };

  // Primero los ids exactos (para que una huella no robe la entrada de otro).
  const emparejadas = new Map();
  for (const h of hallazgos) {
    const e = porId.get(h.id);
    if (e && !usadas.has(e)) { emparejadas.set(h, { entrada: e, por: 'id' }); usadas.add(e); }
  }
  for (const h of hallazgos) {
    if (emparejadas.has(h)) continue;
    const k = `${h.regla}|${h.evidencia.ruta}|${h.huella}`;
    const e = (porHuella.get(k) || []).find((x) => !usadas.has(x));
    if (e) { emparejadas.set(h, { entrada: e, por: 'huella' }); usadas.add(e); }
  }

  const resultados = hallazgos.map((h) => {
    const par = emparejadas.get(h);
    let estado;
    let porque;
    let baselineState;
    if (par) {
      const e = par.entrada;
      baselineState = par.por === 'huella' || (e.huella && e.huella !== h.huella) ? 'updated' : 'unchanged';
      if (e.estado === 'CORREGIDO') { estado = 'REAPARECIDO'; porque = 'estaba corregido y ha vuelto'; baselineState = 'new'; }
      else if (h.regla === 'tipos/any' && Number.isInteger(e.cuenta) && Number.isInteger(h.cuenta) && h.cuenta > e.cuenta) {
        estado = 'NUEVO'; porque = `delta de any: de ${e.cuenta} a ${h.cuenta} (+${h.cuenta - e.cuenta})`; baselineState = 'updated';
      } else { estado = e.estado; porque = par.por === 'huella' ? `en la baseline con otro id (${e.id})` : 'en la baseline'; }
    } else {
      baselineState = 'new';
      const archivos = [h.evidencia.ruta, ...(h.relacionados || [])];
      if (reglaPosterior(h.regla)) { estado = 'NUEVA REGLA'; porque = 'la regla entró después de la baseline'; }
      else if (cambiados === null || archivos.some((a) => cambiados.has(a))) { estado = 'NUEVO'; porque = cambiados === null ? 'no se sabe qué cambió desde el corte: cuenta como nuevo' : 'el archivo cambió desde el corte'; }
      else { estado = 'NUEVA REGLA'; porque = 'código anterior al corte que la regla ve por primera vez'; }
    }
    return { ...h, estado, porque, baselineState, ...(par ? { entradaBaseline: par.entrada } : {}) };
  });

  const ausentes = [];
  for (const e of entradas) {
    if (usadas.has(e)) continue;
    const ruta = rutaDeId(e.id, e.regla);
    const fuera = (reglasActivas && !esDeAuditoria(e) && !reglasActivas.has(e.regla)) || (archivosEnAlcance && !archivosEnAlcance.has(ruta));
    if (fuera) ausentes.push({ entrada: e, estado: e.estado, nota: 'fuera del alcance de esta pasada', nuevoCorregido: false });
    else if (esDeAuditoria(e)) ausentes.push({ entrada: e, estado: e.estado, nota: 'hallazgo de auditoría: solo se cierra con una decisión explícita', nuevoCorregido: false });
    else if (e.estado === 'CORREGIDO') ausentes.push({ entrada: e, estado: 'CORREGIDO', nota: 'sigue corregido', nuevoCorregido: false });
    else ausentes.push({ entrada: e, estado: 'CORREGIDO', nota: 'ya no aparece', nuevoCorregido: true });
  }

  const porEstado = Object.fromEntries(ESTADOS.map((s) => [s, 0]));
  for (const r of resultados) porEstado[r.estado]++;
  porEstado.CORREGIDO += ausentes.filter((a) => a.nuevoCorregido).length;

  const motivos = new Map();
  for (const r of resultados) {
    if (r.estado === 'NUEVO' && (r.severidad === 'alta' || r.severidad === 'bloqueante')) motivos.set(r.id, `NUEVO ${r.severidad}: ${r.id}`);
    if (r.estado === 'REAPARECIDO') motivos.set(r.id, `REAPARECIDO: ${r.id}`);
    if (r.regla.startsWith('higiene/') && r.estado !== 'FALSO POSITIVO') motivos.set(r.id, `higiene (${r.estado}): ${r.id}`);
  }
  return { resultados, ausentes, porEstado, puerta: { codigo: motivos.size ? 1 : 0, motivos: [...motivos.values()] } };
};

/** Atajo para la línea de órdenes de los detectores: lee la baseline del disco y clasifica un resultado. */
export const clasificarContraBaseline = (resultado, rutaBaseline) => {
  const baseline = leerJson(rutaBaseline);
  const errores = validarBaseline(baseline);
  if (errores.length) throw new Error(`baseline no válida (${path.basename(rutaBaseline)}):\n  ${errores.join('\n  ')}`);
  return clasificar(resultado.hallazgos, baseline, {
    cambiados: cambiadosDesdeCorte(resultado.raiz, baseline.corte),
    reglasActivas: new Set(Object.keys(resultado.reglas)),
    archivos: resultado.alcance?.archivos ? new Set(resultado.alcance.archivos) : null,
  });
};

/**
 * Una baseline PROPUESTA a partir de una clasificación. Nunca se escribe sobre la baseline vigente: la aplica
 * una persona. Política:
 *   - lo decidido se conserva (y `tipos/any` baja su cuenta si bajó: trinquete);
 *   - NUEVA REGLA → PREEXISTENTE;
 *   - NUEVO de severidad baja o media → PREEXISTENTE, con un motivo que dice cuándo entró;
 *   - NUEVO alto o bloqueante, REAPARECIDO, cualquier `higiene/*` y una subida de `any` → `pendientes`: NO entran
 *     en las entradas; siguen saliendo hasta que alguien los corrija o los decida a mano;
 *   - `inicial: true` (primera baseline, en el corte): todo lo que hay → PREEXISTENTE, salvo la higiene;
 *   - lo que ya no aparece → CORREGIDO con fecha (salvo lo de auditoría, que se queda como estaba).
 */
export const proponerBaseline = (clasificacion, baseline, { inicial = false, hoy, corte, reglas }) => {
  const fecha = hoy || new Date().toISOString().slice(0, 10);
  const entradas = [];
  const pendientes = [];
  const DECISION = ['motivo', 'responsable', 'fecha', 'revisar_en', 'referencia', 'pregunta'];
  for (const r of clasificacion.resultados) {
    const previa = r.entradaBaseline;
    const entrada = {
      id: r.id, regla: r.regla, estado: 'PREEXISTENTE', severidad: r.severidad, huella: r.huella,
      origen: previa?.origen || 'detector', titulo: previa?.titulo || r.mensaje, desde: previa?.desde || fecha,
      ...(r.cuenta !== undefined ? { cuenta: r.cuenta } : {}),
    };
    if (previa) for (const c of DECISION) if (previa[c] !== undefined) entrada[c] = previa[c];
    const higiene = r.regla.startsWith('higiene/');
    const alta = r.severidad === 'alta' || r.severidad === 'bloqueante';
    const subidaDeAny = r.regla === 'tipos/any' && r.estado === 'NUEVO' && previa;
    if (higiene || r.estado === 'REAPARECIDO' || subidaDeAny || (!inicial && r.estado === 'NUEVO' && alta)) {
      pendientes.push({ id: r.id, regla: r.regla, estado: r.estado, severidad: r.severidad, mensaje: r.mensaje, porque: r.porque, evidencia: r.evidencia });
      if (previa) entradas.push({ ...previa }); // lo que había se queda tal cual hasta que alguien decida
      continue;
    }
    if (ESTADOS_DE_BASELINE.includes(r.estado)) entrada.estado = r.estado;
    else if (r.estado === 'NUEVO' && !inicial) entrada.motivo = entrada.motivo || `NUEVO el ${fecha}, severidad ${r.severidad}: entra en la baseline al aprobar esta propuesta`;
    entradas.push(entrada);
  }
  for (const a of clasificacion.ausentes) {
    entradas.push(a.nuevoCorregido ? { ...a.entrada, estado: 'CORREGIDO', fecha } : { ...a.entrada });
  }
  entradas.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return {
    version: 1,
    corte: corte || baseline.corte,
    generado: new Date().toISOString(),
    reglas: reglas || baseline.reglas || {},
    entradas,
    ...(pendientes.length ? { pendientes } : {}),
  };
};

/** ¿Existe y es legible? (para avisos sin lanzar) */
export const existe = (archivo) => { try { return fs.statSync(archivo).isFile(); } catch { return false; } };
