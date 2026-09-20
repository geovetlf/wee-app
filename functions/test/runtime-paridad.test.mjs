/**
 * F12-A · BLOQUE A — PARIDAD: EL ENSAYO EN SECO DE LA MIGRACIÓN DE CÓDIGO.
 *
 * «No migres sin dry-run» vale también para el código. Antes de mover un
 * consumidor de producción del motor que lo atiende hoy al motor del Core, hay
 * que saber si el Core decidiría LO MISMO: mismos pasos, mismo orden, mismo
 * proveedor, mismo modelo. Si no, la migración cambia el producto —y los
 * Credits— sin que nadie lo haya decidido.
 *
 * Esta suite enfrenta los dos motores con las mismas entradas, sin red y sin
 * Firestore, y deja fijado lo que sale. Cada resultado es una PUERTA:
 *
 *   ABIERTA   el Core decide igual → ese consumidor se puede migrar (con
 *             aprobación y cambiando los contratos de la sección F del mapa).
 *   CERRADA   hay divergencias → migrar hoy cambiaría el comportamiento. Primero
 *             se cierra la divergencia con un adaptador, y se vuelve a medir.
 *
 * Si una puerta cambia de estado, esta suite falla: es el momento de actualizar
 * `docs/RUNTIME.md`, no de ablandar la comprobación.
 *
 * Usa el compilado (`functions/lib`), como `runtime-map.test.mjs`: se compara lo
 * que se despliega.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/*
 * LA CONFIGURACIÓN DE LABORATORIO, declarada para que la medida sea repetible.
 *
 * Los dos motores miran si hay credencial para saber con qué cuentan, así que
 * tienen que mirar lo mismo. Se dan por configurados los proveedores de la fase
 * de IA real (Gemini, Seedance por ModelArk, ElevenLabs — CLAUDE.md § 6) y el que
 * tiene generaciones completadas en producción (DeepSeek). Los valores son
 * falsos: aquí nadie llama a nadie.
 *
 * NO es una afirmación sobre qué secretos tiene producción: eso no se lee. Y la
 * conclusión no depende de ello — con cualquier conjunto realista de claves
 * divergen entre 12 y 15 capacidades (docs/RUNTIME.md § Paridad).
 */
const CLAVES_DEL_LABORATORIO = ['GEMINI_API_KEY', 'ARK_API_KEY', 'ELEVENLABS_API_KEY', 'DEEPSEEK_API_KEY'];
const LAS_DEMAS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'BFL_API_KEY', 'MINIMAX_API_KEY'];
for (const k of CLAVES_DEL_LABORATORIO) process.env[k] = 'clave-falsa-para-paridad';
for (const k of LAS_DEMAS) delete process.env[k];

const { TEMPLATES } = lib('creator/templates.js');
const { orquestadorDeWee } = lib('orchestrator/index.js');
const core = lib('core/index.js');
const { resolverConContexto } = lib('router/index.js');
const { createRouter, memoryHealth, resolveQuality } = lib('engine/router.js');
const { ADAPTERS, DEFAULT_PROVIDERS, DEFAULT_ROUTING, DEFAULT_SETTINGS } = lib('engine/registry.js');

const trace = { traceId: 'brain_paridad_0001', requestId: 'brain_paridad_0001', userId: 'user-0001', appId: 'wee', workplace: 'studio' };
const principal = { userId: 'user-0001', appId: 'wee' };

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── P1 · Workflow + Orchestrator: cada plan que producción puede construir ──');
{
  /** El orden EXACTO del `while` de `creatorRun`: el primer paso pendiente con sus dependencias hechas. */
  const ordenDelWhile = (steps) => {
    const done = new Set(); const orden = []; let guard = 0;
    while (done.size < steps.length) {
      if (guard++ > steps.length * 2) return null;
      const next = steps.find((s) => !done.has(s.id) && (s.dependsOn || []).every((d) => done.has(d)));
      if (!next) return null;
      orden.push(next.id); done.add(next.id);
    }
    return orden;
  };
  /* Todas las combinaciones de respuestas serían millones. Se cubre: sin respuestas, todo «no sé», y cada opción de cada pregunta por separado. */
  const variantesDe = (tpl) => {
    const v = [{}, Object.fromEntries(tpl.questions.map((q) => [q.id, 'idk']))];
    for (const q of tpl.questions) for (const o of (q.options || [])) v.push({ [q.id]: o.id });
    return v;
  };
  /*
   * EL ADAPTADOR ENTERO. Un plan de Weë Creator contado como workflow del Core:
   * se copian los cinco campos de cada paso y se le pone contrato. Que baste con
   * esto es el primer resultado de la suite — los dos modelos de plan son el mismo.
   */
  const comoWorkflow = (plan, exp, n) => ({
    id: 'wf_brain_paridad_' + String(n).padStart(4, '0'), contract: core.WORKFLOW_CONTRACT_VERSION, goal: plan.goal, workplace: exp,
    steps: plan.steps.map((s) => ({ id: s.id, capability: s.capability, purpose: s.purpose, ...(s.dependsOn?.length ? { dependsOn: s.dependsOn } : {}), ...(s.input ? { input: s.input } : {}) })),
  });
  const pet = (run, at, extra = {}) => ({ contract: core.ORCHESTRATOR_CONTRACT_VERSION, principal, run, at, ...extra });

  let planes = 0, aceptados = 0, terminan = 0, mismoOrden = 0, conParalelismo = 0, maxParalelo = 0;
  const rechazos = []; const capacidades = new Set(); const campos = new Set();
  for (const [exp, tpl] of Object.entries(TEMPLATES)) {
    for (const respuestas of variantesDe(tpl)) {
      const plan = tpl.buildPlan(tpl.defaultGoal, respuestas);
      planes++;
      plan.steps.forEach((s) => { capacidades.add(s.capability); Object.keys(s).forEach((k) => campos.add(k)); });
      const m = orquestadorDeWee(comoWorkflow(plan, exp, planes));
      if (!m.ok) { rechazos.push(`${exp}: ${JSON.stringify(m.error.details ?? m.error.code).slice(0, 160)}`); continue; }
      aceptados++;

      /* El Core despacha EN PARALELO todo lo que está listo. Se le devuelve el resultado de todo lo que sale, de uno en uno y por orden de salida: es lo que haría el ejecutor de hoy. */
      let run = m.prepared.iniciar(trace).run; let t = 1; let guard = 0; let roto = false;
      const ordenCore = []; const enVuelo = [];
      while (guard++ < 400) {
        const d = m.orchestrator.avanzar(pet(run, t++));
        if (d.status === 'finished') break;
        if (d.status === 'dispatch' && d.dispatch.length) {
          run = d.run;
          enVuelo.push(...d.dispatch.map((x) => x.stepId));
          maxParalelo = Math.max(maxParalelo, d.dispatch.length);
          if (d.dispatch.length > 1) conParalelismo++;
        } else if (!enVuelo.length) { roto = true; break; }
        const stepId = enVuelo.shift();
        ordenCore.push(stepId);
        const r = m.orchestrator.informar(pet(run, t++, { outcome: { stepId, kind: 'succeeded', at: t } }));
        if (r.status === 'invalid') { roto = true; break; }
        run = r.run;
      }
      const pos = new Map(ordenCore.map((id, i) => [id, i]));
      const respeta = plan.steps.every((s) => (s.dependsOn || []).every((dep) => pos.get(dep) < pos.get(s.id)));
      if (!roto && respeta && ordenCore.length === plan.steps.length) terminan++;
      if (!roto && igualOrden(ordenDelWhile(plan.steps), ordenCore)) mismoOrden++;
    }
  }
  function igualOrden(a, b) { return Array.isArray(a) && JSON.stringify(a) === JSON.stringify(b); }

  const catalogo = new Set(core.CAPABILITY_CATALOG.map((c) => c.id));
  const fuera = [...capacidades].filter((c) => !catalogo.has(c));
  check('1) se probaron los planes de las once experiencias', Object.keys(TEMPLATES).length === 11 && planes >= 200, `${planes} planes`);
  check('2) el Workflow del Core ACEPTA todos: ninguno le resulta inválido', aceptados === planes, `${aceptados}/${planes} · ${rechazos.slice(0, 3).join(' | ')}`);
  check('3) ninguna capacidad que usa producción falta en el catálogo del Core', fuera.length === 0, fuera.join(', '));
  check('4) un paso vivo tiene exactamente los cinco campos que el adaptador copia', igual([...campos], ['capability', 'dependsOn', 'id', 'input', 'purpose']), [...campos].join(', '));
  check('5) el Orchestrator lleva todos hasta el final, con todos sus pasos y respetando las dependencias', terminan === planes, `${terminan}/${planes}`);
  check('6) y con un ejecutor de uno en uno, el orden es IDÉNTICO al del `while` de creatorRun', mismoOrden === planes, `${mismoOrden}/${planes}`);
  /* No es una divergencia: es lo que se gana. El `while` hace en serie pasos que no dependen entre sí (el clip y la voz de un vídeo). */
  check('7) el Core además sabe que hay pasos que pueden ir a la vez (hoy van en serie)', conParalelismo > 0 && maxParalelo >= 2, `${conParalelismo} despachos con más de un paso · hasta ${maxParalelo} a la vez`);
  check('8) PUERTA Workflow + Orchestrator: ABIERTA a nivel de decisión', aceptados === planes && terminan === planes && mismoOrden === planes && fuera.length === 0);
  /* Abierta «a nivel de decisión» no es «migrable mañana»: lo que falta no es lógica, es quien ejecute, guarde y cobre. */
  check('9) pero no hay todavía quien EJECUTE lo que el Orchestrator despacha: ningún módulo une Orchestrator → Router → Gateway',
    !fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { recursive: true }).filter((f) => String(f).endsWith('.ts') && !String(f).startsWith('core'))
      .some((f) => { const s = leer('functions/src/' + String(f).split(path.sep).join('/')); return /orquestadorDeWee\(/.test(s) && /gatewayDeWee\(/.test(s); }));
  check('10) ni almacén de trabajos: `JobStore` es un puerto que solo implementan las pruebas',
    /No hay almacén\. `JobStore` es un puerto/.test(leer('functions/src/job/index.ts'))
    && !fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { recursive: true }).filter((f) => String(f).endsWith('.ts') && !String(f).startsWith('core'))
      .some((f) => /:\s*JobStore\s*=|implements JobStore|crearSiAusente\s*[:(]\s*async|crearSiAusente:\s/.test(leer('functions/src/' + String(f).split(path.sep).join('/')))));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── P2 · Router: qué elige cada uno, capacidad por capacidad ──');
{
  /* El router que atiende hoy, con la configuración por defecto — que es la de producción: `aiRouting`, `aiProviders` y `aiSettings` están vacías. */
  const config = { providers: DEFAULT_PROVIDERS, routing: DEFAULT_ROUTING, settings: DEFAULT_SETTINGS, source: 'defaults' };
  const libroNulo = new Proxy({}, { get: () => async () => 'gen_paridad' });
  const vivo = createRouter({ adapters: ADAPTERS, loadConfig: async () => config, ledger: libroNulo, health: memoryHealth(), usageToday: async () => undefined });
  const idDe = (c) => `${c.provider}/${c.model?.id ?? c.model}`;

  const iguales = [], distintas = [], sinNadie = [], distintasConAdaptador = [];
  for (const capability of Object.keys(DEFAULT_ROUTING)) {
    const c0 = (await vivo.route({ capability, input: {}, userId: 'user-0001' })).candidates?.[0];
    if (!c0 || c0.provider === 'mock') { sinNadie.push(capability); continue; }
    const rc = resolverConContexto({ capability, trace });
    const delCore = rc.ok ? `${rc.implementation.providerId}/${rc.implementation.modelId}` : '—';
    (delCore === idDe(c0) ? iguales : distintas).push(capability);
    /* Con el único adaptador que el contrato del Router admite hoy: la cabeza de la cadena viva como `preference` y la calidad viva como `hints`. */
    const ra = resolverConContexto({ capability, trace, hints: { quality: resolveQuality({ capability, input: {} }) }, preference: { providerId: c0.provider, modelId: c0.model?.id ?? c0.model } });
    if (!ra.ok || `${ra.implementation.providerId}/${ra.implementation.modelId}` !== idDe(c0)) distintasConAdaptador.push(capability);
  }

  /*
   * LA LÍNEA BASE. No es un objetivo: es lo que hay. Si cambia —porque cambió una
   * cadena, un modelo o la política del Router— esta comprobación falla y hay que
   * volver a mirar `docs/RUNTIME.md` § Paridad antes de tocar esta lista.
   */
  const IGUALES = ['audio.transcribe', 'doc.read', 'scene.split', 'script.write', 'text.search', 'voice.tts'];
  const DISTINTAS = ['image.background_remove', 'image.edit', 'image.generate', 'image.identity_edit', 'image.object_remove', 'image.reference', 'image.space_restyle', 'image.upscale',
    'subtitle.generate', 'text.generate', 'text.structure', 'video.generate', 'video.image_to_video', 'video.reference', 'vision.describe'];
  const SIN_NADIE = ['audio.sfx', 'doc.render', 'image.try_on', 'music.generate', 'video.compose', 'video.montage', 'video.vertical'];
  const DISTINTAS_CON_ADAPTADOR = DISTINTAS.filter((c) => !['image.upscale', 'subtitle.generate'].includes(c));

  check('11) producción enruta veintiocho capacidades', Object.keys(DEFAULT_ROUTING).length === 28, `${Object.keys(DEFAULT_ROUTING).length}`);
  check('12) en seis, los dos routers eligen el mismo proveedor y el mismo modelo', igual(iguales, IGUALES), iguales.join(', '));
  check('13) en QUINCE eligen distinto: migrar hoy cambiaría el modelo que atiende a la gente', igual(distintas, DISTINTAS), distintas.join(', '));
  check('14) y siete no las sirve nadie de verdad: hoy caen en el modo demo, y el Core las daría por no disponibles', igual(sinNadie, SIN_NADIE), sinNadie.join(', '));
  check('15) con el adaptador que el contrato admite hoy (`preference` + `hints`) siguen siendo trece: la preferencia pesa, no manda',
    igual(distintasConAdaptador, DISTINTAS_CON_ADAPTADOR), distintasConAdaptador.join(', '));
  check('16) PUERTA Router: CERRADA', distintas.length > 0 && distintasConAdaptador.length > 0);
  /* Y el Gateway va detrás del Router: sin él no sabe con qué ejecutar, y además no escribe `aiGenerations` ni sabe de Credits. */
  check('17) PUERTA Gateway: CERRADA — la composición lo dice de sí misma: ni elige proveedor ni escribe el libro',
    /No elige proveedor: ejecuta el que le mandan\. No escribe el libro/.test(leer('functions/src/engine/gateway.ts')));
}

console.log('\n── P3 · El documento dice lo mismo ──');
{
  const doc = fs.existsSync(path.resolve(RAIZ, 'docs/RUNTIME.md')) ? leer('docs/RUNTIME.md') : '';
  check('18) `docs/RUNTIME.md` recoge las tres puertas con su estado',
    /Workflow \+ Orchestrator[^\n]*ABIERTA/.test(doc) && /\| \*\*Router\*\*[^\n]*CERRADA|Router[^\n|]*\|[^\n]*CERRADA/.test(doc) && /Gateway[^\n]*CERRADA/.test(doc));
  check('19) y las cifras medidas: 6 iguales, 15 distintas, 7 sin proveedor real', /\b6\b[^\n]*iguales/.test(doc) && /\b15\b[^\n]*distint/.test(doc) && /\b7\b[^\n]*(sin proveedor|modo demo)/.test(doc));
  check('20) esta suite está en la cadena de `npm test`', leer('functions/package.json').includes('node test/runtime-paridad.test.mjs'));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
