/**
 * MC-2 · WEE MEDIA DELIVERY — LA LLAVE QUE CADUCA.
 *
 * Lo que esta fase construye es una frase: **un material de Weë se puede
 * entregar de forma segura y temporal sin que nadie sepa dónde están sus
 * bytes**. Todo lo que se prueba aquí es alguna consecuencia de eso.
 *
 *   A · La política de vigencia: acotada, del servidor.
 *   B · La decisión pura: quién puede y quién no.
 *   C · La respuesta uniforme: no se dice si algo existe.
 *   D · El resolutor entero, con las dos puertas de Weë.
 *   E · La firma de R2, sin red: consulta canónica y protocolo.
 *   F · El proveedor de mentira.
 *   G · Lo que NUNCA se guarda ni se registra.
 *   H · Seguridad: lo que manda el cliente no decide nada.
 *   I · Concurrencia y estructura.
 *
 * NADA DE ESTO ESTÁ CONECTADO: ninguna Function importa `media/`, no hay bucket
 * y NO se ha hecho ni una llamada real a R2. Todo el adaptador se ejerce con un
 * `fetch` de mentira o firmando en local, que no toca la red.
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
  POLITICA_DE_ENTREGA, ESTADOS_ENTREGABLES, claveDelObjeto, crearRegistroDeMedios,
  decidirEntrega, huellaDeEntrega, referenciaDelObjeto, vigenciaAprobada, PIEZA_ORIGINAL,
} = core;
const { crearAlmacenFalso, DESCRIPTOR_FALSO, FAKE_PROVIDER_ID } = lib('media/falso.js');
const { crearAdaptadorDeR2, DESCRIPTOR_DE_R2, MAX_VIGENCIA_DE_R2, R2_PROVIDER_ID, anfitrionDeR2 } = lib('media/r2.js');
const { rutaCanonicaDeObjeto } = lib('media/firma.js');
const { huellaDeMedios } = lib('media/huella.js');
const { solicitarEntrega } = lib('media/entrega.js');

const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const MATERIAL = 'asset_abc123';
const T0 = 1_700_000_000_000;

const CONFIG_R2 = { accountId: 'a'.repeat(32), accessKeyId: 'AKIAEJEMPLO', secretAccessKey: 'secretoDePrueba', bucket: 'wee-media' };

/* Un material de la Fase 11, lo justo para decidir. */
const material = (o = {}) => ({
  contract: 1,
  assetId: o.assetId ?? MATERIAL,
  ownerAccountId: o.ownerAccountId ?? ANA,
  kind: 'video',
  status: o.status ?? 'ready',
  storageRef: o.storageRef === null ? undefined : (o.storageRef ?? {
    provider: o.provider ?? FAKE_PROVIDER_ID,
    objectKey: claveDelObjeto(o.ownerAccountId ?? ANA, o.assetId ?? MATERIAL),
  }),
  provenance: { createdAt: T0 },
  createdAt: T0, updatedAt: T0,
});

/* Su ficha de objeto físico, coherente con él. */
const ficha = (o = {}) => {
  const accountId = o.accountId ?? ANA;
  const assetId = o.assetId ?? MATERIAL;
  const providerId = o.providerId ?? FAKE_PROVIDER_ID;
  const objectKey = o.objectKey ?? claveDelObjeto(accountId, assetId);
  const ref = { provider: providerId, ...(o.bucket ? { bucket: o.bucket } : {}), objectKey };
  return {
    objectRef: referenciaDelObjeto(huellaDeMedios, ref),
    providerId, accountId, assetId, pieza: PIEZA_ORIGINAL,
    ...(o.bucket ? { bucket: o.bucket } : {}),
    objectKey,
    estado: o.estado ?? 'guardado',
    bytes: 100, contentType: 'video/mp4', createdAt: T0, updatedAt: T0,
  };
};

const REGISTRO_FALSO = crearRegistroDeMedios([DESCRIPTOR_FALSO]).registro;

/* ═══ A · LA POLÍTICA DE VIGENCIA ═════════════════════════════════════════ */
console.log('\n── A · Cuánto dura una llave, y quién lo decide ──');
{
  check('hay un mínimo, un por defecto y un máximo, y el máximo es del SERVIDOR',
    POLITICA_DE_ENTREGA.minSegundos === 60 && POLITICA_DE_ENTREGA.porDefectoSegundos === 300 && POLITICA_DE_ENTREGA.maxSegundos === 3600);
  check('y el tope del PROVEEDOR está documentado aparte: 7 días, lo que publica Cloudflare',
    POLITICA_DE_ENTREGA.topeDelProveedorSegundos === 604800 && MAX_VIGENCIA_DE_R2 === 604800);
  check('el máximo de Weë es MUCHO más corto que el del proveedor, a propósito',
    POLITICA_DE_ENTREGA.maxSegundos < POLITICA_DE_ENTREGA.topeDelProveedorSegundos / 100);

  check('sin pedir nada, la de por defecto', vigenciaAprobada(undefined) === 300 && vigenciaAprobada(null) === 300);
  check('lo que cabe se concede tal cual', vigenciaAprobada(60) === 60 && vigenciaAprobada(3600) === 3600 && vigenciaAprobada(900) === 900);
  check('J · una vigencia que no es un entero positivo se RECHAZA',
    [0, -1, 1.5, '300', {}, [], NaN, Infinity, true].every((v) => vigenciaAprobada(v) === undefined));
  check('J · por debajo del mínimo, también', vigenciaAprobada(59) === undefined && vigenciaAprobada(1) === undefined);
  check('K · por encima del máximo se RECHAZA, no se recorta en silencio',
    vigenciaAprobada(3601) === undefined && vigenciaAprobada(86400) === undefined && vigenciaAprobada(604800) === undefined);
  check('K · pedir 7 días no devuelve 1 hora: devuelve que no', vigenciaAprobada(604800) !== 3600);
  check('la política se puede estrechar desde fuera, nunca ensanchar sola',
    vigenciaAprobada(300, { minSegundos: 10, porDefectoSegundos: 30, maxSegundos: 120, topeDelProveedorSegundos: 604800 }) === undefined);
}

/* ═══ B · LA DECISIÓN PURA ════════════════════════════════════════════════ */
console.log('\n── B · Quién puede, y por qué exactamente no ──');
{
  const base = { accountId: ANA, material: material(), objeto: ficha(), registro: REGISTRO_FALSO };
  const d = decidirEntrega(base);
  check('A · el dueño puede, y se le concede una vigencia', d.permitida === true && d.vigenciaSegundos === 300 && d.providerId === FAKE_PROVIDER_ID);

  check('B · otra cuenta NO puede, aunque acierte el identificador del material',
    decidirEntrega({ ...base, accountId: BEA }).detalle === 'no_es_tuyo');
  check('C · un material que no existe', decidirEntrega({ ...base, material: undefined }).detalle === 'sin_material');
  check('D · un material sin ficha de objeto', decidirEntrega({ ...base, objeto: undefined }).detalle === 'sin_ficha');
  check('E · una ficha que es de OTRO material', decidirEntrega({ ...base, objeto: ficha({ assetId: 'asset_otro' }) }).detalle === 'ficha_de_otro_material');
  check('F · una ficha de OTRA cuenta', decidirEntrega({ ...base, objeto: ficha({ accountId: BEA, assetId: MATERIAL }) }).detalle === 'ficha_de_otra_cuenta');
  check('G · la ficha y el material discrepan en el proveedor: no se firma nada',
    decidirEntrega({ ...base, objeto: { ...ficha(), providerId: 'erre2' }, registro: crearRegistroDeMedios([DESCRIPTOR_FALSO, { ...DESCRIPTOR_DE_R2, id: 'erre2' }]).registro }).detalle === 'proveedor_no_coincide');

  const apagado = crearRegistroDeMedios([{ ...DESCRIPTOR_FALSO, estado: 'DISABLED' }]).registro;
  check('H · un proveedor APAGADO nunca entrega', decidirEntrega({ ...base, registro: apagado }).detalle === 'sin_capacidad');
  const sinFirma = crearRegistroDeMedios([{ ...DESCRIPTOR_FALSO, capacidades: ['object.put', 'object.head'] }]).registro;
  check('I · un proveedor que guarda pero NO sabe firmar, tampoco', decidirEntrega({ ...base, registro: sinFirma }).detalle === 'sin_capacidad');
  check('un proveedor que ni siquiera está declarado se distingue por dentro',
    decidirEntrega({ ...base, registro: crearRegistroDeMedios([]).registro }).detalle === 'proveedor_desconocido');

  check('19 · una ficha marcada BORRADA no entrega nada', decidirEntrega({ ...base, objeto: ficha({ estado: 'borrado' }) }).detalle === 'ficha_borrada');
  check('19 · ni un material retirado', decidirEntrega({ ...base, material: material({ status: 'deleted' }) }).detalle === 'material_no_entregable');
  check('19 · ni uno que todavía se está subiendo, ni uno que falló',
    decidirEntrega({ ...base, material: material({ status: 'uploading' }) }).detalle === 'material_no_entregable'
    && decidirEntrega({ ...base, material: material({ status: 'failed' }) }).detalle === 'material_no_entregable');
  check('pero sí uno en `processing`: su objeto original YA está, según el contrato de F11',
    decidirEntrega({ ...base, material: material({ status: 'processing' }) }).permitida === true && ESTADOS_ENTREGABLES.includes('processing'));
  check('un material sin referencia de almacén —un texto— no tiene bytes que entregar',
    decidirEntrega({ ...base, material: material({ storageRef: null }) }).detalle === 'material_sin_objeto');
  check('y nada de esto lanza', [undefined, null, {}, 5].every((v) => decidirEntrega({ ...base, material: v, objeto: v }).permitida === false));
}

/* ═══ C · LA RESPUESTA UNIFORME ═══════════════════════════════════════════ */
console.log('\n── C · No se dice si algo existe ──');
{
  const base = { accountId: ANA, material: material(), objeto: ficha(), registro: REGISTRO_FALSO };
  const casos = [
    decidirEntrega({ ...base, material: undefined }),
    decidirEntrega({ ...base, accountId: BEA }),
    decidirEntrega({ ...base, material: material({ status: 'deleted' }) }),
    decidirEntrega({ ...base, objeto: undefined }),
    decidirEntrega({ ...base, objeto: ficha({ accountId: BEA, assetId: MATERIAL }) }),
    decidirEntrega({ ...base, registro: crearRegistroDeMedios([]).registro }),
  ];
  check('«no existe», «no es tuyo», «está borrado» y «no hay proveedor» contestan lo MISMO hacia fuera',
    casos.every((c) => c.motivo === 'no_disponible'), [...new Set(casos.map((c) => c.motivo))].join(','));
  check('probar identificadores ajenos no distingue un material de otro: la respuesta no cambia',
    new Set(casos.map((c) => c.motivo)).size === 1);
  check('pero por DENTRO cada caso se distingue, que es donde hace falta', new Set(casos.map((c) => c.detalle)).size === casos.length);
  check('la vigencia inválida SÍ se puede decir: habla de la petición, no del material',
    decidirEntrega({ ...base, vigenciaSegundos: 999999 }).motivo === 'vigencia_invalida');
  check('y se comprueba ANTES que nada, para no filtrar por el orden de los errores',
    decidirEntrega({ ...base, accountId: BEA, material: undefined, vigenciaSegundos: 999999 }).motivo === 'vigencia_invalida');
}

/* ═══ D · EL RESOLUTOR ENTERO ═════════════════════════════════════════════ */
console.log('\n── D · De quién ha iniciado sesión a una llave que caduca ──');

/* Una base de datos que EXPLOTA si alguien intenta escribir. */
const dbQueNoDejaEscribir = () => ({
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: false }),
      set: () => { throw new Error('ESCRITURA PROHIBIDA en una entrega'); },
      create: () => { throw new Error('ESCRITURA PROHIBIDA en una entrega'); },
      update: () => { throw new Error('ESCRITURA PROHIBIDA en una entrega'); },
      delete: () => { throw new Error('ESCRITURA PROHIBIDA en una entrega'); },
    }),
  }),
});

const almacenDeFichas = (fichas) => ({
  async leer(objectRef, accountId) {
    const f = fichas.find((x) => x.objectRef === objectRef);
    return f && f.accountId === accountId ? f : undefined;
  },
  async registrar() { throw new Error('ESCRITURA PROHIBIDA en una entrega'); },
  async marcarBorrado() { throw new Error('ESCRITURA PROHIBIDA en una entrega'); },
});

const depsCon = (o = {}) => {
  const almacen = o.almacen ?? crearAlmacenFalso({ ahora: () => T0 });
  const f = o.ficha ?? ficha();
  return {
    deps: {
      db: dbQueNoDejaEscribir(),
      cuentaDelPrincipal: async (principalId) => (o.sinCuenta ? null : { accountId: principalId }),
      leerMaterial: async (assetId) => (o.material === null ? null : ((o.material ?? material()).assetId === assetId ? (o.material ?? material()) : null)),
      objetos: almacenDeFichas(o.fichas ?? [f]),
      registro: o.registro ?? REGISTRO_FALSO,
      adaptadores: o.adaptadores ?? { [FAKE_PROVIDER_ID]: almacen },
      ahora: () => T0,
    },
    almacen,
  };
};

{
  /* El almacén falso solo firma lo que existe: se guarda primero. */
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const f = ficha();
  await almacen.guardar({ destino: { provider: FAKE_PROVIDER_ID, objectKey: f.objectKey }, cuerpo: Buffer.from('bytes'), contentType: 'video/mp4' });

  const { deps } = depsCon({ almacen, ficha: f });
  const r = await solicitarEntrega(deps, { principalId: ANA, assetId: MATERIAL, operationId: 'op-uno' });
  check('A · el dueño recibe una llave', r.ok === true && typeof r.entrega.url === 'string' && r.entrega.url.length > 0);
  check('con el material de Weë dentro, que SÍ es identidad', r.ok && r.entrega.assetId === MATERIAL);
  check('y con su caducidad, en milisegundos', r.ok && r.entrega.expiraEn === T0 + 300 * 1000 && r.entrega.vigenciaSegundos === 300);
  check('la respuesta NO lleva contenedor, ni clave, ni proveedor, ni referencia física',
    r.ok && !('bucket' in r.entrega) && !('objectKey' in r.entrega) && !('providerId' in r.entrega) && !('objectRef' in r.entrega) && !('storageRef' in r.entrega));
  check('Object.keys de la entrega son exactamente cuatro', r.ok && Object.keys(r.entrega).sort().join(',') === 'assetId,expiraEn,url,vigenciaSegundos');

  check('B · otra cuenta pidiendo el mismo material se va con las manos vacías',
    (await solicitarEntrega(deps, { principalId: BEA, assetId: MATERIAL })).ok === false);
  check('B · y con el MISMO motivo que si no existiera',
    (await solicitarEntrega(deps, { principalId: BEA, assetId: MATERIAL })).motivo === 'no_disponible'
    && (await solicitarEntrega(deps, { principalId: ANA, assetId: 'asset_inventado' })).motivo === 'no_disponible');

  const sinPrincipal = await solicitarEntrega(deps, { principalId: '', assetId: MATERIAL });
  check('sin sesión no se resuelve nada', sinPrincipal.ok === false && sinPrincipal.traza.detalle === 'principal_invalido');
  const { deps: sinCuenta } = depsCon({ sinCuenta: true, almacen, ficha: f });
  check('un principal sin cuenta que valga, tampoco', (await solicitarEntrega(sinCuenta, { principalId: ANA, assetId: MATERIAL })).traza.detalle === 'sin_cuenta');

  const { deps: sinAdaptador } = depsCon({ almacen, ficha: f, adaptadores: {} });
  check('si el proveedor está declarado pero no hay adaptador, se dice por dentro y no se inventa una URL',
    (await solicitarEntrega(sinAdaptador, { principalId: ANA, assetId: MATERIAL })).traza.detalle === 'sin_adaptador');

  /* Sin bytes en el almacén, el adaptador no firma. */
  const { deps: sinBytes } = depsCon({ ficha: f });
  check('y si el objeto físico no está, tampoco se firma', (await solicitarEntrega(sinBytes, { principalId: ANA, assetId: MATERIAL })).traza.detalle === 'firma_fallida');
}

/* ═══ E · LA FIRMA DE R2, SIN RED ═════════════════════════════════════════ */
console.log('\n── E · La URL firmada, contra el protocolo ──');
{
  const adaptador = crearAdaptadorDeR2({ config: () => CONFIG_R2, ahora: () => T0 });
  const clave = claveDelObjeto(ANA, MATERIAL);
  const ref = { provider: R2_PROVIDER_ID, bucket: CONFIG_R2.bucket, objectKey: clave };
  const firmada = await adaptador.urlFirmada(ref, 900);
  check('R2 declara la capacidad y la implementa de verdad',
    adaptador.capacidades.includes('object.signedUrl') && typeof adaptador.urlFirmada === 'function' && firmada.ok === true);

  const u = new URL(firmada.url);
  const q = u.searchParams;
  check('la dirección es la oficial', u.host === anfitrionDeR2(CONFIG_R2.accountId) && u.protocol === 'https:');
  check('la RUTA es exactamente la canónica, la misma que usan guardar/mirar/borrar', u.pathname === rutaCanonicaDeObjeto(CONFIG_R2.bucket, clave));
  check('algoritmo `AWS4-HMAC-SHA256`', q.get('X-Amz-Algorithm') === 'AWS4-HMAC-SHA256');
  check('credencial con su ámbito: clave/fecha/auto/s3/aws4_request', /^AKIAEJEMPLO\/\d{8}\/auto\/s3\/aws4_request$/.test(q.get('X-Amz-Credential')));
  check('fecha en formato del protocolo', /^\d{8}T\d{6}Z$/.test(q.get('X-Amz-Date')));
  check('vigencia en segundos, la concedida', q.get('X-Amz-Expires') === '900');
  check('solo se firma `host`, como dice la documentación oficial', q.get('X-Amz-SignedHeaders') === 'host');
  check('y la firma, 64 hexadecimales', /^[0-9a-f]{64}$/.test(q.get('X-Amz-Signature')));
  check('caduca cuando dice', firmada.expiraEn === T0 + 900 * 1000);

  /* LA LECCIÓN DE F-1, EN LA CONSULTA: lo firmado es lo enviado. */
  const partes = firmada.url.split('?')[1].split('&X-Amz-Signature=');
  const canonica = partes[0];
  const ordenada = canonica.split('&').slice().sort().join('&');
  check('los parámetros van ORDENADOS por nombre, que es parte del protocolo', canonica === ordenada);
  check('`X-Amz-Signature` va al final y FUERA de lo firmado', partes.length === 2 && !canonica.includes('X-Amz-Signature'));
  check('la consulta que viaja es EXACTAMENTE la que se firmó, sin reordenar ni recodificar',
    u.search === `?${canonica}&X-Amz-Signature=${partes[1]}`);
  check('las barras de la credencial van escapadas dentro del parámetro', canonica.includes('%2F'));

  /* Propiedades de la firma, sin reimplementar SigV4 en la prueba. */
  const otra = await adaptador.urlFirmada(ref, 900);
  check('es determinista con los mismos datos', otra.ok && otra.url === firmada.url);
  const otraClave = await adaptador.urlFirmada({ ...ref, objectKey: claveDelObjeto(ANA, 'asset_distinto') }, 900);
  check('otra clave, otra firma', otraClave.ok && new URL(otraClave.url).searchParams.get('X-Amz-Signature') !== q.get('X-Amz-Signature'));
  const otraVigencia = await adaptador.urlFirmada(ref, 600);
  check('otra vigencia, otra firma: el tiempo va firmado', otraVigencia.ok && new URL(otraVigencia.url).searchParams.get('X-Amz-Signature') !== q.get('X-Amz-Signature'));
  const otroSecreto = await crearAdaptadorDeR2({ config: () => ({ ...CONFIG_R2, secretAccessKey: 'otroSecreto' }), ahora: () => T0 }).urlFirmada(ref, 900);
  check('y otro secreto, otra firma', otroSecreto.ok && otroSecreto.url !== firmada.url);

  check('EL SECRETO NO VIAJA EN LA URL, en ninguna forma', !firmada.url.includes(CONFIG_R2.secretAccessKey));
  check('ni ninguna cabecera de autorización', !/authorization/i.test(firmada.url));

  const fuera = await adaptador.urlFirmada(ref, MAX_VIGENCIA_DE_R2 + 1);
  check('el adaptador rechaza lo que su proveedor no admite', fuera.ok === false && fuera.error.details.field === 'vigenciaSegundos');
  const sinConfig = await crearAdaptadorDeR2({ config: () => ({}), ahora: () => T0 }).urlFirmada(ref, 900);
  check('sin configuración no firma nada', sinConfig.ok === false && sinConfig.error.details.reason === 'no_configurado');
  const ajena = await adaptador.urlFirmada({ ...ref, bucket: 'otro-cubo' }, 900);
  check('N · un contenedor que no es el suyo no se atiende', ajena.ok === false);
  const deOtro = await adaptador.urlFirmada({ provider: FAKE_PROVIDER_ID, objectKey: clave }, 900);
  check('O · una referencia de otro proveedor, tampoco', deOtro.ok === false);
  const conPunto = await adaptador.urlFirmada({ ...ref, objectKey: 'a/./b' }, 900);
  check('y una clave que no se puede transmitir con fidelidad se rechaza también al firmar', conPunto.ok === false && conPunto.error.details.field === 'destino.objectKey');
}

/* ═══ F · EL PROVEEDOR DE MENTIRA ═════════════════════════════════════════ */
console.log('\n── F · La llave falsa, con las mismas reglas ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const ref = { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(ANA, MATERIAL) };
  await almacen.guardar({ destino: ref, cuerpo: Buffer.from('bytes'), contentType: 'video/mp4' });
  const r = await almacen.urlFirmada(ref, 120);
  check('firma, y hacia un dominio que NO puede existir', r.ok && r.url.startsWith('https://fake.invalid/'));
  check('nunca hacia un proveedor real', r.ok && !/cloudflarestorage|amazonaws|googleapis/.test(r.url));
  check('respeta la caducidad que se le pide', r.ok && r.expiraEn === T0 + 120 * 1000);
  check('es determinista', (await almacen.urlFirmada(ref, 120)).url === r.url);
  check('respeta la identidad del objeto: otra clave, otra llave',
    (await almacen.urlFirmada({ ...ref, objectKey: claveDelObjeto(BEA, MATERIAL) }, 120)).ok === false);
  check('respeta el aislamiento de proveedor', (await almacen.urlFirmada({ ...ref, provider: R2_PROVIDER_ID }, 120)).ok === false);
  check('y una vigencia imposible se rechaza', (await almacen.urlFirmada(ref, 0)).ok === false);

  const otro = crearAlmacenFalso({ ahora: () => T0 });
  check('dos instancias no se ven: el aislamiento es por instancia', (await otro.urlFirmada(ref, 120)).ok === false);
  check('no se compone en producción', !/falso|FAKE_PROVIDER/.test(sinComentarios(leer('functions/src/media/catalogo.ts'))));
}

/* ═══ G · LO QUE NUNCA SE GUARDA NI SE REGISTRA ═══════════════════════════ */
console.log('\n── G · La llave no es un dato ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const f = ficha();
  await almacen.guardar({ destino: { provider: FAKE_PROVIDER_ID, objectKey: f.objectKey }, cuerpo: Buffer.from('bytes'), contentType: 'video/mp4' });
  const { deps } = depsCon({ almacen, ficha: f });
  const r = await solicitarEntrega(deps, { principalId: ANA, assetId: MATERIAL, operationId: 'op-dos' });

  /*
   * L · La base de datos que se le dio EXPLOTA en cualquier escritura, y el
   * almacén de fichas también. Que esto haya llegado hasta aquí ya prueba que
   * no se escribió nada en ningún sitio.
   */
  check('L · pedir una entrega no escribe NADA: ni material, ni ficha, ni ningún documento', r.ok === true);
  check('L · ni el material ni la ficha quedan tocados', f.estado === 'guardado' && !('delivery' in f) && !('url' in f));

  /* P · La traza sirve para entender, no para entrar. */
  const t = r.traza;
  check('P · la traza NO lleva la URL', !('url' in t) && !JSON.stringify(t).includes(r.entrega.url));
  check('P · ni un trozo de su firma', !JSON.stringify(t).includes(r.entrega.url.slice(-32)));
  check('P · lleva una HUELLA con la que cruzarla sin escribirla', /^ent_[0-9a-f]{16}$/.test(t.huellaDeUrl));
  check('P · y lo que hace falta para entender qué pasó',
    t.operationId === 'op-dos' && t.accountId === ANA && t.assetId === MATERIAL && t.providerId === FAKE_PROVIDER_ID
    && t.resultado === 'entregada' && typeof t.ms === 'number');
  check('la huella es de la URL entera: otra URL, otra huella',
    huellaDeEntrega(huellaDeMedios, r.entrega.url) === t.huellaDeUrl && huellaDeEntrega(huellaDeMedios, r.entrega.url + 'x') !== t.huellaDeUrl);
  check('y una huella rota no inventa una', huellaDeEntrega(() => 'no-es-hex', 'x') === 'ent_desconocida');

  /* Lo mismo cuando falla: una negativa tampoco filtra nada. */
  const malo = await solicitarEntrega(deps, { principalId: BEA, assetId: MATERIAL, operationId: 'op-tres' });
  check('una negativa tampoco lleva URL ni huella', !malo.ok && !('url' in malo.traza) && malo.traza.huellaDeUrl === undefined);

  /* Y dicho sobre el texto. */
  const ENT = sinComentarios(leer('functions/src/media/entrega.ts'));
  check('el resolutor no escribe: ni `set`, ni `create`, ni `update`, ni `delete`', !/\.(set|create|update|delete)\(/.test(ENT));
  check('y no registra nada por su cuenta', !/console\./.test(ENT));
  check('el Core de la entrega tampoco', !/console\./.test(sinComentarios(leer('functions/src/core/media/entrega.ts'))));
}

/* ═══ H · LO QUE MANDA EL CLIENTE NO DECIDE NADA ══════════════════════════ */
console.log('\n── H · El cliente elige UNA cosa: qué material ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const f = ficha();
  await almacen.guardar({ destino: { provider: FAKE_PROVIDER_ID, objectKey: f.objectKey }, cuerpo: Buffer.from('bytes'), contentType: 'video/mp4' });
  const { deps } = depsCon({ almacen, ficha: f });

  /* M/N/O · Se le manda de todo. Nada de ello debe cambiar el resultado. */
  const limpia = await solicitarEntrega(deps, { principalId: ANA, assetId: MATERIAL });
  const envenenada = await solicitarEntrega(deps, {
    principalId: ANA, assetId: MATERIAL,
    objectKey: claveDelObjeto(BEA, MATERIAL), bucket: 'cubo-de-otro', providerId: 'erre2',
    accountId: BEA, ownerAccountId: BEA, storageRef: { provider: 'erre2', objectKey: 'lo/que/sea' },
  });
  check('M/N/O · mandar clave, contenedor, proveedor y dueño no cambia NADA',
    limpia.ok && envenenada.ok && limpia.entrega.url === envenenada.entrega.url);
  check('M/N/O · y la entrega sigue siendo la del material de su dueño', envenenada.ok && envenenada.traza.accountId === ANA);

  const PET = sinComentarios(leer('functions/src/media/entrega.ts')).match(/export const solicitarEntrega[\s\S]*?\n\};/)[0];
  check('el resolutor no LEE nada de eso de la petición',
    !/peticion\.(objectKey|bucket|providerId|accountId|ownerAccountId|storageRef|url)/.test(PET));
  check('la cuenta sale de la puerta de Weë, no de la petición', /deps\.cuentaDelPrincipal\(peticion\.principalId/.test(PET));
  check('y la clave del objeto sale de la ficha guardada', /decision\.objeto\.objectKey/.test(PET));

  /* 17 · El aislamiento de MC-1 se mantiene. */
  const deVecina = ficha({ accountId: ANA + 'X', assetId: MATERIAL });
  check('17 · `accounts/uAnaX/` no es `accounts/uAna/`',
    decidirEntrega({ accountId: ANA, material: material(), objeto: deVecina, registro: REGISTRO_FALSO }).permitida === false);
  check('17 · la comprobación no usa `includes` ni un prefijo suelto',
    !/includes\(|substring\(/.test(sinComentarios(leer('functions/src/core/media/entrega.ts')).replace(/ESTADOS_ENTREGABLES\.includes/g, '')));
}

/* ═══ I · CONCURRENCIA Y ESTRUCTURA ═══════════════════════════════════════ */
console.log('\n── I · Muchas a la vez, y qué NO se ha construido ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const f = ficha();
  await almacen.guardar({ destino: { provider: FAKE_PROVIDER_ID, objectKey: f.objectKey }, cuerpo: Buffer.from('bytes'), contentType: 'video/mp4' });
  const { deps } = depsCon({ almacen, ficha: f });

  const muchas = await Promise.all(Array.from({ length: 8 }, (_, i) => solicitarEntrega(deps, { principalId: ANA, assetId: MATERIAL, operationId: `op-${i}` })));
  check('ocho a la vez: todas contestan', muchas.every((r) => r.ok));
  check('y todas la misma llave, porque firmar es DETERMINISTA y no guarda estado',
    new Set(muchas.map((r) => r.entrega.url)).size === 1);
  check('cada una conserva su propio identificador de operación', new Set(muchas.map((r) => r.traza.operationId)).size === 8);

  const mezcladas = await Promise.all([
    solicitarEntrega(deps, { principalId: ANA, assetId: MATERIAL }),
    solicitarEntrega(deps, { principalId: BEA, assetId: MATERIAL }),
    solicitarEntrega(deps, { principalId: ANA, assetId: MATERIAL }),
  ]);
  check('mezclar cuentas a la vez no contamina: la ajena sigue sin recibir nada',
    mezcladas[0].ok && !mezcladas[1].ok && mezcladas[2].ok);
  check('sin estado global: no hay `let` ni `var` de módulo en la capa de entrega',
    !/^(let|var|export (let|var)) /m.test(sinComentarios(leer('functions/src/media/entrega.ts')))
    && !/^(let|var|export (let|var)) /m.test(sinComentarios(leer('functions/src/core/media/entrega.ts'))));

  /* 21 · El coste, dicho sobre el texto: nada que recorra ni que se repita. */
  const ENT = sinComentarios(leer('functions/src/media/entrega.ts'));
  check('21 · ni una consulta: no hay `where`, ni `orderBy`, ni recorrer una colección', !/\.where\(|\.orderBy\(|\.listDocuments\(|collection\(\)\.get\(/.test(ENT));
  check('21 · ni escuchas, ni sondeos, ni temporizadores', !/onSnapshot|setInterval|setTimeout|while\s*\(/.test(ENT));
  check('21 · la ficha se encuentra DERIVANDO su identidad, que es lo que compró MC-1', /referenciaDelObjeto\(huellaDeMedios, material\.storageRef\)/.test(ENT));

  /* 25 · Sin Job Engine: firmar es corto y local. */
  check('25 · la entrega no crea trabajos, ni colas, ni obreros', !/JobEngine|encolar|jobId|worker|cola/i.test(ENT));
  /* 26 · Sin Credits. */
  check('26 · y no cobra nada', !/[Cc]redit|spendCredits|ledger|cobrar/.test(ENT) && !/[Cc]redit/.test(sinComentarios(leer('functions/src/core/media/entrega.ts'))));

  /* 32 · Fases futuras que NO se han implementado. */
  const TODO = ['media', 'core/media'].map((d) => fs.readdirSync(path.resolve(RAIZ, 'functions/src', d)).map((x) => leer(`functions/src/${d}/${x}`)).join('\n')).join('\n');
  const SIN_COMENTARIOS = sinComentarios(TODO);
  const futuras = ['directUpload', 'multipart', 'thumbnail', 'transcod', 'lifecycle', 'migrat', 'qiniu', 'alibaba', 'tencent', 'AssetPicker', 'ControlCenter']
    .filter((t) => new RegExp(t, 'i').test(SIN_COMENTARIOS));
  check('32 · ninguna fase futura se coló en el código', futuras.length === 0, futuras.join(','));
  check('32 · `traer` y `copiar` siguen declaradas y SIN implementar',
    !/async traer\(|async copiar\(/.test(SIN_COMENTARIOS) && /traer\?\(/.test(leer('functions/src/core/media/puerto.ts')));

  const delCore = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).sort();
  check('el Core de medios son seis archivos y ninguno más', delCore.join(',') === 'entrega.ts,index.ts,objeto.ts,puerto.ts,registro.ts,subida.ts', delCore.join(','));
  const fuera = fs.readdirSync(path.resolve(RAIZ, 'functions/src/media')).sort();
  check('y la composición, nueve', fuera.join(',') === 'almacen.ts,catalogo.ts,entrega.ts,falso.ts,firma.ts,huella.ts,index.ts,r2.ts,subida.ts', fuera.join(','));

  /* 13 · R2 no se menciona fuera de su adaptador. */
  /*
   * `bucket` SÍ aparece, y tiene que aparecer: es un campo del `StorageRef` de
   * la Fase 11, que es genérico —un contenedor lo tienen R2, Qiniu y Alibaba—.
   * Lo que no puede aparecer es un PROVEEDOR, una dirección o una credencial.
   */
  check('13 · el resolutor no menciona ningún proveedor, ni dirección, ni credencial, ni firma',
    !/\bR2|[Cc]loudflare|\bAWS\b|amz|endpoint|SigV4|accessKey|secret|Authorization|signedUrl/i.test(ENT));
  check('13 · y donde nombra un contenedor es copiando el campo genérico de F11, no leyendo una variable',
    /decision\.objeto\.bucket/.test(ENT) && !/env\(|R2_ENV|process\.env/.test(ENT));
  check('13 · y el Core de la entrega, tampoco', !/R2|[Cc]loudflare|AWS|amz|s3/i.test(sinComentarios(leer('functions/src/core/media/entrega.ts'))));

  check('esta suite está en la cadena de `npm test`', /media-delivery-core\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
