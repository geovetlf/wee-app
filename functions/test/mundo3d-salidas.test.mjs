/**
 * FASES 3 y 4 · LOS DERECHOS DEL MUNDO LLEGAN AL MATERIAL, Y EL MUNDO Y SU VISTA PREVIA SON PAPELES
 * (misión «cerrar los gaps de world.generate», 2026-10-05).
 *
 *   A · Los derechos salen de los DATOS del modelo que atendió (`derechosDeImplementacion`), con UNA regla para los
 *       tres caminos que crean materiales: modelo territorial, modelo sin restricciones, modelo sin licencia ajena,
 *       otro proveedor. Ni un caso especial de nadie.
 *   B · Por los tres caminos, el material los recibe: `creatorRun` (`materialesDeResultado`), el Core síncrono
 *       (`materialDeWee`) y la materialización asíncrona (`atenderAviso` → `PeticionDeMaterializacion.derechos`).
 *   C · World + Preview, World sin Preview, Preview opcional que no llega, múltiples salidas, salida inválida o mal
 *       formada: por el PAPEL que declara el esquema, nunca por el nombre, la extensión o el orden.
 *   D · Lo asíncrono: el recurso es el PRINCIPAL por su papel y las variantes viajan aparte, temporales.
 *   E · Un mundo es un MUNDO por cualquier camino (`world`, no `model3d`).
 *
 * La persistencia de verdad (Firestore y Storage) la prueba `mundo3d.emulator.mjs`. Aquí, sin red ni Firebase. $0.
 *
 *   node functions/test/mundo3d-salidas.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const lib = (p) => require(path.resolve(AQUI, '../lib/', p));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lanza = async (f) => { try { await f(); return null; } catch (e) { return e; } };

const http = lib('engine/http.js');
const { derechosDeImplementacion } = lib('engine/derechos.js');
const { ADAPTERS } = lib('engine/registry.js');
const { derechosValidos } = lib('core/content/asset.js');
const M = lib('engine/providers/fal-modelos.js');
const HW = M.HUNYUAN_WORLD_IMAGEN_A_MUNDO;
const { atenderAviso } = lib('runtime/atencion.js');
const { tipoDeMaterialDe, identidadDelMaterial } = lib('runtime/materializacion.js');
const { claveDeOperacion, clavesDeOperacionDe, intentoDeLaOperacion } = lib('runtime/proveedor.js');
const { crearJobEngine, POLITICA_DE_TRABAJO } = lib('core/job.js');

/* ── Un modelo que se puede inventar sin tocar los datos de nadie ── */
const gobierno = (extra = {}) => ({
  providerModelId: 'prueba/mundo', version: '1', reviewStatus: 'APPROVED', active: 'ACTIVE',
  commercialUseStatus: 'ALLOWED', licenseStatus: 'CLEAR', outputRightsStatus: 'CLEAR', attributionRequired: false,
  licencias: [{ nombre: 'Licencia abierta de prueba', url: 'https://ejemplo.test/licencia', notas: ['ninguna'] }],
  pricingMode: 'per_generation', providerPricing: null, inputSchema: [], outputSchema: [], fuentes: [], lastVerifiedAt: '2026-10-05', motivo: 'prueba', ...extra,
});
const adaptador = (id, modelos) => ({ id, name: id, modalities: ['3d'], models: modelos, isConfigured: () => true, supports: () => true, run: async () => { throw new Error('no'); } });

/* ═══ A · LOS DERECHOS SALEN DE LOS DATOS DEL MODELO ══════════════════════ */
console.log('\n── A · Una regla: los derechos del modelo que atendió ──');
{
  const hunyuan = derechosDeImplementacion({ providerId: 'fal', modelId: HW.id });
  check('A1) modelo con restricciones territoriales (Hunyuan World, sus datos de verdad): revisión, uso comercial, atribución, sus dos licencias y la UE, el Reino Unido y Corea del Sur',
    hunyuan?.revision === 'REVIEW_REQUIRED' && hunyuan.usoComercial === 'RESTRICTED' && hunyuan.atribucion === true
    && hunyuan.licencias.length === 2 && iguales(hunyuan.jurisdiccionesBloqueadas, ['EU', 'GB', 'KR']) && derechosValidos(hunyuan), JSON.stringify(hunyuan));
  const libre = { id: 'libre', provider: 'otro', capabilities: ['world.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.1 }, gobierno: gobierno() };
  const otro = { otro: adaptador('otro', [libre]) };
  const delOtro = derechosDeImplementacion({ providerId: 'otro', modelId: 'libre' }, otro);
  check('A2) modelo sin restricciones (otro proveedor, otra licencia): SUS derechos, sin jurisdicciones bloqueadas, y nada de Hunyuan',
    delOtro?.revision === 'APPROVED' && delOtro.usoComercial === 'ALLOWED' && delOtro.atribucion === false && !('jurisdiccionesBloqueadas' in delOtro)
    && delOtro.licencias.map((l) => l.nombre).join() === 'Licencia abierta de prueba' && derechosValidos(delOtro), JSON.stringify(delOtro));
  const sinLicenciaAjena = ADAPTERS.gemini?.models?.[0];
  check('A3) un modelo sin licencia ajena declarada (sin gobierno) no deja derechos que copiar',
    !!sinLicenciaAjena && derechosDeImplementacion({ providerId: 'gemini', modelId: sinLicenciaAjena.id }) === undefined);
  check('A4) sin implementación, con un proveedor o un modelo que no existen, nada: no se inventa una licencia',
    [undefined, {}, { providerId: 'fal' }, { modelId: HW.id }, { providerId: 'nadie', modelId: 'x' }, { providerId: 'fal', modelId: 'fal-ai/no-revisado' }]
      .every((i) => derechosDeImplementacion(i) === undefined));
  const codigo = sinComentarios(leer('functions/src/engine/derechos.ts'));
  check('A5) y la regla no sabe de ningún proveedor ni de ningún modelo: sin Hunyuan, sin fal, sin listas de países',
    !/hunyuan|tencent|\bfal\b|'EU'|'GB'|'KR'/i.test(codigo) && /derechosDelModelo\(/.test(codigo));
}

/* ═══ B · POR LOS TRES CAMINOS, EL MATERIAL LOS RECIBE ═════════════════════ */
console.log('\n── B · creatorRun, el Core síncrono y el asíncrono los pasan al material ──');
{
  const creator = sinComentarios(leer('functions/src/creator/index.ts'));
  check('B1) creatorRun: los derechos del modelo que atendió (por su id, que ahora viaja con la ejecución) van al material',
    /const derechos = derechosDeImplementacion\(\{ providerId: run\.provider, modelId: run\.modelId \}\)/.test(creator)
    && /\.\.\.\(derechos \? \{ derechos \} : \{\}\)/.test(creator) && /modelId: result\.modelId/.test(sinComentarios(leer('functions/src/gateway/index.ts'))));
  const runtime = sinComentarios(leer('functions/src/runtime/index.ts'));
  check('B2) el Core síncrono (`materialDeWee`) y la composición del asíncrono (`atencionDeWee.derechosDe`) preguntan a la MISMA regla, con el modelo del trabajo',
    (runtime.match(/derechosDeImplementacion\(job\.implementation\)/g) ?? []).length === 2);

  /* El asíncrono, de verdad: el motor de siempre, un trabajo de mundo aceptado y un materializador que apunta lo que le piden. */
  const motor = crearJobEngine();
  const T0 = 1_700_000_000_000;
  const OPERACION = 'hunyuan-world-op-1';
  const trabajo = (o = {}) => ({
    contract: '1.0', jobId: 'jw1', revision: 1, state: 'waiting', owner: { userId: 'uAna' }, context: { operationId: 'oper-1' },
    capability: 'world.generate', implementation: o.implementation ?? { providerId: 'fal', modelId: HW.id, adapterId: 'adapter:fal' },
    input: { modo: 'desde_imagen' }, trace: { traceId: 'tr', requestId: 'req-w', userId: 'uAna', runId: 'run-w', stepId: 'crear' },
    metadata: { creditTransactionId: 'usage_req-w', creditRequestId: 'req-w', creditsEstimated: 39, service: 'ai_world' },
    mode: 'sync', policy: POLITICA_DE_TRABAJO, idempotency: { key: 'k', scope: 's', fingerprint: 'f' },
    createdAt: T0, updatedAt: T0, deadlineAt: T0 + 3_600_000, availableAt: T0,
    attempts: [{ attemptId: 'jw1#1', number: 1, startedAt: T0, dispatched: true, providerKey: 'k1', providerRef: { providerId: 'fal', operationId: OPERACION } }],
    attemptCount: 1, seenEvents: [],
  });
  const mundo = (job, derechosDe) => {
    const jobs = new Map([[job.jobId, job]]);
    const pedidos = [];
    return {
      pedidos,
      deps: {
        trabajos: {
          async porReferenciaDeProveedor(providerId, operationId) {
            const clave = claveDeOperacion(providerId, operationId);
            const encontrado = [...jobs.values()].find((j) => clave && clavesDeOperacionDe(j).includes(clave));
            const i = encontrado && intentoDeLaOperacion(encontrado, { providerId, operationId });
            return i ? { ok: true, job: encontrado, intento: i } : { ok: false, motivo: 'no_encontrada' };
          },
        },
        motor,
        almacen: { async aplicar(t) { jobs.set(t.jobId, t.job); return { applied: true, job: t.job }; } },
        materializar: { async guardar(p) { pedidos.push(p); return { ok: true, assetId: p.assetId, yaEstaba: false }; } },
        ahora: () => T0 + 60_000,
        ...(derechosDe ? { derechosDe } : {}),
      },
    };
  };
  const AVISO = {
    providerId: 'fal', operationId: OPERACION, providerStatus: 'OK', desenlace: 'terminado',
    recurso: 'https://v3.fal.media/files/abc/world.bin',
    variantes: [{ kind: 'preview', recurso: 'https://v3.fal.media/files/abc/preview.png' }],
  };
  const conRegla = mundo(trabajo(), (job) => derechosDeImplementacion(job.implementation));
  const r = await atenderAviso(conRegla.deps, AVISO);
  const pedido = conRegla.pedidos[0];
  check('B3) asíncrono: un mundo terminado se materializa con los derechos del modelo del TRABAJO (no del aviso), como mundo, y con su vista previa',
    r.estado === 'aplicado' && r.terminal === true && pedido?.kind === 'world'
    && iguales(pedido.derechos?.jurisdiccionesBloqueadas, ['EU', 'GB', 'KR']) && iguales(pedido.variantes, AVISO.variantes)
    && pedido.assetId === identidadDelMaterial('jw1', 'jw1#1') && pedido.userId === 'uAna', JSON.stringify({ r, kind: pedido?.kind, d: pedido?.derechos }));
  const otroModelo = mundo(trabajo({ implementation: { providerId: 'otro', modelId: 'libre' } }), (job) => derechosDeImplementacion(job.implementation, { otro: adaptador('otro', [{ id: 'libre', provider: 'otro', capabilities: ['world.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.1 }, gobierno: gobierno() }]) }));
  await atenderAviso(otroModelo.deps, { ...AVISO, variantes: undefined });
  check('B4) proveedor alternativo: el mismo camino deja SUS derechos (sin jurisdicciones bloqueadas) y sin vista previa si no la dio',
    otroModelo.pedidos[0]?.derechos?.revision === 'APPROVED' && !('jurisdiccionesBloqueadas' in otroModelo.pedidos[0].derechos) && !('variantes' in otroModelo.pedidos[0]));
  const avisoForjado = { ...AVISO, derechos: { revision: 'APPROVED', usoComercial: 'ALLOWED', atribucion: false, licencias: [] } };
  const forjado = mundo(trabajo(), (job) => derechosDeImplementacion(job.implementation));
  await atenderAviso(forjado.deps, avisoForjado);
  check('B5) quien manda un aviso no decide los derechos: lo que diga de sí mismo se ignora y manda el modelo del trabajo guardado',
    iguales(forjado.pedidos[0]?.derechos?.jurisdiccionesBloqueadas, ['EU', 'GB', 'KR']) && forjado.pedidos[0]?.derechos?.revision === 'REVIEW_REQUIRED');
  const sinRegla = mundo(trabajo());
  await atenderAviso(sinRegla.deps, AVISO);
  check('B6) y sin la regla compuesta (el runtime no conoce proveedores), no se inventan: el material no lleva derechos de nadie',
    sinRegla.pedidos.length === 1 && !('derechos' in sinRegla.pedidos[0]));
  const materializador = sinComentarios(leer('functions/src/content/materializador.ts'));
  check('B7) el materializador de verdad los pasa al material en sus DOS caminos (el que trae los bytes y el que adopta un objeto sin ficha)',
    (materializador.match(/\.\.\.\(peticion\.derechos \? \{ derechos: peticion\.derechos \} : \{\}\)/g) ?? []).length === 2);
}

/* ═══ C · WORLD Y PREVIEW, POR PAPELES ═════════════════════════════════════ */
console.log('\n── C · El papel lo declara el esquema, no el archivo ──');
const F = lib('engine/providers/fal.js');
/* Un modelo de fal que SÍ declara vista previa (y una miniatura), con el mapeo del de verdad. Solo existe en esta prueba. */
const CON_VISTA = {
  ...HW, id: 'fal-ai/prueba/mundo-con-vista', gobierno: {
    ...HW.gobierno, providerModelId: 'fal-ai/prueba/mundo-con-vista',
    outputSchema: [
      { nombre: 'preview_image', tipo: 'file', requerido: false, papel: 'preview' },
      { nombre: 'world_file', tipo: 'file', requerido: true, papel: 'principal' },
      { nombre: 'thumb', tipo: 'file', requerido: false, papel: 'thumbnail' },
    ],
  },
};
const DOS_PRINCIPALES = { ...CON_VISTA, id: 'fal-ai/prueba/dos', gobierno: { ...CON_VISTA.gobierno, providerModelId: 'fal-ai/prueba/dos', outputSchema: [...CON_VISTA.gobierno.outputSchema, { nombre: 'world_file_drc', tipo: 'file', requerido: false, papel: 'principal' }] } };
/** El adaptador compilado, con estos modelos en su catálogo propio y el mapeo del modelo de verdad. */
const conModelos = (modelos) => {
  const fuente = fs.readFileSync(path.resolve(AQUI, '../lib/engine/providers/fal.js'), 'utf8');
  const modulo = { exports: {} };
  const datos = { ...M, MODELOS_FAL: [HW, ...modelos], ENTRADA_DE_WEE_POR_MODELO: Object.fromEntries([HW, ...modelos].map((m) => [m.id, M.ENTRADA_DE_WEE_POR_MODELO[HW.id]])) };
  const requerir = (spec) => (spec === './fal-modelos' ? datos : require(spec.startsWith('.') ? path.resolve(AQUI, '../lib/engine/providers', spec) : spec));
  new Function('exports', 'require', 'module', '__filename', '__dirname', fuente)(modulo.exports, requerir, modulo, 'fal.js', path.resolve(AQUI, '../lib/engine/providers'));
  return modulo.exports;
};
const FV = conModelos([CON_VISTA, DOS_PRINCIPALES]);

/* La red, en memoria (como en proveedor-fal). */
const ORIGINAL = { fetchJson: http.fetchJson, pollUntil: http.pollUntil, persistRemoteFile: http.persistRemoteFile, readImage: http.readImage };
let respuestas = [];
const guardados = [];
http.fetchJson = async () => { const r = respuestas.shift(); if (r instanceof Error) throw r; return r; };
http.pollUntil = async (comprobar) => { for (let i = 0; i < 10; i++) { const e = await comprobar(); if (e.done) return e.value; } throw new http.ProviderError('sondeo', 'fal', 504); };
http.persistRemoteFile = async (userId, url, proveedor, etiqueta) => {
  if (/falla/.test(url)) throw new http.ProviderError('fal: no se pudo copiar', 'fal', 502);
  guardados.push({ url, etiqueta });
  return `https://firebasestorage.googleapis.com/v0/b/get-wee.appspot.com/o/users%2Fu1%2Fai-generations%2F${etiqueta}.bin?alt=media`;
};
http.readImage = async () => ({ buffer: Buffer.from('foto'), contentType: 'image/png' });
const claveAntes = process.env.FAL_KEY;
process.env.FAL_KEY = 'clave-de-prueba-no-real';

const FOTO = 'https://firebasestorage.googleapis.com/v0/b/get-wee.appspot.com/o/users%2Fu1%2Fcreator-inputs%2Ffaro.png?alt=media&token=t';
const ENTRADA = { modo: 'desde_imagen', imagen: FOTO, espacio: 'exterior', elementos: [] };
const ENVIO = { request_id: 'req-1', status_url: 'https://queue.fal.run/x/requests/req-1/status', response_url: 'https://queue.fal.run/x/requests/req-1' };
const archivo = (nombre, extra = {}) => ({ url: `https://v3.fal.media/files/abc/${nombre}`, content_type: 'application/octet-stream', file_size: 100, ...extra });
const correr = async (modelo, resultado, A = FV) => {
  respuestas = [ENVIO, { status: 'COMPLETED' }, resultado];
  guardados.length = 0;
  return A.falAdapter.run({ capability: 'world.generate', model: modelo, input: { ...ENTRADA }, ctx: { userId: 'u1', requestId: 'r1' }, timeoutMs: 60_000 });
};
{
  const r = await correr(CON_VISTA, { preview_image: archivo('vista.png', { content_type: 'image/png' }), world_file: archivo('mundo.bin') });
  check('C1) World + Preview: el mundo es EL resultado (url, urls de uno) y la vista previa, una variante con su tipo — aunque el esquema la declare primero',
    r.output.kind === 'world' && r.output.urls.length === 1 && r.output.url === r.output.urls[0] && /world_file/.test(r.output.url)
    && r.output.variantes?.length === 1 && r.output.variantes[0].kind === 'preview' && /preview_image/.test(r.output.variantes[0].url) && r.output.variantes[0].mimeType === 'image/png',
    JSON.stringify(r.output));
  check('C2) y queda dicho para el libro qué papel hizo cada archivo, sin URLs', iguales(r.meta.archivos.map((a) => `${a.campo}:${a.papel}`), ['world_file:principal', 'preview_image:preview'])
    && !JSON.stringify(r.meta.archivos).includes('http'));
}
{
  const r = await correr(HW, { world_file: archivo('mundo.bin') });
  check('C3) World sin Preview (el modelo de hoy no la declara): el mundo, ni una variante, y UN solo archivo copiado — no se inventa una vista previa',
    r.output.kind === 'world' && r.output.urls.length === 1 && !('variantes' in r.output) && guardados.length === 1 && guardados[0].etiqueta === 'world_file');
}
{
  const r = await correr(CON_VISTA, { world_file: archivo('mundo.bin') });
  check('C4) Preview opcional que no llega: el mundo sale igual, sin variante y sin error', r.output.urls.length === 1 && !('variantes' in r.output) && guardados.length === 1);
}
{
  const r = await correr(DOS_PRINCIPALES, {
    world_file_drc: archivo('mundo.drc'), thumb: archivo('mini.png'), preview_image: archivo('vista.png'),
    world_file: archivo('mundo.bin'), extra_no_declarado: archivo('otra-cosa.bin'),
  });
  check('C5) múltiples salidas: un principal (el primero que declara el esquema), una variante de cada clase, lo NO declarado ignorado y un segundo principal descartado con su motivo',
    /world_file\./.test(r.output.url) && r.output.urls.length === 1 && iguales(r.output.variantes.map((v) => v.kind).sort(), ['preview', 'thumbnail'])
    && r.meta.descartados?.some((d) => /world_file_drc: un segundo archivo principal/.test(d)) && !guardados.some((g) => /extra|drc/.test(g.etiqueta)),
    JSON.stringify({ o: r.output, d: r.meta.descartados }));
}
{
  const sinPrincipal = await lanza(() => correr(CON_VISTA, { preview_image: archivo('vista.png') }));
  const principalRoto = await lanza(() => correr(CON_VISTA, { world_file: { url: 42 } }));
  const principalSinCifrar = await lanza(() => correr(CON_VISTA, { world_file: archivo('x', { url: 'http://v3.fal.media/files/x' }) }));
  check('C6) salida inválida: sin el principal (aunque llegue la vista previa), con su archivo mal formado o sin cifrar → error de proveedor que NO se reintenta',
    [sinPrincipal, principalRoto].every((e) => e?.name === 'ProviderError' && e.status === 502 && e.retryable === false && /principal/.test(e.message))
    && principalSinCifrar?.name === 'ProviderError' && principalSinCifrar.retryable === false,
    [sinPrincipal, principalRoto, principalSinCifrar].map((e) => e?.message ?? 'no lanzó').join(' | '));
  const vistaRota = await correr(CON_VISTA, { world_file: archivo('mundo.bin'), preview_image: archivo('vista-falla.png') });
  check('C7) una vista previa que no se puede guardar no tumba un mundo bueno: sale sin ella y queda dicho por qué',
    vistaRota.output.urls.length === 1 && !('variantes' in vistaRota.output) && vistaRota.meta.descartados?.some((d) => /preview_image: no se pudo guardar/.test(d)));
  const malFormada = await correr(CON_VISTA, { world_file: archivo('mundo.bin'), preview_image: 'no-es-un-archivo', thumb: { content_type: 'image/png' } });
  check('C8) un archivo de variante mal formado (sin url, o que no es un objeto) se ignora: no se inventa nada con él',
    !('variantes' in malFormada.output) && guardados.length === 1);
}
check('C9) todos los modelos de fal de verdad declaran UN principal y su papel explícito; ninguno tiene vista previa inventada',
  M.MODELOS_FAL.every((m) => m.gobierno.outputSchema.filter((c) => c.tipo === 'file' && (c.papel ?? 'principal') === 'principal').length === 1
    && m.gobierno.outputSchema.every((c) => c.tipo !== 'file' || c.papel !== undefined)));

/* ═══ D · LO ASÍNCRONO: EL PRINCIPAL POR SU PAPEL ═════════════════════════ */
console.log('\n── D · El aviso: el recurso es el principal, las variantes aparte ──');
{
  const conVista = FV.leerAvisoDeFal({ request_id: 'req-9', status: 'OK', payload: { preview_image: archivo('vista.png'), world_file: archivo('mundo.bin') } }, CON_VISTA.gobierno.providerModelId, CON_VISTA);
  check('D1) el recurso es el archivo PRINCIPAL por su papel (no el primero del esquema ni del cuerpo) y la vista previa va en `variantes`, temporal',
    /mundo\.bin$/.test(conVista?.recurso ?? '') && iguales(conVista?.variantes, [{ kind: 'preview', recurso: archivo('vista.png').url }]), JSON.stringify(conVista));
  const deHoy = F.leerAvisoDeFal({ request_id: 'req-9', status: 'OK', payload: { world_file: archivo('mundo.bin') } }, HW.gobierno.providerModelId);
  check('D2) el modelo de hoy: el mundo, y ni una variante', /mundo\.bin$/.test(deHoy?.recurso ?? '') && !('variantes' in (deHoy ?? {})));
  const fallo = FV.leerAvisoDeFal({ request_id: 'req-9', status: 'ERROR', error: 'falló', payload: { world_file: archivo('mundo.bin'), preview_image: archivo('v.png') } }, CON_VISTA.gobierno.providerModelId, CON_VISTA);
  check('D3) un aviso de error no trae ni recurso ni variantes, aunque el cuerpo traiga archivos', fallo?.desenlace === 'fallado' && !('recurso' in fallo) && !('variantes' in fallo));
}

/* ═══ E · UN MUNDO ES UN MUNDO POR CUALQUIER CAMINO ═══════════════════════ */
console.log('\n── E · `world`, no `model3d` ──');
check('E1) la materialización asíncrona guarda un mundo como MUNDO (antes: model3d por la modalidad 3d)', tipoDeMaterialDe('world.generate') === 'world');
check('E2) y lo demás de la modalidad 3d y de las otras capacidades, como siempre', tipoDeMaterialDe('video.generate') === 'video' && tipoDeMaterialDe('vision.describe') === 'text' && tipoDeMaterialDe('nadie.sabe') === undefined);
check('E3) esta suite está en la cadena de `npm test`', /mundo3d-salidas\.test\.mjs/.test(leer('functions/package.json')));

Object.assign(http, ORIGINAL);
if (claveAntes === undefined) delete process.env.FAL_KEY; else process.env.FAL_KEY = claveAntes;
console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
