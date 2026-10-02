/**
 * EL ESPEJO SE COMPRUEBA — `core/content/vista.ts` vs `services/vistaDeAsset.ts`.
 *
 * ── Por qué hay dos implementaciones ────────────────────────────────────────
 *
 * El Core vive en `functions/src/core`, y `metro.config.js` bloquea `functions/`
 * del bundle de la app: tiene su propio `node_modules` y no se empaqueta. El
 * cliente NO PUEDE importar `vistaDeMaterial`, por mucho que sea justo la
 * función que necesita. No es una decisión de diseño que se pueda deshacer aquí;
 * es una restricción del empaquetador.
 *
 * Así que hay dos ejecuciones de UN contrato. Esto es lo que impide que se
 * separen: se cargan las dos, se les pasan los mismos materiales y se exige que
 * devuelvan exactamente lo mismo. Si alguien cambia una y olvida la otra, esto
 * se rompe y dice en qué material y en qué campo.
 *
 * Sin esta prueba, «espejo» sería un comentario piadoso. Con ella, es un hecho.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Los dos módulos, transpilados al vuelo. El del cliente es puro: no toca Firebase. */
const ts = require('typescript');
const cargar = async (ruta, quitarImports = false) => {
  let fuente = leer(ruta);
  if (quitarImports) fuente = fuente.replace(/^import[\s\S]*?from '[^']*';$/gm, '');
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};

const servidor = await cargar('functions/src/core/content/vista.ts', true);
const cliente = await cargar('services/vistaDeAsset.ts');

/* ── Los materiales con los que se comparan ─────────────────────────────────── */

const REF = { provider: 'unAlmacen', bucket: 'unCubo', objectKey: 'accounts/a/assets/m/original' };
const base = (extra = {}) => ({
  contract: '1.0', assetId: 'asset_0001', ownerAccountId: 'acc_1',
  kind: 'image', status: 'ready', storageRef: REF, mimeType: 'image/png', bytes: 1234,
  width: 1024, height: 768, provenance: { createdAt: 7 }, createdAt: 1, updatedAt: 2, ...extra,
});

const CASOS = [
  ['recién llegado', base({ status: 'uploading', storageRef: undefined })],
  ['preparándose', base({ status: 'processing' })],
  ['disponible y pelado', base()],
  ['falló', base({ status: 'failed' })],
  ['retirado', base({ status: 'deleted', deletedAt: 9 })],
  ['con nombre y etiquetas', base({ name: 'mi foto', tags: ['a', 'b'] })],
  ['con miniatura', base({ variants: [{ kind: 'thumbnail', storageRef: { ...REF, objectKey: 'u/mini.png' }, bytes: 900, width: 200, height: 150 }] })],
  ['con vista previa', base({ variants: [{ kind: 'preview', storageRef: { ...REF, objectKey: 'u/vista.png' }, mimeType: 'image/webp' }] })],
  ['con póster de vídeo', base({ kind: 'video', durationSec: 12, variants: [{ kind: 'poster', storageRef: { ...REF, objectKey: 'u/poster.jpg' } }] })],
  ['con transcodificado', base({ kind: 'video', variants: [{ kind: 'transcoded', storageRef: { ...REF, objectKey: 'u/720.mp4' }, durationSec: 12 }] })],
  ['con las cuatro variantes', base({ variants: [
    { kind: 'transcoded', storageRef: { ...REF, objectKey: 'u/t' } },
    { kind: 'preview', storageRef: { ...REF, objectKey: 'u/p' } },
    { kind: 'poster', storageRef: { ...REF, objectKey: 'u/o' } },
    { kind: 'thumbnail', storageRef: { ...REF, objectKey: 'u/m' } },
  ] })],
  ['generado por Weë', base({ provenance: { createdAt: 7, capability: 'image.generate', provider: 'unProveedor', model: 'un-modelo-v3' } })],
  ['derivado', base({ provenance: { createdAt: 7, sourceAssetIds: ['asset_0002'] } })],
  ['derivado y generado', base({ provenance: { createdAt: 7, capability: 'image.edit', sourceAssetIds: ['asset_0002'] } })],
  ['una mejora de otro', base({ previousVersionId: 'asset_0000' })],
  ['texto sin objeto', base({ kind: 'text', storageRef: undefined, content: 'hola' })],
  ['sin objeto ni texto', base({ storageRef: undefined })],
];

/* ── A · Las dos implementaciones dicen lo mismo ────────────────────────────── */
console.log('\n── A · El espejo: las dos implementaciones, el mismo resultado ──');
{
  const distintos = [];
  for (const [nombre, a] of CASOS) {
    /*
     * El Core recibe si el material trae dirección propia como argumento; el
     * cliente lo mira en `delivery`, que es de donde sale en su caso. Se le pasa
     * lo mismo a los dos para comparar la DECISIÓN, no la fuente del dato.
     */
    const delServidor = servidor.vistaDeMaterial(a, false);
    const delCliente = cliente.vistaDeAsset(a);
    if (JSON.stringify(delServidor) !== JSON.stringify(delCliente)) {
      distintos.push(`${nombre}: ${JSON.stringify(delServidor)} vs ${JSON.stringify(delCliente)}`);
    }
  }
  check('la proyección entera coincide en los diecisiete materiales', distintos.length === 0, distintos.slice(0, 2).join(' | '));

  for (const [fn, args] of [
    ['estadoVisible', ['uploading', 'processing', 'ready', 'failed', 'deleted', 'inventado']],
    ['seListaAlDueno', ['uploading', 'processing', 'ready', 'failed', 'deleted']],
  ]) {
    const malos = args.filter((v) => servidor[fn](v) !== cliente[fn](v));
    check(`${fn} coincide para todos los estados`, malos.length === 0, malos.join(','));
  }

  const origenesDistintos = CASOS.filter(([, a]) => servidor.origenDe(a) !== cliente.origenDe(a));
  check('origenDe coincide en todos', origenesDistintos.length === 0, origenesDistintos.map(([nn]) => nn).join(','));

  const repDistintas = [];
  for (const [nombre, a] of CASOS) {
    for (const para of ['miniatura', 'vista', 'original']) {
      if (JSON.stringify(servidor.representacionPara(a, para)) !== JSON.stringify(cliente.representacionPara(a, para))) {
        repDistintas.push(`${nombre}/${para}`);
      }
    }
  }
  check('representacionPara coincide en los tres propósitos de los diecisiete', repDistintas.length === 0, repDistintas.join(','));

  const genDistintas = CASOS.filter(([, a]) =>
    JSON.stringify(servidor.generacionVisible(a.provenance)) !== JSON.stringify(cliente.generacionVisible(a.provenance)));
  check('generacionVisible coincide en todos', genDistintas.length === 0, genDistintas.map(([nn]) => nn).join(','));

  check('y los dos declaran los mismos estados visibles',
    servidor.ESTADOS_VISIBLES.join(',') === cliente.ESTADOS_VISIBLES.join(','));
}

/* ── B · Y lo que ninguna de las dos puede dejar salir ──────────────────────── */
console.log('\n── B · Ni una de las dos filtra lo interno ──');
{
  const conTodo = base({
    variants: [{ kind: 'thumbnail', storageRef: { ...REF, objectKey: 'u/m' } }],
    provenance: {
      createdAt: 7, capability: 'image.generate', provider: 'unProveedor', model: 'un-modelo-v3',
      cost: { amount: 12, currency: 'USD' }, generationId: 'gen_1', jobId: 'job_1', runId: 'run_1',
      stepId: 'step_1', requestId: 'req_1', operationId: 'op_1', traceId: 'trace_1',
    },
    metadata: { experienceId: 'studio', interno: 'no-debe-salir' },
    delivery: { url: 'https://ejemplo/a?token=abc', kind: 'bearer_token' },
  });
  const AGUJAS = [
    ['el proveedor de IA', 'unProveedor'], ['el modelo', 'un-modelo-v3'], ['el coste', 'USD'],
    ['identificadores de operación', /gen_1|job_1|run_1|step_1|req_1|op_1|trace_1/],
    ['metadata interna', 'no-debe-salir'], ['una URL', 'https://'], ['un token', 'token=abc'],
  ];
  for (const [quien, ns] of [['servidor', servidor.vistaDeMaterial(conTodo, false)], ['cliente', cliente.vistaDeAsset(conTodo)]]) {
    const texto = JSON.stringify(ns);
    const filtradas = AGUJAS.filter(([, a]) => (a instanceof RegExp ? a.test(texto) : texto.includes(a))).map(([q]) => q);
    check(`${quien}: la proyección no lleva nada interno`, filtradas.length === 0, filtradas.join(', '));
    check(`${quien}: y no lleva la referencia de almacén del material`, ns.storageRef === undefined);
  }
  check('la referencia sí va DENTRO de la representación, que es su sitio',
    cliente.vistaDeAsset(conTodo).miniatura.ref.objectKey === 'u/m');
}

/* ── C · El cliente no reconstruye nada por su cuenta ───────────────────────── */
console.log('\n── C · El cliente consume la proyección, no la reinventa ──');
{
  const SERVICIO = sinComentarios(leer('services/assetsService.ts'));
  const REJILLA = sinComentarios(leer('components/creator/RejillaDeCreaciones.tsx'));
  const PANTALLA = sinComentarios(leer('screens/MisCreacionesScreen.tsx'));

  check('ningún consumidor fabrica su clave de traducción pegando el estado interno',
    ![SERVICIO, REJILLA, PANTALLA].some((s) => /creaciones\.(status|kind)\$\{/.test(s)));
  check('ni recorre `variants` a mano para elegir qué enseñar',
    ![SERVICIO, REJILLA, PANTALLA].some((s) => /variants\s*[?.]*\.\s*(find|filter|some)/.test(s)));
  check('la selección de representación se pide a UNA función',
    /representacionPara\(/.test(SERVICIO) && !/representacionPara\(/.test(REJILLA) && !/representacionPara\(/.test(PANTALLA));
  check('y la lista de estados visibles se DERIVA, no se escribe a mano',
    /ESTADOS_QUE_SE_LISTAN/.test(SERVICIO) && !/\['ready',\s*'processing'/.test(SERVICIO));

  /* Lo que el cliente no puede tocar nunca. */
  check('ningún consumidor nombra un proveedor de almacén ni construye una URL desde una referencia',
    ![SERVICIO, REJILLA, PANTALLA].some((s) => /\br2\b|cloudflare|cloudinary|\bs3\b|amazonaws|storageRef\.objectKey|\.bucket\b/i.test(s)));
  check('ni lee el proveedor, el coste o un identificador de operación de la procedencia',
    ![REJILLA, PANTALLA].some((s) => /provenance\.(provider|model|cost|generationId|runId|stepId|traceId)/.test(s)));

  /* El mapa de claves cubre TODO el vocabulario, o el compilador no deja pasar. */
  check('hay una clave declarada para cada estado visible',
    cliente.ESTADOS_VISIBLES.every((e) => typeof cliente.CLAVE_DE_ESTADO[e] === 'string' && cliente.CLAVE_DE_ESTADO[e].startsWith('creaciones.')));
  check('y una para cada tipo de material',
    ['text', 'image', 'video', 'audio', 'document', 'model3d'].every((k) => typeof cliente.CLAVE_DE_TIPO[k] === 'string'));
}

/* ── D · Las claves existen en los diccionarios ─────────────────────────────── */
console.log('\n── D · Y esas claves existen de verdad, en los dos idiomas ──');
{
  const dicc = (locale) => leer(`i18n/textos/${locale}/creaciones.ts`);
  const claves = [...Object.values(cliente.CLAVE_DE_ESTADO), ...Object.values(cliente.CLAVE_DE_TIPO)]
    .map((c) => c.replace('creaciones.', ''));
  for (const locale of ['es', 'en']) {
    const fuente = dicc(locale);
    const faltan = claves.filter((c) => !new RegExp(`\\b${c}\\s*:`).test(fuente));
    check(`en ${locale} no falta ninguna de las once claves`, faltan.length === 0, faltan.join(','));
  }
}

/* ── E · La miniatura no puede sustituir al original ────────────────────────── */
console.log('\n── E · Miniatura y original no se confunden ──');
{
  const conMini = base({ variants: [{ kind: 'thumbnail', storageRef: { ...REF, objectKey: 'u/mini.png' } }] });
  for (const [quien, ns, fn] of [['servidor', servidor, 'vistaDeMaterial'], ['cliente', cliente, 'vistaDeAsset']]) {
    const v = ns[fn](conMini, false);
    check(`${quien}: la miniatura es la variante, no el original`,
      v.miniatura.variante === 'thumbnail' && v.miniatura.esElOriginal === false);
    check(`${quien}: el original es el original, y no trae variante`,
      v.original.esElOriginal === true && v.original.variante === undefined && v.original.ref.objectKey === REF.objectKey);
    check(`${quien}: pedir el original con variantes disponibles NUNCA devuelve una`,
      ns.representacionPara(conMini, 'original').esElOriginal === true);
    check(`${quien}: y un material sin objeto no tiene original que dar`,
      ns.representacionPara(base({ storageRef: undefined }), 'original') === undefined);
  }
}

/* ── F · La entrega sigue siendo agnóstica ──────────────────────────────────── */
console.log('\n── F · La entrega no nombra a nadie ──');
{
  check('el modo de entrega es un vocabulario de Weë, no de un proveedor',
    ['ninguna', 'firmada', 'directa'].includes(cliente.modoDeEntrega(base())));
  check('con objeto y sin dirección guardada, hay que pedir una llave firmada',
    cliente.modoDeEntrega(base()) === 'firmada');
  check('con dirección guardada (lo heredado de F11), es directa',
    cliente.modoDeEntrega(base({ delivery: { url: 'https://x/y', kind: 'bearer_token' } })) === 'directa');
  check('un retirado no se entrega',
    cliente.modoDeEntrega(base({ status: 'deleted', deletedAt: 9, delivery: { url: 'https://x/y', kind: 'public' } })) === 'ninguna');
  check('y el módulo del cliente no nombra ningún almacén',
    !/\br2\b|cloudflare|cloudinary|\bs3\b|amazonaws|gcs|azure/i.test(sinComentarios(leer('services/vistaDeAsset.ts'))));
  check('ni construye direcciones: no hay ni un `http` fuera de los comentarios',
    !/https?:\/\//.test(sinComentarios(leer('services/vistaDeAsset.ts'))));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
