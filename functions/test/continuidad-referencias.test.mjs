/**
 * WEË CONTINUITY — C8: DE UN ANCLAJE A MATERIAL AUTORIZADO.
 *
 * ── Lo único que hay que entender para leer esta suite ──────────────────────
 *
 * Un `Element` de Weë guarda UN entero de versión en el documento vivo, y
 * actualizarlo sobrescribe en sitio. Cuando algo pasa de v3 a v4, los `refs` de
 * v3 dejan de existir en todo el sistema: no están archivados ni se pueden
 * reconstruir.
 *
 * Así que C8 no tiene historia que consultar, y la regla es una sola:
 *
 *   se pide la versión actual  → se materializa.
 *   se pide cualquier otra     → `version_not_found`. Nunca la de ahora.
 *
 * Media suite existe para demostrar que ese «nunca» es de verdad, porque
 * devolver v4 a quien ancló v3 sería el fallo más caro imaginable: la
 * referencia dejaría de ser la que se pidió y nadie se enteraría jamás.
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

const {
  resolverReferenciasDeContinuidad,
  anclajesQueNecesitanMaterial,
  materialQueRepresenta,
  materialEnLaEntrada,
  MAX_ANCLAJES_DE_CONTINUIDAD,
} = lib('engine/referencias.js');
const { traducirContinuidad, cubreLoExigido, materialDeLaEntrada } = lib('engine/continuidad.js');

/* ── El mundo de prueba. Nada de Firestore: los puertos son los de verdad. ── */

const MIA = 'acc_mia';
const AJENA = 'acc_ajena';

const elemento = (id, version, refs, owner = MIA) => ({
  contract: 1, elementId: id, type: 'character', version, status: 'active',
  name: id, refs, ownerAccountId: owner, createdAt: 1, updatedAt: 1,
});
const ref = (assetId, role = 'primary', kind = 'image') => ({ assetId, role, kind });

const MUNDO = {
  el_luna_0001: elemento('el_luna_0001', 4, [ref('as_luna_v4'), ref('as_luna_extra', 'reference')]),
  el_casa_0001: elemento('el_casa_0001', 1, [ref('as_casa_v1')]),
  el_clip_0001: elemento('el_clip_0001', 2, [ref('as_clip_v2', 'primary', 'video')]),
  el_sinfoto_01: elemento('el_sinfoto_01', 1, [ref('as_suelto', 'supporting')]),
  el_ajeno_0001: elemento('el_ajeno_0001', 1, [ref('as_ajeno')], AJENA),
  el_roto_0001: elemento('el_roto_0001', 1, [ref('as_perdido')]),
};

let lecturasDeElemento = 0;
let lecturasDeEntrega = 0;
const deps = (extra = {}) => ({
  elemento: async (accountId, elementId) => {
    lecturasDeElemento++;
    const e = MUNDO[elementId];
    /* Exactamente lo que hace `leerElemento`: de otra cuenta contesta `null`. */
    return e && e.ownerAccountId === accountId ? e : null;
  },
  entrega: async (assetId) => {
    lecturasDeEntrega++;
    if (assetId === 'as_perdido') return null;
    return { assetId, url: `https://llave.invalid/${assetId}?firma=xyz`, expiraEn: 9_000, vigenciaSegundos: 900 };
  },
  ...extra,
});
const limpiar = () => { lecturasDeElemento = 0; lecturasDeEntrega = 0; };

const pide = (anchors, preserve = ['identity.face'], extra = {}) => ({ preserve, anchors, ...extra });

console.log('\n── A · La versión, que es el corazón de la fase ──');

limpiar();
const actual = await resolverReferenciasDeContinuidad(MIA, pide([{ elementId: 'el_luna_0001', version: 4 }]), deps());
check('la versión ACTUAL se materializa',
  actual.materiales.length === 1 && actual.fallos.length === 0
  && actual.materiales[0]?.assetId === 'as_luna_v4' && actual.materiales[0]?.requestedVersion === 4);

const menor = await resolverReferenciasDeContinuidad(MIA, pide([{ elementId: 'el_luna_0001', version: 3 }]), deps());
check('una versión ANTERIOR no se materializa: `version_not_found`',
  menor.materiales.length === 0 && menor.fallos[0]?.reason === 'version_not_found');
check('y NO cae en la actual: no sale ni un material', menor.materiales.length === 0,
  'devolver v4 a quien ancló v3 rompería el ancla sin que nadie lo viera');

const mayor = await resolverReferenciasDeContinuidad(MIA, pide([{ elementId: 'el_luna_0001', version: 5 }]), deps());
check('una versión POSTERIOR tampoco: `version_not_found`',
  mayor.materiales.length === 0 && mayor.fallos[0]?.reason === 'version_not_found');
check('el fallo dice QUÉ se pidió, no lo que había',
  menor.fallos[0]?.requestedVersion === 3 && mayor.fallos[0]?.requestedVersion === 5
  && menor.fallos[0]?.elementId === 'el_luna_0001');
check('la versión se compara de UNA sola forma, y es la exacta',
  (() => {
    const SRC = sinComentarios(leer('functions/src/engine/referencias.ts'));
    const comparaciones = [...SRC.matchAll(/\.version\s*(===|!==|==|!=|<=|>=|<|>)/g)].map((m) => m[1]);
    return comparaciones.length === 1 && comparaciones[0] === '!=='
      && !/latest|ultimaVersion|versionActual/.test(SRC);
  })(),
  'ni mayor, ni menor, ni «la última»: igual o nada');

console.log('\n── B · De quién es ──');

const ajeno = await resolverReferenciasDeContinuidad(MIA, pide([{ elementId: 'el_ajeno_0001', version: 1 }]), deps());
const fantasma = await resolverReferenciasDeContinuidad(MIA, pide([{ elementId: 'el_no_existe', version: 1 }]), deps());
check('un elemento de otra cuenta se comporta como INEXISTENTE',
  ajeno.materiales.length === 0 && fantasma.materiales.length === 0
  && ajeno.fallos[0]?.reason === 'not_found' && fantasma.fallos[0]?.reason === 'not_found',
  'idénticos a propósito: distinguirlos permitiría descubrir qué tiene otra cuenta probando ids');
check('y no se filtra nada suyo: ni versión, ni material, ni url',
  JSON.stringify(ajeno).indexOf('as_ajeno') === -1 && !JSON.stringify(ajeno).includes('http'));
check('sin cuenta no se resuelve nada',
  (await resolverReferenciasDeContinuidad('', pide([{ elementId: 'el_luna_0001', version: 4 }]), deps())).materiales.length === 0
  && (await resolverReferenciasDeContinuidad(undefined, pide([{ elementId: 'el_luna_0001', version: 4 }]), deps())).lecturas === 0);
check('la cuenta no se deduce ni se acepta del cliente: entra como argumento',
  /accountId: string,/.test(leer('functions/src/engine/referencias.ts'))
  && /deps\.referencias\(trace\.userId,/.test(leer('functions/src/engine/gateway.ts')),
  'trace.userId lo puso el servidor al autenticar');

console.log('\n── C · El material ──');

const sinPrimaria = await resolverReferenciasDeContinuidad(MIA, pide([{ elementId: 'el_sinfoto_01', version: 1 }]), deps());
check('un elemento sin material que enseñar falla explícitamente',
  sinPrimaria.fallos[0]?.reason === 'no_material' && sinPrimaria.materiales.length === 0);
const roto = await resolverReferenciasDeContinuidad(MIA, pide([{ elementId: 'el_roto_0001', version: 1 }]), deps());
check('un material que no se puede entregar falla explícitamente',
  roto.fallos[0]?.reason === 'material_unavailable');
check('se usa la `primary`, que es lo que S4 definió como «la que se enseña sola»',
  materialQueRepresenta(MUNDO.el_luna_0001).assetId === 'as_luna_v4'
  && materialQueRepresenta(MUNDO.el_sinfoto_01) === undefined,
  'no «la primera»: eso sería elegir a dedo');
check('el material que sale NO lleva dónde viven los bytes',
  ['providerId', 'bucket', 'objectKey', 'storageRef', 'ownerAccountId', 'provider']
    .every((c) => !(c in (actual.materiales[0] ?? {})))
  && !/providerId|objectKey|bucket|storageRef/.test(sinComentarios(leer('functions/src/engine/referencias.ts'))));
check('lleva lo que C7 necesita, y con su vocabulario',
  actual.materiales[0]?.materialType === 'image' && actual.materiales[0]?.role === 'primary'
  && typeof actual.materiales[0]?.expiresAt === 'number');
check('y la llave es temporal: caduca',
  actual.materiales[0]?.expiresAt > 0 && 'expiresAt' in (actual.materiales[0] ?? {}));

console.log('\n── D · Varias referencias, una sola resolución ──');

limpiar();
const repetido = await resolverReferenciasDeContinuidad(MIA, pide([
  { elementId: 'el_luna_0001', version: 4 },
  { elementId: 'el_luna_0001', version: 4 },
  { elementId: 'el_luna_0001', version: 4 },
], ['identity.face', 'outfit.clothing', 'pose.body']), deps());
check('el mismo anclaje tres veces se resuelve UNA',
  repetido.materiales.length === 1 && lecturasDeElemento === 1 && lecturasDeEntrega === 1,
  `lecturas: ${lecturasDeElemento} elemento + ${lecturasDeEntrega} entrega`);
check('tres aspectos apoyados en la misma referencia tampoco la duplican',
  repetido.materiales.length === 1);
check('pero el mismo elemento en DOS versiones son dos anclajes distintos',
  anclajesQueNecesitanMaterial(pide([
    { elementId: 'el_luna_0001', version: 4 },
    { elementId: 'el_luna_0001', version: 3 },
  ])).length === 2);

limpiar();
const varios = await resolverReferenciasDeContinuidad(MIA, pide([
  { elementId: 'el_luna_0001', version: 4 },
  { elementId: 'el_casa_0001', version: 1 },
  { elementId: 'el_clip_0001', version: 2 },
], ['identity.face', 'architecture.geometry', 'action.movement']), deps());
check('personaje + entorno + clip: tres referencias, tres materiales',
  varios.materiales.length === 3 && varios.fallos.length === 0);
check('coste MEDIDO: 1 lectura por elemento + 2 por entrega, sin una sola consulta',
  varios.lecturas === 3 * 3 && lecturasDeElemento === 3 && lecturasDeEntrega === 3,
  `${varios.lecturas} lecturas para 3 referencias`);
check('y no hay ninguna consulta: solo lecturas por identificador',
  !/\.where\(|collection\(|orderBy|limit\(/.test(leer('functions/src/engine/referencias.ts')));

const demasiados = Array.from({ length: MAX_ANCLAJES_DE_CONTINUIDAD + 2 }, (_, i) => ({ elementId: `el_x_${i}`, version: 1 }));
const topado = await resolverReferenciasDeContinuidad(MIA, pide(demasiados), deps());
check('hay un tope duro, y lo que sobra se NOMBRA en vez de recortarse',
  topado.fallos.filter((f) => f.reason === 'limit_exceeded').length === 2,
  `tope ${MAX_ANCLAJES_DE_CONTINUIDAD}`);

console.log('\n── E · Lo que no pide material ──');

check('`mayChange` solo no materializa nada',
  anclajesQueNecesitanMaterial({ mayChange: ['outfit.clothing'], anchors: [{ elementId: 'el_luna_0001', version: 4 }] }).length === 0,
  'permiso no es orden: traer material por algo que se autorizó a cambiar sería pagar lecturas por nada');
check('y muchos `mayChange` NO bloquean una generación',
  (await resolverReferenciasDeContinuidad(MIA, {
    preserve: ['identity.face'],
    mayChange: ['outfit.clothing', 'lighting.type', 'environment.weather', 'style.medium'],
    anchors: [{ elementId: 'el_luna_0001', version: 4 }],
  }, deps())).fallos.length === 0);
check('sin continuidad no se resuelve nada y no se lee nada',
  anclajesQueNecesitanMaterial(undefined).length === 0
  && (await resolverReferenciasDeContinuidad(MIA, undefined, deps())).lecturas === 0
  && (await resolverReferenciasDeContinuidad(MIA, { preserve: ['identity.face'] }, deps())).lecturas === 0);

console.log('\n── F · Cómo llega a C7 ──');

const entrada = materialEnLaEntrada(varios.materiales, { prompt: 'una escena' });
check('el material entra por las claves ABSTRACTAS que el motor ya usaba',
  Array.isArray(entrada.referenceImages) && entrada.referenceImages.length === 2
  && Array.isArray(entrada.referenceVideos) && entrada.referenceVideos.length === 1,
  'referenceImages / referenceVideos, no `input_image` ni `reference_image`');
check('y NO pisa lo que ya venía: una foto adjunta sigue estando',
  materialEnLaEntrada(actual.materiales, { referenceImages: ['https://mia.invalid/foto.jpg'] })
    .referenceImages.length === 2);
check('C7 ve el material y lo traduce: PARCIAL, ni un ápice más',
  (() => {
    const t = traducirContinuidad({ preserve: ['identity.face'] },
      { referenciasDeImagen: 8, referenciasDeVideo: 0, controlesDedicados: [], admiteFuerza: false },
      materialDeLaEntrada(entrada));
    return t.aspects[0].support === 'partial' && t.aspects[0].reason === 'reference_conditioning';
  })());
check('sin material, C7 sigue diciendo `missing_material` y no inventa nada',
  traducirContinuidad({ preserve: ['identity.face'] },
    { referenciasDeImagen: 8, controlesDedicados: [] }, materialDeLaEntrada({ prompt: 'x' }))
    .aspects[0].reason === 'missing_material');
check('un texto o un documento no se fuerzan a hueco de imagen',
  materialEnLaEntrada([{ ...(actual.materiales[0] ?? {}), materialType: 'text' }], { prompt: 'x' }).referenceImages === undefined);

console.log('\n── G · Los huecos, que hasta hoy no se contaban ──');

const MEC4 = { referenciasDeImagen: 4, referenciasDeVideo: 0, controlesDedicados: [], admiteFuerza: false };
const seis = traducirContinuidad({ preserve: ['identity.face', 'outfit.clothing'], strength: 'strict' }, MEC4, { imagenes: 6, videos: 0 });
check('seis referencias y cuatro huecos: `slots_exhausted`, NO «las cuatro primeras»',
  seis.aspects.every((a) => a.reason === 'slots_exhausted' && a.support === 'unsupported'),
  seis.aspects.map((a) => a.reason).join(','));
check('y nada queda cubierto: elegir cuál sacrificar es decidir por la persona',
  seis.noCubiertos.length === 2 && !cubreLoExigido(seis));
check('con MUST PRESERVE sin cubrir, la ejecución se rechaza ANTES del proveedor',
  /continuity: 'pre_execution_rejected'/.test(leer('functions/src/engine/gateway.ts'))
  && /if \(!cubreLoExigido\(traduccion\)\)/.test(leer('functions/src/engine/gateway.ts')));
check('justo cuatro y cuatro sí cabe',
  traducirContinuidad({ preserve: ['identity.face'] }, MEC4, { imagenes: 4, videos: 0 }).aspects[0].support === 'partial');
check('y `strict` sigue siendo `strict` aunque no quepa',
  seis.strength === 'strict' && seis.fuerzaSinTraducir === true);

console.log('\n── H · Lo que C8 NO hace ──');

{
  const SRC = sinComentarios(leer('functions/src/engine/referencias.ts'));
  check('no escribe: ni una fila, ni un campo, ni una marca',
    !/\.set\(|\.update\(|\.create\(|\.delete\(|runTransaction/.test(SRC));
  check('no llama a ningún proveedor', !/fetch\(|http|axios|ProviderError/.test(SRC));
  check('no cobra', !/credit|Credit|spend|refund/i.test(SRC));
  check('no crea trabajos ni flujos', !/crearTrabajo|JobStore|Workflow|Orchestrator/.test(SRC));
  check('no enruta ni elige modelo', !/router|Router|modelId|providerId|elegirModelo/.test(SRC));
  check('no mira ninguna imagen', !/similarity|embedding|CLIP|compararImagenes|segmentation/i.test(SRC));
  check('y no nombra a ningún proveedor',
    !/(?<![a-z])(gemini|seedance|seedream|deepseek|openai|claude|anthropic|elevenlabs|minimax|flux|bytedance|byteplus|r2|cloudinary)(?![a-z])/i.test(SRC));
}

console.log('\n── I · Lo que NO se creó, y era el encargo ──');

check('no hay historia de versiones de Element: no se creó ninguna',
  !/versions\//.test(leer('functions/src/elements/index.ts'))
  && !/previousVersionId/.test(leer('functions/src/engine/referencias.ts')),
  'la cadena de versiones del Asset NO se usa para reconstruir la del Element');
check('el camino de escritura de Element no se tocó',
  /tx\.set\(ref, siguiente\)/.test(leer('functions/src/elements/index.ts')));
check('no hay segundo firmador, ni segundo cliente de almacén, ni segunda puerta',
  /solicitarEntrega/.test(leer('functions/src/engine/referencias-de-wee.ts'))
  && /leerElemento/.test(leer('functions/src/engine/referencias-de-wee.ts'))
  && !/urlFirmada|signedUrl|S3Client|PutObject/.test(leer('functions/src/engine/referencias.ts')));
check('el Router no cambió y sigue sin saber de continuidad',
  !/continuity|continuidad/i.test(leer('functions/src/core/router.ts'))
  && !/continuity|continuidad/i.test(leer('functions/src/router/politica.ts')));
check('el Core sigue sin nombrar proveedores ni saber de materialización',
  !/traducirContinuidad|resolverReferenciasDeContinuidad/.test(leer('functions/src/core/continuity.ts'))
  && !/referencias/.test(leer('functions/src/core/continuity.ts')));

console.log('\n── J · Sin continuidad, todo sigue igual ──');

check('la resolución solo ocurre si hay requisitos Y hay puerto',
  /if \(requisitosDeContinuidad && deps\.referencias\)/.test(leer('functions/src/engine/gateway.ts')),
  'sin puerto no se materializa nada, que es el comportamiento de antes de C8');
check('sin material, la entrada llega INTACTA al adaptador',
  (() => { const e = { prompt: 'x', referenceImages: ['ya.jpg'] }; return materialEnLaEntrada([], e) === e; })(),
  'el mismo objeto, no una copia equivalente: nada se toca cuando no hay nada que añadir');
check('el mundo de Firestore se carga AL USARSE, no al importar el Gateway',
  /await import\('\.\/referencias-de-wee'\)/.test(leer('functions/src/engine/gateway.ts'))
  && !/^import .*referencias-de-wee/m.test(leer('functions/src/engine/gateway.ts')));
check('un adaptador NUNCA recibe un `elementId` en lugar de material',
  ['flux', 'seedance', 'gemini'].every((p) => !/elementId/.test(sinComentarios(leer(`functions/src/engine/providers/${p}.ts`))))
  && !/elementId/.test(sinComentarios(leer('functions/src/engine/continuidad.ts'))),
  'el guard de C7, intacto: los adaptadores no son motores de contexto');
check('y ninguno se inventa un control dedicado',
  ['flux', 'seedance', 'gemini'].every((p) => /controlesDedicados: \[\]/.test(leer(`functions/src/engine/providers/${p}.ts`))));
check('el mecanismo lo DECLARA el adaptador; nunca se le supone uno',
  /adapter\.continuidad\?\.\(/.test(leer('functions/src/engine/gateway.ts'))
  && /referenciasDeImagen: 0, referenciasDeVideo: 0, controlesDedicados: \[\]/.test(leer('functions/src/engine/gateway.ts')),
  'sin declaración, cero huecos: lo exigido no se sostiene y se rechaza');
check('esta suite está en la cadena de `npm test`',
  /continuidad-referencias\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
