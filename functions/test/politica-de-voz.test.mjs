/*
 * ELEGIR PROVEEDOR ES DE LA POLÍTICA DE ROUTING, NO DEL PLAN (B3.15.2).
 *
 * Para aislar ElevenLabs en su primer canary se intentó que el paso de voz
 * declarase `allowedProviders: ['elevenlabs']`. El Core lo rechazó, y tenía
 * razón: `core/planner.ts` lista esa clave —junto a `provider`, `model`,
 * `adapter`, `modelId` y `excludeProviders`— como decisión de implementación, y
 * un plan declara INTENCIÓN. La guarda de paridad lo cazó (254/255) y el cambio
 * se revirtió entero.
 *
 * El aislamiento vive donde el motor ya lo esperaba: `aiRouting/{capacidad}`,
 * que es configuración y no código. Esta prueba no comprueba la configuración
 * —vive en Firestore y cambia sin desplegar—, comprueba las dos mitades que sí
 * son del repositorio:
 *
 *   A. Ningún plan nombra una implementación.   (EJECUTADO, con el predicado
 *      del propio Core, así que si el Core amplía la lista, esto se aprieta solo)
 *   B. Y el Core lo rechaza si alguien lo intenta.            (EJECUTADO)
 *   C. Una cadena de un solo eslabón aísla de verdad.         (EJECUTADO)
 *   D. Y si ese único no puede, no contesta nadie.            (EJECUTADO)
 *   E. La cadena del repositorio no cambió: esto fue configuración.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { TEMPLATES } = lib('creator/templates.js');
const { claveDeImplementacion } = lib('core/planner.js');

console.log('\n─── A. Ningún plan nombra una implementación. EJECUTADO ───');

/*
 * Se construyen los planes de las once plantillas recorriendo las opciones de su
 * primera pregunta, y CADA clave de CADA `input` se le pasa al predicado del
 * propio Core. No hay lista escrita a mano aquí: la lista es la del Core.
 */
const delitos = [];
let planes = 0; const noConstruidos = [];
for (const [id, tpl] of Object.entries(TEMPLATES)) {
  const primera = tpl.questions?.[0];
  for (const op of primera ? primera.options.map((o) => o.id) : ['idk']) {
    const respuestas = Object.fromEntries((tpl.questions || []).map((q) => [q.id, q.id === primera?.id ? op : 'idk']));
    let p;
    try { p = tpl.buildPlan('Una prueba', respuestas); } catch { noConstruidos.push(`${id}/${op}`); continue; }
    planes++;
    for (const s of p.steps || []) {
      for (const clave of Object.keys(s.input || {})) {
        if (claveDeImplementacion(clave)) delitos.push(`${id}/${op}:${s.id}.${clave}`);
      }
      for (const clave of Object.keys(s)) {
        if (claveDeImplementacion(clave)) delitos.push(`${id}/${op}:${s.id} (raíz).${clave}`);
      }
    }
  }
}
/* Sin suelo, un buildPlan roto vaciaría el barrido y esto pasaría en falso. */
check('1 · el barrido construyó planes de verdad', planes >= 80 && Object.keys(TEMPLATES).length === 11,
  `${planes} planes de ${Object.keys(TEMPLATES).length} plantillas · no construidos: ${noConstruidos.length ? noConstruidos.join(', ') : 'ninguno'}`);
check('2 · ningún paso de ningún plan nombra una implementación',
  delitos.length === 0, delitos.slice(0, 4).join(' | ') || 'ninguno');

/* 3 · y el predicado que se acaba de usar sigue cubriendo lo que dice cubrir. */
for (const clave of ['allowedProviders', 'provider', 'model', 'adapter', 'modelId', 'providerId', 'excludeProviders']) {
  check(`3 · el Core considera «${clave}» decisión de implementación`, claveDeImplementacion(clave));
}
/*
 * Y lo que NO está en esa lista, dicho con precisión para no prometer de más:
 * `preferCheaper` no lo para el Planner —lo para el Gateway, con su lista
 * cerrada de claves de ejecución—. Se afirma lo que es, no lo que sonaría mejor.
 */
check('4 · `preferCheaper` no lo para el Planner, lo para el Gateway',
  !claveDeImplementacion('preferCheaper') && /preferCheaper/.test(leer('functions/src/core/gateway.ts')));

console.log('\n─── B. Y el Core lo rechaza si alguien lo intenta. EJECUTADO ───');

/* CONTROL: el intento revertido, reconstruido. Tiene que caer. */
const intento = { voice: 'idk', allowedProviders: ['elevenlabs'] };
const cazadas = Object.keys(intento).filter((k) => claveDeImplementacion(k));
check('5 · CONTROL: el paso que se intentó poner sería detectado',
  igual(cazadas, ['allowedProviders']), cazadas.join(',') || 'ninguna');
check('6 · y la guarda de paridad con el Core sigue registrada',
  /runtime-paridad\.test\.mjs/.test(leer('functions/package.json')));

console.log('\n─── C. Una cadena de uno aísla de verdad. EJECUTADO ───');

/*
 * Se monta el Router COMPILADO con los adaptadores reales y se le da una
 * configuración cuya única diferencia es la cadena de `voice.tts` —igual que
 * hace `aiRouting/voice.tts` en producción—. No se toca ningún adaptador, ni el
 * registro, ni la configuración de ningún proveedor.
 */
const { createRouter, memoryHealth } = lib('engine/router.js');
const { ADAPTERS, DEFAULT_PROVIDERS, DEFAULT_ROUTING, DEFAULT_SETTINGS } = lib('engine/registry.js');

const conCadena = (cadena, configurado = () => true) => {
  const routing = { ...DEFAULT_ROUTING };
  if (cadena) routing['voice.tts'] = { capability: 'voice.tts', chain: cadena.map((provider) => ({ provider })), policy: 'balanced' };
  return createRouter({
    adapters: Object.fromEntries(Object.entries(ADAPTERS).map(([id, a]) => [id, { ...a, isConfigured: () => configurado(id) }])),
    loadConfig: async () => ({ providers: DEFAULT_PROVIDERS, routing, settings: DEFAULT_SETTINGS }),
    ledger: {}, health: memoryHealth(),
  });
};
const decidir = (router, quality = 'auto') =>
  router.route({ capability: 'voice.tts', input: { text: 'Una prueba de voz de Weë' }, prefs: { quality } });

/* 7 · sin política, la cadena del repositorio: los dos. Es el punto de partida. */
const base = await decidir(conCadena(null));
check('7 · sin política, ElevenLabs y MiniMax son candidatos',
  igual(base.candidates.map((c) => c.provider), ['elevenlabs', 'minimax']),
  base.candidates.map((c) => `${c.provider}/${c.model.id}`).join(' , '));

/* 8-10 · con la política, uno solo, en las tres calidades. */
for (const q of ['auto', 'standard', 'max']) {
  const d = await decidir(conCadena(['elevenlabs']), q);
  check(`8 · con la política y quality=${q}, el único candidato es ElevenLabs`,
    igual(d.candidates.map((c) => c.provider), ['elevenlabs']),
    d.candidates.map((c) => `${c.provider}/${c.model.id}`).join(' , ') || '(ninguno)');
}
check('9 · y el demo no aparece por ningún lado',
  !(await decidir(conCadena(['elevenlabs']))).candidates.some((c) => c.provider === 'mock'));
/* 10 · es genérico: la política no es un permiso para ElevenLabs. */
const alReves = await decidir(conCadena(['minimax']));
check('10 · al revés funciona igual: con MiniMax, ElevenLabs queda fuera',
  igual(alReves.candidates.map((c) => c.provider), ['minimax']), alReves.candidates.map((c) => c.provider).join(','));

console.log('\n─── D. Si el único no puede, no contesta nadie. EJECUTADO ───');

/*
 * Esto es lo que de verdad protege al canary. El candidato de demo se añade
 * DESPUÉS del bucle de la cadena, así que la política no lo tocaría: lo único
 * que lo impide es que solo entra cuando NO hay ningún proveedor real capaz de
 * atender la capacidad —y MiniMax, aunque esté fuera de la cadena, cuenta como
 * real—. Si eso cediera, un fallo de ElevenLabs se serviría como audio de
 * muestra y el canary diría «funciona» sin haber llamado a nadie.
 */
const sinClave = await decidir(conCadena(['elevenlabs'], (id) => id !== 'elevenlabs'));
check('11 · sin clave de ElevenLabs no queda ningún candidato',
  sinClave.candidates.length === 0, sinClave.candidates.map((c) => c.provider).join(',') || '(ninguno)');
check('12 · y el Router dice por qué',
  sinClave.skipped.some((s) => s.provider === 'elevenlabs' && s.reason === 'sin clave configurada'),
  JSON.stringify(sinClave.skipped));
check('13 · ni MiniMax ni el demo ocupan su sitio',
  !sinClave.candidates.some((c) => c.provider === 'minimax' || c.provider === 'mock'));
check('14 · la condición que lo impide sigue escrita',
  /const mockAllowed = !realProviderAvailable;/.test(leer('functions/src/engine/router.ts')));
/* Y aunque entrara, se vería: aquí el demo no es una bandera, es el proveedor. */
check('15 · un demo nunca asciende a nadie a verificado',
  /if \(!demo\) void recordRealSuccess\(/.test(leer('functions/src/engine/router.ts')));

console.log('\n─── E. Esto fue configuración, no código ───');

check('16 · la cadena del repositorio sigue nombrando a los dos',
  /'voice\.tts': routing\('voice\.tts', chain\('elevenlabs', 'minimax'\), 'balanced'\)/.test(leer('functions/src/engine/registry.ts')));
check('17 · las plantillas no mencionan ningún proveedor',
  !/(elevenlabs|minimax|seedance|gemini|deepseek|flux|seedream)/i
    .test(leer('functions/src/creator/templates.ts').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')));
check('18 · MiniMax conserva su adaptador y su sitio por defecto',
  !!ADAPTERS.minimax && igual(DEFAULT_ROUTING['voice.tts'].chain.map((l) => l.provider), ['elevenlabs', 'minimax']));
/* El sitio donde se cambia una cadena sin desplegar, tal y como ya existía. */
check('19 · y cambiar una cadena sigue siendo cosa de aiRouting',
  /aiRouting\/\{capacidad\} \{ chain: \[\{ provider, model\?, minQuality\?, maxQuality\? \}\], policy \}/
    .test(leer('functions/src/engine/admin.ts')));
check('20 · que nadie puede escribir desde el cliente',
  /match \/aiRouting\/\{capabilityId\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nElegir proveedor es de la política de routing, no del plan');
process.exit(failures ? 1 : 0);
