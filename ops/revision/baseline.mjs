#!/usr/bin/env node
/*
 * LA BASELINE DEL REVISOR DE WEË — y la puerta G3 del cierre de fase (docs/REVISION.md).
 *
 *   node ops/revision/baseline.mjs [--baseline ops/revision/baseline.json] [--base <commit>] [--raiz <dir>]
 *                                  [--json <archivo>] [--sarif <archivo>] [--md <archivo>]
 *                                  [--detectores <json ya calculado>] [--solo <reglas>] [--archivos a,b]
 *   node ops/revision/baseline.mjs --validar [--baseline <archivo>]
 *   node ops/revision/baseline.mjs --proponer <archivo> [--inicial] [--corte <commit>]
 *
 * Ejecuta los detectores (o lee su JSON con `--detectores`), compara con la baseline y clasifica cada hallazgo
 * (PREEXISTENTE, NUEVO, NUEVA REGLA, CORREGIDO, REAPARECIDO, ACEPTADO COMO DEUDA, INCIERTO, FALSO POSITIVO; la
 * lógica, en `clasificacion.mjs`). La base de las reglas que comparan es, por defecto, el `corte` de la baseline.
 *
 * Código de salida = la puerta: 1 si hay un NUEVO alto o bloqueante, un REAPARECIDO o cualquier `higiene/*`;
 * 0 si no; 2 si la baseline no es válida o falla algo.
 *
 * `--proponer` escribe una baseline PROPUESTA en OTRA ruta: nunca sobrescribe la vigente (se niega si la ruta es
 * la misma). La aplica una persona, con autorización. No se propone con un alcance parcial (`--solo`,
 * `--archivos`): una pasada parcial daría por corregido lo que no miró.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ_POR_DEFECTO, existeCommit, leerArgumentos, lista, leerJson, escribirJson } from './comun.mjs';
import { analizar } from './detectores.mjs';
import { versionesDeReglas } from './reglas.mjs';
import { validarBaseline, baselineVacia, clasificar, cambiadosDesdeCorte, proponerBaseline, ESTADOS, esDeAuditoria } from './clasificacion.mjs';
import { aSarif } from './sarif.mjs';

export const RUTA_BASELINE = 'ops/revision/baseline.json';

/** Resumen en Markdown (para el informe de la fase). */
export const enMarkdown = (resultado, c, { baselineRuta, corte }) => {
  const l = [];
  l.push(`# Revisión determinista — ${new Date().toISOString().slice(0, 10)}`);
  l.push('');
  l.push(`- Base: \`${resultado.base || '—'}\` · corte de la baseline: \`${corte || '—'}\` · baseline: \`${baselineRuta}\``);
  l.push(`- ${resultado.archivosAnalizados} archivos en ${(resultado.duracionMs / 1000).toFixed(1)} s`);
  l.push(`- Puerta G3: **${c.puerta.codigo ? 'NO PASA' : 'pasa'}**`);
  for (const m of c.puerta.motivos) l.push(`  - ${m}`);
  l.push('');
  l.push('| Estado | Hallazgos |');
  l.push('|---|---|');
  for (const e of ESTADOS) l.push(`| ${e} | ${c.porEstado[e]} |`);
  const seccion = (titulo, filas) => {
    if (!filas.length) return;
    l.push('', `## ${titulo}`, '');
    for (const r of filas) l.push(`- \`${r.id}\` — ${r.severidad} — ${r.mensaje} (${r.evidencia.ruta}:${r.evidencia.linea})${r.porque ? ` · ${r.porque}` : ''}`);
  };
  seccion('REAPARECIDO', c.resultados.filter((r) => r.estado === 'REAPARECIDO'));
  seccion('NUEVO', c.resultados.filter((r) => r.estado === 'NUEVO'));
  seccion('NUEVA REGLA', c.resultados.filter((r) => r.estado === 'NUEVA REGLA'));
  const corregidos = c.ausentes.filter((a) => a.nuevoCorregido);
  if (corregidos.length) {
    l.push('', '## CORREGIDO (ya no aparece)', '');
    for (const a of corregidos) l.push(`- \`${a.entrada.id}\` — ${a.entrada.titulo}`);
  }
  const auditoria = c.ausentes.filter((a) => esDeAuditoria(a.entrada));
  if (auditoria.length) {
    l.push('', '## Hallazgos de auditoría abiertos (sin detector: se cierran a mano)', '');
    for (const a of auditoria) l.push(`- \`${a.entrada.id}\` — ${a.estado} — ${a.entrada.titulo}`);
  }
  if (resultado.disparadores.length) {
    l.push('', '## Disparadores de frontera', '');
    for (const d of resultado.disparadores) l.push(`- ${d.tipo}: ${d.detalle}`);
  }
  return `${l.join('\n')}\n`;
};

export const resumenDeTexto = (resultado, c) => {
  const l = [];
  l.push(`Baseline de Weë — ${resultado.archivosAnalizados} archivos, ${(resultado.duracionMs / 1000).toFixed(1)} s, base ${resultado.base || '—'}`);
  l.push(`  ${ESTADOS.map((e) => `${e}: ${c.porEstado[e]}`).join(' · ')}`);
  const nuevos = c.resultados.filter((r) => r.estado === 'NUEVO' || r.estado === 'REAPARECIDO');
  for (const r of nuevos.slice(0, 40)) l.push(`  ${r.estado.padEnd(11)} ${r.severidad.padEnd(10)} ${r.id}`);
  if (nuevos.length > 40) l.push(`  … y ${nuevos.length - 40} más (ver --json/--md)`);
  l.push(c.puerta.codigo ? `✘ Puerta G3: NO PASA (${c.puerta.motivos.length})` : '✔ Puerta G3: pasa');
  for (const m of c.puerta.motivos.slice(0, 20)) l.push(`  · ${m}`);
  return l.join('\n');
};

const principal = () => {
  const args = leerArgumentos(process.argv.slice(2), ['validar', 'inicial']);
  const raiz = path.resolve(args.raiz || RAIZ_POR_DEFECTO);
  const rutaBaseline = path.resolve(raiz, args.baseline || RUTA_BASELINE);
  const hayBaseline = fs.existsSync(rutaBaseline);

  if (args.validar) {
    if (!hayBaseline) { console.error(`✘ no existe ${rutaBaseline}`); return 2; }
    const errores = validarBaseline(leerJson(rutaBaseline));
    if (errores.length) { console.error(`✘ baseline no válida:\n  ${errores.join('\n  ')}`); return 2; }
    console.log('✔ baseline válida');
    return 0;
  }

  let baseline;
  if (hayBaseline) {
    baseline = leerJson(rutaBaseline);
    const errores = validarBaseline(baseline);
    if (errores.length) { console.error(`✘ baseline no válida:\n  ${errores.join('\n  ')}`); return 2; }
  } else {
    baseline = baselineVacia(args.corte);
    console.log(`aviso: no hay baseline en ${path.relative(raiz, rutaBaseline).replace(/\\/g, '/')}; se compara contra una vacía`);
  }
  const corte = args.corte || baseline.corte;
  const base = args.base || (corte && existeCommit(raiz, corte) ? corte : null);
  const solo = lista(args.solo);
  const archivos = lista(args.archivos);

  if (args.proponer) {
    const destino = path.resolve(args.proponer);
    if (destino === rutaBaseline) { console.error('✘ --proponer no escribe sobre la baseline vigente: elige otra ruta (la aplica una persona)'); return 2; }
    if (solo || archivos) { console.error('✘ no se propone una baseline con un alcance parcial (--solo/--archivos)'); return 2; }
    if (!corte) { console.error('✘ una baseline necesita un corte: --corte <commit>'); return 2; }
  }

  const resultado = args.detectores ? leerJson(args.detectores) : analizar({ raiz, base, solo, archivos });
  const c = clasificar(resultado.hallazgos, baseline, {
    cambiados: cambiadosDesdeCorte(raiz, corte),
    reglasActivas: new Set(Object.keys(resultado.reglas || {})),
    archivos: resultado.alcance?.archivos ? new Set(resultado.alcance.archivos) : null,
  });

  if (args.json) escribirJson(args.json, { ...resultado, baseline: path.relative(raiz, rutaBaseline).replace(/\\/g, '/'), corte, porEstado: c.porEstado, puerta: c.puerta, clasificacion: c.resultados.map(({ entradaBaseline, ...r }) => r), ausentes: c.ausentes });
  if (args.sarif) escribirJson(args.sarif, aSarif(resultado, c));
  if (args.md) {
    fs.mkdirSync(path.dirname(path.resolve(args.md)), { recursive: true });
    fs.writeFileSync(args.md, enMarkdown(resultado, c, { baselineRuta: path.relative(raiz, rutaBaseline).replace(/\\/g, '/'), corte }));
  }
  if (args.proponer) {
    const propuesta = proponerBaseline(c, baseline, { inicial: Boolean(args.inicial), corte, reglas: { ...(baseline.reglas || {}), ...(resultado.reglas || versionesDeReglas()) } });
    const errores = validarBaseline(propuesta);
    escribirJson(args.proponer, propuesta);
    console.log(`Propuesta escrita en ${args.proponer}: ${propuesta.entradas.length} entradas, ${propuesta.pendientes?.length || 0} pendientes de decisión humana. NO se ha aplicado.`);
    if (errores.length) console.error(`✘ la propuesta no valida:\n  ${errores.join('\n  ')}`);
  }
  console.log(resumenDeTexto(resultado, c));
  return c.puerta.codigo;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let codigo;
  try { codigo = principal(); } catch (e) { console.error(`✘ ${e.message}`); codigo = 2; }
  process.exitCode = codigo;
}
