/**
 * WEË — C13: EL TEXTO TAMBIÉN ES MATERIAL.
 *
 * ── Lo que C12 midió, corregido en C26 ──────────────────────────────────────────
 *
 * CUARENTA Y UNA aristas de dependencia al enumerar las once plantillas, y
 * TREINTA Y OCHO salen de un paso que produce texto —`text.generate` 23,
 * `vision.describe` 14, `text.search` 1—. Y un resultado de texto no tenía
 * referencia: `referenciasDe` devuelve las URLs de la respuesta, un texto no
 * tiene ninguna, y `materialDe` descarta lo que llega sin `outputRefs`.
 *
 * Así que el noventa y tres por ciento del grafo de Weë terminaba en un paso
 * que no podía leer lo que el anterior había escrito.
 *
 * C12 escribió «40 aristas, 36 de texto: 27 + 8 + 1». Hoy las plantillas dan 41
 * aristas y 38; el código tiene 39 declaraciones `dependsOn` y 40 líneas que
 * nombran esa palabra, porque una es la firma del helper. No he reconstruido
 * con cuál de esas cuentas se escribió aquel 40, y da igual: los números vivían
 * en el NOMBRE de un check que no los miraba, así que nada avisó cuando
 * dejaron de cuadrar. La sección D ya no los recuerda: los cuenta.
 *
 * ── Y lo que NO hubo que construir ──────────────────────────────────────────
 *
 * Casi todo estaba. `AssetKind` incluye `text` desde el primer día;
 * `materialValido` admite un material de texto SIN referencia de almacén;
 * `identidadDelMaterial` ya calcula la identidad; el puerto de materialización
 * ya existía para traerse un vídeo a casa; `outputRefs` nunca dijo que fueran
 * URLs. Lo que faltaba era que alguien lo usara.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
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
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const { materialValido, esTipoDeMaterial, TIPOS_DE_MATERIAL } = core;
const {
  materialDeTexto, procedenciaDelDespacho, identidadDelMaterial, tipoDeMaterialDe,
  MAX_TEXTO_DEL_MATERIAL,
} = lib('runtime/materializacion.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');

const AHORA = 1_700_000_000_000;
const reloj = () => AHORA;

const despacho = (capability, extra = {}) => ({
  jobId: 'job_c13_0001',
  attemptId: 'att_0001',
  attempt: 1,
  capability,
  implementation: { providerId: 'probe', modelId: 'probe-1', adapterId: 'adapter:probe' },
  input: { kind: 'script', brief: 'un guion de treinta segundos' },
  trace: { traceId: 'tr_c13_0001', requestId: 'rq_c13_0001', userId: 'acc_mia', runId: 'run_0001', stepId: 'guion' },
  mode: 'sync',
  idempotencyKey: 'idem_c13_0001',
  timeoutMs: 30_000,
  deadlineAt: AHORA + 60_000,
  ...extra,
});

const GUION = 'ESCENA 1. Un patio al atardecer. La abuela riega las macetas.';

console.log('\n── A · El contrato que ya estaba ──');

check('`AssetKind` incluye `text` desde el primer día',
  esTipoDeMaterial('text') && TIPOS_DE_MATERIAL.includes('text'));
check('y `materialValido` admite un material de texto SIN referencia de almacén',
  materialValido({
    contract: '1.0', assetId: 'mat_abc', ownerAccountId: 'acc_mia', kind: 'text', status: 'ready',
    provenance: { createdAt: AHORA }, createdAt: AHORA, updatedAt: AHORA,
  }),
  'no hubo que tocar el contrato de la Fase 11');
check('a una imagen `ready` SÍ se le exige, y eso no ha cambiado',
  !materialValido({
    contract: '1.0', assetId: 'mat_abc', ownerAccountId: 'acc_mia', kind: 'image', status: 'ready',
    provenance: { createdAt: AHORA }, createdAt: AHORA, updatedAt: AHORA,
  }));
check('la clase de material la dice EL CATÁLOGO, no el prefijo del nombre',
  tipoDeMaterialDe('text.generate') === 'text' && tipoDeMaterialDe('vision.describe') === 'text'
  && tipoDeMaterialDe('audio.transcribe') === 'text' && tipoDeMaterialDe('image.analyze') === 'text',
  'mirar una foto produce una descripción, y una descripción es texto');
check('G7 CERRADO · el prefijo discrepaba del catálogo en 38 de 68 capacidades',
  (() => {
    const CLASE = { text: 'text', image: 'image', video: 'video', voice: 'audio', audio: 'audio', music: 'audio', doc: 'document', '3d': 'model3d', vision: 'text' };
    return core.CAPABILITY_CATALOG.every((e) => tipoDeMaterialDe(e.id) === CLASE[e.produces]);
  })(),
  'las 68 coinciden ahora con lo que declara el catálogo');
check('y una capacidad que no está en el catálogo no produce material',
  tipoDeMaterialDe('inventada.x') === undefined && tipoDeMaterialDe(undefined) === undefined);
check('`AssetKind` no ha ganado ni un tipo nuevo',
  TIPOS_DE_MATERIAL.length === 6 && igual([...TIPOS_DE_MATERIAL].sort(),
    ['audio', 'document', 'image', 'model3d', 'text', 'video']));

console.log('\n── B · De un resultado de texto a una petición de material ──');

const peticion = materialDeTexto(despacho('text.generate'), GUION, AHORA);

check('un resultado de `text.generate` produce su petición de material',
  !!peticion && peticion.kind === 'text' && peticion.contenido === GUION);
check('la identidad es la MISMA de siempre: calculada, no sorteada',
  peticion?.assetId === identidadDelMaterial('job_c13_0001', 'att_0001'),
  'dos llegadas del mismo intento piden el mismo material');
check('y la pide del INTENTO, no del trabajo: un reintento es otra ejecución',
  identidadDelMaterial('job_c13_0001', 'att_0001') !== identidadDelMaterial('job_c13_0001', 'att_0002'));
check('la cuenta sale del DESPACHO, que lo armó el Job Engine',
  peticion?.userId === 'acc_mia',
  'ni del resultado, ni del cliente, ni de un proveedor');
check('la procedencia contesta de dónde salió: trabajo, paso, traza, capacidad, proveedor y modelo',
  igual(peticion?.provenance, {
    runId: 'run_0001', stepId: 'guion', requestId: 'rq_c13_0001', traceId: 'tr_c13_0001',
    jobId: 'job_c13_0001', capability: 'text.generate', provider: 'probe', model: 'probe-1',
    createdAt: AHORA,
  }),
  JSON.stringify(Object.keys(peticion?.provenance ?? {})));
check('no se inventó un sistema de procedencia: es el `Provenance` de la Fase 11',
  /provenance: Provenance/.test(leer('functions/src/content/index.ts')));
check('y NO lleva enlace: un texto no tiene ninguno que caduque',
  peticion?.recurso === undefined);

console.log('\n── C · Lo que NO se convierte en material ──');

check('un texto vacío no es material',
  materialDeTexto(despacho('text.generate'), '   ', AHORA) === undefined);
check('algo que no es texto tampoco',
  materialDeTexto(despacho('text.generate'), 42, AHORA) === undefined
  && materialDeTexto(despacho('text.generate'), undefined, AHORA) === undefined);
check('un texto desbocado se rechaza en vez de meterlo en un documento',
  materialDeTexto(despacho('text.generate'), 'x'.repeat(MAX_TEXTO_DEL_MATERIAL + 1), AHORA) === undefined,
  `tope ${MAX_TEXTO_DEL_MATERIAL}`);
check('F6 · una capacidad que NO produce texto no produce material de texto',
  materialDeTexto(despacho('image.generate'), GUION, AHORA) === undefined
  && materialDeTexto(despacho('video.generate'), GUION, AHORA) === undefined,
  'un vídeo con `content` no es un texto: lo dice el catálogo, no el resultado');
check('un despacho sin identidad no produce material',
  materialDeTexto(despacho('text.generate', { jobId: '', attemptId: '' }), GUION, AHORA) === undefined);

console.log('\n── D · Los productores de texto, MEDIDOS y no recordados ──');

/*
 * ── POR QUÉ ESTO SE MIDE AQUÍ Y YA NO SE RECUERDA ───────────────────────────
 *
 * Hasta C26 esta sección se llamaba «LAS 36 ARISTAS DE TEXTO: 27 + 8 + 1» y
 * comprobaba otra cosa: que las tres capacidades producen material de texto.
 * Los números vivían en el NOMBRE del check y no los leía nadie, así que
 * habrían sobrevivido a cualquier cambio de las plantillas. Y ya no eran
 * ciertos cuando alguien fue a mirarlos.
 *
 * Hay dos cuentas distintas, y las dos son legítimas:
 *
 *   39  declaraciones `dependsOn` escritas en el código de las plantillas
 *   41  aristas al ENUMERAR las 35 formas distintas que salen de ellas
 *
 * Y ninguna se deriva de la otra. Hay dos motivos, los dos comprobados abajo:
 * una declaración puede nombrar a DOS productores, y una sola línea cuya
 * capacidad depende de lo que conteste la persona se convierte en VARIAS
 * formas —la de Photo, en cuatro—. C12 contó declaraciones; la medición
 * canónica de C15d enumera formas, que es lo que de verdad corre.
 *
 * Así que aquí ya no se recuerda ningún número: se cuenta.
 */
const PLANTILLAS = lib('creator/templates.js').TEMPLATES;
const CATALOGO = core.CAPABILITY_CATALOG;
const produce = (id) => CATALOGO.find((c) => c.id === id)?.produces;

const respuestaBase = (t) => Object.fromEntries((t.questions ?? []).map((q) => [q.id, q.options?.[0]?.id ?? '']));
const FORMAS_DE_HOY = [];
for (const [exp, t] of Object.entries(PLANTILLAS)) {
  const b = respuestaBase(t);
  const vistas = new Map();
  const probar = (respuestas, rama) => {
    let p;
    try { p = t.buildPlan('un encargo de ejemplo', respuestas); } catch { return; }
    const clave = p.steps.map((s) => s.capability).join('>');
    if (!vistas.has(clave)) vistas.set(clave, { exp, rama, steps: p.steps });
  };
  probar(b, '(defecto)');
  for (const q of (t.questions ?? [])) for (const o of (q.options ?? [])) probar({ ...b, [q.id]: o.id }, `${q.id}=${o.id}`);
  FORMAS_DE_HOY.push(...vistas.values());
}

const porProductor = {};
let ARISTAS = 0;
for (const f of FORMAS_DE_HOY) {
  const porId = Object.fromEntries(f.steps.map((s) => [s.id, s]));
  for (const s of f.steps) for (const d of (s.dependsOn ?? [])) {
    const p = porId[d];
    if (!p) continue;
    ARISTAS++;
    porProductor[p.capability] = (porProductor[p.capability] ?? 0) + 1;
  }
}
const deTexto = Object.entries(porProductor).filter(([cap]) => produce(cap) === 'text');
const ARISTAS_DE_TEXTO = deTexto.reduce((a, [, c]) => a + c, 0);

check('C26 · las aristas se CUENTAN, y son las 41 de la medición canónica',
  ARISTAS === 41,
  `${ARISTAS} · el mismo número que pincha \`puente-necesidades\``);
check('C26 · y 38 de las 41 salen de un paso que produce texto',
  ARISTAS_DE_TEXTO === 38,
  JSON.stringify(Object.fromEntries(deTexto)));
check('C26 · son exactamente TRES capacidades las que producen ese texto',
  igual(deTexto.map(([c]) => c).sort(), ['text.generate', 'text.search', 'vision.describe']),
  deTexto.map(([c, n2]) => `${c} ${n2}`).join(' · '));

for (const [capability, aristas] of deTexto.slice().sort()) {
  const r = materialDeTexto(despacho(capability), GUION, AHORA);
  check(`${capability} (${aristas} aristas medidas hoy) produce material de texto`,
    !!r && r.kind === 'text' && r.contenido === GUION && r.provenance.capability === capability);
}
check('C26 · y las 3 restantes salen de productores que NO son texto: no se les finge material',
  ARISTAS - ARISTAS_DE_TEXTO === 3
  && Object.entries(porProductor).filter(([c]) => produce(c) !== 'text')
    .every(([c]) => materialDeTexto(despacho(c), GUION, AHORA) === undefined),
  Object.entries(porProductor).filter(([c]) => produce(c) !== 'text').map(([c, n2]) => `${c} ${n2}`).join(' · '));

/* Y por qué contar el código y contar las formas dan números distintos. */
const FUENTE_PLANTILLAS = leer('functions/src/creator/templates.ts');
const DECLARACIONES = (FUENTE_PLANTILLAS.match(/dependsOn:/g) ?? []).length;
check('C26 · 39 declaraciones en el código y 41 aristas al enumerar: son DOS medidas',
  DECLARACIONES === 39 && ARISTAS === 41,
  `${DECLARACIONES} declaraciones · ${ARISTAS} aristas · ninguna se deriva de la otra`);
check('C26 · motivo uno: una sola declaración puede nombrar a DOS productores',
  /dependsOn: \['[a-z_]+', '[a-z_]+'\]/.test(FUENTE_PLANTILLAS)
  && FORMAS_DE_HOY.some((f) => f.steps.some((s2) => (s2.dependsOn ?? []).length === 2)),
  'la de Weë Business: el texto final cuelga del análisis Y del mercado');
check('C26 · motivo dos: UNA línea puede ser CUATRO aristas, según lo que conteste la persona',
  FORMAS_DE_HOY.filter((f) => f.exp === 'photo'
    && f.steps.some((s) => s.id === 'edit' && (s.dependsOn ?? []).includes('look'))).length === 4
  && (FUENTE_PLANTILLAS.match(/step\('edit', capability, purpose, \{ dependsOn: \['look'\]/g) ?? []).length === 1,
  'la capacidad de ese paso la decide la respuesta, y cada una es otra forma');

console.log('\n── E · El ejecutor: de material a referencia consumible ──');

const guardados = [];
const puerto = {
  async guardar(p) {
    guardados.push(p);
    return p.userId === 'acc_mia'
      ? { ok: true, assetId: p.assetId, yaEstaba: false }
      : { ok: false, motivo: 'rechazado' };
  },
};
const gateway = (respuesta) => ({ async ejecutar() { return respuesta; } });
const completado = (content, urls) => ({
  status: 'completed',
  capability: 'text.generate',
  implementation: { providerId: 'probe', modelId: 'probe-1' },
  response: { kind: 'text', ...(content !== undefined ? { content } : {}), ...(urls ? { urls } : {}) },
  usage: {},
  trace: { traceId: 'tr_c13_0001', requestId: 'rq_c13_0001', userId: 'acc_mia' },
  timing: { startedAt: AHORA, finishedAt: AHORA },
  warnings: [],
});

const conMaterial = await crearEjecutor({ gateway: gateway(completado(GUION)), ahora: reloj, material: puerto })
  .ejecutar(despacho('text.generate'));

check('el intento sale bien y su resultado lleva UNA referencia',
  conMaterial.outcome === 'succeeded' && conMaterial.result?.outputRefs?.length === 1,
  JSON.stringify(conMaterial.result?.outputRefs));
check('y la referencia es el identificador del material, no una URL',
  conMaterial.result?.outputRefs?.[0] === identidadDelMaterial('job_c13_0001', 'att_0001')
  && !conMaterial.result?.outputRefs?.[0]?.includes('http'),
  '`outputRefs` nunca dijo que fueran direcciones: son referencias');
check('se guardó UNA vez, con la cuenta del despacho',
  guardados.length === 1 && guardados[0].userId === 'acc_mia' && guardados[0].kind === 'text');
check('un resultado con URLs Y texto conserva las dos: no se tira la mitad',
  (await crearEjecutor({ gateway: gateway(completado(GUION, ['https://x.invalid/a.png'])), ahora: reloj, material: puerto })
    .ejecutar(despacho('text.generate'))).result?.outputRefs?.length === 2);
check('SIN el puerto, un resultado de texto se comporta EXACTAMENTE como antes',
  (await crearEjecutor({ gateway: gateway(completado(GUION)), ahora: reloj })
    .ejecutar(despacho('text.generate'))).result?.outputRefs?.length === 0,
  'añadir esto no cambió el comportamiento de quien no lo enchufe');
check('F2/F5 · si el puerto rechaza por la cuenta, NO se inventa una referencia',
  (await crearEjecutor({
    gateway: gateway(completado(GUION)), ahora: reloj, material: puerto,
  }).ejecutar(despacho('text.generate', { trace: { ...despacho('text.generate').trace, userId: 'acc_ajena' } })))
    .result?.outputRefs?.length === 0);
check('y el intento SIGUE siendo bueno: ya se ejecutó y ya se pagó',
  (await crearEjecutor({
    gateway: gateway(completado(GUION)), ahora: reloj, material: puerto,
  }).ejecutar(despacho('text.generate', { trace: { ...despacho('text.generate').trace, userId: 'acc_ajena' } })))
    .outcome === 'succeeded',
  'mentir aquí habría cobrado dos veces por lo mismo');
check('F1 · un texto que no se materializa no deja referencia, y eso se ve',
  (await crearEjecutor({
    gateway: gateway(completado(GUION)), ahora: reloj,
    material: { async guardar() { throw new Error('el almacén no contesta'); } },
  }).ejecutar(despacho('text.generate'))).result?.outputRefs?.length === 0,
  'un puerto que explota no tumba el intento');

console.log('\n── F · Entrada y salida son dos canales, y no se cruzan ──');

check('F8 · el resultado NO entra en `input`',
  igual(Object.keys(conMaterial.result ?? {}).sort(), ['outputRefs', 'usage'])
  /* Sin anclar al punto: una aserción de tipo por medio no puede esconder el acceso. */
  && !/\binput\b[\s\S]{0,60}?\.(upstream|outputRef|material|assetId)\b/
    .test(sinComentarios(leer('functions/src/runtime/ejecutor.ts'))),
  'ni siquiera se lee: el material de salida tiene su propio camino');
check('F7 · el materializador exige contenido O enlace, y sin ninguno rechaza',
  /if \(!peticion\.recurso\) return \{ ok: false, motivo: 'rechazado' \};/
    .test(leer('functions/src/content/materializador.ts')),
  'COBERTURA DECLARADA: se comprueba sobre el código, no ejecutándolo — el materializador necesita Firestore');
check('RECURSO DE ENTRADA y MATERIAL DE SALIDA siguen separados',
  /references\?: readonly BrainAttachment\[\]/.test(leer('functions/src/core/job.ts'))
  && /outputRefs/.test(leer('functions/src/core/job.ts')),
  'C11.4 abrió el de entrada; C13 el de salida');
check('`UpstreamMaterial` NO se tocó: `outputRefs` ya servía',
  igual(
    (leer('functions/src/core/orchestrator.ts').match(/export interface UpstreamMaterial \{[^}]*\}/) ?? [''])[0]
      .match(/^\s*(\w+)\??:/gm)?.map((x) => x.trim().replace(/\??:/, '')),
    ['stepId', 'capability', 'produces', 'outputRefs'],
  ));
check('y `materialDe` conserva lo que llega con referencia: sin cambiarlo',
  /if \(!r \|\| !s \|\| !r\.outputRefs\?\.length\) continue;/.test(leer('functions/src/core/orchestrator.ts')),
  'la condición que descartaba el texto sigue igual; lo que cambió es que ahora SÍ trae referencia');

console.log('\n── G · Cada capa en su sitio ──');

{
  const EJ = sinComentarios(leer('functions/src/runtime/ejecutor.ts'));
  check('el Gateway no administra material: no sabe de este puerto',
    !/PuertoDeMaterializacion|crearMaterialDeTexto/.test(leer('functions/src/core/gateway.ts') + leer('functions/src/engine/gateway.ts')));
  check('F12 · el Job no crea material: no nombra ni el puerto ni la Fase 11',
    !/PuertoDeMaterializacion|crearMaterial|materialDeTexto/.test(
      leer('functions/src/core/job.ts') + leer('functions/src/job/index.ts')));
  check('el Router sigue sin saber nada de esto',
    !/material|outputRef|upstream/i.test(sinComentarios(leer('functions/src/core/router.ts'))));
  check('el Planner tampoco: no crea materiales',
    !/crearMaterial|materialDeTexto|Asset/.test(sinComentarios(leer('functions/src/core/planner.ts'))));
  check('el ejecutor TRANSPORTA la decisión y delega el guardado en el puerto',
    /deps\.material\.guardar\(aGuardar\)/.test(EJ) && !/getFirestore|collection\(/.test(EJ),
    'aquí no se escribe en ninguna base de datos');
  check('y es el MISMO puerto que ya guardaba un vídeo cuando llegaba su aviso',
    /PuertoDeMaterializacion/.test(leer('functions/src/runtime/atencion.ts'))
    && /PuertoDeMaterializacion/.test(leer('functions/src/runtime/ejecutor.ts')),
    'un puerto, dos caminos: el síncrono y el del aviso');
}

console.log('\n── H · Lo que no se creó ──');

check('no hay un segundo sistema de materiales',
  !/TextMaterialEngine|TextAssetEngine|OutputReferenceEngine|SegundoRegistro/.test(
    ['runtime/materializacion.ts', 'runtime/ejecutor.ts', 'content/index.ts', 'content/materializador.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('no hay almacén nuevo: un material de texto no sube ningún objeto',
  !/bucket|storageBucket|R2|CDN/.test(
    (leer('functions/src/content/index.ts').split('export const crearMaterialDeTexto')[1] ?? '')),
  'la Fase 11 ya decía que el texto no lo necesita');
check('la colección es la de siempre',
  /const ref = assets\(\)\.doc\(datos\.assetId\);/.test(leer('functions/src/content/index.ts')));
check('se crea SOLO SI NO EXISTE: dos llegadas dejan un material',
  /await ref\.create\(/.test(
    (leer('functions/src/content/index.ts').split('export const crearMaterialDeTexto')[1] ?? '')));
check('Credits, Financial, Media Cloud, Brain y Skills, sin tocar',
  !/materialDeTexto|crearMaterialDeTexto/.test(
    ['core/financial/commerce.ts', 'core/media/entrega.ts', 'core/brain.ts', 'core/skill.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('G6a sigue sin implementar: el Planner no ha cambiado su derivación',
  /if \(necesita === 'text' \|\| aportadas\.has\(necesita\)\) continue;/.test(leer('functions/src/core/planner.ts')),
  'C13 deja el material listo; derivar la arista es otra fase');
check('esta suite está en la cadena de `npm test`',
  /texto-material\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
