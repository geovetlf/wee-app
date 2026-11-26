/*
 * CONVERGENCIA experiencia de Filmmaker <-> engine (agente convergente, 2026-11-18). Comprobaciones ESTATICAS y ligeras (leen fuentes, no ejecutan nada pesado).
 *   A · espejos de limites: lo que la pantalla acota == lo que el servidor rechaza (si el servidor cambia, esto avisa).
 *   B · todo tipo de la experiencia o se mapea al contrato o esta cerrado/plantilla; y su formato lo genera el servidor.
 *   C · CABOS SUELTOS conocidos (no fallan la cadena; con FILMMAKER_STRICT=1 si): se imprimen para que nadie los olvide.
 * node test/filmmaker-convergencia.test.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (r) => readFileSync(join(raiz, r), 'utf8');
let fallos = 0; let n = 0; const cabos = [];
const check = (nombre, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ' — ' + extra : '')); if (!cond) fallos++; };
const cabo = (id, texto) => { cabos.push(`${id} ${texto}`); };
const num = (src, re) => { const m = src.match(re); return m ? Number(m[1]) : NaN; };

console.log('── A · Espejos de límites ──');
const plano = leer('functions/src/creator/plano.ts');
const maxServidor = num(plano, /duracionMaximaSec:\s*(\d+)/);
const minServidor = num(plano, /duracionMinimaSec:\s*(\d+)/);
const tandas = leer('utils/tandasDeFilmmaker.ts');
const orq = leer('utils/filmmakerOrquestacion.ts');
check('A1) TOPE_DE_CUADRO (pantalla) == duracionMaximaSec del servidor', num(tandas, /TOPE_DE_CUADRO\s*=\s*(\d+)/) === maxServidor, `pantalla ${num(tandas, /TOPE_DE_CUADRO\s*=\s*(\d+)/)} · servidor ${maxServidor}`);
check('A2) AJUSTE_DE_TOMA de la orquestación == servidor (4–15)', num(orq, /minimoSeg:\s*(\d+)/) === minServidor && num(orq, /maximoSeg:\s*(\d+)/) === maxServidor);
check('A3) montaje final 60 planos / 600 s en la pantalla', num(tandas, /planos:\s*(\d+),\s*segundos/) === 60 && num(tandas, /segundos:\s*(\d+)\s*\}\s*as const/) === 600);
const proporciones = (plano.match(/proporciones:\s*Object\.freeze\(\[([^\]]*)\]/) ?? [, ''])[1].match(/\d+:\d+/g) ?? [];

console.log('── B · Tipos y formatos ──');
const crear = leer('constants/filmmakerCrear.ts');
const tipos = [...crear.matchAll(/\{ id: '(\w+)', clave:[^}]*?estado: '(\w+)'(?:[^}]*?formato: '([\d:]+)')?/g)].map((m) => ({ id: m[1], estado: m[2], formato: m[3] }));
const mapa = new Set([...orq.match(/TIPO_DE_PRODUCCION[^=]*=\s*Object\.freeze\(\{([^}]*)\}/)[1].matchAll(/(\w+):\s*'/g)].map((m) => m[1]));
check('B1) hay tipos leidos', tipos.length >= 3, tipos.map((t) => t.id).join(','));
for (const t of tipos) check(`B2) tipo «${t.id}» (${t.estado}): se mapea al contrato o esta cerrado`, mapa.has(t.id) || t.estado === 'cerrada', mapa.has(t.id) ? 'mapeado' : 'cerrado');
check('B3) Videoclip no esta en Filmmaker', !tipos.some((t) => t.id === 'clip') && !mapa.has('clip'));
for (const t of tipos.filter((x) => x.estado === 'habilitada' && x.formato)) {
  const ok = proporciones.includes(t.formato);
  if (!ok) cabo('FORMATO', `el tipo «${t.id}» arranca en ${t.formato} y el servidor solo genera ${proporciones.join(' ')} (C66): la toma se rechaza con aspect_ratio_not_supported`);
}

console.log('── C · Cabos sueltos conocidos ──');
const recorrer = (d, salida = []) => { for (const f of readdirSync(join(raiz, d))) { if (f === 'node_modules') continue; const r = `${d}/${f}`; (statSync(join(raiz, r)).isDirectory() ? recorrer(r, salida) : salida.push(r)); } return salida; };
const pantallas = ['screens', 'components/filmmaker'].flatMap((d) => recorrer(d)).filter((f) => /\.tsx$/.test(f));
const usa = (pat) => pantallas.some((f) => pat.test(leer(f)));
if (!usa(/useProduccionDeFilmmaker/)) cabo('CABLEADO', 'ninguna pantalla usa useProduccionDeFilmmaker: Universo/Capítulos/Storyboard viven solo en estado local y no llegan a `productions`');
if (!usa(/useTomaDePlano/) || !pantallas.filter((f) => f.startsWith('components/filmmaker')).some((f) => /useTomaDePlano/.test(leer(f)))) cabo('TOMAS', 'la ficha del cuadro / la cola de Producción no piden la toma (useTomaDePlano solo lo usa ProductionScreen)');
const prodAbierta = /PRODUCCION_ABIERTA\s*=\s*true/.test(leer('constants/filmmakerCamara.ts'));
if (!prodAbierta) cabo('PUERTA', 'PRODUCCION_ABIERTA=false: «Producir tanda» sale cerrado (no se simula)');
if (!existsSync(join(raiz, 'functions/src/creator/lotes.ts'))) cabo('LOTES', 'no hay creator/lotes.ts en esta rama (solo filmmaker/core): producir una tanda = una toma por plano, sin lote');
if (!existsSync(join(raiz, 'functions/src/creator/render.ts'))) cabo('MONTAJE', 'no hay render/montaje final en esta rama (solo filmmaker/core): «Juntar» y «Salida» no pueden ejecutarse');
if (!/references\??:/.test(leer('services/filmmakerService.ts'))) cabo('REFERENCIAS', 'createProduction no tiene campo de referencias y plano.ts rechaza cualquier referencia (references_not_supported): la imagen de referencia no llega al engine');
if (/maxima|duracionMaximaSec:\s*15/.test(plano)) cabo('TOPE15', 'plano.ts fija 15 s por plano aunque Seedance 2.5 admite 30 (D7)');
for (const c of cabos) console.log('⚠ CABO SUELTO · ' + c);
console.log(`\n${cabos.length} cabo(s) suelto(s) conocidos (informe vivo: AUDITORIA-ENGINE-VS-EXPERIENCIA.md).`);
if (process.env.FILMMAKER_STRICT === '1' && cabos.length) fallos++;
console.log(fallos ? `\n${fallos} FALLO(S)` : `\nTodo en verde (${n}).`);
process.exit(fallos ? 1 : 0);
