#!/usr/bin/env node
/*
 * EL INFORME DE AUTOVERIFICACIÓN DEL GUARDIAN — `ops/guardian/informe.mjs`.
 *
 *   node ops/guardian/informe.mjs [--verificacion informe.json] [--estado <carpeta>] [--json ruta] [--md ruta] [--raiz dir]
 *
 * Responde, con lo que de verdad pasó y sin inventar nada, a ocho preguntas:
 *   1 · qué comprobaciones se ejecutaron      2 · qué falló          3 · por qué (la causa que hay evidencia de)
 *   4 · qué corrigió el Guardian              5 · qué pruebas corrieron después de corregir
 *   6 · qué sigue pendiente                   7 · si lo corregido es reversible       8 · qué necesita a una persona
 *
 * Une dos fuentes que ya existen: el informe de `ops/guardian/verificar.mjs` (`wee-guardian-verificacion@1`) y el registro de
 * la autocorrección (`ops/guardian/.estado/registro.jsonl`). Sin `--verificacion` hace la verificación ESTÁTICA en el acto (y lo
 * dice: no se ejecutaron suites). Solo lee y escribe el informe que se le pida; no corrige nada. Lo fija functions/test/guardian-dominios.test.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONTRATO as CONTRATO_VERIFICACION, verificar } from './verificar.mjs';
import { leerRegistro, estadoPorDefecto, ESTADOS_FINALES } from './autocorreccion.mjs';

export const CONTRATO_INFORME = 'wee-guardian-informe@1';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Pura: el informe. `registro` = entradas del JSONL (de más antigua a más reciente). */
export const construirInforme = ({ verificacion, registro = [] }) => {
  if (!verificacion || verificacion.contrato !== CONTRATO_VERIFICACION) throw new Error(`la verificación no es del contrato ${CONTRATO_VERIFICACION}`);
  const suites = verificacion.dominios.flatMap((d) => d.suites.map((s) => ({ ...s, dominio: d.id })));
  const ejecutadas = suites.filter((s) => s.estado !== 'NO_EJECUTADA');
  const fallidas = [...new Map(suites.filter((s) => ['FALLA', 'INTERMITENTE', 'ENTORNO'].includes(s.estado)).map((s) => [s.suite, s])).values()]
    .map((s) => ({ suite: s.suite, dominio: s.dominio, estado: s.estado, clase: s.clase, causa: s.motivo || s.evidencia?.primera?.firma?.split('\n')[0] || 'sin detalle', repetida: Boolean(s.evidencia?.repeticion) }));

  /* El estado de cada fallo corregido = su última entrada del registro. */
  const porClave = new Map();
  for (const e of registro) porClave.set(e.clave, [...(porClave.get(e.clave) || []), e]);
  const correcciones = [...porClave].map(([clave, es]) => {
    const ultima = es[es.length - 1];
    const aceptada = [...es].reverse().find((e) => e.estado === 'ACEPTADA') || null;
    const verificaciones = (aceptada || ultima).verificaciones || [];
    return {
      clave, corrector: ultima.corrector, estado: ultima.estado, archivos: ultima.archivos || [], causa: ultima.causa || null, motivo: ultima.motivo || null,
      reversible: Boolean(ultima.reversible), rama: ultima.rama || null, requiereHumano: Boolean(ultima.requiereHumano || ultima.estado === 'REQUIERE_HUMANO' || ultima.estado === 'BLOQUEADA'),
      categorias: ultima.categorias || [], pruebas: verificaciones.map((v) => ({ nombre: v.nombre, ok: v.ok })), historial: es.map((e) => e.estado),
    };
  });
  const necesitaHumanos = [];
  for (const c of correcciones) if (c.requiereHumano) necesitaHumanos.push({ que: `${c.corrector} · ${c.archivos.join(', ') || 'functions/lib'}`, porque: c.motivo || `categoría: ${c.categorias.join(', ')}` });
  for (const c of correcciones) if (c.estado === 'ACEPTADA') necesitaHumanos.push({ que: `${c.corrector} · ${c.archivos.join(', ')}`, porque: `corrección verificada y lista en la rama ${c.rama}; aplicarla (--aplicar-clave ${c.clave}) es una decisión de una persona` });
  for (const p of verificacion.problemas) necesitaHumanos.push({ que: p.id, porque: p.mensaje });
  for (const f of fallidas) necesitaHumanos.push({ que: `${f.suite} (${f.estado})`, porque: f.estado === 'INTERMITENTE' ? 'falló y pasó al repetirla: la causa sigue sin resolverse' : f.estado === 'ENTORNO' ? 'el entorno no deja verificar esta suite' : 'un fallo que el Guardian no corrige solo' });

  const pendientes = [
    ...verificacion.pendientes.map((p) => ({ tipo: 'dominio-sin-nada-que-verificar', que: p.nombre, porque: p.motivo })),
    ...(verificacion.ejecucion === 'no-ejecutada' ? [{ tipo: 'suites-no-ejecutadas', que: 'las suites de los dominios', porque: 'la verificación fue estática; las suites las ejecuta el Nivel 2 de la CI (o `--modo ejecutar`)' }] : []),
    ...correcciones.filter((c) => c.estado === 'ACEPTADA').map((c) => ({ tipo: 'correccion-sin-aplicar', que: c.clave, porque: 'aceptada y no aplicada' })),
  ];

  const resultado = verificacion.resultado === 'PASA' && !necesitaHumanos.length ? 'SIN_PENDIENTES_HUMANOS' : verificacion.resultado === 'PASA' ? 'PASA_CON_PENDIENTES' : verificacion.resultado;
  return {
    contrato: CONTRATO_INFORME, resultado, verificacion: { modo: verificacion.modo, ejecucion: verificacion.ejecucion, resultado: verificacion.resultado },
    ejecutadas: { dominios: verificacion.dominios.length, suites: ejecutadas.length, suitesDelMapa: suites.length, huellasYMapa: { problemas: verificacion.problemas.length } },
    fallidas, causas: fallidas.map((f) => ({ suite: f.suite, causa: f.causa, clase: f.clase })),
    correcciones, pruebasPosteriores: correcciones.filter((c) => c.pruebas.length).map((c) => ({ clave: c.clave, pruebas: c.pruebas })),
    pendientes, reversibilidad: correcciones.map((c) => ({ clave: c.clave, reversible: c.reversible, estado: c.estado })), necesitaHumanos,
    registro: { entradas: registro.length, finales: registro.filter((e) => ESTADOS_FINALES.includes(e.estado)).length },
  };
};

/** Pura: el informe como Markdown, con las ocho preguntas por su nombre. */
export const aMarkdown = (i) => {
  const l = [`# Guardian · informe de autoverificación — ${i.resultado}`, ''];
  l.push('## 1 · Qué comprobaciones se ejecutaron', `- Verificación **${i.verificacion.modo}** (${i.verificacion.ejecucion === 'ejecutada' ? 'suites ejecutadas' : '**sin ejecutar suites**'}): ${i.ejecutadas.dominios} dominios, ${i.ejecutadas.suitesDelMapa} suites en el mapa, ${i.ejecutadas.suites} ejecutadas; ${i.ejecutadas.huellasYMapa.problemas} problema(s) del mapa/huellas.`, '');
  l.push('## 2 · Qué falló', ...(i.fallidas.length ? i.fallidas.map((f) => `- **${f.suite}** (${f.dominio}) — ${f.estado}${f.clase ? `, ${f.clase}` : ''}`) : ['- Ninguna suite.']), '');
  l.push('## 3 · Causa', ...(i.causas.length ? i.causas.map((c) => `- ${c.suite}: ${c.causa}`) : ['- Nada que explicar.']), '');
  l.push('## 4 · Qué corrigió el Guardian', ...(i.correcciones.length ? i.correcciones.map((c) => `- [${c.corrector}] **${c.estado}** ${c.archivos.join(', ') || 'functions/lib'} — ${c.causa || c.motivo || ''}`) : ['- Nada: no hay correcciones en el registro.']), '');
  l.push('## 5 · Qué pruebas corrieron después', ...(i.pruebasPosteriores.length ? i.pruebasPosteriores.map((p) => `- ${p.clave}: ${p.pruebas.map((x) => `${x.ok ? '✔' : '✘'} ${x.nombre}`).join(' · ')}`) : ['- Ninguna corrección que verificar.']), '');
  l.push('## 6 · Qué sigue pendiente', ...(i.pendientes.length ? i.pendientes.map((p) => `- ${p.que} — ${p.porque}`) : ['- Nada.']), '');
  l.push('## 7 · ¿Es reversible?', ...(i.reversibilidad.length ? i.reversibilidad.map((r) => `- ${r.clave} (${r.estado}): ${r.reversible ? 'sí, con --revertir' : 'no aplica (artefacto derivado o no se aplicó)'}`) : ['- No hay correcciones.']), '');
  l.push('## 8 · Qué necesita a una persona', ...(i.necesitaHumanos.length ? i.necesitaHumanos.map((h) => `- ${h.que} — ${h.porque}`) : ['- Nada por ahora.']), '');
  return l.join('\n');
};

const principal = async () => {
  const args = process.argv.slice(2);
  const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
  const raiz = path.resolve(valor('--raiz') || process.env.GUARDIAN_RAIZ || REPO);
  try {
    const verificacion = valor('--verificacion') ? JSON.parse(fs.readFileSync(valor('--verificacion'), 'utf8')) : await verificar({ raiz, modo: 'estatico' });
    const registro = leerRegistro(path.resolve(valor('--estado') || estadoPorDefecto(raiz)));
    const informe = construirInforme({ verificacion, registro });
    const md = aMarkdown(informe);
    if (valor('--json')) fs.writeFileSync(valor('--json'), `${JSON.stringify(informe, null, 2)}\n`);
    if (valor('--md')) fs.writeFileSync(valor('--md'), md);
    console.log(md);
    process.exitCode = informe.resultado === 'PASA_CON_PENDIENTES' || informe.resultado === 'SIN_PENDIENTES_HUMANOS' ? 0 : (verificacion.codigo || 1);
  } catch (e) {
    console.error(`✘ Guardian · informe: FALLO — ${e.message}`);
    process.exitCode = 3;
  }
};
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await principal();
