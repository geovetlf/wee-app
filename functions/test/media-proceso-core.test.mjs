/**
 * MC-4 · WEE MEDIA PROCESSING — DE UN MATERIAL SALE OTRO.
 *
 * Lo que esta fase construye es una relación: **un derivado sabe de qué salió, y
 * su dueño es el de su origen**. Todo lo que se prueba aquí es consecuencia de
 * eso, o de las dos separaciones que lo sostienen: control frente a datos, y
 * almacenamiento frente a proceso.
 *
 *   A · La transformación: acotada, cerrada, imposible de convertir en orden.
 *   B · La identidad del derivado: determinista y canónica.
 *   C · La decisión pura: quién puede derivar qué.
 *   D · El plano de control: peticiones de trabajo, sin un solo byte.
 *   E · El ejecutor: traer, procesar, guardar, verificar.
 *   F · Idempotencia y concurrencia.
 *   G · El procesador real (`sharp`), sin red.
 *   H · El procesador de mentira.
 *   I · Seguridad y propiedad.
 *   J · Estructura: qué NO se ha construido.
 *
 * NADA DE ESTO ESTÁ CONECTADO: ninguna Function importa `media/`, no hay bucket
 * y NO se ha hecho ni una llamada real a ningún proveedor.
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
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const core = lib('core/index.js');
const {
  CAPACIDADES_DE_MC4, ESTADOS_PROCESABLES, FORMA_DE_VARIANTE, LIMITES_DE_TRANSFORMACION,
  NOMBRE_DE_TAREA_DE_MEDIOS, PIEZA_ORIGINAL, FORMA_DE_TAREA,
  canonizarTransformacion, capacidadDeProceso, claveDelObjeto, crearRegistroDeMedios,
  decidirProceso, esTareaGeneral, identidadDeVariante, leerPaqueteDeProceso, piezaDeVariante,
  referenciaDelObjeto, transformacionValida, transformacionesValidas, varianteDeResultado, usoValido,
} = core;
const { crearAlmacenFalso, DESCRIPTOR_FALSO, FAKE_PROVIDER_ID } = lib('media/falso.js');
const { crearProcesadorFalso, DESCRIPTOR_DEL_PROCESADOR_FALSO, PROCESADOR_FALSO_ID } = lib('media/procesador-falso.js');
const { crearProcesadorDeImagen, DESCRIPTOR_DEL_PROCESADOR_DE_IMAGEN, PROCESADOR_DE_IMAGEN_ID } = lib('media/procesador.js');
const { huellaDeMedios } = lib('media/huella.js');
const { solicitarProceso, crearEjecutorDeMedios } = lib('media/proceso.js');
const { crearMedidor } = lib('media/uso.js');

const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const MATERIAL = 'asset_abc123';
const T0 = 1_700_000_000_000;
const OP = 'operacion-proceso-01';

const MINIATURA = { tipo: 'thumbnail', ancho: 400, alto: 400, ajuste: 'cover', formato: 'webp', calidad: 80 };
const VISTA = { tipo: 'preview', ancho: 1024, alto: 1024, ajuste: 'dentro', formato: 'jpeg', calidad: 70 };
const LIGERA = { tipo: 'transcoded', ancho: 1920, alto: 1080, ajuste: 'contain', formato: 'jpeg', calidad: 85 };
const POSTER = { tipo: 'poster', segundo: 3, ancho: 1280, alto: 720, formato: 'jpeg' };

const material = (o = {}) => ({
  contract: 1,
  assetId: o.assetId ?? MATERIAL,
  ownerAccountId: o.ownerAccountId ?? ANA,
  kind: o.kind ?? 'image',
  status: o.status ?? 'ready',
  storageRef: o.storageRef === null ? undefined : (o.storageRef ?? {
    provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(o.ownerAccountId ?? ANA, o.assetId ?? MATERIAL),
  }),
  mimeType: 'image/png', provenance: { createdAt: T0 }, createdAt: T0, updatedAt: T0,
});

const ficha = (o = {}) => {
  const accountId = o.accountId ?? ANA;
  const assetId = o.assetId ?? MATERIAL;
  const ref = { provider: FAKE_PROVIDER_ID, objectKey: o.objectKey ?? claveDelObjeto(accountId, assetId) };
  return {
    objectRef: referenciaDelObjeto(huellaDeMedios, ref), providerId: FAKE_PROVIDER_ID, accountId, assetId,
    pieza: PIEZA_ORIGINAL, objectKey: ref.objectKey, estado: o.estado ?? 'guardado',
    bytes: o.bytes ?? 5000, contentType: 'image/png', createdAt: T0, updatedAt: T0,
  };
};

/* ═══ A · LA TRANSFORMACIÓN ═══════════════════════════════════════════════ */
console.log('\n── A · Una intención acotada, nunca una orden ──');
{
  check('B · una transformación bien formada vale', [MINIATURA, VISTA, LIGERA, POSTER].every(transformacionValida));
  check('Q · un objeto vacío, nulo, un texto o un array: NO',
    [undefined, null, {}, 'thumbnail', [], 5, true].every((v) => !transformacionValida(v)));
  check('C · un tipo que no existe se rechaza', !transformacionValida({ ...MINIATURA, tipo: 'hologram' }));
  check('W · un campo de MÁS invalida la transformación entera: no hay por dónde anidar nada',
    !transformacionValida({ ...MINIATURA, extra: 1 }) && !transformacionValida({ ...MINIATURA, command: 'ffmpeg -i x' }));
  check('W · y un campo de menos, también', !transformacionValida({ tipo: 'thumbnail', ancho: 400, alto: 400 }));
  check('W · un objeto profundamente anidado no pasa', !transformacionValida({ ...MINIATURA, ajuste: { a: { b: { c: 1 } } } }));
  check('S · dimensiones negativas o cero: NO',
    !transformacionValida({ ...MINIATURA, ancho: -1 }) && !transformacionValida({ ...MINIATURA, alto: 0 }));
  check('T · NaN: NO', !transformacionValida({ ...MINIATURA, ancho: NaN }) && !transformacionValida({ ...MINIATURA, calidad: NaN }));
  check('U · Infinity: NO', !transformacionValida({ ...MINIATURA, alto: Infinity }) && !transformacionValida({ ...POSTER, segundo: Infinity }));
  check('R · pasarse del lado máximo: NO', !transformacionValida({ ...MINIATURA, ancho: LIMITES_DE_TRANSFORMACION.maxLado + 1 }));
  check('R · y no llegar al mínimo, tampoco', !transformacionValida({ ...MINIATURA, alto: LIMITES_DE_TRANSFORMACION.minLado - 1 }));
  check('R · decimales: NO', !transformacionValida({ ...MINIATURA, ancho: 400.5 }));
  check('V · una cadena gigante donde iba un número o una palabra: NO',
    !transformacionValida({ ...MINIATURA, formato: 'x'.repeat(100000) }) && !transformacionValida({ ...MINIATURA, ancho: '400' }));
  check('un formato fuera del catálogo: NO', !transformacionValida({ ...MINIATURA, formato: 'tiff' }));
  check('un ajuste fuera del catálogo: NO', !transformacionValida({ ...MINIATURA, ajuste: 'stretch' }));
  check('una calidad fuera de rango: NO',
    !transformacionValida({ ...MINIATURA, calidad: 10 }) && !transformacionValida({ ...MINIATURA, calidad: 100 }));
  check('un póster con un instante negativo o desmedido: NO',
    !transformacionValida({ ...POSTER, segundo: -1 }) && !transformacionValida({ ...POSTER, segundo: LIMITES_DE_TRANSFORMACION.maxSegundo + 1 }));
  check('un póster con campos de imagen mezclados: NO', !transformacionValida({ ...POSTER, calidad: 80 }));

  /* X · Cuántas caben. */
  check('X · una lista de hasta cuatro vale', transformacionesValidas([MINIATURA, VISTA, LIGERA]));
  check('X · cinco NO: no hay forma de pedir diez mil derivados de una sentada',
    !transformacionesValidas([MINIATURA, VISTA, LIGERA, MINIATURA, VISTA]) && LIMITES_DE_TRANSFORMACION.maxPorPeticion === 4);
  check('X · una lista vacía o que no es lista: NO',
    [[], {}, null, undefined, 'x'].every((v) => !transformacionesValidas(v)));
  check('X · y si UNA de la lista no vale, no vale la lista', !transformacionesValidas([MINIATURA, { ...VISTA, ancho: -1 }]));

  /* El catálogo de límites es uno solo. */
  check('los límites viven en UN sitio y son pequeños',
    LIMITES_DE_TRANSFORMACION.maxLado === 4096 && LIMITES_DE_TRANSFORMACION.formatos.length === 3 && LIMITES_DE_TRANSFORMACION.ajustes.length === 3);
}

/* ═══ B · LA IDENTIDAD DEL DERIVADO ═══════════════════════════════════════ */
console.log('\n── B · La misma petición da el mismo derivado ──');
{
  check('la forma canónica NO es JSON: no depende del orden en que alguien escribió las claves',
    canonizarTransformacion(MINIATURA) === 'thumbnail|400x400|cover|webp|q80'
    && canonizarTransformacion({ calidad: 80, formato: 'webp', ajuste: 'cover', alto: 400, ancho: 400, tipo: 'thumbnail' }) === canonizarTransformacion(MINIATURA));
  check('un póster se canoniza por su instante', canonizarTransformacion(POSTER) === 'poster|1280x720|jpeg|t3');

  const v = identidadDeVariante(huellaDeMedios, MATERIAL, MINIATURA);
  check('J · la identidad tiene su forma y es determinista', FORMA_DE_VARIANTE.test(v) && v === identidadDeVariante(huellaDeMedios, MATERIAL, MINIATURA));
  check('J · la MISMA transformación escrita al revés da la MISMA identidad',
    v === identidadDeVariante(huellaDeMedios, MATERIAL, { calidad: 80, formato: 'webp', ajuste: 'cover', alto: 400, ancho: 400, tipo: 'thumbnail' }));
  check('J · otro tamaño, otra identidad', v !== identidadDeVariante(huellaDeMedios, MATERIAL, { ...MINIATURA, ancho: 200 }));
  check('J · otro formato, otro ajuste u otra calidad: otra identidad',
    v !== identidadDeVariante(huellaDeMedios, MATERIAL, { ...MINIATURA, formato: 'jpeg' })
    && v !== identidadDeVariante(huellaDeMedios, MATERIAL, { ...MINIATURA, ajuste: 'contain' })
    && v !== identidadDeVariante(huellaDeMedios, MATERIAL, { ...MINIATURA, calidad: 81 }));
  check('J · OTRO ORIGEN, otra identidad: una variante no puede saltar de material',
    v !== identidadDeVariante(huellaDeMedios, 'asset_otro123', MINIATURA));
  check('versionado: como una versión nueva es OTRO material en F11, su variante es OTRA por construcción',
    identidadDeVariante(huellaDeMedios, 'asset_v2_x', MINIATURA) !== v);
  check('una transformación inválida no produce identidad', identidadDeVariante(huellaDeMedios, MATERIAL, { ...MINIATURA, ancho: -1 }) === undefined);

  const pieza = piezaDeVariante(huellaDeMedios, MINIATURA);
  check('la pieza cabe en la clave de objeto de MC-1', /^[a-z0-9][a-z0-9_-]{0,31}$/.test(pieza));
  check('empieza por el tipo, para poder leerla de un vistazo', pieza.startsWith('thumbnail_'));
  check('y dos tamaños distintos NO comparten sitio', pieza !== piezaDeVariante(huellaDeMedios, { ...MINIATURA, ancho: 200 }));
  check('la clave completa del derivado sigue aislada por cuenta',
    claveDelObjeto(ANA, MATERIAL, pieza) === `accounts/${ANA}/assets/${MATERIAL}/${pieza}`);

  /* La tarea para el Job Engine. */
  check('Y · el nombre de tarea tiene la FORMA que exige F8', [MINIATURA, VISTA, LIGERA, POSTER].every((t) => FORMA_DE_TAREA.test(NOMBRE_DE_TAREA_DE_MEDIOS(t))));
  check('Y · y es el que la Fase 11 ya había anticipado', NOMBRE_DE_TAREA_DE_MEDIOS(MINIATURA) === 'media.thumbnail');

  /* La capacidad sale del material Y de la transformación. */
  check('O · una miniatura de una imagen pide `image.thumbnail`', capacidadDeProceso('image', MINIATURA) === 'image.thumbnail');
  check('O · una previsualización de un vídeo pide `video.preview`, que NO es la de imagen',
    capacidadDeProceso('video', VISTA) === 'video.preview' && capacidadDeProceso('image', VISTA) === 'image.preview');
  check('O · un póster solo tiene sentido en vídeo',
    capacidadDeProceso('video', POSTER) === 'video.poster' && capacidadDeProceso('image', POSTER) === undefined);
  check('O · un material de un tipo sin familia no pide nada', capacidadDeProceso('model3d', MINIATURA) === undefined);
}

/* ═══ C · LA DECISIÓN PURA ════════════════════════════════════════════════ */
console.log('\n── C · Quién puede derivar qué ──');
{
  const base = {
    accountId: ANA, material: material(), objeto: ficha(),
    transformaciones: [MINIATURA], capacidadesDelProcesador: CAPACIDADES_DE_MC4, huella: huellaDeMedios,
  };
  const d = decidirProceso(base);
  check('M · el dueño puede, y cada derivado sale con su identidad, su pieza y su tarea',
    d.permitida === true && d.derivados.length === 1 && FORMA_DE_VARIANTE.test(d.derivados[0].variantId) && d.derivados[0].tarea === 'media.thumbnail');

  check('N · otra cuenta NO puede, aunque acierte el identificador', decidirProceso({ ...base, accountId: BEA }).detalle === 'no_es_tuyo');
  check('un material que no existe', decidirProceso({ ...base, material: undefined }).detalle === 'sin_material');
  check('un material sin bytes completos no se deriva',
    ['uploading', 'failed', 'deleted'].every((s) => decidirProceso({ ...base, material: material({ status: s }) }).detalle === 'material_no_listo'));
  check('pero `ready` y `processing` sí', ESTADOS_PROCESABLES.join(',') === 'ready,processing');
  check('sin ficha de objeto no hay de dónde partir', decidirProceso({ ...base, objeto: undefined }).detalle === 'sin_ficha');
  check('una ficha borrada, tampoco', decidirProceso({ ...base, objeto: ficha({ estado: 'borrado' }) }).detalle === 'ficha_borrada');
  check('una ficha de OTRO material, tampoco', decidirProceso({ ...base, objeto: ficha({ assetId: 'asset_otro' }) }).detalle === 'sin_ficha');
  check('un origen demasiado grande se rechaza ANTES de intentar nada',
    decidirProceso({ ...base, objeto: ficha({ bytes: LIMITES_DE_TRANSFORMACION.maxBytesDeOrigen + 1 }) }).detalle === 'origen_demasiado_grande');

  check('O · una capacidad que el procesador NO declara se rechaza',
    decidirProceso({ ...base, capacidadesDelProcesador: ['image.preview'] }).detalle === 'sin_capacidad');
  check('P · un procesador sin capacidades no procesa nada', decidirProceso({ ...base, capacidadesDelProcesador: [] }).detalle === 'sin_procesador');
  check('C · pedir un póster de una imagen: no admitido', decidirProceso({ ...base, transformaciones: [POSTER] }).detalle === 'tipo_no_admitido');

  check('B · lo que se puede decir sin hablar del material se dice, y va PRIMERO',
    decidirProceso({ ...base, transformaciones: 'no-es-lista' }).motivo === 'peticion_invalida'
    && decidirProceso({ ...base, material: undefined, accountId: BEA, transformaciones: [] }).motivo === 'peticion_invalida');
  check('N · y todo lo del recurso contesta lo MISMO hacia fuera',
    [decidirProceso({ ...base, material: undefined }), decidirProceso({ ...base, accountId: BEA }), decidirProceso({ ...base, objeto: undefined })]
      .every((x) => x.motivo === 'no_disponible'));
  check('y nada de esto lanza', [undefined, null, {}, 5].every((v) => decidirProceso({ ...base, material: v, objeto: v }).permitida === false));
}

/* ═══ D · EL PLANO DE CONTROL ═════════════════════════════════════════════ */
console.log('\n── D · Peticiones de trabajo, sin un solo byte ──');

const mundo = (o = {}) => {
  const almacen = o.almacen ?? crearAlmacenFalso({ ahora: () => T0 });
  const procesador = o.procesador ?? crearProcesadorFalso();
  const materiales = new Map([[MATERIAL, o.material ?? material()]]);
  const fichas = new Map([[ficha().objectRef, o.ficha ?? ficha()]]);
  const variantes = [];
  return {
    almacen, procesador, materiales, fichas, variantes,
    deps: {
      db: {},
      cuentaDelPrincipal: async (p) => (o.sinCuenta ? null : { accountId: p }),
      leerMaterial: async (id) => materiales.get(id) ?? null,
      anotarVariante: async (accountId, assetId, v) => {
        const m = materiales.get(assetId);
        if (!m || m.ownerAccountId !== accountId) return false;
        variantes.push({ assetId, ...v });
        return true;
      },
      objetos: {
        async leer(objectRef, accountId) { const f = fichas.get(objectRef); return f && f.accountId === accountId ? f : undefined; },
        async registrar(f) {
          const previo = fichas.get(f.objectRef);
          if (previo) return previo.accountId === f.accountId ? { ok: true, objeto: previo, yaEstaba: true } : { ok: false, motivo: 'de_otra_cuenta' };
          fichas.set(f.objectRef, f);
          return { ok: true, objeto: f, yaEstaba: false };
        },
        async marcarBorrado() { throw new Error('MC-4 no borra nada'); },
      },
      procesador,
      ahora: () => T0,
    },
  };
};

{
  const m = mundo();
  const r = await solicitarProceso(m.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA, VISTA], operationId: OP });
  check('se devuelven PETICIONES de trabajo, una por derivado', r.ok === true && r.solicitudes.length === 2);
  check('Y · son tareas GENERALES del Job Engine, no operaciones de IA',
    r.ok && r.solicitudes.every((s) => esTareaGeneral(s) && s.task.name.startsWith('media.') && s.capability === undefined && s.implementation === undefined));
  check('Y · con el contrato del motor que YA existe', r.ok && r.solicitudes.every((s) => typeof s.contract === 'string' && s.contract.length > 0));
  check('Y · la clave de deduplicación ES la identidad del derivado', r.ok && r.solicitudes.every((s) => s.idempotencyKey === s.input.variantId));
  check('AF · el paquete lleva REFERENCIAS, nunca bytes',
    r.ok && r.solicitudes.every((s) => !JSON.stringify(s.input).includes('Buffer') && s.input.origen && s.input.destino && !('cuerpo' in s.input)));
  check('el destino está dentro de la carpeta de su cuenta y en el mismo proveedor que el origen',
    r.ok && r.solicitudes.every((s) => s.input.destino.objectKey.startsWith(`accounts/${ANA}/assets/${MATERIAL}/`) && s.input.destino.provider === s.input.origen.provider));
  check('y cada paquete se puede volver a leer entero', r.ok && r.solicitudes.every((s) => !!leerPaqueteDeProceso(s.input)));
  check('AF · pedir NO llamó al procesador ni una vez', m.procesador.llamadas.procesar === 0);
  check('AF · ni abrió el almacén', m.almacen.llamadas.mirar === 0 && m.almacen.llamadas.guardar === 0);
  check('la traza dice cuántos y cuáles, y nada más', r.ok && r.traza.derivados === 2 && r.traza.variantIds.length === 2 && r.traza.accountId === ANA);

  check('N · otra cuenta no obtiene nada', (await solicitarProceso(m.deps, { principalId: BEA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP })).ok === false);
  const sinSesion = await solicitarProceso(m.deps, { principalId: '', assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP });
  check('sin sesión, tampoco', !sinSesion.ok && sinSesion.traza.detalle === 'principal_invalido');
  const sinCuenta = mundo({ sinCuenta: true });
  check('ni un principal sin cuenta', (await solicitarProceso(sinCuenta.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP })).traza.detalle === 'sin_cuenta');
}

/* ═══ E · EL EJECUTOR ═════════════════════════════════════════════════════ */
console.log('\n── E · Traer, procesar, guardar, verificar ──');

const ejecutorDe = (m, medidor) => crearEjecutorDeMedios({
  almacenes: { [FAKE_PROVIDER_ID]: m.almacen },
  procesador: m.procesador,
  objetos: m.deps.objetos,
  anotarVariante: m.deps.anotarVariante,
  ahora: () => T0,
  ...(medidor ? { medidor } : {}),
});

const despacho = (solicitud, i = 1) => ({
  jobId: `job-${i}`, attemptId: `att-${i}`, attempt: 1,
  task: solicitud.task, input: solicitud.input, trace: solicitud.trace,
  mode: 'sync', idempotencyKey: solicitud.idempotencyKey, timeoutMs: 60000, deadlineAt: T0 + 60000,
});

{
  const m = mundo();
  /* El original tiene que existir físicamente: lo pone el almacén falso. */
  await m.almacen.guardar({ destino: material().storageRef, cuerpo: Buffer.from('bytes del original'), contentType: 'image/png' });
  const r = await solicitarProceso(m.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP });
  const eje = ejecutorDe(m);

  const informe = await eje.ejecutar(despacho(r.solicitudes[0]), { renovar: async () => true });
  check('D · una miniatura se produce y el intento termina bien', informe.outcome === 'succeeded' && informe.dispatched === true);

  /*
   * MC-7 · el procesado consume cuatro cosas distintas y las mide por separado.
   * Se comprueba aquí, donde ya vive el arnés del ejecutor, en vez de levantar
   * uno segundo en la suite de MC-7 solo para esto.
   */
  {
    const mm = mundo();
    const rr = await solicitarProceso(mm.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP });
    await mm.almacen.guardar({ destino: material().storageRef, cuerpo: Buffer.from('bytes del original'), contentType: 'image/png' });
    const medida = crearMedidor(huellaDeMedios);
    await ejecutorDe(mm, medida.medidor).ejecutar(despacho(rr.solicitudes[0]), { renovar: async () => true });
    const hechos = medida.pendientes();
    const clases = new Set(hechos.map((h) => `${h.operacion}:${h.metrica}`));
    check('MC-7 · el procesado mide lo que lee, lo que computa, lo que escribe y lo que verifica',
      clases.has('object.get:bytes_leidos') && clases.has('process.run:segundos_de_proceso')
      && clases.has('object.put:bytes_escritos') && clases.has('object.head:operaciones'),
      [...clases].join(' · '));
    check('MC-7 · todas las medidas son hechos válidos y van ancladas al intento',
      hechos.length > 0 && hechos.every(usoValido) && hechos.every((h) => h.ancla.attemptId === 'att-1'));
    check('MC-7 · con la cuenta del paquete ya autorizado, nunca declarada por nadie',
      hechos.every((h) => h.accountId === ANA && h.assetId === MATERIAL));
    check('MC-7 · el cómputo se le atribuye al PROCESADOR, no al almacén',
      hechos.filter((h) => h.metrica === 'segundos_de_proceso').every((h) => h.providerId === mm.procesador.processorId));
  }
  check('AB · el resultado lleva REFERENCIAS, no URLs', informe.result.outputRefs.length === 2 && !JSON.stringify(informe.result).includes('http'));
  check('los bytes nuevos quedaron en el almacén, en su pieza', m.almacen.contenido.size === 2);
  check('AB · y se verificó mirando lo que hay, no creyendo al almacén', m.almacen.llamadas.mirar >= 1);
  check('quedó una ficha de objeto del derivado', m.fichas.size === 2);
  check('y la relación origen → derivado está en el MATERIAL de la Fase 11',
    m.variantes.length === 1 && m.variantes[0].assetId === MATERIAL && m.variantes[0].kind === 'thumbnail');
  check('la variante es la `AssetVariant` de F11, con su referencia y sus medidas',
    !!m.variantes[0].storageRef && m.variantes[0].width === 400 && m.variantes[0].height === 400 && !!m.variantes[0].bytes);
  check('AC · y NO lleva ninguna URL: la entrega se resuelve cuando toca',
    !('url' in m.variantes[0]) && !('delivery' in m.variantes[0]) && !JSON.stringify(m.variantes[0]).includes('http'));

  /* E/F · Los otros dos tipos de imagen. */
  const m2 = mundo();
  await m2.almacen.guardar({ destino: material().storageRef, cuerpo: Buffer.from('bytes del original'), contentType: 'image/png' });
  const r2 = await solicitarProceso(m2.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [VISTA, LIGERA], operationId: OP });
  const eje2 = ejecutorDe(m2);
  const dos = await Promise.all(r2.solicitudes.map((s, i) => eje2.ejecutar(despacho(s, i), { renovar: async () => true })));
  check('E/F · una previsualización y una versión ligera también',
    dos.every((x) => x.outcome === 'succeeded') && m2.variantes.map((v) => v.kind).sort().join(',') === 'preview,transcoded');
  check('cada una en su propia pieza: no se pisan', m2.almacen.contenido.size === 3);

  /* G/H · Vídeo: el póster y la previsualización, con un procesador que los declara. */
  const mv = mundo({ material: material({ kind: 'video', assetId: MATERIAL }), procesador: crearProcesadorFalso() });
  await mv.almacen.guardar({ destino: material().storageRef, cuerpo: Buffer.from('bytes de video'), contentType: 'video/mp4' });
  const rv = await solicitarProceso(mv.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [POSTER], operationId: OP });
  check('G · un póster de vídeo se PUEDE pedir si el procesador lo declara', rv.ok === true && rv.solicitudes[0].task.name === 'media.poster');
  const iv = await ejecutorDe(mv).ejecutar(despacho(rv.solicitudes[0]), { renovar: async () => true });
  check('G · y se ejecuta por el mismo camino', iv.outcome === 'succeeded' && mv.variantes[0].kind === 'poster');
  const rvp = await solicitarProceso(mv.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [VISTA], operationId: OP });
  check('H · una previsualización de vídeo, igual', rvp.ok === true && rvp.solicitudes[0].task.name === 'media.preview');
  check('I · el seam de audio existe declarado, sin implementación que lo finja',
    capacidadDeProceso('audio', VISTA) === 'audio.preview' && !CAPACIDADES_DE_MC4.includes('audio.preview'));

  /* Caminos malos. */
  const mm = mundo();
  const rm = await solicitarProceso(mm.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP });
  const sinBytes = await ejecutorDe(mm).ejecutar(despacho(rm.solicitudes[0]), { renovar: async () => true });
  check('si el original no está físicamente, el intento falla y lo dice', sinBytes.outcome === 'failed' && sinBytes.dispatched === true);
  check('un despacho que no es de medios no se atiende',
    (await eje.ejecutar({ ...despacho(r.solicitudes[0]), task: { name: 'ai.text' } }, { renovar: async () => true })).error.details.reason === 'no_es_tarea_de_medios');
  check('un paquete ilegible NO SALIÓ, así que el motor puede reintentarlo sin miedo',
    (await eje.ejecutar({ ...despacho(r.solicitudes[0]), input: { roto: true } }, { renovar: async () => true })).dispatched === false);

  /* Un procesador que falla una vez: el motor reintenta, no MC-4. */
  const mf = mundo();
  await mf.almacen.guardar({ destino: material().storageRef, cuerpo: Buffer.from('bytes del original'), contentType: 'image/png' });
  const rf = await solicitarProceso(mf.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP });
  mf.procesador.fallarUnaVez('proceso_fallido');
  const fallo = await ejecutorDe(mf).ejecutar(despacho(rf.solicitudes[0]), { renovar: async () => true });
  check('un fallo del procesador se informa como intento fallido; el reintento es del Job Engine', fallo.outcome === 'failed');
  const luego = await ejecutorDe(mf).ejecutar(despacho(rf.solicitudes[0]), { renovar: async () => true });
  check('y al reintentar converge', luego.outcome === 'succeeded' && mf.variantes.length === 1);
}

/* ═══ F · IDEMPOTENCIA Y CONCURRENCIA ═════════════════════════════════════ */
console.log('\n── F · Repetir y coincidir ──');
{
  const m = mundo();
  await m.almacen.guardar({ destino: material().storageRef, cuerpo: Buffer.from('bytes del original'), contentType: 'image/png' });
  const a = await solicitarProceso(m.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP });
  const b = await solicitarProceso(m.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: 'otra-operacion-99' });
  check('K · pedir lo mismo dos veces da la MISMA identidad y el MISMO destino, aunque cambie la operación',
    a.solicitudes[0].idempotencyKey === b.solicitudes[0].idempotencyKey
    && a.solicitudes[0].input.destino.objectKey === b.solicitudes[0].input.destino.objectKey);

  const eje = ejecutorDe(m);
  const tres = await Promise.all([0, 1, 2].map((i) => eje.ejecutar(despacho(a.solicitudes[0], i), { renovar: async () => true })));
  check('L · tres ejecuciones simultáneas del mismo derivado: todas terminan bien', tres.every((x) => x.outcome === 'succeeded'));
  check('L · y dejan UN objeto y UNA ficha, no tres', m.almacen.contenido.size === 2 && m.fichas.size === 2);
  check('L · todas apuntan al mismo objeto', new Set(tres.map((x) => x.result.outputRefs[0])).size === 1);
  check('L · la variante se anota por `kind`, así que el material no acumula duplicadas',
    new Set(m.variantes.map((v) => v.kind)).size === 1);
  check('L · la garantía no es un cerrojo: es «solo si está libre» y el `create` de la base de datos',
    !/mutex|lock|cerrojo|Semaphore/i.test(sinComentarios(leer('functions/src/media/proceso.ts'))));
}

/* ═══ G · EL PROCESADOR REAL ══════════════════════════════════════════════ */
console.log('\n── G · `sharp`, sin red y sin comandos ──');
{
  const proc = crearProcesadorDeImagen();
  check('declara SOLO las tres de imagen que implementa', proc.capacidades.join(',') === CAPACIDADES_DE_MC4.join(',') && CAPACIDADES_DE_MC4.length === 3);
  check('y se declara UNVERIFIED: la librería está probada, este procesador no ha corrido en producción',
    DESCRIPTOR_DEL_PROCESADOR_DE_IMAGEN.estado === 'UNVERIFIED' && DESCRIPTOR_DEL_PROCESADOR_DE_IMAGEN.id === PROCESADOR_DE_IMAGEN_ID);

  /* Un PNG mínimo de verdad, hecho por la propia librería. */
  const sharpMod = await import('sharp');
  const sharpFn = sharpMod.default || sharpMod;
  const original = await sharpFn({ create: { width: 800, height: 600, channels: 3, background: { r: 10, g: 120, b: 200 } } }).png().toBuffer();

  const r = await proc.procesar({ cuerpo: original, contentType: 'image/png', transformacion: MINIATURA });
  check('D · redimensiona de verdad, y devuelve lo que midió',
    r.ok === true && r.resultado.ancho === 400 && r.resultado.alto === 400 && r.resultado.bytes > 0);
  check('D · con el tipo de salida que se pidió', r.ok && r.resultado.contentType === 'image/webp');
  check('D · y pesa menos que el original', r.ok && r.resultado.bytes < original.length);
  const otra = await proc.procesar({ cuerpo: original, contentType: 'image/png', transformacion: MINIATURA });
  check('K · es determinista: los mismos bytes y la misma transformación dan lo mismo',
    otra.ok && otra.resultado.cuerpo.equals(r.resultado.cuerpo));
  const jpeg = await proc.procesar({ cuerpo: original, contentType: 'image/png', transformacion: VISTA });
  check('E · una previsualización en otro formato', jpeg.ok && jpeg.resultado.contentType === 'image/jpeg');

  check('C · un póster NO lo hace: no hay nada aquí que sepa abrir un vídeo',
    (await proc.procesar({ cuerpo: original, contentType: 'video/mp4', transformacion: POSTER })).error.details.reason === 'sin_capacidad');
  check('un origen que no es imagen, tampoco',
    (await proc.procesar({ cuerpo: original, contentType: 'application/pdf', transformacion: MINIATURA })).error.details.reason === 'sin_capacidad');
  check('Q · una transformación inválida se rechaza antes de cargar nada',
    (await proc.procesar({ cuerpo: original, contentType: 'image/png', transformacion: { ...MINIATURA, ancho: -1 } })).error.details.reason === 'peticion_invalida');
  check('unos bytes que no son una imagen fallan controladamente, sin filtrar el mensaje de la librería',
    (await proc.procesar({ cuerpo: Buffer.from('esto no es una imagen'), contentType: 'image/png', transformacion: MINIATURA })).error.details.reason === 'origen_ilegible');

  /* AE · Nada de comandos. */
  const PROC = sinComentarios(leer('functions/src/media/procesador.ts'));
  check('AE · no hay `exec`, ni `spawn`, ni `execSync`, ni plantilla de comando',
    !/exec\(|execSync|spawn|child_process|shelljs|`ffmpeg|`convert |\$\{.*\}.*(ffmpeg|magick)/.test(PROC));
  check('AE · lo único que cruza son números y palabras de un catálogo', /AJUSTE\[t\.ajuste\]/.test(PROC) && /resize\(t\.ancho, t\.alto/.test(PROC));
  check('AE · y se carga perezosamente, como ya hacía `vertexAI.ts`', /await import\('sharp'\)/.test(PROC));
}

/* ═══ H · EL PROCESADOR DE MENTIRA ════════════════════════════════════════ */
console.log('\n── H · El falso, con las mismas reglas ──');
{
  const f = crearProcesadorFalso();
  const r = await f.procesar({ cuerpo: Buffer.from('bytes'), contentType: 'image/png', transformacion: MINIATURA });
  check('AA · produce un resultado, sin red y sin librería nativa', r.ok === true && r.resultado.bytes > 0);
  check('AA · determinista', (await f.procesar({ cuerpo: Buffer.from('bytes'), contentType: 'image/png', transformacion: MINIATURA })).resultado.cuerpo.equals(r.resultado.cuerpo));
  check('AA · respeta la transformación', r.resultado.ancho === 400 && r.resultado.contentType === 'image/webp');
  check('AA · otros bytes u otra transformación dan otro resultado',
    !(await f.procesar({ cuerpo: Buffer.from('otros'), contentType: 'image/png', transformacion: MINIATURA })).resultado.cuerpo.equals(r.resultado.cuerpo));
  check('AA · rechaza lo que no vale', (await f.procesar({ cuerpo: Buffer.alloc(0), contentType: 'image/png', transformacion: MINIATURA })).ok === false);
  f.fallarUnaVez('no_disponible');
  check('AA · y sabe fallar a propósito, para poder probar el reintento', (await f.procesar({ cuerpo: Buffer.from('b'), contentType: 'image/png', transformacion: MINIATURA })).ok === false);
  check('AA · una sola vez', (await f.procesar({ cuerpo: Buffer.from('b'), contentType: 'image/png', transformacion: MINIATURA })).ok === true);
  check('AA · no se compone en producción',
    !/procesador-falso|PROCESADOR_FALSO/.test(sinComentarios(leer('functions/src/media/catalogo.ts')) + sinComentarios(leer('functions/src/media/index.ts'))));
}

/* ═══ I · SEGURIDAD Y PROPIEDAD ═══════════════════════════════════════════ */
console.log('\n── I · De quién es el derivado ──');
{
  const m = mundo();
  await m.almacen.guardar({ destino: material().storageRef, cuerpo: Buffer.from('bytes del original'), contentType: 'image/png' });

  /* El cliente manda de todo. Nada de ello decide. */
  const limpia = await solicitarProceso(m.deps, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP });
  const sucia = await solicitarProceso(m.deps, {
    principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: OP,
    accountId: BEA, ownerAccountId: BEA, providerId: 'erre2', bucket: 'cubo-de-otro',
    objectKey: claveDelObjeto(BEA, MATERIAL), destino: { provider: 'erre2', objectKey: 'donde/yo/diga' }, variantId: 'var_' + '0'.repeat(16),
  });
  check('mandar cuenta, dueño, proveedor, contenedor, clave, destino e identidad no cambia NADA',
    limpia.ok && sucia.ok && JSON.stringify(limpia.solicitudes[0].input) === JSON.stringify(sucia.solicitudes[0].input));
  check('M · el derivado pertenece a la MISMA cuenta que el origen, nunca al que ejecuta',
    limpia.solicitudes[0].input.accountId === ANA && limpia.solicitudes[0].trace.userId === ANA);

  /* N · Ejecutar un paquete de otra cuenta no escribe en el material ajeno. */
  const ajeno = { ...limpia.solicitudes[0].input, accountId: BEA };
  const informe = await ejecutorDe(m).ejecutar({ ...despacho(limpia.solicitudes[0]), input: ajeno }, { renovar: async () => true });
  check('N · un paquete que dice otra cuenta no consigue anotar nada en el material de Ana',
    informe.outcome === 'failed' && m.variantes.length === 0);

  /* AB · Aislamiento exacto. */
  check('AB · `accounts/uAnaX/` no es `accounts/uAna/`',
    core.claveEsDeLaCuenta(claveDelObjeto(ANA, MATERIAL, 'thumbnail_a1b2c3d4e5f6'), ANA)
    && !core.claveEsDeLaCuenta(claveDelObjeto(ANA + 'X', MATERIAL, 'thumbnail_a1b2c3d4e5f6'), ANA));

  /* AD · Secretos y registros. */
  const PROC = sinComentarios(leer('functions/src/media/proceso.ts'));
  const CORE = sinComentarios(leer('functions/src/core/media/proceso.ts'));
  check('AD · no hay `console.` en ninguna parte del proceso', !/console\./.test(PROC) && !/console\./.test(CORE));
  check('AD · ni credenciales, ni firmas, ni URLs en el camino de proceso',
    !/accessKey|secret|Authorization|SigV4|signedUrl|urlFirmada|https:\/\//.test(PROC));
  check('AC · una URL firmada no se persiste en ningún sitio: no se genera ninguna aquí', !/urlFirmada|urlDeSubida|firmarConsulta/.test(PROC));
  check('AE · el Core del proceso no menciona ningún proveedor ni librería',
    !/\bR2|[Cc]loudflare|\bAWS\b|sharp|ffmpeg|magick|bucket|endpoint/i.test(CORE));
  check('AE · y el resolutor no menciona a R2 ni a ninguna librería',
    !/\bR2\b|[Cc]loudflare|sharp|ffmpeg|magick/i.test(PROC));
  check('AE · el que SÍ conoce la librería es el adaptador, y solo él',
    /import\('sharp'\)/.test(leer('functions/src/media/procesador.ts')));
}

/* ═══ J · ESTRUCTURA ══════════════════════════════════════════════════════ */
console.log('\n── J · Qué NO se ha construido ──');
{
  const PROC = sinComentarios(leer('functions/src/media/proceso.ts'));
  const CORE = sinComentarios(leer('functions/src/core/media/proceso.ts'));
  const TODO = PROC + CORE + sinComentarios(leer('functions/src/core/media/procesador.ts'));

  check('AJ · NO hay un segundo motor de trabajos: se usa el `JobExecutor` de F8',
    /JobExecutor/.test(PROC) && !/crearJobEngine|JobStore|QueuePort|encolar|scheduler/i.test(PROC));
  check('AJ · ni una segunda política de reintentos, ni concesiones, ni plazos propios',
    !/maxAttempts|backoff|lease|concesion|renovarConcesion|reintent/i.test(PROC.replace(/reintenta/g, '')));
  check('AL · sin ciclo de vida: MC-4 no borra nada', !/\.borrar\(|marcarBorrado|garbage|recolect/i.test(PROC));
  check('AM · sin migración ni replicación', !/migrat|replica|copiar\(/i.test(TODO));
  check('sin caché, sin Redis, sin CDN', !/redis|cache|cdn|edge/i.test(TODO));
  check('AH · sin Credits ni ningún libro', !/[Cc]redit|ledger|cobrar|refund|precio/i.test(TODO));
  check('NO es generación de IA: ni modelo, ni prompt, ni Router, ni Gateway',
    !/prompt|modelId|gemini|seedance|elevenlabs|Router|Gateway|generar[A-Z]/i.test(TODO.replace(/generativ/gi, '')));
  check('ni edición de vídeo: sin línea de tiempo, cortes, transiciones ni subtítulos',
    !/timeline|transition|subtitle|multi-?track|montaje/i.test(TODO));
  check('AG · Cloudinary no aparece por ninguna parte', !/cloudinary/i.test(TODO));

  check('21 · el plano de CONTROL no mueve bytes', !/Buffer\.|\.traer\(|cuerpo:/.test(PROC.split('crearEjecutorDeMedios')[0]));
  check('21 · y el que sí los mueve es el ejecutor, que corre en un trabajador', /almacenDeOrigen\.traer\(paquete\.origen\)/.test(PROC));

  /*
   * LA REGLA PERMANENTE: almacenar, transformar y entregar son capacidades
   * INDEPENDIENTES, y ninguna capa del Core puede dar por hecho que las sirve
   * el mismo proveedor. R2 es el primero implementado, no la arquitectura.
   */
  check('el paquete ADMITE origen y destino en proveedores distintos: R2 → procesador → Qiniu',
    !!leerPaqueteDeProceso({
      accountId: ANA, sourceAssetId: MATERIAL, variantId: 'var_' + '0'.repeat(16),
      origen: { provider: 'erre2', bucket: 'wee', objectKey: 'accounts/a/assets/b/original' },
      destino: { provider: 'qiniu', bucket: 'otro', objectKey: 'accounts/a/assets/b/thumbnail_x' },
      transformacion: MINIATURA,
    }));
  check('y también Qiniu → procesador → Alibaba, sin que R2 aparezca por ningún lado',
    !!leerPaqueteDeProceso({
      accountId: ANA, sourceAssetId: MATERIAL, variantId: 'var_' + '1'.repeat(16),
      origen: { provider: 'qiniu', objectKey: 'accounts/a/assets/b/original' },
      destino: { provider: 'alibaba', objectKey: 'accounts/a/assets/b/preview_y' },
      transformacion: VISTA,
    }));
  check('el ejecutor resuelve DOS almacenes, no uno: leer y escribir pueden ser proveedores distintos',
    /almacenDeOrigen = deps\.almacenes\[paquete\.origen\.provider\]/.test(PROC)
    && /almacenDeDestino = deps\.almacenes\[paquete\.destino\.provider\]/.test(PROC)
    && /almacenDeDestino\.guardar/.test(PROC) && /almacenDeDestino\.mirar/.test(PROC));
  check('y el procesador entra como una dependencia APARTE de los almacenes',
    /almacenes:/.test(PROC) && /procesador:/.test(PROC));
  check('21 · ni consultas, ni escuchas, ni sondeos, ni temporizadores',
    !/\.where\(|\.orderBy\(|onSnapshot|setInterval|setTimeout/.test(PROC));
  check('sin estado global', !/^(let|var|export (let|var)) /m.test(PROC) && !/^(let|var|export (let|var)) /m.test(CORE));

  check('el registro de procesadores es EL MISMO de MC-1, hecho genérico: no hay catálogo paralelo',
    /crearRegistroDeMedios/.test(leer('functions/src/core/media/registro.ts'))
    && !fs.existsSync(path.resolve(RAIZ, 'functions/src/core/media/registro-de-procesadores.ts')));
  const reg = crearRegistroDeMedios([DESCRIPTOR_DEL_PROCESADOR_FALSO]);
  check('y funciona igual con el vocabulario de proceso',
    reg.registro.puede(PROCESADOR_FALSO_ID, 'image.thumbnail') && !reg.registro.puede(PROCESADOR_FALSO_ID, 'document.preview'));
  check('P · un procesador APAGADO no puede nada',
    !crearRegistroDeMedios([{ ...DESCRIPTOR_DEL_PROCESADOR_FALSO, estado: 'DISABLED' }]).registro.puede(PROCESADOR_FALSO_ID, 'image.thumbnail'));

  check('la variante que se anota es la `AssetVariant` de F11, sin modelo nuevo',
    !!varianteDeResultado(MINIATURA, { provider: 'fake', objectKey: 'accounts/a/assets/b/c' }, { bytes: 10 })
    && !fs.existsSync(path.resolve(RAIZ, 'functions/src/core/media/variante.ts')));

  const delCore = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).sort();
  check('el Core de medios son once archivos y ninguno más',
    delCore.join(',') === 'entrega.ts,index.ts,migracion.ts,objeto.ts,procesador.ts,proceso.ts,puerto.ts,recoleccion.ts,registro.ts,subida.ts,uso.ts', delCore.join(','));
  const fuera = fs.readdirSync(path.resolve(RAIZ, 'functions/src/media')).sort();
  check('y la composición, dieciocho',
    fuera.join(',') === 'almacen.ts,canary.ts,catalogo.ts,cloudinary.ts,entrega.ts,falso.ts,firma.ts,fuente-falsa.ts,huella.ts,index.ts,migracion.ts,procesador-falso.ts,procesador.ts,proceso.ts,r2.ts,recoleccion.ts,subida.ts,uso.ts', fuera.join(','));

  /* El procesado NO tiene puerta propia: la única de Media Cloud es la del canary. */
  check('AK · el procesado no está expuesto: ninguna Function lo llama',
    !/solicitarProceso|crearEjecutorDeMedios/.test(leer('functions/src/index.ts'))
    && (leer('functions/src/index.ts').match(/from '\.\/media\//g) || []).length === 1);
  check('esta suite está en la cadena de `npm test`', /media-proceso-core\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
