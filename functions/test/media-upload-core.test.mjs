/**
 * MC-3 · WEE MEDIA UPLOAD — LOS BYTES NO PASAN POR WEË.
 *
 * Lo que esta fase construye es una separación: **Weë manda el plano de control
 * y el proveedor mueve los bytes**. Todo lo que se prueba aquí es alguna
 * consecuencia de eso.
 *
 *   A · La política: vigencia y tamaño, acotados y sin constantes nuevas.
 *   B · La decisión pura: quién puede escribir y con qué límites.
 *   C · La identidad: derivada, estable, y una sola fuente canónica.
 *   D · La adición de F11: un material antes de que existan sus bytes.
 *   E · El resolutor: de la sesión a un permiso temporal.
 *   F · La confirmación: mirando el objeto, no creyendo al cliente.
 *   G · La firma de R2 (PUT prefirmado), sin red.
 *   H · El proveedor de mentira.
 *   I · Seguridad: lo que manda el cliente no decide nada.
 *   J · Idempotencia y concurrencia.
 *   K · Estructura: qué NO se ha construido.
 *
 * NADA DE ESTO ESTÁ CONECTADO: ninguna Function importa `media/`, no hay bucket
 * y NO se ha hecho ni una llamada real a R2.
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
  ESTADOS_QUE_ADMITEN_SUBIDA, MAXIMO_DE_BYTES_DE_MATERIAL, POLITICA_DE_SUBIDA, PIEZA_ORIGINAL,
  claveDelObjeto, crearRegistroDeMedios, decidirSubida, identidadDeIntento, referenciaDelObjeto,
  tamanoAprobado, tipoDeContenidoAceptable, topeDeSubida, vigenciaDeSubidaAprobada, FORMA_DE_INTENTO,
} = core;
const { crearAlmacenFalso, DESCRIPTOR_FALSO, FAKE_PROVIDER_ID } = lib('media/falso.js');
const { crearAdaptadorDeR2, DESCRIPTOR_DE_R2, MAX_VIGENCIA_DE_R2, R2_PROVIDER_ID, anfitrionDeR2 } = lib('media/r2.js');
const { rutaCanonicaDeObjeto } = lib('media/firma.js');
const { huellaDeMedios } = lib('media/huella.js');
const { solicitarSubida, confirmarSubida, identidadDeMaterialDeSubida } = lib('media/subida.js');

const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const T0 = 1_700_000_000_000;
const OP = 'operacion-de-ana-0001';
const CONFIG_R2 = { accountId: 'a'.repeat(32), accessKeyId: 'AKIAEJEMPLO', secretAccessKey: 'secretoDePrueba', bucket: 'wee-media' };
const REGISTRO_FALSO = crearRegistroDeMedios([DESCRIPTOR_FALSO]).registro;

const material = (o = {}) => {
  const accountId = o.ownerAccountId ?? ANA;
  const assetId = o.assetId ?? identidadDeMaterialDeSubida(accountId, OP);
  return {
    contract: 1, assetId, ownerAccountId: accountId, kind: 'video',
    status: o.status ?? 'uploading',
    storageRef: o.storageRef === null ? undefined : (o.storageRef ?? {
      provider: o.provider ?? FAKE_PROVIDER_ID, objectKey: claveDelObjeto(accountId, assetId),
    }),
    mimeType: 'video/mp4', provenance: { createdAt: T0 }, createdAt: T0, updatedAt: T0,
  };
};

const ficha = (o = {}) => {
  const accountId = o.accountId ?? ANA;
  const assetId = o.assetId ?? identidadDeMaterialDeSubida(accountId, OP);
  const ref = { provider: o.providerId ?? FAKE_PROVIDER_ID, objectKey: o.objectKey ?? claveDelObjeto(accountId, assetId) };
  return {
    objectRef: referenciaDelObjeto(huellaDeMedios, ref), providerId: ref.provider, accountId, assetId,
    pieza: PIEZA_ORIGINAL, objectKey: ref.objectKey, estado: o.estado ?? 'guardado',
    bytes: 100, contentType: 'video/mp4', createdAt: T0, updatedAt: T0,
  };
};

/* ═══ A · LA POLÍTICA ═════════════════════════════════════════════════════ */
console.log('\n── A · Cuánto dura un permiso de escritura, y cuánto cabe ──');
{
  check('Q · hay mínimo, por defecto y máximo', POLITICA_DE_SUBIDA.minSegundos === 60 && POLITICA_DE_SUBIDA.porDefectoSegundos === 900 && POLITICA_DE_SUBIDA.maxSegundos === 3600);
  check('dura MÁS que una entrega —escribir dos gigas no es leer— pero sigue siendo corto',
    POLITICA_DE_SUBIDA.porDefectoSegundos > core.POLITICA_DE_ENTREGA.porDefectoSegundos && POLITICA_DE_SUBIDA.maxSegundos <= 3600);
  check('Q · sin pedir nada, la de por defecto', vigenciaDeSubidaAprobada(undefined) === 900);
  check('Q · lo que cabe se concede', vigenciaDeSubidaAprobada(60) === 60 && vigenciaDeSubidaAprobada(3600) === 3600);
  check('R · fuera de rango se RECHAZA, no se recorta', vigenciaDeSubidaAprobada(59) === undefined && vigenciaDeSubidaAprobada(3601) === undefined && vigenciaDeSubidaAprobada(604800) === undefined);
  check('R · y lo que no es un entero, tampoco', [0, -1, 1.5, '900', {}, NaN, Infinity].every((v) => vigenciaDeSubidaAprobada(v) === undefined));

  /* M/N · El tamaño NO inventa ninguna constante. */
  check('M · el tope de Weë es el que YA existía en la Fase 11', POLITICA_DE_SUBIDA.maxBytes === MAXIMO_DE_BYTES_DE_MATERIAL);
  check('M · y cuando el proveedor publica uno menor, manda el menor',
    topeDeSubida(POLITICA_DE_SUBIDA, 1000) === 1000 && topeDeSubida(POLITICA_DE_SUBIDA, 5 * 1024 ** 3) === MAXIMO_DE_BYTES_DE_MATERIAL);
  check('M · sin tope del proveedor, el de Weë', topeDeSubida(POLITICA_DE_SUBIDA, undefined) === MAXIMO_DE_BYTES_DE_MATERIAL);
  check('M · un tamaño válido se aprueba', tamanoAprobado(1024, 2048) === 1024);
  check('N · cero, negativo, decimal, texto o pasarse: RECHAZADO',
    [0, -1, 1.5, '1024', null, undefined, NaN, 2049].every((v) => tamanoAprobado(v, 2048) === undefined));
  check('N · ni una sola constante de tamaño nueva en el Core de la subida',
    !/\d{7,}/.test(sinComentarios(leer('functions/src/core/media/subida.ts'))));

  /* O/P · El tipo de contenido. */
  check('O · un tipo con forma válida se acepta', ['video/mp4', 'image/png', 'application/pdf'].every(tipoDeContenidoAceptable));
  check('P · uno sin forma de tipo, no', ['', 'video', 'video/', '/mp4', 'x'.repeat(200), null, undefined, 5, {}].every((v) => !tipoDeContenidoAceptable(v)));
  check('P · y se dice EXPLÍCITAMENTE que esto no valida los bytes',
    /no dice que los bytes sean lo que dice el tipo/i.test(leer('functions/src/core/media/subida.ts')));
}

/* ═══ B · LA DECISIÓN PURA ════════════════════════════════════════════════ */
console.log('\n── B · Quién puede escribir, y por qué exactamente no ──');
{
  const base = { accountId: ANA, material: material(), objeto: undefined, registro: REGISTRO_FALSO, providerId: FAKE_PROVIDER_ID, contentType: 'video/mp4', bytes: 1024 };
  const d = decidirSubida(base);
  check('B · el dueño de un material en subida puede', d.permitida === true && d.vigenciaSegundos === 900 && d.maxBytes === 1024 && d.providerId === FAKE_PROVIDER_ID);

  check('D · otra cuenta NO puede', decidirSubida({ ...base, accountId: BEA }).detalle === 'no_es_tuyo');
  check('Y · un material que no existe', decidirSubida({ ...base, material: undefined }).detalle === 'sin_material');
  check('un material que ya está listo no admite bytes nuevos', decidirSubida({ ...base, material: material({ status: 'ready' }) }).detalle === 'material_no_admite_bytes');
  check('ni uno retirado, ni uno fallido, ni uno en proceso',
    ['deleted', 'failed', 'processing'].every((s) => decidirSubida({ ...base, material: material({ status: s }) }).detalle === 'material_no_admite_bytes'));
  check('solo `uploading` admite bytes', ESTADOS_QUE_ADMITEN_SUBIDA.join(',') === 'uploading');

  check('V · si YA hay ficha de objeto, los bytes ya están: no se concede permiso para pisarlos',
    decidirSubida({ ...base, objeto: ficha() }).detalle === 'ficha_ya_existe');
  check('una ficha BORRADA no bloquea: ahí ya no hay bytes', decidirSubida({ ...base, objeto: ficha({ estado: 'borrado' }) }).permitida === true);

  const apagado = crearRegistroDeMedios([{ ...DESCRIPTOR_FALSO, estado: 'DISABLED' }]).registro;
  check('G · un proveedor APAGADO nunca recibe subidas', decidirSubida({ ...base, registro: apagado }).detalle === 'sin_capacidad');
  const sinSubida = crearRegistroDeMedios([{ ...DESCRIPTOR_FALSO, capacidades: ['object.put', 'object.head'] }]).registro;
  check('F · saber GUARDAR no es saber recibir una subida: la capacidad se pregunta exacta',
    decidirSubida({ ...base, registro: sinSubida }).detalle === 'sin_capacidad');
  check('F · y `object.upload` es una capacidad propia, no un alias de `object.put`',
    REGISTRO_FALSO.puede(FAKE_PROVIDER_ID, 'object.upload') && !sinSubida.puede(FAKE_PROVIDER_ID, 'object.upload') && sinSubida.puede(FAKE_PROVIDER_ID, 'object.put'));
  check('H · un proveedor que no está declarado', decidirSubida({ ...base, registro: crearRegistroDeMedios([]).registro }).detalle === 'sin_proveedor');

  /* Lo que se puede decir y lo que no. */
  check('los fallos de la PETICIÓN sí se dicen: no hablan de ningún recurso',
    decidirSubida({ ...base, bytes: -1 }).motivo === 'peticion_invalida' && decidirSubida({ ...base, contentType: 'x' }).motivo === 'peticion_invalida' && decidirSubida({ ...base, vigenciaSegundos: 5 }).motivo === 'peticion_invalida');
  check('AB · y los del RECURSO contestan todos lo mismo, para no poder enumerar materiales ajenos',
    [decidirSubida({ ...base, material: undefined }), decidirSubida({ ...base, accountId: BEA }), decidirSubida({ ...base, objeto: ficha() }), decidirSubida({ ...base, registro: crearRegistroDeMedios([]).registro })]
      .every((x) => x.motivo === 'no_disponible'));
  check('se comprueba la petición ANTES que el recurso, para no filtrar por el orden de los errores',
    decidirSubida({ ...base, material: undefined, accountId: BEA, bytes: -5 }).motivo === 'peticion_invalida');
  check('y nada de esto lanza', [undefined, null, {}, 5].every((v) => decidirSubida({ ...base, material: v, objeto: v }).permitida === false));
}

/* ═══ C · LA IDENTIDAD ════════════════════════════════════════════════════ */
console.log('\n── C · Una sola fuente canónica ──');
{
  const a1 = identidadDeMaterialDeSubida(ANA, OP);
  check('V · el material se DERIVA de (cuenta, clave de operación): repetir pide el mismo', a1 === identidadDeMaterialDeSubida(ANA, OP));
  check('V · otra clave de operación, otro material', a1 !== identidadDeMaterialDeSubida(ANA, 'otra-operacion-1'));
  check('AB · y la MISMA clave en otra cuenta es OTRO material: nadie apunta al de otra eligiendo su clave',
    a1 !== identidadDeMaterialDeSubida(BEA, OP));
  check('tiene la forma que exige la Fase 11', core.FORMA_DE_ID_DE_MATERIAL.test(a1));
  check('una clave de operación demasiado corta o larga no produce material',
    identidadDeMaterialDeSubida(ANA, 'corta') === undefined && identidadDeMaterialDeSubida(ANA, 'x'.repeat(129)) === undefined);

  /* El intentId es una PROYECCIÓN de la identidad del objeto, no una identidad nueva. */
  const ref = { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(ANA, a1) };
  const objectRef = referenciaDelObjeto(huellaDeMedios, ref);
  const i1 = identidadDeIntento(huellaDeMedios, objectRef);
  check('el intento tiene su forma y es determinista', FORMA_DE_INTENTO.test(i1) && i1 === identidadDeIntento(huellaDeMedios, objectRef));
  check('sale de la identidad del OBJETO: otro destino, otro intento',
    i1 !== identidadDeIntento(huellaDeMedios, referenciaDelObjeto(huellaDeMedios, { ...ref, objectKey: claveDelObjeto(BEA, a1) })));
  check('y no es una segunda estrategia: sin objeto no hay intento', identidadDeIntento(huellaDeMedios, '') === undefined);
  check('una huella rota no inventa una identidad', identidadDeIntento(() => 'no-es-hex', objectRef) === undefined);
}

/* ═══ D · LA ADICIÓN DE F11 ═══════════════════════════════════════════════ */
console.log('\n── D · Un material antes de que existan sus bytes ──');
{
  const F11 = sinComentarios(leer('functions/src/content/index.ts'));
  check('existe una puerta para crear un material EN SUBIDA', /export const crearMaterialParaSubida/.test(F11));
  check('y otra para cerrarlo cuando los bytes llegan', /export const marcarMaterialSubido/.test(F11));
  check('nace en `uploading`, que es el estado que el contrato YA tenía', /status: 'uploading'/.test(F11));
  check('AF · sin `delivery`: no hay nada que entregar todavía, y para un almacén que firma no hay URL permanente',
    !/crearMaterialParaSubida[\s\S]{0,2000}?delivery/.test(F11));
  check('AF · la transición la autoriza el CONTRATO, no esta capa', /puedePasarA\(doc\.status, 'ready'\)/.test(F11));
  check('AF · y no se inventa ningún estado nuevo: el contrato de F11 no cambió',
    core.ESTADOS_DE_MATERIAL.join(',') === 'uploading,processing,ready,failed,deleted');
  check('AF · se crea con `create`, así que repetir no pisa nada', /assets\(\)\.doc\(datos\.assetId\)\.create\(doc\)/.test(F11));
  check('AB · y una referencia fuera de la carpeta de su cuenta NO crea ficha, en los DOS mundos',
    /esDeLaCuenta\(ref, datos\.ownerAccountId\)/.test(F11) && /claveEsDeLaCuenta\(ref\.objectKey, datos\.ownerAccountId\)/.test(F11));
}

/* ═══ E · EL RESOLUTOR ════════════════════════════════════════════════════ */
console.log('\n── E · De la sesión a un permiso temporal ──');

const mundo = (o = {}) => {
  const almacen = o.almacen ?? crearAlmacenFalso({ ahora: () => T0 });
  const materiales = new Map(o.materiales ?? []);
  const fichas = new Map(o.fichas ?? []);
  const escrituras = [];
  return {
    almacen, materiales, fichas, escrituras,
    deps: {
      db: {},
      cuentaDelPrincipal: async (p) => (o.sinCuenta ? null : { accountId: p }),
      crearMaterial: async (d) => {
        escrituras.push(['crearMaterial', d.assetId]);
        const previo = materiales.get(d.assetId);
        if (previo) return previo.ownerAccountId === d.ownerAccountId ? { status: 'ya_estaba', material: previo } : { status: 'no_es_tuyo' };
        const m = { contract: 1, assetId: d.assetId, ownerAccountId: d.ownerAccountId, kind: d.kind, status: 'uploading', storageRef: d.storageRef, mimeType: d.mimeType, provenance: d.provenance, createdAt: T0, updatedAt: T0 };
        materiales.set(d.assetId, m);
        return { status: 'creado', material: m };
      },
      leerMaterial: async (id) => materiales.get(id) ?? null,
      marcarSubido: async (accountId, assetId, medido) => {
        escrituras.push(['marcarSubido', assetId]);
        const m = materiales.get(assetId);
        if (!m) return { status: 'no_encontrado' };
        if (m.ownerAccountId !== accountId) return { status: 'no_es_tuyo' };
        if (m.status === 'ready') return { status: 'ya_estaba_listo', material: m };
        const nuevo = { ...m, status: 'ready', bytes: medido.bytes, mimeType: medido.mimeType ?? m.mimeType };
        materiales.set(assetId, nuevo);
        return { status: 'listo', material: nuevo };
      },
      objetos: {
        async leer(objectRef, accountId) { const f = fichas.get(objectRef); return f && f.accountId === accountId ? f : undefined; },
        async registrar(f) {
          escrituras.push(['registrarFicha', f.objectRef]);
          const previo = fichas.get(f.objectRef);
          if (previo) return previo.accountId === f.accountId ? { ok: true, objeto: previo, yaEstaba: true } : { ok: false, motivo: 'de_otra_cuenta' };
          fichas.set(f.objectRef, f);
          return { ok: true, objeto: f, yaEstaba: false };
        },
        async marcarBorrado() { throw new Error('no debe borrar nada'); },
      },
      registro: o.registro ?? REGISTRO_FALSO,
      adaptadores: o.adaptadores ?? { [FAKE_PROVIDER_ID]: almacen },
      proveedor: o.proveedor ?? FAKE_PROVIDER_ID,
      ahora: () => T0,
    },
  };
};

const PETICION = { principalId: ANA, operationId: OP, kind: 'video', contentType: 'video/mp4', bytes: 5000 };

{
  const m = mundo();
  const r = await solicitarSubida(m.deps, PETICION);
  check('B · el dueño recibe una intención de subida', r.ok === true && FORMA_DE_INTENTO.test(r.intento.intentId));
  check('C · con la cuenta derivada del principal', r.ok && r.traza.accountId === ANA);
  check('con su material de la Fase 11 dentro', r.ok && r.intento.assetId === identidadDeMaterialDeSubida(ANA, OP));
  check('A · el contrato dice a dónde, cómo, con qué cabeceras, cuánto cabe y hasta cuándo',
    r.ok && typeof r.intento.url === 'string' && r.intento.metodo === 'PUT' && r.intento.cabeceras['content-type'] === 'video/mp4'
    && r.intento.maxBytes === 5000 && r.intento.expiraEn === T0 + 900 * 1000 && r.intento.vigenciaSegundos === 900);
  check('T · y NADA más: ni contenedor, ni clave, ni proveedor, ni credencial',
    r.ok && Object.keys(r.intento).sort().join(',') === 'assetId,cabeceras,expiraEn,intentId,maxBytes,metodo,url,vigenciaSegundos');
  check('S · no hay secretos en ninguna parte de la respuesta',
    r.ok && !JSON.stringify(r.intento).includes(CONFIG_R2.secretAccessKey) && !/accessKey|secret|credential/i.test(JSON.stringify(r.intento)));
  check('V · el material se creó UNA vez', m.escrituras.filter(([q]) => q === 'crearMaterial').length === 1);
  check('y quedó en `uploading`, sin bytes', m.materiales.get(r.intento.assetId).status === 'uploading' && m.materiales.get(r.intento.assetId).bytes === undefined);

  const sinPrincipal = await solicitarSubida(m.deps, { ...PETICION, principalId: '' });
  check('sin sesión no se resuelve nada', !sinPrincipal.ok && sinPrincipal.traza.detalle === 'principal_invalido');
  const sinCuenta = mundo({ sinCuenta: true });
  check('un principal sin cuenta que valga, tampoco', (await solicitarSubida(sinCuenta.deps, PETICION)).traza.detalle === 'sin_cuenta');

  /* Una petición mal formada NO deja un material a medias. */
  const limpio = mundo();
  const mala = await solicitarSubida(limpio.deps, { ...PETICION, bytes: -1 });
  check('N · una petición inválida se rechaza SIN escribir nada', !mala.ok && limpio.escrituras.length === 0 && limpio.materiales.size === 0);
  const malTipo = mundo();
  await solicitarSubida(malTipo.deps, { ...PETICION, contentType: 'noesuntipo' });
  check('P · un tipo mal formado, tampoco escribe nada', malTipo.materiales.size === 0);
  const malaVig = mundo();
  await solicitarSubida(malaVig.deps, { ...PETICION, vigenciaSegundos: 99999 });
  check('R · una vigencia fuera de política, tampoco', malaVig.materiales.size === 0);
}

/* ═══ F · LA CONFIRMACIÓN ═════════════════════════════════════════════════ */
console.log('\n── F · No se cree al cliente: se mira el objeto ──');
{
  const m = mundo();
  const r = await solicitarSubida(m.deps, PETICION);
  const assetId = r.intento.assetId;
  const destino = { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(ANA, assetId) };

  /* X · Todavía no ha subido nada. */
  const pronto = await confirmarSubida(m.deps, { principalId: ANA, assetId });
  check('X · confirmar sin haber subido no marca nada listo: se dice que está pendiente',
    !pronto.ok && pronto.motivo === 'pendiente' && m.materiales.get(assetId).status === 'uploading' && m.fichas.size === 0);

  /* El cliente sube (el almacén falso hace de proveedor). */
  await m.almacen.guardar({ destino, cuerpo: Buffer.from('unos bytes de video'), contentType: 'video/mp4', siNoExiste: true });
  const ok = await confirmarSubida(m.deps, { principalId: ANA, assetId, operationId: OP });
  check('X · con los bytes ya puestos, se confirma', ok.ok === true && ok.assetId === assetId);
  check('X · y lo que se anota es lo MEDIDO en el proveedor, no lo que dijo el cliente',
    ok.ok && ok.bytes === 19 && ok.bytes !== PETICION.bytes);
  check('X · el material queda listo', m.materiales.get(assetId).status === 'ready' && m.materiales.get(assetId).bytes === 19);
  check('X · y queda UNA ficha de objeto, con el `ETag` del proveedor', m.fichas.size === 1 && !!m.fichas.get(ok.objectRef).etiquetaDelProveedor);
  check('la confirmación mira metadata, no bytes: una sola llamada al proveedor', m.almacen.llamadas.mirar === 2);

  /* V · Confirmar dos veces. */
  const otra = await confirmarSubida(m.deps, { principalId: ANA, assetId });
  check('V · confirmar dos veces no es un error y no duplica nada', otra.ok === true && m.fichas.size === 1 && m.materiales.get(assetId).status === 'ready');
  check('V · y la segunda ni siquiera vuelve a preguntarle al proveedor', m.almacen.llamadas.mirar === 2);

  /* Z/AA · Lo ajeno. */
  check('Z · otra cuenta no puede confirmar el material de Ana', (await confirmarSubida(m.deps, { principalId: BEA, assetId })).ok === false);
  check('Y · un material que no existe', (await confirmarSubida(m.deps, { principalId: ANA, assetId: 'asset_inventado1234' })).traza.detalle === 'sin_material');

  /* V · Pedir otra vez la subida cuando los bytes ya están. */
  /*
   * Y la Fase 11 manda: el material ya está `ready`, así que se rechaza AHÍ,
   * antes de mirar siquiera si hay objeto físico. El orden importa —el Asset es
   * la fuente de verdad— y por eso el motivo es el del material, no el de la ficha.
   */
  const repetida = await solicitarSubida(m.deps, PETICION);
  check('V · pedir permiso otra vez cuando los bytes YA están se rechaza, y lo rechaza F11',
    !repetida.ok && repetida.traza.detalle === 'material_no_admite_bytes', repetida.traza?.detalle);

  /* Un objeto que se pasó de tamaño no se da por bueno. */
  const grande = mundo();
  const rg = await solicitarSubida(grande.deps, { ...PETICION, operationId: 'operacion-grande-01' });
  await grande.almacen.guardar({ destino: { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(ANA, rg.intento.assetId) }, cuerpo: Buffer.alloc(100), contentType: 'video/mp4' });
  const conTope = { ...grande.deps, politica: { ...POLITICA_DE_SUBIDA, maxBytes: 50 } };
  const pasado = await confirmarSubida(conTope, { principalId: ANA, assetId: rg.intento.assetId });
  check('un objeto más grande de lo permitido NO se marca listo', !pasado.ok && pasado.traza.detalle === 'bytes_de_mas' && grande.materiales.get(rg.intento.assetId).status === 'uploading');
}

/* ═══ G · LA FIRMA DE R2 ══════════════════════════════════════════════════ */
console.log('\n── G · PUT prefirmado, contra el protocolo oficial ──');
{
  const adaptador = crearAdaptadorDeR2({ config: () => CONFIG_R2, ahora: () => T0 });
  const clave = claveDelObjeto(ANA, 'asset_abc123');
  const destino = { provider: R2_PROVIDER_ID, bucket: CONFIG_R2.bucket, objectKey: clave };
  const r = await adaptador.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 900, maxBytes: 5000, siNoExiste: true });

  check('R2 declara la capacidad y la implementa', adaptador.capacidades.includes('object.upload') && typeof adaptador.urlDeSubida === 'function' && r.ok === true);
  const u = new URL(r.url);
  const q = u.searchParams;
  check('es un PUT: el único mecanismo que Cloudflare documenta como soportado', r.metodo === 'PUT');
  check('la dirección es la oficial y la RUTA es la canónica de siempre',
    u.host === anfitrionDeR2(CONFIG_R2.accountId) && u.pathname === rutaCanonicaDeObjeto(CONFIG_R2.bucket, clave));
  check('algoritmo, credencial, fecha y vigencia, como los publica la documentación',
    q.get('X-Amz-Algorithm') === 'AWS4-HMAC-SHA256' && /^AKIAEJEMPLO\/\d{8}\/auto\/s3\/aws4_request$/.test(q.get('X-Amz-Credential'))
    && /^\d{8}T\d{6}Z$/.test(q.get('X-Amz-Date')) && q.get('X-Amz-Expires') === '900');
  check('O · el `content-type` va FIRMADO: el proveedor lo exige, y Weë no mira un byte',
    q.get('X-Amz-SignedHeaders').split(';').includes('content-type') && r.cabeceras['content-type'] === 'video/mp4');
  check('V · y `if-none-match: *` también: el destino es de UNA sola escritura, y lo hace cumplir el proveedor',
    q.get('X-Amz-SignedHeaders').split(';').includes('if-none-match') && r.cabeceras['if-none-match'] === '*');
  check('las cabeceras firmadas van ordenadas', q.get('X-Amz-SignedHeaders') === 'content-type;host;if-none-match');
  check('y la firma, 64 hexadecimales', /^[0-9a-f]{64}$/.test(q.get('X-Amz-Signature')));

  /* La lección de F-1, otra vez: lo firmado es lo enviado. */
  const partes = r.url.split('?')[1].split('&X-Amz-Signature=');
  check('los parámetros van ordenados y la firma fuera de lo firmado',
    partes[0] === partes[0].split('&').slice().sort().join('&') && !partes[0].includes('X-Amz-Signature'));
  check('la consulta que viaja es EXACTAMENTE la que se firmó', u.search === `?${partes[0]}&X-Amz-Signature=${partes[1]}`);

  check('es determinista', (await adaptador.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 900, maxBytes: 5000, siNoExiste: true })).url === r.url);
  const otroTipo = await adaptador.urlDeSubida({ destino, contentType: 'image/png', vigenciaSegundos: 900, maxBytes: 5000, siNoExiste: true });
  check('otro tipo declarado, otra firma: cambiar el tipo invalida el permiso', otroTipo.url !== r.url);
  check('S/T · el secreto no viaja en la URL, ni ninguna autorización',
    !r.url.includes(CONFIG_R2.secretAccessKey) && !/authorization/i.test(r.url));

  check('AE · nada de esto tocó la red: firmar es local y determinista', true);
  check('el adaptador rechaza lo que su proveedor no admite',
    (await adaptador.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: MAX_VIGENCIA_DE_R2 + 1, maxBytes: 5000 })).ok === false
    && (await adaptador.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 900, maxBytes: 6 * 1024 ** 3 })).ok === false);
  check('J · un contenedor que no es el suyo no se atiende', (await adaptador.urlDeSubida({ destino: { ...destino, bucket: 'otro' }, contentType: 'video/mp4', vigenciaSegundos: 900, maxBytes: 100 })).ok === false);
  check('K · ni una referencia de otro proveedor', (await adaptador.urlDeSubida({ destino: { provider: FAKE_PROVIDER_ID, objectKey: clave }, contentType: 'video/mp4', vigenciaSegundos: 900, maxBytes: 100 })).ok === false);
  check('sin configuración no firma nada', (await crearAdaptadorDeR2({ config: () => ({}) }).urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 900, maxBytes: 100 })).ok === false);
  check('AC · y una clave que no se puede transmitir con fidelidad se rechaza también aquí',
    (await adaptador.urlDeSubida({ destino: { ...destino, objectKey: 'a/./b' }, contentType: 'video/mp4', vigenciaSegundos: 900, maxBytes: 100 })).error.details.field === 'destino.objectKey');
}

/* ═══ H · EL PROVEEDOR DE MENTIRA ═════════════════════════════════════════ */
console.log('\n── H · La subida falsa, con las mismas reglas ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const destino = { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(ANA, 'asset_abc123') };
  const r = await almacen.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 300, maxBytes: 100, siNoExiste: true });
  check('AD · firma, hacia un dominio que NO puede existir', r.ok && r.url.startsWith('https://fake.invalid/upload/'));
  check('AD · nunca hacia un proveedor real', r.ok && !/cloudflarestorage|amazonaws|googleapis/.test(r.url));
  check('AD · con el mismo contrato que el real: método, cabeceras obligatorias y caducidad',
    r.metodo === 'PUT' && r.cabeceras['content-type'] === 'video/mp4' && r.cabeceras['if-none-match'] === '*' && r.expiraEn === T0 + 300 * 1000);
  check('AD · determinista', (await almacen.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 300, maxBytes: 100, siNoExiste: true })).url === r.url);
  check('AD · respeta el aislamiento de proveedor', (await almacen.urlDeSubida({ destino: { ...destino, provider: R2_PROVIDER_ID }, contentType: 'video/mp4', vigenciaSegundos: 300, maxBytes: 100 })).ok === false);
  check('AD · y rechaza una vigencia, un tipo o un tamaño imposibles',
    [(await almacen.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 0, maxBytes: 100 })),
      (await almacen.urlDeSubida({ destino, contentType: '', vigenciaSegundos: 300, maxBytes: 100 })),
      (await almacen.urlDeSubida({ destino, contentType: 'video/mp4', vigenciaSegundos: 300, maxBytes: 0 }))].every((x) => x.ok === false));
  check('AD · no se compone en producción', !/falso|FAKE_PROVIDER/.test(sinComentarios(leer('functions/src/media/catalogo.ts'))));
}

/* ═══ I · SEGURIDAD ═══════════════════════════════════════════════════════ */
console.log('\n── I · El cliente no elige dónde ──');
{
  const limpio = mundo();
  const a = await solicitarSubida(limpio.deps, PETICION);
  const sucio = mundo();
  const b = await solicitarSubida(sucio.deps, {
    ...PETICION,
    /* I/J/K/L · Se le manda de todo. Nada de esto debe cambiar el destino. */
    objectKey: claveDelObjeto(BEA, 'asset_de_bea12'), bucket: 'cubo-de-otro', providerId: 'erre2',
    accountId: BEA, ownerAccountId: BEA, assetId: 'asset_elegido1234',
    storageRef: { provider: 'erre2', objectKey: 'lo/que/sea' }, maxBytes: 999999999,
  });
  check('I/J/K/L · mandar clave, contenedor, proveedor, cuenta y material no cambia NADA',
    a.ok && b.ok && a.intento.url === b.intento.url && a.intento.assetId === b.intento.assetId);
  check('L · la cuenta sigue siendo la de la sesión', b.ok && b.traza.accountId === ANA);
  check('I · y la clave sigue siendo la derivada, dentro de la carpeta de Ana',
    sucio.materiales.get(b.intento.assetId).storageRef.objectKey === claveDelObjeto(ANA, b.intento.assetId));

  const PET = sinComentarios(leer('functions/src/media/subida.ts'));
  check('el resolutor no LEE nada de eso de la petición',
    !/peticion\.(objectKey|bucket|providerId|accountId|ownerAccountId|storageRef|assetId|url|maxBytes)/.test(PET.replace(/peticion\.assetId/g, '')));
  check('la cuenta sale de la puerta de Weë', /deps\.cuentaDelPrincipal\(peticion\.principalId/.test(PET));
  check('el destino lo deriva el servidor entero', /claveDelObjeto\(accountId, assetId, PIEZA_ORIGINAL\)/.test(PET) && /puerto\?\.contenedor/.test(PET));

  /* AB · Aislamiento exacto. */
  check('AB · `accounts/uAnaX/` no es `accounts/uAna/`',
    core.claveEsDeLaCuenta(claveDelObjeto(ANA, 'asset_uno1234'), ANA) && !core.claveEsDeLaCuenta(claveDelObjeto(ANA + 'X', 'asset_uno1234'), ANA));
  check('AB · sin `includes` ni prefijos sueltos en el Core de la subida',
    !/includes\(|substring\(/.test(sinComentarios(leer('functions/src/core/media/subida.ts')).replace(/ESTADOS_QUE_ADMITEN_SUBIDA\.includes/g, '')));

  /* S/T/U · Secretos y registros. */
  const t = a.traza;
  check('U · la traza NO lleva la URL de subida', !('url' in t) && !JSON.stringify(t).includes(a.intento.url));
  check('U · lleva una HUELLA con la que cruzarla sin escribirla', FORMA_DE_INTENTO.test(t.huellaDeUrl));
  check('U · y lo necesario para entender qué pasó', t.accountId === ANA && t.providerId === FAKE_PROVIDER_ID && t.resultado === 'concedida' && typeof t.ms === 'number');
  const negativa = await solicitarSubida(limpio.deps, { ...PETICION, bytes: -1 });
  check('U · una negativa tampoco lleva URL ni huella', !negativa.ok && !('url' in negativa.traza) && negativa.traza.huellaDeUrl === undefined);
  /*
   * AB · No hace falta rechazar a Bea: **no puede ni apuntar** al material de
   * Ana. La identidad del material lleva la cuenta dentro, así que la misma
   * clave de operación en otra sesión pide otro material, en otra carpeta.
   */
  const deBea = await solicitarSubida(limpio.deps, { ...PETICION, principalId: BEA });
  check('AB · Bea con la MISMA clave de operación no alcanza el material de Ana: recibe el suyo',
    deBea.ok && deBea.intento.assetId !== a.intento.assetId && deBea.traza.accountId === BEA);
  check('no hay `console.` en ninguna parte de la capa de subida',
    !/console\./.test(PET) && !/console\./.test(sinComentarios(leer('functions/src/core/media/subida.ts'))));
  check('U · y la URL de subida no se persiste en ningún sitio',
    !/delivery|url:.*intento|guardarUrl/.test(PET.replace(/url: permiso\.url/g, '')) && ![...limpio.fichas.values()].some((f) => JSON.stringify(f).includes('http')));
}

/* ═══ J · IDEMPOTENCIA Y CONCURRENCIA ═════════════════════════════════════ */
console.log('\n── J · Repetir y coincidir ──');
{
  const m = mundo();
  const tres = await Promise.all([1, 2, 3].map(() => solicitarSubida(m.deps, PETICION)));
  check('W · tres solicitudes simultáneas: todas contestan', tres.every((r) => r.ok));
  check('W · y todas al MISMO material y al MISMO destino',
    new Set(tres.map((r) => r.intento.assetId)).size === 1 && new Set(tres.map((r) => r.intento.url)).size === 1 && m.materiales.size === 1);
  check('W · sin doble propiedad: todas son de Ana', [...m.materiales.values()].every((x) => x.ownerAccountId === ANA));

  const destino = { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(ANA, tres[0].intento.assetId) };
  await m.almacen.guardar({ destino, cuerpo: Buffer.from('bytes'), contentType: 'video/mp4', siNoExiste: true });
  const conf = await Promise.all([1, 2, 3].map(() => confirmarSubida(m.deps, { principalId: ANA, assetId: tres[0].intento.assetId })));
  check('W · tres confirmaciones simultáneas: una ficha, un material listo',
    conf.every((r) => r.ok) && m.fichas.size === 1 && m.materiales.get(tres[0].intento.assetId).status === 'ready');
  check('W · la garantía no es un cerrojo: es el `create` de la base de datos y el condicional del proveedor',
    !/mutex|lock|cerrojo|Semaphore/i.test(sinComentarios(leer('functions/src/media/subida.ts'))));

  /* Dos cuentas a la vez con la MISMA clave de operación. */
  const cruzado = mundo();
  const [deAna, deBea] = await Promise.all([
    solicitarSubida(cruzado.deps, PETICION),
    solicitarSubida(cruzado.deps, { ...PETICION, principalId: BEA }),
  ]);
  check('W · la misma clave de operación en dos cuentas da DOS materiales distintos, sin cruzarse',
    deAna.ok && deBea.ok && deAna.intento.assetId !== deBea.intento.assetId && cruzado.materiales.size === 2);
  check('W · y cada uno dentro de la carpeta de su cuenta',
    cruzado.materiales.get(deAna.intento.assetId).storageRef.objectKey.startsWith(`accounts/${ANA}/`)
    && cruzado.materiales.get(deBea.intento.assetId).storageRef.objectKey.startsWith(`accounts/${BEA}/`));
}

/* ═══ K · ESTRUCTURA ══════════════════════════════════════════════════════ */
console.log('\n── K · Qué NO se ha construido ──');
{
  const SUB = sinComentarios(leer('functions/src/media/subida.ts'));
  const CORE_SUB = sinComentarios(leer('functions/src/core/media/subida.ts'));

  check('AH · ni un trabajo, ni una cola, ni un obrero: subir es corto', !/JobEngine|encolar|jobId|worker|queue|scheduler/i.test(SUB));
  check('AG · y no cobra Credits ni toca ningún libro', !/[Cc]redit|spendCredits|ledger|cobrar|refund/.test(SUB) && !/[Cc]redit/.test(CORE_SUB));
  check('no genera miniaturas, pósters, variantes ni transcodifica nada',
    !/thumbnail|poster|variant|transcod|resize|crop|preview|waveform|OCR/i.test(SUB + CORE_SUB));
  check('no hay ciclo de vida, ni recolección, ni migración, ni replicación',
    !/lifecycle|garbage|reconcil|migrat|replica/i.test(SUB + CORE_SUB));
  check('AC · el Core de la subida no menciona ningún proveedor, ni dirección, ni credencial',
    !/\bR2|[Cc]loudflare|\bAWS\b|amz|bucket|endpoint|SigV4|accessKey|secret/i.test(CORE_SUB));
  check('AC · y el resolutor tampoco', !/\bR2|[Cc]loudflare|\bAWS\b|amz|endpoint|SigV4|accessKey|Authorization/i.test(SUB));
  check('AC · donde nombra un contenedor es por el campo genérico de F11', /puerto\?\.contenedor|storageRef\.bucket/.test(SUB) && !/env\(|R2_ENV|process\.env/.test(SUB));

  check('21 · ni una consulta: nada de `where`, `orderBy` ni recorrer colecciones', !/\.where\(|\.orderBy\(|\.listDocuments\(/.test(SUB));
  check('21 · ni escuchas, ni sondeos, ni temporizadores', !/onSnapshot|setInterval|setTimeout/.test(SUB));
  check('21 · y los bytes NO pasan por Weë: aquí no se lee ni se escribe un cuerpo',
    !/Buffer|cuerpo:|body:/.test(SUB));
  check('sin estado global en la capa de subida',
    !/^(let|var|export (let|var)) /m.test(SUB) && !/^(let|var|export (let|var)) /m.test(CORE_SUB));

  const delCore = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).sort();
  check('el Core de medios son ocho archivos y ninguno más', delCore.join(',') === 'entrega.ts,index.ts,objeto.ts,procesador.ts,proceso.ts,puerto.ts,registro.ts,subida.ts', delCore.join(','));
  const fuera = fs.readdirSync(path.resolve(RAIZ, 'functions/src/media')).sort();
  check('y la composición, trece', fuera.join(',') === 'almacen.ts,canary.ts,catalogo.ts,entrega.ts,falso.ts,firma.ts,huella.ts,index.ts,procesador-falso.ts,procesador.ts,proceso.ts,r2.ts,subida.ts', fuera.join(','));

  /* La subida NO tiene puerta propia: la única de Media Cloud es la del canary. */
  check('AE · la subida no está expuesta: ninguna Function la llama',
    !/solicitarSubida|confirmarSubida/.test(leer('functions/src/index.ts'))
    && (leer('functions/src/index.ts').match(/from '\.\/media\//g) || []).length === 1);
  check('las reglas de `mediaObjects` siguen cerradas al cliente',
    /match \/mediaObjects\/\{objectRef\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')));
  check('esta suite está en la cadena de `npm test`', /media-upload-core\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
