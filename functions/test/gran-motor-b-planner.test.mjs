/*
 * GRAN MOTOR · PAQUETE B · PLANNER Y WEË BRAIN (Core frente a Legacy)
 *
 * ── Qué fija esta suite ─────────────────────────────────────────────────────
 *
 * No añade comportamiento: FIJA la semántica que ya tenían el Planner y Brain
 * ANTES de corregir nada, y prueba los dos defectos que sí se corrigieron.
 *
 *   A · LEGACY es coherente consigo mismo en TODAS sus formas. Cada plantilla
 *       de `creator/templates.ts`, con todas las combinaciones de respuestas:
 *       ids únicos, dependencias solo hacia atrás, capacidades del catálogo.
 *   B · El PLANNER del Core: generación frente a transformación, paso repetido
 *       sin fundirse, reutilización de un resultado intermedio solo cuando se
 *       declara, validación del plan ANTES de ejecutar (claves duplicadas,
 *       referencias hacia delante, cantidades imposibles, variantes inventadas),
 *       determinismo.
 *   C · EQUIVALENCIA Core/Legacy de las 11 plantillas por el puente real
 *       (`pasosParaElCore` → `crearPlannerDeWee`): qué plan sale, cuántos pasos,
 *       en qué orden, con qué dependencias, y QUÉ clase de diferencias quedan
 *       (solo las justificadas y las abiertas por su fase).
 *   D · WEË BRAIN: el `catch` del Core Brain traga el error del pensador POR
 *       DISEÑO (no se filtra mensaje de proveedor); el reembolso seguro se
 *       decide en `creator/brain.ts` con lo que el pensador GUARDÓ; y los dos
 *       defectos corregidos: respuesta vacía tras quitar la marca (B-1) y marca
 *       en mitad del texto que pegaba las palabras (B-2).
 *
 * Sin red, sin proveedor, sin Credits, sin Firestore. Usa el compilado:
 * `npm run build` antes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const src = (p) => fs.readFileSync(path.resolve(here, '../src/' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '  ✔ ' : '  ✘ ') + n + ') ' + nombre + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

let peticiones = 0;
globalThis.fetch = async () => { peticiones++; throw new Error('esta suite no sale a la red'); };

const core = lib('core/index.js');
const { TEMPLATES } = lib('creator/templates.js');
const { pasosParaElCore } = lib('creator/necesidades.js');
const { compararPlanes } = lib('creator/paridad.js');
const { crearPlannerDeWee } = lib('planner/index.js');
const { crearBrainDeWee } = lib('brain/index.js');
const { disponibilidadDelCatalogo } = lib('creator/sombra.js');
const { CAPABILITY_CATALOG } = core;

const planner = crearPlannerDeWee({ availability: disponibilidadDelCatalogo(), tracer: { record() {} }, now: () => 1 });
const TRAZA = { traceId: 'trace_0001', requestId: 'req_0001', userId: 'usuario1' };
const U = (o = {}) => ({
  intent: 'creation', confidence: 'high', goal: 'g', inputs: { text: 'g', attachments: [] },
  references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [], ...o,
});
const planificar = (u, extra = {}) => planner.planificar({ contract: core.PLANNER_CONTRACT_VERSION, trace: TRAZA, understanding: u, ...extra });
const FOTO = { kind: 'image', url: 'https://ejemplo.invalid/foto.png' };

/* Todas las combinaciones de respuestas de una plantilla, respetando `when`. */
const combinaciones = (preguntas, rec = {}, out = []) => {
  const pend = preguntas.filter((q) => !q.when || q.when(rec)).find((q) => !(q.id in rec));
  if (!pend) { out.push({ ...rec }); return out; }
  for (const o of pend.options) combinaciones(preguntas, { ...rec, [pend.id]: o.id }, out);
  return out;
};

const EXPERIENCIAS = Object.keys(TEMPLATES).sort();
console.log('\n── A · Legacy es coherente consigo mismo (todas las formas de las 11 plantillas) ──');
check('hay 11 plantillas, las del servidor', EXPERIENCIAS.length === 11, EXPERIENCIAS.join(','));

const CAPS_DEL_CATALOGO = new Set(CAPABILITY_CATALOG.map((c) => c.id));
const formas = {}; // experiencia → [{ rec, plan }]
for (const exp of EXPERIENCIAS) {
  const t = TEMPLATES[exp];
  const vistas = new Set();
  formas[exp] = [];
  const problemas = [];
  for (const rec of combinaciones(t.questions)) {
    let plan;
    try { plan = t.buildPlan(t.defaultGoal, rec); } catch (e) { problemas.push('buildPlan lanza: ' + e.message); continue; }
    const ids = plan.steps.map((s) => s.id);
    if (new Set(ids).size !== ids.length) problemas.push('ids duplicados ' + JSON.stringify(rec));
    plan.steps.forEach((s, i) => {
      if (!CAPS_DEL_CATALOGO.has(s.capability)) problemas.push(`capacidad fuera del catálogo ${s.capability}`);
      for (const d of s.dependsOn ?? []) {
        const j = ids.indexOf(d);
        if (j < 0) problemas.push(`dependencia desconocida ${s.id}->${d}`);
        else if (j >= i) problemas.push(`dependencia hacia delante ${s.id}->${d}`);
      }
    });
    const forma = JSON.stringify(plan.steps.map((s) => [s.id, s.capability, s.dependsOn, s.input]));
    if (vistas.has(forma)) continue;
    vistas.add(forma);
    formas[exp].push({ rec, plan });
  }
  check(`${exp}: ${formas[exp].length} formas distintas, todas con ids únicos, dependencias hacia atrás y capacidades del catálogo`,
    problemas.length === 0 && formas[exp].length > 0, problemas.slice(0, 3).join(' · '));
}

console.log('\n── B · El Planner del Core: semántica fijada ──');
{
  const gen = await planificar(U({ capability: 'image.generate', capabilities: ['image.generate'] }));
  check('GENERACIÓN: image.generate sin foto es un plan de un paso, sin pedir material',
    gen.status === 'ready' && gen.plan.steps.length === 1 && !gen.plan.steps[0].uses && !gen.plan.steps[0].dependsOn);

  const transSinFoto = await planificar(U({ steps: [{ key: 'a', capability: 'image.edit' }] }));
  check('TRANSFORMACIÓN declarada, sin la foto: se PREGUNTA por el material (material:image); no se fabrica',
    transSinFoto.status === 'needs_clarification' && transSinFoto.clarification.missing.includes('material:image') && !transSinFoto.plan,
    JSON.stringify(transSinFoto.clarification));
  const transConFoto = await planificar(U({ steps: [{ key: 'a', capability: 'image.edit' }], inputs: { text: 'g', attachments: [FOTO] } }));
  check('TRANSFORMACIÓN declarada con la foto: un solo paso que USA el recurso 0 y no depende de nadie',
    transConFoto.status === 'ready' && transConFoto.plan.steps.length === 1
    && JSON.stringify(transConFoto.plan.steps[0].uses) === '[0]' && !transConFoto.plan.steps[0].dependsOn);

  const sinMaterial = await planificar(U({ capability: 'vision.describe', capabilities: ['vision.describe'] }));
  check('lo que SOLO trabaja material ajeno (describir, escalar, montar) no se completa inventando el material: pregunta',
    sinMaterial.status === 'needs_clarification' && sinMaterial.clarification.missing.includes('material:image'), JSON.stringify(sinMaterial.clarification));
  const dirigible = await planificar(U({ capability: 'video.image_to_video', capabilities: ['video.image_to_video'] }));
  check('lo que se puede DIRIGIR con palabras (animar «una imagen de…») se completa con su generación y depende de ella',
    dirigible.status === 'ready' && dirigible.plan.capabilities.join(',') === 'image.generate,video.image_to_video'
    && dirigible.plan.steps[1].dependsOn?.[0] === dirigible.plan.steps[0].id);

  const dosTextos = await planificar(U({ capability: 'text.generate', capabilities: ['text.generate', 'text.search', 'text.generate'] }));
  check('el MISMO paso repetido no se funde: dos text.generate con uno en medio son TRES pasos (el conjunto sigue en dos)',
    dosTextos.status === 'ready' && dosTextos.plan.steps.length === 3 && dosTextos.plan.capabilities.length === 2);
  check('…y ninguno depende de sí mismo ni de otro del mismo grafo (nadie declaró nada)',
    dosTextos.plan.steps.every((s) => !s.dependsOn));

  const reuso = await planificar(U({ steps: [
    { key: 'a', capability: 'image.generate' }, { key: 'b', capability: 'image.generate' },
    { key: 'c', capability: 'image.edit', needs: [{ from: 'upstream', modality: 'image', stepKey: 'a' }] },
  ] }));
  check('REUTILIZACIÓN: el resultado intermedio se usa SOLO donde se declaró (c depende de a, no de b ni de nadie más)',
    reuso.status === 'ready' && reuso.plan.steps[2].dependsOn?.length === 1 && reuso.plan.steps[2].dependsOn[0] === reuso.plan.steps[0].id
    && !reuso.plan.steps[1].dependsOn);

  const dup = await planificar(U({ steps: [{ key: 'a', capability: 'text.generate' }, { key: 'a', capability: 'text.generate' }] }));
  check('VALIDACIÓN: dos pasos con la misma clave se rechazan antes de planificar (duplicate_step_key)',
    dup.status === 'invalid' && dup.error.details.reason === 'duplicate_step_key' && !dup.plan);
  const alFrente = await planificar(U({ steps: [
    { key: 'a', capability: 'image.generate', needs: [{ from: 'upstream', modality: 'text', stepKey: 'b' }] },
    { key: 'b', capability: 'text.generate' },
  ] }));
  check('VALIDACIÓN: una referencia hacia un paso POSTERIOR se rechaza (aquí mueren los ciclos)', alFrente.status === 'invalid' && alFrente.error.details.reason === 'unknown_step_key');
  const consigo = await planificar(U({ steps: [{ key: 'a', capability: 'text.generate', needs: [{ from: 'upstream', modality: 'text', stepKey: 'a' }] }] }));
  check('VALIDACIÓN: un paso que depende de sí mismo se rechaza', consigo.status === 'invalid');
  const incoherente = await planificar(U({ steps: [
    { key: 'a', capability: 'text.generate' },
    { key: 'b', capability: 'image.edit', needs: [{ from: 'upstream', modality: 'image', stepKey: 'a' }] },
  ] }));
  check('VALIDACIÓN: pedir de un paso una modalidad que NO produce se rechaza (modality_mismatch)',
    incoherente.status === 'invalid' && incoherente.error.details.reason === 'modality_mismatch');
  const cinco = await planificar(U({ steps: [{ key: 'a', capability: 'image.generate', count: 5 }] }));
  const fraccion = await planificar(U({ steps: [{ key: 'a', capability: 'image.generate', count: 2.5 }] }));
  const tres = await planificar(U({ steps: [{ key: 'a', capability: 'image.generate', count: 3 }] }));
  check('VALIDACIÓN: una cantidad imposible (5, 2,5) se rechaza y no se recorta; 3 pasa y viaja en input.count',
    cinco.status === 'invalid' && fraccion.status === 'invalid' && tres.status === 'ready' && tres.plan.steps[0].input?.count === 3);
  const variante = await planificar(U({ steps: [{ key: 'a', capability: 'image.generate', input: { kind: 'inventada' } }] }));
  check('VALIDACIÓN: una variante que su capacidad no declara se rechaza (unknown_variant)', variante.status === 'invalid' && variante.error.details.reason === 'unknown_variant');
  const proveedor = await planificar(U({ steps: [{ key: 'a', capability: 'text.generate', providerId: 'x' }] }));
  check('VALIDACIÓN: elegir proveedor/modelo desde el entendimiento se rechaza (lo elige el Router)', proveedor.status === 'invalid' && proveedor.error.details.reason === 'implementation_not_allowed');

  const faltaDato = await planificar(U({ missing: ['formato'] }));
  check('lo que Brain no supo, el Planner no lo inventa: pregunta', faltaDato.status === 'needs_clarification' && !faltaDato.plan);
  const charla = await planificar(U({ intent: 'conversation', needsPlanning: false }));
  check('una charla sin capacidad no es un fallo: «impossible», sin plan', charla.status === 'impossible' && !charla.plan);
  const musica = await planificar(U({ capability: 'music.generate', capabilities: ['music.generate'] }));
  check('una capacidad que nadie sirve hoy (music.generate) sale unsupported con la lista, no se planifica a medias',
    musica.status === 'unsupported' && musica.unavailable.includes('music.generate') && !musica.plan);

  const declarado = await planificar(U({ steps: [
    { key: 'voz', capability: 'voice.tts' }, { key: 'texto', capability: 'text.generate' },
  ] }));
  check('el orden DECLARADO manda: no se reordena por el catálogo', declarado.status === 'ready'
    && declarado.plan.steps.map((s) => s.capability).join(',') === 'voice.tts,text.generate');
  const deducido = await planificar(U({ capabilities: ['video.generate', 'voice.tts', 'text.generate'] }));
  check('sin pasos declarados, el plan conserva el orden pedido cuando el catálogo lo deja libre',
    deducido.status === 'ready' && deducido.plan.steps.map((s) => s.capability).join(',') === 'video.generate,voice.tts,text.generate');

  const a = JSON.stringify((await planificar(U({ steps: [{ key: 'a', capability: 'image.generate', count: 2 }] }))).plan);
  const b = JSON.stringify((await planificar(U({ steps: [{ key: 'a', capability: 'image.generate', count: 2 }] }))).plan);
  check('DETERMINISTA: el mismo entendimiento da el mismo plan, con el mismo id', a === b && a.includes('"plan_req_0001"'));
  const entrada = U({ steps: [{ key: 'a', capability: 'image.generate' }], inputs: { text: 'g', attachments: [{ ...FOTO }] } });
  const antes = JSON.stringify(entrada);
  const salida = await planificar(entrada);
  const intacto = JSON.stringify(entrada) === antes;
  entrada.inputs.attachments[0].url = 'https://otra.invalid';
  check('el plan no comparte objetos con quien llamó (cambiar la entrada después no cambia el plan) y la entrada no sale mutada',
    intacto && salida.plan.references[0].url === FOTO.url);
}

console.log('\n── C · Equivalencia Core / Legacy de las 11 plantillas, por el puente real ──');
const ESPERADO = {
  /* experiencia: [formas, ready, needs_clarification(material:image), unsupported] */
  design:   [104, 104, 0, 0],
  studio:   [65, 60, 5, 0],
  photo:    [45, 5, 40, 0],
  writer:   [44, 44, 0, 0],
  music:    [70, 9, 0, 61],
  beauty:   [42, 0, 42, 0],
  chef:     [82, 60, 22, 0],
  home:     [94, 20, 74, 0],
  business: [24, 24, 0, 0],
  travel:   [32, 32, 0, 0],
  brain:    [5, 5, 0, 0],
};
check('toda experiencia está en la tabla de equivalencia (una nueva obliga a clasificarla)',
  JSON.stringify(Object.keys(ESPERADO).sort()) === JSON.stringify(EXPERIENCIAS));

const CLASES_ADMITIDAS = new Set(['EXACT_MATCH', 'SEMANTICALLY_EQUIVALENT', 'CORE_ADDS_INFORMATION', 'LEGACY_ONLY_INFORMATION']);
/* Lo único que Legacy tiene y el Core no, normalizado (los nombres de paso salen). */
const LEGACY_SOLO_ADMITIDO = new Map([
  ['explainToUser', 'promesa al usuario — la frase que se le muestra a la persona; es producto, no plan'],
  ['purpose', 'frase para la persona — el Core pone la del catálogo; es texto de interfaz'],
  ['voice', 'G15 — la voz elegida no tiene sitio en el contrato del Core todavía (fase abierta)'],
  ['focus', 'G14 — el foco de Weë Home no tiene sitio en el contrato del Core todavía (fase abierta)'],
  ['dependsOn', 'arista que solo ordenaba — el Core no convierte en dependencia lo que nadie lee'],
]);
const resumen = {};
const hallazgos = { claseFuera: [], forma: [], dependenciaNueva: [], legacySoloNuevo: new Set(), noListoSinMotivo: [] };
for (const exp of EXPERIENCIAS) {
  const cuenta = { formas: formas[exp].length, ready: 0, nc: 0, unsupported: 0, otros: 0 };
  for (const { plan } of formas[exp]) {
    const puente = pasosParaElCore(plan.steps);
    if (puente.rechazos.length || !puente.steps.length) { cuenta.otros++; continue; }
    const u = U({
      goal: TEMPLATES[exp].defaultGoal, capability: puente.steps[0].capability,
      capabilities: [...new Set(puente.steps.map((s) => s.capability))], steps: puente.steps,
      inputs: { text: TEMPLATES[exp].defaultGoal, attachments: [] }, workplace: { id: 'wee', experienceId: exp },
    });
    const r = await planificar(u);
    if (r.status === 'ready') {
      cuenta.ready++;
      const dif = compararPlanes(plan, r.plan, r.status, 'puente');
      for (const d of dif) {
        if (!CLASES_ADMITIDAS.has(d.clase)) hallazgos.claseFuera.push(`${exp}:${d.clase}:${d.campo}`);
        if (d.clase === 'LEGACY_ONLY_INFORMATION') {
          const campo = d.campo.replace(/^steps\[[^\]]*\]\./, '');
          if (!LEGACY_SOLO_ADMITIDO.has(campo)) hallazgos.legacySoloNuevo.add(`${exp}:${d.campo}`);
        }
      }
      if (r.plan.steps.length !== plan.steps.length) hallazgos.forma.push(`${exp}: ${plan.steps.length} pasos en Legacy y ${r.plan.steps.length} en el Core`);
      else if (r.plan.steps.map((s) => s.capability).join() !== plan.steps.map((s) => s.capability).join()) hallazgos.forma.push(`${exp}: otro orden de capacidades`);
      else {
        /* Posición a posición: lo que el Core hace depender, ya dependía en Legacy (nunca inventa una arista). */
        r.plan.steps.forEach((s, i) => {
          for (const d of s.dependsOn ?? []) {
            const j = r.plan.steps.findIndex((x) => x.id === d);
            if (!(plan.steps[i].dependsOn ?? []).includes(plan.steps[j].id)) hallazgos.dependenciaNueva.push(`${exp}: ${plan.steps[i].id}<-${plan.steps[j].id}`);
          }
        });
      }
    } else if (r.status === 'needs_clarification' && r.clarification.missing.every((m) => m === 'material:image')) cuenta.nc++;
    else if (r.status === 'unsupported') cuenta.unsupported++;
    else { cuenta.otros++; hallazgos.noListoSinMotivo.push(`${exp}:${r.status}`); }
  }
  resumen[exp] = cuenta;
  const e = ESPERADO[exp];
  check(`${exp}: ${cuenta.formas} formas → ${cuenta.ready} listas · ${cuenta.nc} piden la foto (material:image) · ${cuenta.unsupported} no soportadas`,
    cuenta.formas === e[0] && cuenta.ready === e[1] && cuenta.nc === e[2] && cuenta.unsupported === e[3] && cuenta.otros === 0, JSON.stringify(cuenta));
}
check('ninguna forma lista produce una diferencia ESTRUCTURAL ni NO SOPORTADA (solo las cuatro clases benignas)', hallazgos.claseFuera.length === 0, hallazgos.claseFuera.slice(0, 3).join(', '));
check('mismo número de pasos y mismo orden de capacidades que Legacy en toda forma lista', hallazgos.forma.length === 0, hallazgos.forma.slice(0, 3).join(' · '));
check('el Core nunca inventa una dependencia que Legacy no tuviera', hallazgos.dependenciaNueva.length === 0, hallazgos.dependenciaNueva.slice(0, 3).join(' · '));
check('lo que Legacy tiene y el Core no se reduce a cinco motivos conocidos (frase, promesa, voz G15, foco G14, arista de orden)',
  hallazgos.legacySoloNuevo.size === 0, [...hallazgos.legacySoloNuevo].slice(0, 3).join(', '));
check('toda forma NO lista tiene un motivo conocido (foto que falta o capacidad sin servir), nunca «invalid» ni «failed»', hallazgos.noListoSinMotivo.length === 0, hallazgos.noListoSinMotivo.slice(0, 3).join(', '));

/* La causa de que photo / beauty / home «no lleguen a decidir» no es el puente de necesidades: es que el entendimiento del puente no lleva adjuntos. */
{
  let ahoraListas = 0; let aunNo = 0;
  for (const exp of ['photo', 'beauty', 'home', 'studio', 'chef']) {
    for (const { plan } of formas[exp]) {
      const puente = pasosParaElCore(plan.steps);
      const r = await planificar(U({
        goal: 'g', capability: puente.steps[0].capability, capabilities: [...new Set(puente.steps.map((s) => s.capability))],
        steps: puente.steps, inputs: { text: 'g', attachments: [FOTO] },
      }));
      if (r.status === 'ready') ahoraListas++; else aunNo++;
    }
  }
  check('CAUSA MEDIDA: con la foto en el entendimiento, TODA forma de photo, beauty, home, studio y chef sale lista; el límite no está en necesidades.ts',
    aunNo === 0 && ahoraListas === 45 + 42 + 94 + 65 + 82, `listas ${ahoraListas}, aún no ${aunNo}`);
  const entradaDeSombra = sinComentarios(src('creator/sombra.ts'));
  check('…porque `entendimientoDelPuente` declara `attachments: []` (la sombra no pasa las fotos del trabajo): decisión, no se amplía aquí',
    /const entendimientoDelPuente[\s\S]{0,900}attachments:\s*\[\]/.test(entradaDeSombra));
  const music = pasosParaElCore(formas.music.find((f) => f.plan.steps.some((s) => s.capability === 'music.generate')).plan.steps);
  check('music: music.generate no es ROUTABLE en el catálogo, y por eso no hay plan del Core (Weë Music no se conecta)',
    CAPABILITY_CATALOG.find((c) => c.id === 'music.generate').status !== 'ROUTABLE' && music.steps.some((s) => s.capability === 'music.generate'));
}

console.log('\n── D · Weë Brain: errores, vacíos y coherencia intención → respuesta ──');
const BRAIN_REQ = (o = {}) => ({
  contract: core.BRAIN_CONTRACT_VERSION, trace: { ...TRAZA }, language: { appLanguage: 'es' },
  message: { text: 'hola', attachments: [] }, conversation: { id: 'chat_0001', recent: [] }, options: {}, ...o,
});
const respuesta = (content, extra = {}) => ({
  response: { kind: 'text', content, actual: { provider: { lines: [], usd: 0.001, model: 'm' }, latencyMs: 3 }, model: 'm', ...extra },
  usage: { inputTokens: 1, outputTokens: 1 },
});
const brainCon = (pensar, experiences = ['design', 'chef']) => crearBrainDeWee({ pensador: { pensar }, tracer: { record() {} }, now: () => 1000, experiences });

{
  const feliz = await brainCon(async () => respuesta('hola, ¿en qué te ayudo?')).conversar(BRAIN_REQ());
  check('camino feliz: «answered» con el texto del modelo y el coste transportado, no calculado',
    feliz.status === 'answered' && feliz.reply.text.startsWith('hola') && feliz.execution.providerUsd === 0.001 && feliz.execution.requestId === 'req_0001');

  /* El catch del Core Brain traga el error del pensador: por diseño y sin filtrar nada. */
  const secreto = 'sk-NO-DEBE-SALIR';
  const rompe = await brainCon(async () => { throw Object.assign(new Error('clave ' + secreto), { weeError: { code: 'RATE_LIMITED' } }); }).conversar(BRAIN_REQ());
  check('PENSADOR QUE FALLA: «failed» / PROVIDER_ERROR / thinker_failed, sin mensaje ni traza del error original (el original lo guarda quien compone)',
    rompe.status === 'failed' && rompe.error.code === 'PROVIDER_ERROR' && rompe.error.details.reason === 'thinker_failed'
    && !JSON.stringify(rompe).includes(secreto) && !JSON.stringify(rompe).includes('RATE_LIMITED') && !rompe.reply);
  const sincrono = await brainCon(() => { throw new Error('sync'); }).conversar(BRAIN_REQ());
  const nulo = await brainCon(async () => { throw null; }).conversar(BRAIN_REQ());
  check('…ni un throw síncrono ni un throw null hacen que Brain lance hacia arriba', sincrono.status === 'failed' && nulo.status === 'failed' && nulo.error.details.errorName === 'object');

  const mala = await brainCon(async () => ({ response: { kind: 'texto-raro', actual: {} } })).conversar(BRAIN_REQ());
  check('una respuesta del proveedor sin la forma canónica se rechaza (invalid_provider_response)', mala.status === 'failed' && mala.error.details.reason === 'invalid_provider_response');
  const sinTraza = await brainCon(async () => respuesta('x')).conversar(BRAIN_REQ({ trace: undefined }));
  const nula = await brainCon(async () => respuesta('x')).conversar(null);
  check('petición sin traza o nula: «failed» / INVALID_REQUEST, el pensador NO se llama',
    sinTraza.status === 'failed' && nula.status === 'failed' && sinTraza.error.code === 'INVALID_REQUEST');
  let llamadas = 0;
  const larga = await brainCon(async () => { llamadas++; return respuesta('x'); }).conversar(BRAIN_REQ({ message: { text: 'a'.repeat(100000), attachments: [] } }));
  const adjuntoRaro = await brainCon(async () => { llamadas++; return respuesta('x'); }).conversar(BRAIN_REQ({ message: { text: 'hola', attachments: [{ kind: 'ejecutable', url: 'https://x.invalid' }] } }));
  check('mensaje desmesurado o adjunto de una clase inventada: INVALID_REQUEST antes de pensar (0 llamadas al proveedor)',
    larga.status === 'failed' && adjuntoRaro.status === 'failed' && llamadas === 0);

  /* B-1: respuesta sin texto. */
  const soloMarca = await brainCon(async () => respuesta('[[WEE:design]]')).conversar(BRAIN_REQ());
  const espacios = await brainCon(async () => respuesta('  \n ')).conversar(BRAIN_REQ());
  const vacia = await brainCon(async () => respuesta('')).conversar(BRAIN_REQ());
  const sinContenido = await brainCon(async () => respuesta(undefined)).conversar(BRAIN_REQ());
  check('B-1 · una respuesta SIN TEXTO (vacía, solo espacios, solo la marca de derivar o sin contenido) es un fallo, no una respuesta entregable',
    [soloMarca, espacios, vacia, sinContenido].every((r) => r.status === 'failed' && r.error.code === 'PROVIDER_ERROR' && r.error.details.reason === 'empty_reply' && !r.reply),
    [soloMarca, espacios, vacia, sinContenido].map((r) => r.status).join(','));
  /* …y «entender» no cambia: un JSON ilegible degrada a señales. */
  const entenderVacio = await brainCon(async () => respuesta('')).entender(BRAIN_REQ());
  check('B-1 · «entender» con salida ilegible sigue degradando a señales (no rompe)', entenderVacio.status !== 'failed' || entenderVacio.error?.details?.reason !== 'empty_reply');

  /* B-2: la marca en mitad del texto. */
  const alFinal = await brainCon(async () => respuesta('Eso lo hace mejor Weë Design.\n[[WEE:design]]')).conversar(BRAIN_REQ());
  const enMedio = await brainCon(async () => respuesta('mira [[WEE:design]] hola')).conversar(BRAIN_REQ());
  const alPrincipio = await brainCon(async () => respuesta('[[WEE:design]] hola')).conversar(BRAIN_REQ());
  check('B-2 · la marca al final se quita igual que siempre (sin dejar nada) y sugiere la experiencia',
    alFinal.reply.text === 'Eso lo hace mejor Weë Design.' && alFinal.reply.suggestedExperience === 'design' && alFinal.status === 'ready_to_plan');
  check('B-2 · la marca en MEDIO del texto deja un espacio, no pega las palabras («mira hola», no «mirahola»)', enMedio.reply.text === 'mira hola', JSON.stringify(enMedio.reply?.text));
  check('B-2 · la marca al principio se quita sin dejar espacios sobrantes', alPrincipio.reply.text === 'hola', JSON.stringify(alPrincipio.reply?.text));
  const inventada = await brainCon(async () => respuesta('prueba esto\n[[WEE:zzz]]')).conversar(BRAIN_REQ());
  check('una experiencia que no existe en la lista de derivar se ignora y se avisa (suggestion_rejected); el texto se entrega',
    inventada.reply.text === 'prueba esto' && !inventada.reply.suggestedExperience && inventada.execution.warnings.includes('suggestion_rejected'));

  /* «entender»: lo que el modelo declare se valida contra el catálogo y nunca decide proveedor. */
  const entiende = (json) => brainCon(async () => respuesta(JSON.stringify(json))).entender(BRAIN_REQ());
  const buena = await entiende({ intent: 'creation', confidence: 'high', goal: 'g', capability: 'image.generate', steps: [
    { key: 'a', capability: 'text.generate' },
    { key: 'b', capability: 'image.generate', needs: [{ from: 'upstream', modality: 'text', stepKey: 'a' }] },
  ] });
  check('entender: los pasos que el modelo declara llegan al entendimiento con sus necesidades, en orden',
    buena.understanding.steps?.length === 2 && buena.understanding.steps[1].needs?.[0].stepKey === 'a' && buena.understanding.intent === 'creation');
  const conProveedor = await entiende({ intent: 'creation', confidence: 'high', goal: 'g', capability: 'image.generate', constraints: { providerId: 'x', modelId: 'y' } });
  check('entender: un proveedor o modelo colado en las restricciones NO llega al entendimiento',
    !JSON.stringify(conProveedor.understanding).match(/providerId|modelId/));
  const capInventada = await entiende({ intent: 'creation', confidence: 'high', goal: 'g', capability: 'image.hackeo', steps: [{ key: 'a', capability: 'nope.x' }] });
  check('entender: una capacidad inventada no entra (ni principal ni en los pasos)',
    !(capInventada.understanding.capabilities ?? []).includes('image.hackeo') && !capInventada.understanding.steps?.length);
  const jsonRoto = await brainCon(async () => respuesta('no es json')).entender(BRAIN_REQ());
  check('entender: un modelo que no responde JSON no rompe nada; el entendimiento sale por señales y sin pasos', jsonRoto.status !== 'failed' && !jsonRoto.understanding.steps);

  /* Coherencia intención → plan → respuesta: lo que Brain entiende lo planifica el Planner tal cual. */
  const coherente = await planificar(buena.understanding);
  check('coherencia: el entendimiento de Brain se planifica sin traducción (2 pasos, el segundo depende del primero)',
    coherente.status === 'ready' && coherente.plan.steps.length === 2 && coherente.plan.steps[1].dependsOn?.[0] === coherente.plan.steps[0].id);
}

console.log('\n── D2 · El reembolso seguro vive en creator/brain.ts, con lo que el pensador GUARDÓ ──');
{
  const BRAIN = sinComentarios(src('creator/brain.ts'));
  check('el pensador del conductor guarda el fallo original antes de relanzarlo (Core Brain lo sustituye por uno genérico)',
    /catch \(error\) \{\s*if \(error instanceof FalloDelPensador\) falloDelConductor = error;\s*throw error;\s*\}/.test(BRAIN));
  check('el pensador de siempre también guarda la causa original (la app necesita su código)', /causaDelFallo = error;\s*throw error;/.test(BRAIN));
  check('el `catch` reembolsa SOLO si devolver es seguro: `!falloDelConductor || falloDelConductor.reembolsoSeguro`',
    /const devolverEsSeguro = !falloDelConductor \|\| falloDelConductor\.reembolsoSeguro;/.test(BRAIN));
  check('un fallo de forma (no del pensador) sube como GENERATION_FAILED / INVALID_REQUEST; la causa original gana si existe',
    /if \(causaDelFallo\) throw causaDelFallo;/.test(BRAIN) && /new EngineError\(pensado\.error\?\.code === 'INVALID_REQUEST' \? 'INVALID_REQUEST' : 'GENERATION_FAILED'\)/.test(BRAIN));
  /* Por qué un error crudo del conductor no puede reembolsar hoy: en la ruta del Core no hay cobro por delante. */
  const iPorElCore = BRAIN.indexOf('const porElCore =');
  const iBusqueda = BRAIN.indexOf('if (webSearch) {');
  const iConversar = BRAIN.indexOf('cerebro.conversar(');
  const iBloque = BRAIN.indexOf('spend = cobroDelBloque;');
  check('la ruta del Core solo existe para text.generate (CAPACIDAD_DEL_CANARY) y la búsqueda es text.search: nunca por el conductor',
    /const capacidad: CapabilityId = webSearch \? 'text.search' : 'text.generate';/.test(BRAIN)
    && /const porElCore = puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY;/.test(BRAIN) && /const CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate';/.test(BRAIN));
  check('el cobro por delante (`spend = await …spendCredits`) solo ocurre con webSearch; el del bloque, DESPUÉS de conversar: en la ruta del Core, al pensar `spend` es null',
    iBusqueda > 0 && /if \(webSearch\) \{\s*spend = await creditEngine\.spendCredits/.test(BRAIN) && iBloque > iConversar && iConversar > iPorElCore,
    'por eso una excepción cruda del conductor no llega a un reembolso (no hay nada cobrado). Si algún día la búsqueda pasara por el Core, habría que endurecer `devolverEsSeguro` (ver decisión D-B2)');
  check('el Core Brain no cobra, no reserva y no reembolsa: no menciona Credits', !/spendCredits|completeCredits|refundCredits|creditEngine/.test(sinComentarios(src('core/brain.ts'))));
  check('esta suite no salió a la red', peticiones === 0);
}

console.log(failures === 0
  ? `\nPaquete B · Planner y Brain: ${n} comprobaciones en verde`
  : `\n${failures} comprobación(es) fallaron de ${n}`);
process.exit(failures === 0 ? 0 : 1);
