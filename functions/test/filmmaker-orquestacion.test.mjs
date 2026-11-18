/*
 * ORQUESTACIÓN DEL CLIENTE de Weë Filmmaker (experiencia → contrato del engine). node test/filmmaker-orquestacion.test.mjs
 *   A · borrador: tipo/estilo/idea/universo/tandas/cuadros → producción válida; ejemplos y voces NO viajan.  B · estados.  C · sincronizar solo cambia lo cambiado.
 */
import { crearCargador } from './filmmaker-cliente.mjs';
let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const cargar = crearCargador({ dobles: { 'firebase/functions': { httpsCallable: () => async () => ({ data: {} }) }, '../config/firebase': { functions: {} } } });
const O = cargar('utils/filmmakerOrquestacion.ts');
const D = cargar('services/filmmaker/dominio.ts');
const S = cargar('services/filmmakerOrquestacionService.ts');
const T = cargar('utils/tandasDeFilmmaker.ts');

let tandas = T.anadirTanda(T.tandasVacias(), 180, 'Cap 1'); const tid = tandas.tandas[0].id;
tandas = T.anadirCuadro(tandas, tid, 'Un jinete cruza el desierto').estado;
const c1 = tandas.tandas[0].cuadros[0].id;
tandas = T.editarCuadro(tandas, tid, c1, { hablante: 'narrator', duracion: 6, creativo: { 'movement.type': 'orbit', 'shot.type': 'wide' } });
const universo = { siguiente: 3, aprobado: true, elementos: [
  { id: 'e1', tipo: 'character', nombre: 'Jay', linea: 'Vaquero futurista', grupo: 'main', voz: 'warm' },
  { id: 'e2', tipo: 'place', nombre: 'Desierto', linea: '', grupo: 'other', voz: 'auto' },
  { id: 'e3', tipo: 'character', nombre: 'Muestra', linea: '', grupo: 'main', voz: 'auto', ejemplo: true }] };
const exp = { productionId: 'prod_orquest_1', idea: 'Un western futurista en Marte', tipo: 'short', estilo: 'scifi', aspectRatio: '16:9', universo, tandas };

console.log('── A · Borrador ──');
const r = O.produccionDesdeLaExperiencia(exp);
const v = D.validarProduccion(r.production, { stage: 'draft' });
check('A1) la producción cumple el contrato', v.ok !== false && !(v.issues ?? v.problems ?? []).some((x) => x.severity === 'error'), JSON.stringify(v.issues ?? v.problems ?? []).slice(0, 200));
check('A2) tipo y estilo van a intent y a la dirección creativa', r.production.intent.productionType === 'short_film' && r.production.intent.style === 'scifi' && r.production.creativeDirection.visualStyle === 'scifi');
check('A3) personaje y lugar entran; el ejemplo NO', r.production.characters.length === 1 && r.production.locations.length === 1 && r.omisiones.some((o) => o.motivo === 'ejemplo'));
check('A4) tanda = escena, cuadro = plano con duración', r.production.scenes.length === 1 && r.production.scenes[0].shots[0].durationSec === 6);
check('A5) la cámara del cuadro llega por operaciones de F1-A', r.production.scenes[0].shots[0].visual?.creative !== undefined);
check('A6) el narrador es `narration`; no bloquea la toma', r.production.scenes[0].shots[0].dialogue?.[0].kind === 'narration');
check('A7) la voz elegida NO se simula: queda como «sin destino»', r.vozSinDestino.some((x) => x.ownerId === 'e1' && x.voz === 'warm'));
check('A8) los ids cumplen 4–160', [r.production.scenes[0].id, r.production.scenes[0].shots[0].id, r.production.characters[0].id].every((i) => /^[A-Za-z0-9_.:-]{4,160}$/.test(i)));
const hab = O.produccionDesdeLaExperiencia({ ...exp, tandas: T.editarCuadro(tandas, tid, c1, { hablante: 'e1' }) });
check('A9) personaje que habla = `dialogue` por defecto (a cámara: contrato 6 lo rechaza hoy) y `voiceover` si se pide', hab.production.scenes[0].shots[0].dialogue?.[0].kind === 'dialogue'
  && O.produccionDesdeLaExperiencia({ ...exp, hablaComo: 'voiceover', tandas: T.editarCuadro(tandas, tid, c1, { hablante: 'e1' }) }).production.scenes[0].shots[0].dialogue?.[0].kind === 'voiceover');
check('A10) tipo sin equivalente (serie) se dice, no se inventa', O.produccionDesdeLaExperiencia({ ...exp, tipo: 'series' }).omisiones.some((o) => o.motivo === 'tipo_sin_equivalente'));

check('A11) Videoclip ya no es de Filmmaker: `clip` no se mapea a `music_video`', O.TIPO_DE_PRODUCCION.clip === undefined && !Object.values(O.TIPO_DE_PRODUCCION).includes('music_video')
  && O.produccionDesdeLaExperiencia({ ...exp, tipo: 'clip' }).omisiones.some((o) => o.motivo === 'tipo_sin_equivalente'));

console.log('── B · Estados ──');
check('B1) toma en marcha → en_proceso → tanda «producing»', O.estadoDeCuadro({ fase: 'en_proceso' }) === 'en_proceso' && O.produccionDeTanda(['lista', 'en_proceso']) === 'producing');
check('B2) todos listos → «done»; alguno fallido sin nada en marcha → «error»; nada → sin estado', O.produccionDeTanda(['lista', 'lista']) === 'done' && O.produccionDeTanda(['lista', 'fallida']) === 'error' && O.produccionDeTanda(['sin_toma']) === undefined);
check('B3) vídeo en el plano manda: lista', O.estadoDeCuadro({ fase: 'elige_calidad', enElPlano: { assetId: 'a' } }) === 'lista');
check('B4) duración fuera de toma: <4 s «corta», >30 s «larga»', O.duracionFueraDeToma(3) === 'corta' && O.duracionFueraDeToma(35) === 'larga' && O.duracionFueraDeToma(6) === null);

console.log('── C · Sincronizar ──');
{
  const llamadas = [];
  const base = O.produccionDesdeLaExperiencia(exp).production;
  const svc = { createProduction: async (p) => { llamadas.push(['create', p]); return { ok: true, valor: { created: true, produccion: { productionId: p.productionId, revision: 0, status: 'active', production: p.production } } } },
    applyProductionOperations: async (l) => { llamadas.push(['apply', l]); return { ok: true, valor: { applied: l.operations.length, produccion: { productionId: l.productionId, revision: 1, status: 'active', production: base } } } } };
  const orq = S.crearOrquestacion(svc);
  const creada = await orq.crear({ ...exp, productionId: undefined });
  check('C1) crear manda el borrador a `productions.create`', creada.ok && llamadas[0][0] === 'create' && llamadas[0][1].production.scenes.length === 1);
  const igual = await orq.sincronizar({ productionId: 'prod_orquest_1', revision: 0, status: 'active', production: base }, exp);
  check('C2) sin cambios no se manda nada (y no se pierden tomas)', igual.ok && igual.valor.applied === 0 && llamadas.length === 1);
  const cambiado = await orq.sincronizar({ productionId: 'prod_orquest_1', revision: 0, status: 'active', production: base }, { ...exp, tandas: T.editarCuadro(tandas, tid, c1, { texto: 'Otro texto' }) });
  const ops = llamadas[1]?.[1].operations ?? [];
  check('C3) una escena cambiada se quita y se vuelve a poner en UN lote con la revisión esperada', cambiado.ok && ops.map((o) => o.op).join() === 'remove_scene,add_scene' && llamadas[1][1].expectedRevision === 0);
}

console.log('── D · Reabrir: lo guardado vuelve a la experiencia ──');
{
  const aprobada = { ...tandas, tandas: tandas.tandas.map((x) => ({ ...x, aprobada: true, almacen: true })) };
  const g = O.produccionDesdeLaExperiencia({ ...exp, tandas: aprobada });
  const vuelta = O.tandasDesdeLaProduccion(g.production);
  const c = vuelta.tandas[0]?.cuadros[0];
  check('D1) el capítulo vuelve con su aprobación y su almacén', vuelta.tandas.length === 1 && vuelta.tandas[0].aprobada === true && vuelta.tandas[0].almacen === true && vuelta.tandas[0].id === tid);
  check('D2) el cuadro vuelve con texto, duración, narrador y su cámara', c && c.id === c1 && c.texto === 'Un jinete cruza el desierto' && c.duracion === 6 && c.hablante === 'narrator' && c.creativo['shot.type'] === 'wide' && c.creativo['movement.type'] === 'orbit', JSON.stringify(c));
  const u = O.universoDesdeLaProduccion(g.production);
  check('D3) el universo vuelve sin ejemplos, con su origen y ids sin prefijo', u.elementos.length === 2 && u.elementos[0].id === 'e1' && u.elementos[0].nombre === 'Jay' && !u.elementos.some((e) => e.ejemplo));
  check('D4) el tipo del servidor vuelve a su tipo de la experiencia', O.tipoDeLaExperiencia('short_film') === 'short' && O.tipoDeLaExperiencia('cinematic') === 'film' && O.tipoDeLaExperiencia('music_video') === null);
}


console.log('── E · Voz propia del cuadro ──');
check('E1) una voz de ejemplo NO viaja (queda sin destino y se dice); "auto" y vacío tampoco', O.vozDeLinea('ej_es_aurora') === null && O.vozDeLinea('auto') === null && O.vozDeLinea(null) === null);
{
  const t2 = T.editarCuadro(tandas, tid, c1, { voz: 'ej_es_aurora' });
  const g = O.produccionDesdeLaExperiencia({ ...exp, tandas: t2 });
  check('E2) la voz de ejemplo del cuadro figura como voz sin destino', g.vozSinDestino.some((x) => x.ownerId === c1));
  const prod = JSON.parse(JSON.stringify(g.production)); prod.scenes[0].shots[0].dialogue[0].voice = { referenceId: 'real_1', description: 'x', language: 'es' };
  check('E3) al reabrir, la voz propia guardada en la línea vuelve al cuadro', O.tandasDesdeLaProduccion(prod).tandas[0].cuadros[0].voz === 'real_1');
}

console.log(failures ? `\n${failures} FALLO(S)` : `\nTodo en verde (${n}).`);
process.exit(failures ? 1 : 0);
