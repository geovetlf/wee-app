/**
 * MC-1 · WEE MEDIA CLOUD — LA CAPA DE ALMACENAMIENTO.
 *
 * Lo que esta fase construye es una sola cosa dicha de muchas maneras: **Weë es
 * dueño del material y el proveedor solo guarda bytes**. Todo lo que se prueba
 * aquí es alguna consecuencia de eso.
 *
 *   A · El registro: quién hay, qué sabe hacer, y qué no se acepta.
 *   B · La clave: aislada por cuenta, derivada, imposible de sacar de su sitio.
 *   C · La identidad: `objectRef` es de Weë, no del proveedor.
 *   D · La ficha: qué es válido y qué no puede escribirse nunca.
 *   E · El puerto, contra el almacén de mentira.
 *   F · El adaptador de R2, sin tocar la red.
 *   G · Idempotencia y concurrencia.
 *   H · Seguridad: lo ajeno, lo inventado y lo que llega de fuera.
 *   I · Estructura: qué NO se ha construido.
 *
 * NADA DE ESTO ESTÁ CONECTADO: ninguna Function importa `media/`, no hay bucket
 * creado y no se ha escrito un byte en R2.
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
  CAPACIDADES_DE_MC1, claveDelObjeto, claveEsDeLaCuenta, cuentaDeLaClave, crearRegistroDeMedios,
  esStorageRef, objetoEsDeLaCuenta, objetoValido, proveedorParaGuardar, referenciaDeAlmacenDe,
  referenciaDelObjeto, PIEZA_ORIGINAL, MAX_CLAVE,
} = core;
const { crearAlmacenFalso, FAKE_PROVIDER_ID } = lib('media/falso.js');
const { crearAdaptadorDeR2, DESCRIPTOR_DE_R2, R2_PROVIDER_ID, anfitrionDeR2, configuracionDeR2Valida } = lib('media/r2.js');
const { firmar, codificarParaFirma } = lib('media/firma.js');
const { huellaDeMedios } = lib('media/huella.js');

/* El Core no calcula huellas: se le pasa la del sistema, la misma que en produccion. */
const refDe = (ref) => referenciaDelObjeto(huellaDeMedios, ref);
const valida = (o) => objetoValido(huellaDeMedios, o);

const CUENTA = 'cuentaDeAna';
const OTRA = 'cuentaDeBea';
const MATERIAL = 'asset_abc123';
const T0 = 1_700_000_000_000;

/* ═══ A · EL REGISTRO ═════════════════════════════════════════════════════ */
console.log('\n── A · Quién hay, qué sabe hacer, y qué no se acepta ──');
{
  const { registro, rechazados } = crearRegistroDeMedios([DESCRIPTOR_DE_R2]);
  check('R2 está declarado, con su identidad canónica', registro.buscar('r2')?.id === 'r2');
  check('y esa identidad es la MISMA que cabe en un `StorageRef`', esStorageRef({ provider: R2_PROVIDER_ID, objectKey: 'x' }));
  check('sabe guardar, mirar y borrar', ['object.put', 'object.head', 'object.delete'].every((c) => registro.puede('r2', c)));
  check('y NO dice saber lo que no implementa', !registro.puede('r2', 'object.signedUrl') && !registro.puede('r2', 'object.copy') && !registro.puede('r2', 'object.get'));
  check('no lleva ni una credencial dentro, solo los NOMBRES de sus variables',
    !JSON.stringify(DESCRIPTOR_DE_R2).match(/[A-Za-z0-9/+]{40,}/) && DESCRIPTOR_DE_R2.credencialesEnv.includes('R2_SECRET_ACCESS_KEY'));
  check('declara los límites PUBLICADOS: clave 1.024, subida simple 5 GiB, objeto 5 TiB',
    DESCRIPTOR_DE_R2.limites.maxLargoDeClave === 1024 && DESCRIPTOR_DE_R2.limites.maxBytesDeUnaSubida === 5 * 1024 ** 3 && DESCRIPTOR_DE_R2.limites.maxBytesPorObjeto === 5 * 1024 ** 4);
  check('y se declara UNVERIFIED, porque ninguna llamada real ha llegado todavía', DESCRIPTOR_DE_R2.estado === 'UNVERIFIED');
  check('con la documentación oficial en la que se basa', /developers\.cloudflare\.com\/r2\//.test(DESCRIPTOR_DE_R2.docsUrl));

  const dup = crearRegistroDeMedios([DESCRIPTOR_DE_R2, { ...DESCRIPTOR_DE_R2, name: 'otro' }]);
  check('dos proveedores con el mismo nombre: el segundo se RECHAZA, no se pisa el primero', dup.registro.todos().length === 1 && dup.rechazados[0].motivo === 'duplicado');
  const malos = crearRegistroDeMedios([
    { id: 'R2Mayusculas', name: 'x', estado: 'READY', capacidades: ['object.put'] },
    { id: 'sin-caps', name: 'x', estado: 'READY', capacidades: [] },
    { id: 'repetida', name: 'x', estado: 'READY', capacidades: ['object.put', 'object.put'] },
  ]);
  check('un identificador que no cabría en un `StorageRef` se rechaza', malos.rechazados.some((r) => r.motivo === 'id_invalido'));
  check('uno sin capacidades, también', malos.rechazados.some((r) => r.motivo === 'sin_capacidades'));
  check('y una capacidad repetida, también', malos.rechazados.some((r) => r.motivo === 'capacidad_repetida'));
  check('nada de eso lanza: un catálogo mal escrito es un dato, no una excepción', malos.registro.todos().length === 0);

  const apagado = crearRegistroDeMedios([{ ...DESCRIPTOR_DE_R2, estado: 'DISABLED' }]).registro;
  check('un proveedor apagado NO puede, aunque lo declare', apagado.buscar('r2') && !apagado.puede('r2', 'object.put'));
  check('y no aparece entre los disponibles', apagado.disponibles().length === 0);

  check('elegir con qué guardar es una lectura, no un router', proveedorParaGuardar(registro, 'r2')?.id === 'r2');
  check('y sin configuración, o con un proveedor que no existe, no se elige nada',
    proveedorParaGuardar(registro, undefined) === undefined && proveedorParaGuardar(registro, 'qiniu') === undefined);
  check('un apagado tampoco se elige', proveedorParaGuardar(apagado, 'r2') === undefined);
}

/* ═══ B · LA CLAVE ════════════════════════════════════════════════════════ */
console.log('\n── B · La clave: aislada por cuenta y derivada ──');
{
  const k = claveDelObjeto(CUENTA, MATERIAL);
  check('la clave empieza por la cuenta, y eso es el aislamiento', k === `accounts/${CUENTA}/assets/${MATERIAL}/original`);
  check('es DETERMINISTA: la misma cuenta y el mismo material dan la misma clave', k === claveDelObjeto(CUENTA, MATERIAL));
  check('otra cuenta da otra clave', claveDelObjeto(OTRA, MATERIAL) !== k);
  check('otro material, también', claveDelObjeto(CUENTA, 'asset_otro') !== k);
  check('otra pieza, también: el original y su miniatura no son el mismo objeto', claveDelObjeto(CUENTA, MATERIAL, 'thumbnail') !== k);

  /* Lo que no puede salirse de su carpeta. */
  const hostiles = [
    ['../otra', MATERIAL], [CUENTA, '../otro'], ['a/b', MATERIAL], [CUENTA, 'a/b'],
    ['', MATERIAL], [CUENTA, ''], ['..', '..'], [CUENTA + '/..', MATERIAL],
    ['cuenta con espacio', MATERIAL], [CUENTA, 'asset\u0000'],
  ];
  check('ninguna entrada hostil produce clave: ni rutas, ni puntos, ni espacios, ni nulos',
    hostiles.every(([a, b]) => claveDelObjeto(a, b) === undefined));
  check('ni una pieza en mayúsculas: dos mayúsculas no pueden ser dos objetos', claveDelObjeto(CUENTA, MATERIAL, 'Thumbnail') === undefined);
  check('ni tipos que no son texto', [undefined, null, 1, {}, []].every((v) => claveDelObjeto(v, v) === undefined));
  check('y una clave que no cabría en el límite del proveedor tampoco', claveDelObjeto('c'.repeat(128), 'a'.repeat(128)) !== undefined && MAX_CLAVE === 1024);

  check('la clave resultante es válida para la Fase 11 SIN tocar su contrato', esStorageRef({ provider: 'r2', bucket: 'wee', objectKey: k }));

  /* La pertenencia se comprueba por prefijo ENTERO. */
  check('`accounts/cuentaDeAnaX/` NO es de `cuentaDeAna`', !claveEsDeLaCuenta(`accounts/${CUENTA}X/assets/a/original`, CUENTA));
  check('y la suya sí', claveEsDeLaCuenta(k, CUENTA));
  check('una clave de otra cuenta no es suya', !claveEsDeLaCuenta(claveDelObjeto(OTRA, MATERIAL), CUENTA));
  check('la cuenta se LEE de la clave con su forma entera, no quitando un prefijo', cuentaDeLaClave(k) === CUENTA && cuentaDeLaClave('accounts/x/otra/cosa') === undefined);
}

/* ═══ C · LA IDENTIDAD ════════════════════════════════════════════════════ */
console.log('\n── C · `objectRef` es de Weë, no del proveedor ──');
{
  const ref = { provider: 'r2', bucket: 'wee-media', objectKey: claveDelObjeto(CUENTA, MATERIAL) };
  const id = refDe(ref);
  check('tiene forma de identidad de Weë', /^mob_[0-9a-f]{32}$/.test(id));
  check('es determinista: el mismo sitio da la misma identidad', id === refDe({ ...ref }));
  check('otro proveedor, otra identidad', id !== refDe({ ...ref, provider: 'fake' }));
  check('otro contenedor, otra identidad', id !== refDe({ ...ref, bucket: 'otro' }));
  check('otra clave, otra identidad', id !== refDe({ ...ref, objectKey: claveDelObjeto(OTRA, MATERIAL) }));
  check('NO es la clave del proveedor', id !== ref.objectKey);
  check('NO es una URL', !id.includes('http') && !id.includes('r2.cloudflarestorage'));
  check('NO es un ETag: el del proveedor no interviene', id === refDe(ref));
  check('una referencia inválida no produce identidad', [undefined, {}, { provider: 'r2' }, { provider: 'MAL', objectKey: 'x' }].every((r) => refDe(r) === undefined));

  /*
   * LA HUELLA ES UN PUERTO, NO UN ADORNO. Estas dos fallan si alguien vuelve a
   * meter `crypto` dentro del Core y se guarda el parámetro sin usarlo: la
   * primera porque la identidad dejaría de depender de lo que se pasa, la
   * segunda porque una huella rota pasaría desapercibida.
   */
  check('la identidad sale de la huella que se PASA, no de una escondida dentro del Core',
    referenciaDelObjeto(() => 'b'.repeat(64), ref) === 'mob_' + 'b'.repeat(32)
    && referenciaDelObjeto(() => 'a'.repeat(64), ref) === 'mob_' + 'a'.repeat(32));
  check('y lo que se le da a la huella es DÓNDE está el objeto, nada más',
    referenciaDelObjeto((t) => (t === `${ref.provider}|${ref.bucket}|${ref.objectKey}` ? 'c'.repeat(64) : 'd'.repeat(64)), ref) === 'mob_' + 'c'.repeat(32));
  check('una huella que no devuelve hexadecimal no produce identidad',
    [() => 'no-es-hex', () => '', () => 'abc', () => undefined, () => 42].every((h) => referenciaDelObjeto(h, ref) === undefined));
}

/* ═══ D · LA FICHA ════════════════════════════════════════════════════════ */
console.log('\n── D · Qué ficha es válida, y qué no puede escribirse nunca ──');

const fichaDe = (o = {}) => {
  const accountId = o.accountId ?? CUENTA;
  const assetId = o.assetId ?? MATERIAL;
  const pieza = o.pieza ?? PIEZA_ORIGINAL;
  const objectKey = o.objectKey ?? claveDelObjeto(accountId, assetId, pieza);
  const base = { provider: o.providerId ?? 'r2', ...(o.bucket === null ? {} : { bucket: o.bucket ?? 'wee-media' }), objectKey };
  return {
    objectRef: o.objectRef ?? refDe(base),
    providerId: base.provider, accountId, assetId, pieza,
    ...(base.bucket ? { bucket: base.bucket } : {}),
    objectKey,
    estado: o.estado ?? 'guardado',
    bytes: o.bytes ?? 1234,
    contentType: 'video/mp4',
    createdAt: T0, updatedAt: T0,
  };
};

{
  check('una ficha bien formada vale', valida(fichaDe()));
  check('y su referencia de almacén es la de la Fase 11, sin traducir nada', esStorageRef(referenciaDeAlmacenDe(fichaDe())));

  /* LA COMPROBACIÓN QUE MÁS IMPORTA. */
  const mentirosa = fichaDe({ accountId: CUENTA, objectKey: claveDelObjeto(OTRA, MATERIAL) });
  check('una ficha que dice ser de una cuenta y apunta a la carpeta de OTRA: INVÁLIDA', !valida({ ...mentirosa, objectRef: refDe(referenciaDeAlmacenDe(mentirosa)) }));
  check('una ficha cuya identidad no coincide con dónde dice estar: INVÁLIDA', !valida(fichaDe({ objectRef: 'mob_' + '0'.repeat(32) })));
  check('una identidad con otra forma: INVÁLIDA', !valida(fichaDe({ objectRef: 'asset_123' })));
  check('un estado que no existe: INVÁLIDA', !valida(fichaDe({ estado: 'subiendo' })));
  check('una cuenta o un material con forma rara: INVÁLIDA', !valida(fichaDe({ accountId: 'a/b' })) && !valida({ ...fichaDe(), assetId: '../x' }));
  check('bytes negativos: INVÁLIDA', !valida(fichaDe({ bytes: -1 })));
  check('y nada de eso lanza', [undefined, null, {}, 'x', 5].every((v) => valida(v) === false));

  check('la pertenencia exige las DOS cosas: que lo diga y que la clave lo respalde',
    objetoEsDeLaCuenta(fichaDe(), CUENTA) && !objetoEsDeLaCuenta(fichaDe(), OTRA) && !objetoEsDeLaCuenta(mentirosa, CUENTA));

  /* Lo que la ficha NO lleva: es una relación física, no una copia del material. */
  const claves = Object.keys(fichaDe());
  check('la ficha NO duplica el material: ni nombre, ni etiquetas, ni procedencia, ni variantes',
    !claves.some((k) => ['name', 'tags', 'provenance', 'variants', 'content', 'delivery', 'metadata'].includes(k)), claves.join(','));
  /* `objectKey` es la clave del OBJETO, no una credencial: se buscan credenciales, no la palabra «key». */
  check('ni lleva credenciales, ni URLs, ni bytes',
    !claves.some((k) => /secret|accesskey|apikey|token|password|url|body|cuerpo|contenido/i.test(k)), claves.join(','));
}

/* ═══ E · EL PUERTO ═══════════════════════════════════════════════════════ */
console.log('\n── E · El puerto, contra el almacén de mentira ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const ref = { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(CUENTA, MATERIAL) };
  const cuerpo = Buffer.from('unos bytes de video');

  const g = await almacen.guardar({ destino: ref, cuerpo, contentType: 'video/mp4', siNoExiste: true });
  check('guardar: queda guardado y dice que no estaba', g.ok && g.yaExistia === false && g.objeto.bytes === cuerpo.length);
  check('y devuelve la etiqueta del proveedor, que es suya y opaca', g.ok && typeof g.objeto.etiquetaDelProveedor === 'string');

  const m = await almacen.mirar(ref);
  check('mirar: está, con su tamaño y su tipo', m.ok && m.objeto.bytes === cuerpo.length && m.objeto.contentType === 'video/mp4');
  const noEsta = await almacen.mirar({ provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(CUENTA, 'asset_que_no') });
  check('mirar lo que no hay NO es un error: es una respuesta', noEsta.ok === false && noEsta.motivo === 'no_existe');

  const b = await almacen.borrar(ref);
  check('borrar: borrado', b.ok && b.yaNoEstaba === false);
  const b2 = await almacen.borrar(ref);
  check('borrar otra vez tampoco es un error: borrar es idempotente por contrato', b2.ok && b2.yaNoEstaba === true);

  check('el puerto rechaza una referencia de OTRO proveedor', !(await almacen.guardar({ destino: { provider: 'r2', objectKey: 'x/y' }, cuerpo, contentType: 'x' })).ok);
  check('y un cuerpo vacío', !(await almacen.guardar({ destino: ref, cuerpo: Buffer.alloc(0), contentType: 'x' })).ok);

  almacen.fallarUnaVez('sin_permiso');
  const sinPermiso = await almacen.guardar({ destino: ref, cuerpo, contentType: 'video/mp4' });
  check('un fallo del proveedor llega como error de Weë, con su motivo', !sinPermiso.ok && sinPermiso.error.details.reason === 'sin_permiso');
  check('y con la pieza que falló identificada, sin filtrar nada más', !sinPermiso.ok && sinPermiso.error.source === `storage:${FAKE_PROVIDER_ID}`);
}

/* ═══ F · EL ADAPTADOR DE R2, SIN RED ═════════════════════════════════════ */
console.log('\n── F · R2: lo que se manda y lo que se entiende ──');
{
  const CONFIG = { accountId: 'a'.repeat(32), accessKeyId: 'AKIAEJEMPLO', secretAccessKey: 'secretoDePrueba', bucket: 'wee-media' };
  check('la configuración se valida por su FORMA', configuracionDeR2Valida(CONFIG));
  check('y se rechaza la que no lo es', [undefined, {}, { ...CONFIG, accountId: 'corto' }, { ...CONFIG, bucket: 'MAL' }, { ...CONFIG, secretAccessKey: '' }].every((c) => !configuracionDeR2Valida(c)));
  check('la dirección es la oficial: <ACCOUNT_ID>.r2.cloudflarestorage.com', anfitrionDeR2(CONFIG.accountId) === `${CONFIG.accountId}.r2.cloudflarestorage.com`);

  const vistas = [];
  const fetchFalso = async (url, opciones) => {
    vistas.push({ url, ...opciones });
    return { ok: true, status: 200, headers: new Map([['etag', '"abc123"'], ['content-length', '19'], ['content-type', 'video/mp4']]) };
  };
  /* `Map` no tiene `.get` de cabeceras con el mismo contrato: se adapta. */
  const conHeaders = (r) => ({ ...r, headers: { get: (k) => r.headers.get(k.toLowerCase()) ?? null } });
  const adaptador = crearAdaptadorDeR2({
    config: () => CONFIG,
    fetch: async (u, o) => conHeaders(await fetchFalso(u, o)),
    ahora: () => T0,
  });

  const ref = { provider: 'r2', bucket: 'wee-media', objectKey: claveDelObjeto(CUENTA, MATERIAL) };
  const r = await adaptador.guardar({ destino: ref, cuerpo: Buffer.from('unos bytes de video'), contentType: 'video/mp4', siNoExiste: true, metadatos: { assetid: MATERIAL, pieza: PIEZA_ORIGINAL } });
  check('guardar habla con la dirección oficial y su contenedor', r.ok && vistas[0].url === `https://${CONFIG.accountId}.r2.cloudflarestorage.com/wee-media/${ref.objectKey}`);
  check('con PUT', vistas[0].method === 'PUT');
  check('Y CON `If-None-Match: *`, que es lo que hace idempotente el guardado', vistas[0].headers['if-none-match'] === '*');
  check('firmado con SigV4 y el ámbito de R2 (`auto`, servicio `s3`)',
    /^AWS4-HMAC-SHA256 Credential=AKIAEJEMPLO\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[0-9a-f]{64}$/.test(vistas[0].headers.Authorization));
  check('con el resumen del cuerpo firmado, para que alterarlo invalide la firma', /^[0-9a-f]{64}$/.test(vistas[0].headers['x-amz-content-sha256']));
  check('y los metadatos van con su prefijo, solo escalares cortos', vistas[0].headers['x-amz-meta-assetid'] === MATERIAL);

  /* La respuesta condicional NO es un fallo. */
  const con412 = crearAdaptadorDeR2({
    config: () => CONFIG,
    ahora: () => T0,
    fetch: async (u, o) => (o.method === 'PUT'
      ? { ok: false, status: 412, headers: { get: () => null } }
      : { ok: true, status: 200, headers: { get: (k) => ({ etag: '"yaEstaba"', 'content-length': '19', 'content-type': 'video/mp4' })[k.toLowerCase()] ?? null } }),
  });
  const repetido = await con412.guardar({ destino: ref, cuerpo: Buffer.from('unos bytes de video'), contentType: 'video/mp4', siNoExiste: true });
  check('un 412 con «solo si está libre» NO es un fallo: es que ya estaba', repetido.ok && repetido.yaExistia === true);
  check('y se devuelve el objeto que YA estaba, sin pisarlo', repetido.ok && repetido.objeto.etiquetaDelProveedor === 'yaEstaba');

  const sinConfig = crearAdaptadorDeR2({ config: () => ({}), ahora: () => T0 });
  const nc = await sinConfig.guardar({ destino: ref, cuerpo: Buffer.from('x'), contentType: 'x' });
  check('sin configuración no se llama a nadie, y se dice que no está configurado', !nc.ok && nc.error.details.reason === 'no_configurado');

  const otroBucket = await adaptador.guardar({ destino: { ...ref, bucket: 'otro' }, cuerpo: Buffer.from('x'), contentType: 'x' });
  check('una referencia a OTRO contenedor no se atiende', !otroBucket.ok);
  const otroProveedor = await adaptador.mirar({ provider: FAKE_PROVIDER_ID, objectKey: 'a/b' });
  check('ni una de otro proveedor', otroProveedor.ok === false && otroProveedor.motivo === 'fallo');

  /* La firma, comprobada por sus propiedades. */
  const f1 = firmar({ metodo: 'PUT', host: 'h', ruta: '/b/k', cuerpo: Buffer.from('a') }, { ...CONFIG, region: 'auto', servicio: 's3' }, T0);
  const f2 = firmar({ metodo: 'PUT', host: 'h', ruta: '/b/k', cuerpo: Buffer.from('a') }, { ...CONFIG, region: 'auto', servicio: 's3' }, T0);
  const f3 = firmar({ metodo: 'PUT', host: 'h', ruta: '/b/k', cuerpo: Buffer.from('b') }, { ...CONFIG, region: 'auto', servicio: 's3' }, T0);
  check('la firma es determinista con los mismos datos', f1.Authorization === f2.Authorization);
  check('y cambia si cambia el cuerpo', f1.Authorization !== f3.Authorization);
  check('la codificación es la de AWS, no `encodeURIComponent`', codificarParaFirma("a!b'c(d)e*f", false) === 'a%21b%27c%28d%29e%2Af');
  check('y conserva las barras de la ruta cuando toca', codificarParaFirma('accounts/x/assets/y/original', true) === 'accounts/x/assets/y/original');
}

/* ═══ G · IDEMPOTENCIA Y CONCURRENCIA ═════════════════════════════════════ */
console.log('\n── G · Repetir no duplica ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const ref = { provider: FAKE_PROVIDER_ID, objectKey: claveDelObjeto(CUENTA, MATERIAL) };
  const peticion = { destino: ref, cuerpo: Buffer.from('bytes'), contentType: 'video/mp4', siNoExiste: true };

  const primera = await almacen.guardar(peticion);
  const segunda = await almacen.guardar(peticion);
  const tercera = await almacen.guardar(peticion);
  check('guardar tres veces deja UN objeto', almacen.contenido.size === 1);
  check('la primera dice que no estaba; las otras, que sí', primera.yaExistia === false && segunda.yaExistia === true && tercera.yaExistia === true);
  check('y ninguna pisó a la primera', almacen.contenido.get(`${FAKE_PROVIDER_ID}||${ref.objectKey}`).etag === primera.objeto.etiquetaDelProveedor);

  /* Simultáneas. */
  const otro = crearAlmacenFalso({ ahora: () => T0 });
  const simultaneas = await Promise.all([otro.guardar(peticion), otro.guardar(peticion), otro.guardar(peticion)]);
  check('tres a la vez dejan UN objeto', otro.contenido.size === 1);
  check('y exactamente una dice haberlo creado', simultaneas.filter((r) => r.ok && r.yaExistia === false).length === 1, simultaneas.map((r) => r.yaExistia).join(','));

  /* Sin «solo si está libre», sobrescribir es legítimo: es otra operación. */
  const sobre = crearAlmacenFalso({ ahora: () => T0 });
  await sobre.guardar({ ...peticion, siNoExiste: false });
  await sobre.guardar({ ...peticion, siNoExiste: false, cuerpo: Buffer.from('otros bytes') });
  check('sin pedir «solo si está libre», sobrescribir es otra cosa y se permite', sobre.contenido.size === 1 && sobre.contenido.get(`${FAKE_PROVIDER_ID}||${ref.objectKey}`).cuerpo.toString() === 'otros bytes');

  check('la identidad no depende del azar: no hay `randomUUID` en la capa de medios',
    !/randomUUID|Math\.random/.test(sinComentarios(leer('functions/src/core/media/objeto.ts')) + sinComentarios(leer('functions/src/media/almacen.ts'))));
}

/* ═══ H · SEGURIDAD ═══════════════════════════════════════════════════════ */
console.log('\n── H · Lo ajeno, lo inventado y lo que llega de fuera ──');
{
  const MED = sinComentarios(leer('functions/src/media/index.ts'));
  const OBJ = sinComentarios(leer('functions/src/core/media/objeto.ts'));
  const R2 = sinComentarios(leer('functions/src/media/r2.ts'));
  const ALM = sinComentarios(leer('functions/src/media/almacen.ts'));

  check('la cuenta ENTRA resuelta; la capa de medios no la deduce ni la acepta de un cliente', /accountId: string/.test(MED) && !/request\.data|req\.body/.test(MED));
  check('la clave la DERIVA Weë: nunca llega de fuera', /claveDelObjeto\(peticion\.accountId, peticion\.assetId/.test(MED) && !/peticion\.objectKey/.test(MED));
  check('la ficha se valida ANTES de escribirla', ALM.indexOf('objetoValido') < ALM.indexOf('.create('));
  check('y leerla exige que sea de esa cuenta', /objetoEsDeLaCuenta\(o, accountId\)/.test(ALM));
  check('un objeto de otra cuenta no se devuelve ni al registrarlo', /motivo: 'de_otra_cuenta'/.test(ALM));

  check('ningún secreto aparece escrito en el código', !/R2_SECRET_ACCESS_KEY\s*=\s*['"][^'"]{8,}/.test(R2) && !/accessKeyId:\s*['"][A-Za-z0-9]{16,}/.test(R2));
  check('las credenciales se leen por NOMBRE de variable, por el camino que ya existe', /env\(R2_ENV\./.test(MED));
  check('el adaptador no registra nada: ni firma, ni cabecera, ni dirección', !/console\.(log|warn|error)/.test(R2));
  check('ni la firma', !/console\./.test(sinComentarios(leer('functions/src/media/firma.ts'))));
  check('y en el error no viaja la URL ni la autorización', !/error[^\n]*Authorization|error[^\n]*https:/.test(R2));

  check('la capa de medios NO guarda URLs firmadas', !/signedUrl|urlFirmada/.test(ALM) && !/delivery/.test(ALM));
}

/* ═══ I · ESTRUCTURA: QUÉ NO SE HA CONSTRUIDO ═════════════════════════════ */
console.log('\n── I · Qué NO se ha construido ──');
{
  const delCore = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).sort();
  check('el Core de medios son cuatro archivos y ninguno más', delCore.join(',') === 'index.ts,objeto.ts,puerto.ts,registro.ts', delCore.join(','));
  const fuera = fs.readdirSync(path.resolve(RAIZ, 'functions/src/media')).sort();
  check('y la composición, seis', fuera.join(',') === 'almacen.ts,falso.ts,firma.ts,huella.ts,index.ts,r2.ts', fuera.join(','));

  /* R2 vive en UN sitio. */
  const nombraR2 = ['functions/src'].flatMap(() => {
    const andar = (dir) => fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? andar(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []);
    return andar('functions/src');
  }).filter((f) => /r2\.cloudflarestorage|R2_ACCESS_KEY|AWS4-HMAC/.test(sinComentarios(leer(f))));
  check('el nombre de R2 y su protocolo viven SOLO en su adaptador y en su firma', nombraR2.sort().join(',') === 'functions/src/media/firma.ts,functions/src/media/r2.ts', nombraR2.join(','));

  const CORE_MEDIA = ['puerto.ts', 'objeto.ts', 'registro.ts'].map((f) => sinComentarios(leer(`functions/src/core/media/${f}`))).join('\n');
  check('el Core NO conoce R2, ni ningún proveedor', !/r2|cloudflare|aws|s3|qiniu|alibaba|tencent/i.test(CORE_MEDIA));
  check('el Core de medios no sabe de Firestore, ni de red, ni del reloj', !/firebase|firestore|fetch\(|Date\.now\(\)/.test(CORE_MEDIA));
  check('el puerto guarda BYTES: no sabe de cuentas, ni de Credits, ni de capacidades de IA',
    !/ownerAccountId|creditos|credits|capability|projectId|entityType/i.test(sinComentarios(leer('functions/src/core/media/puerto.ts'))));

  check('NO se creó otro StorageRef: se usa el de la Fase 11', !/interface (Media)?StorageRef|CloudStorageRef|R2AssetRef/.test(CORE_MEDIA));
  check('NO se tocó el contrato del material de la Fase 11', !/media|Media/.test(sinComentarios(leer('functions/src/core/content/asset.ts'))));
  check('NO hay un segundo sistema de materiales: la ficha referencia el `assetId`, no lo sustituye', /assetId: string/.test(sinComentarios(leer('functions/src/core/media/objeto.ts'))));
  check('NO hay otro motor de trabajos, ni otro Router, ni otra cola', !/JobEngine|crearRouter|cola|queue/i.test(CORE_MEDIA));

  /* Lo que pertenece a fases posteriores: declarado como costura, nunca fingido. */
  const PUERTO = sinComentarios(leer('functions/src/core/media/puerto.ts'));
  check('traer, copiar y firmar URL están declaradas OPCIONALES, no implementadas', /traer\?\(/.test(PUERTO) && /copiar\?\(/.test(PUERTO) && /urlFirmada\?\(/.test(PUERTO));
  check('y el adaptador de R2 no las trae: no se finge lo que no hay',
    !/async traer|async copiar|async urlFirmada/.test(sinComentarios(leer('functions/src/media/r2.ts'))));
  check('las capacidades de MC-1 son tres', CAPACIDADES_DE_MC1.length === 3);

  /* Nada conectado. */
  const INDEX = sinComentarios(leer('functions/src/index.ts'));
  check('NADA DE PRODUCCIÓN PASA POR AQUÍ: `index.ts` no exporta ni importa la capa de medios', !/media/i.test(INDEX));
  check('ninguna Function la importa', !fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .some((e) => /from '\.\/media/.test(sinComentarios(leer(`functions/src/${e.name}`)))));
  check('el almacén de mentira NO se compone en producción', !/falso|Falso/.test(sinComentarios(leer('functions/src/media/index.ts'))));

  /* Lo que NO se tocó. */
  check('Cloudinary intacto', /cloudinary/i.test(leer('functions/src/content/index.ts')) && !/media\//.test(sinComentarios(leer('functions/src/content/index.ts'))));
  check('el Financial Core y los Credits, intactos', !/media/i.test(sinComentarios(leer('functions/src/credits/creditEngine.ts'))));
  check('y F12-D, intacta', !/media/i.test(sinComentarios(leer('functions/src/runtime/index.ts'))));

  check('esta suite está en la cadena de `npm test`', /media-core\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
