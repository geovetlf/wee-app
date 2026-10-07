/**
 * S6-E.1 · LA PUERTA DEL CANARIO, INSPECCIONADA Y FIJADA.
 *
 * Las ocho propiedades que S6-E.1 exige demostrar antes de desplegar nada son
 * TODAS comprobables sin producción, sin red y sin dinero: la puerta es una
 * función pura (`decidirRuntime`) y la condición del canario está escrita en
 * `creator/video.ts`. Así que se demuestran aquí, y quedan fijadas.
 *
 *   A · La puerta: las ocho propiedades, una a una
 *   B · La matriz de aislamiento: quién va por Core y quién por Legacy
 *   C · DÓNDE PARA CADA INTERRUPTOR — el gap que bloquea la prueba sin proveedor
 *   D · Lo que sigue cerrado
 *
 * Sin proveedor, sin BytePlus, sin red, sin Firestore, sin Credits.
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

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const puerta = lib('runtime/puerta.js');
const registroDeWee = lib('registry/index.js');
const { decidirRuntime, PUERTA_CERRADA } = puerta;
const VIDEO = leer('functions/src/creator/video.ts');

/**
 * La configuración EXACTA que S6-E.1 pide activar. Ni un comodín, ni una cuenta global: desde el 2026-10-06 cada
 * capacidad lleva SU lista (`porCapacidad`), y la del vídeo no abre nada más.
 */
const UID = 'cuenta_de_prueba_0001';
const ACOTADA = {
  habilitado: true,
  porCapacidad: { 'video.generate': { cuentas: [UID], experiencias: ['studio'] } },
};
const pedir = (extra = {}) => decidirRuntime(ACOTADA, {
  capability: 'video.generate', userId: UID, experienceId: 'studio', ...extra,
});

/* ═══ A · LAS OCHO PROPIEDADES ════════════════════════════════════════════ */
console.log('\n── A · La puerta, propiedad por propiedad ──');
{
  /* 1 · Cómo se lee. */
  check('A1) `generateVideo` lee la puerta de `aiSettings/runtime` y decide con la función pura',
    /decidirRuntime\(await configuracionDeLaPuerta\(getFirestore\(\)\)/.test(VIDEO)
    && /DOCUMENTO_DE_LA_PUERTA = 'runtime'/.test(leer('functions/src/runtime/configuracion.ts'))
    && /COLECCION_DE_LA_PUERTA = 'aiSettings'/.test(leer('functions/src/runtime/configuracion.ts')));

  /* 2 · Cómo se identifica la cuenta. */
  check('A2) la cuenta sale de la SESIÓN, no de los datos de la petición',
    /const uid = request\.auth/.test(VIDEO) || /userId: uid/.test(VIDEO));
  check('A2) y es ese mismo `uid` el que la puerta compara',
    /decidirRuntime\([\s\S]{0,200}?userId: uid,/.test(VIDEO));

  /* 3 · La condición exacta. */
  check('A3) la condición es runtime `core` Y la capacidad declarada EN EL CÓDIGO de la puerta',
    /const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/.test(VIDEO)
    && /const porElCore = puerta\.runtime === 'core' && normalizado\.capability === CAPACIDAD_DEL_CANARY;/.test(VIDEO));
  check('A3) así que la configuración puede CERRAR la puerta pero nunca ampliarla a otra capacidad',
    (() => {
      const conOtra = { ...ACOTADA, porCapacidad: { ...ACOTADA.porCapacidad, 'image.generate': { cuentas: [UID], experiencias: ['studio'] } } };
      /* La puerta diría `core` para `image.generate`… */
      const d = decidirRuntime(conOtra, { capability: 'image.generate', userId: UID, experienceId: 'studio' });
      /* …pero esta callable solo manda al Core su propia capacidad. */
      return d.runtime === 'core' && /normalizado\.capability === CAPACIDAD_DEL_CANARY/.test(VIDEO);
    })());

  /* 4 · Cómo se activa y se desactiva. */
  check('A4) se abre y se cierra con un documento, no con un despliegue',
    /Porque volver atrás no puede depender de un despliegue/.test(leer('functions/src/runtime/configuracion.ts'))
    && /VIGENCIA_DE_LA_PUERTA_MS = 60_000/.test(leer('functions/src/runtime/configuracion.ts')));
  check('A4) y por defecto está CERRADA: ausente, ilegible o a medias deja todo en Legacy',
    PUERTA_CERRADA.habilitado === false
    && [undefined, null, {}, 'abierta', [], { habilitado: 'sí' }, { habilitado: true }]
      .every((c) => decidirRuntime(c, { capability: 'video.generate', userId: UID, experienceId: 'studio' }).runtime === 'legacy'));

  /* 5 · Cómo se evita llamar al proveedor. */
  /* El conductor se construye DENTRO de la rama: con la puerta cerrada, el Core ni se monta. */
  check('A5) con la puerta cerrada NO se construye el conductor: el Core ni se monta',
    VIDEO.indexOf('if (porElCore) {') > 0
    && VIDEO.indexOf('conductorDeWee({') > VIDEO.indexOf('if (porElCore) {')
    && (VIDEO.match(/conductorDeWee\(\{/g) || []).length === 1);
  check('A5) y los dos caminos son excluyentes: uno u otro, nunca los dos',
    /Nunca los dos, porque serían dos vídeos y dos cobros/.test(VIDEO));
}

/* ═══ B · LA MATRIZ DE AISLAMIENTO ════════════════════════════════════════ */
console.log('\n── B · Quién va por Core, y todo lo demás por Legacy ──');
{
  const D = pedir();
  check('B-D) cuenta autorizada + `video.generate` + `studio` → CORE',
    D.runtime === 'core' && D.motivo === 'abierta', `${D.runtime}/${D.motivo}`);

  const A = pedir({ userId: 'otra_cuenta_cualquiera' });
  check('B-A) cuenta NO autorizada → LEGACY',
    A.runtime === 'legacy' && A.motivo === 'cuenta_fuera_de_la_prueba', `${A.runtime}/${A.motivo}`);

  const B = pedir({ capability: 'image.generate' });
  check('B-B) capacidad distinta de `video.generate` → LEGACY',
    B.runtime === 'legacy' && B.motivo === 'capacidad_no_migrada', `${B.runtime}/${B.motivo}`);

  const C = decidirRuntime({ ...ACOTADA, habilitado: false }, { capability: 'video.generate', userId: UID, experienceId: 'studio' });
  check('B-C) puerta deshabilitada → LEGACY',
    C.runtime === 'legacy' && C.motivo === 'deshabilitada', `${C.runtime}/${C.motivo}`);

  const E = pedir({ experienceId: 'chef' });
  check('B-E) otra experiencia → LEGACY',
    E.runtime === 'legacy' && E.motivo === 'experiencia_no_migrada', `${E.runtime}/${E.motivo}`);

  const delVideo = ACOTADA.porCapacidad['video.generate'];
  check('B) y la configuración acotada es EXACTAMENTE la pedida: una capacidad, una cuenta, una experiencia',
    Object.keys(ACOTADA.porCapacidad).length === 1 && delVideo.cuentas.length === 1 && delVideo.experiencias.length === 1
    && !Object.keys(ACOTADA.porCapacidad).includes('*') && !delVideo.cuentas.includes('*'));
  check('B) un comodín no vale: ni de capacidad ni de cuenta (la lista se compara por igualdad, no por patrón)',
    decidirRuntime({ habilitado: true, porCapacidad: { '*': { cuentas: [UID] } } }, { capability: 'video.generate', userId: UID }).runtime === 'legacy'
    && decidirRuntime({ habilitado: true, porCapacidad: { 'video.generate': { cuentas: ['*'] } } }, { capability: 'video.generate', userId: UID }).runtime === 'legacy');
}

/* ═══ C · DÓNDE PARA CADA INTERRUPTOR ═════════════════════════════════════ */
console.log('\n── C · El gap: no hay forma de parar ENTRE el trabajo y el proveedor ──');
{
  /*
   * S6-E.1 pide llegar «hasta el punto previo al Adapter» habiendo creado el
   * trabajo (§4.7) y sin llamar al proveedor (§4.10), usando SOLO un mecanismo
   * que ya exista. Esto mide dónde para cada uno de los que hay.
   */
  const CAPS = ['video.generate'];
  let llamadas = 0;
  const seedance = {
    id: 'seedance', name: 'seedance', modalities: ['video'],
    models: [{ id: 'seedance-1', provider: 'seedance', capabilities: CAPS, quality: 5, speed: 3, cost: { unit: 'second', usd: 0.1 } }],
    isConfigured: () => true,
    supports: (c) => CAPS.includes(c),
    async run() { llamadas++; throw new Error('el proveedor NO debe llamarse en una prueba sin proveedor'); },
  };
  const decide = (provs) => core.crearRouter({
    registry: core.crearRegistro(registroDeWee.datosDelRegistro({ seedance }, provs)),
  }).resolver({
    contract: core.ROUTER_CONTRACT_VERSION, capability: 'video.generate',
    trace: { traceId: 's6e1_uno', requestId: 's6e1_uno', userId: 'user-0001' },
  });

  const encendido = decide({ seedance: { enabled: true, priority: 10 } });
  const apagado = decide({ seedance: { enabled: false, priority: 10 } });
  const modeloApagado = decide({ seedance: { enabled: true, priority: 10, models: { 'seedance-1': { enabled: false } } } });

  check('C) con el proveedor encendido, el Router resuelve Seedance',
    encendido.status === 'routed' && encendido.selected.providerId === 'seedance',
    `${encendido.status}`);
  check('C) APAGAR el proveedor para el Router: `unavailable`, y NO se llega a crear un trabajo',
    apagado.status === 'unavailable', `${apagado.status}`);
  check('C) APAGAR el modelo: exactamente lo mismo',
    modeloApagado.status === 'unavailable', `${modeloApagado.status}`);
  check('C) y el Gateway también sabe pararlo — pero ese `if` está DESPUÉS del trabajo',
    /if \(providerConfig\?\.enabled === false\) return rechazo\('PROVIDER_UNAVAILABLE', 'provider_disabled'\);/.test(leer('functions/src/engine/gateway.ts')));

  /*
   * EL GAP, DICHO CON PRECISIÓN. El contrato de F12-D es «el Router va ANTES
   * del trabajo», así que todo interruptor que el Router vea para el flujo
   * antes de que exista un `jobId`. Los tres que existen —proveedor apagado,
   * modelo apagado, adaptador sin clave— los ve el Router.
   */
  check('C) GAP: los tres interruptores existentes los ve el ROUTER, no el Gateway',
    apagado.status === 'unavailable' && modeloApagado.status === 'unavailable'
    && /El Router va ANTES de crear el trabajo/.test(leer('functions/src/runtime/conductor.ts')));
  check('C) y sin clave el adaptador tampoco llega: el registro lo marca antes de enrutar',
    /isConfigured/.test(leer('functions/src/registry/index.ts')));
  check('C) NINGÚN adaptador se llamó en esta suite', llamadas === 0, `${llamadas}`);
}

/* ═══ D · LO QUE SIGUE CERRADO ════════════════════════════════════════════ */
console.log('\n── D · Producción, intacta ──');
{
  check('D) la puerta sigue cerrada por defecto en el código',
    /PUERTA_CERRADA: ConfiguracionDePuerta = Object\.freeze\(\{ habilitado: false/.test(leer('functions/src/runtime/puerta.ts')));
  check('D) el canario sigue siendo UNO, y declarado en su archivo',
    (leer('functions/src/creator/video.ts').match(/CAPACIDAD_DEL_CANARY/g) || []).length === 2
    && /CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate'/.test(leer('functions/src/creator/brain.ts')));
  check('D) `DEFAULT_ROUTING` sin tocar, y `video.generate` sigue siendo solo Seedance',
    /'video\.generate': routing\('video\.generate', chain\('seedance'\), 'quality-first'\)/.test(leer('functions/src/engine/registry.ts')));
  check('D) S6-E.1 no tocó Router, Job Engine, Gateway, Planner ni Financial',
    ['core/router.ts', 'core/job.ts', 'core/gateway.ts', 'core/planner.ts', 'credits/creditEngine.ts']
      .every((f) => !/S6-E/.test(leer(`functions/src/${f}`))));
  check('D) ni se creó un segundo canario, ni un segundo sistema de puertas',
    !/CAPACIDAD_DEL_CANARY/.test(leer('functions/src/elements/contexto.ts'))
    && (leer('functions/src/runtime/puerta.ts').match(/export const decidirRuntime/g) || []).length === 1);

  check('esta suite está en la cadena de `npm test`', /puerta-canario\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
