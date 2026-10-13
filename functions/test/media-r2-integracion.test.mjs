/**
 * MEDIA-F · EL ADAPTADOR R2 DE PUNTA A PUNTA, CONTRA UN DOBLE S3 LOCAL.
 *
 * Las suites `media-*` prueban el adaptador con un `fetch` de mentira que
 * contesta lo que se le diga. Esto va un paso más allá SIN tocar Cloudflare:
 * levanta un servidor HTTP en 127.0.0.1 que habla el subconjunto de la API S3
 * que Weë usa (PUT/HEAD/GET/DELETE/ListObjectsV2) y que VERIFICA cada firma
 * SigV4 con una implementación propia, escrita aquí aparte de `media/firma.ts`.
 * Las peticiones salen por el `fetch` real de Node, así que lo que se prueba es
 * lo que de verdad viaja por la red: cabeceras, cuerpos, firmas y caducidades.
 *
 *   A · La firma contra los vectores OFICIALES de AWS (SigV4, documentación S3)
 *   B · El ciclo de un objeto: guardar, mirar, traer, listar, borrar
 *   C · Errores y recuperación: 503, respuesta perdida tras escribir, reintento
 *   D · Metadatos que no se pueden transmitir: rechazo sin red
 *   E · URLs firmadas de lectura: caducidad, alcance, método
 *   F · URLs firmadas de escritura: tipo, tamaño exacto, una sola escritura
 *   G · El flujo de Media Cloud: subir, confirmar, entregar, aislamiento
 *   H · Compatibilidad: lo histórico (Cloudinary, Storage de Weë) no pasa por aquí
 *
 * Sin credenciales reales, sin Cloudflare, sin Firestore real, sin emuladores.
 * Lo que el doble NO puede probar —que R2 real haga cumplir `content-length`
 * firmado— queda dicho en `docs/MEDIA-CLOUD-R2.md` como pendiente del canary.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import http from 'node:http';
import { createHash, createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const core = lib('core/index.js');
const { claveDelObjeto, crearRegistroDeMedios, decidirSubida, referenciaDelObjeto, tipoAdmitidoParaLaClase } = core;
const { crearAdaptadorDeR2, DESCRIPTOR_DE_R2, R2_PROVIDER_ID, anfitrionDeR2, metadatosTransmisibles } = lib('media/r2.js');
const { firmar, firmarConsulta } = lib('media/firma.js');
const { huellaDeMedios } = lib('media/huella.js');
const { almacenDeObjetosDeMedios } = lib('media/almacen.js');
const { solicitarSubida, confirmarSubida } = lib('media/subida.js');
const { solicitarEntrega } = lib('media/entrega.js');
const { guardarMaterial } = lib('media/index.js');

/* ═══ El verificador SigV4, escrito aparte ════════════════════════════════ */

const sha = (d) => createHash('sha256').update(d).digest('hex');
const hm = (k, d) => createHmac('sha256', k).update(d, 'utf8').digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const claveDeFirma = (secreto, dia, region) => hm(hm(hm(hm(`AWS4${secreto}`, dia), region), 's3'), 'aws4_request');
const consultaCanonica = (pares) => pares.map(([k, v]) => `${enc(k)}=${enc(v)}`).sort().join('&');

/** Devuelve `null` si la firma vale, o el motivo por el que no. */
const verificar = (req, cuerpo, host, secreto, ahora) => {
  const u = new URL(req.url, 'http://x');
  const pares = [...u.searchParams.entries()];
  const valorDe = (n) => (n === 'host' ? host : String(req.headers[n] ?? '').trim());
  if (u.searchParams.has('X-Amz-Signature')) {
    const fecha = u.searchParams.get('X-Amz-Date');
    const expira = Number(u.searchParams.get('X-Amz-Expires'));
    const t = Date.UTC(+fecha.slice(0, 4), +fecha.slice(4, 6) - 1, +fecha.slice(6, 8), +fecha.slice(9, 11), +fecha.slice(11, 13), +fecha.slice(13, 15));
    if (ahora() > t + expira * 1000) return 'caducada';
    const [, dia, region] = u.searchParams.get('X-Amz-Credential').split('/');
    const firmadas = u.searchParams.get('X-Amz-SignedHeaders').split(';');
    const canonica = [req.method, u.pathname, consultaCanonica(pares.filter(([k]) => k !== 'X-Amz-Signature')),
      firmadas.map((h) => `${h}:${valorDe(h)}\n`).join(''), firmadas.join(';'), 'UNSIGNED-PAYLOAD'].join('\n');
    const aFirmar = ['AWS4-HMAC-SHA256', fecha, `${dia}/${region}/s3/aws4_request`, sha(canonica)].join('\n');
    return createHmac('sha256', claveDeFirma(secreto, dia, region)).update(aFirmar).digest('hex') === u.searchParams.get('X-Amz-Signature') ? null : 'firma';
  }
  const m = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(String(req.headers.authorization ?? ''));
  if (!m) return 'sin_autorizacion';
  const [, , dia, region, firmadasTxt, firma] = m;
  const resumen = String(req.headers['x-amz-content-sha256'] ?? '');
  if (resumen !== sha(cuerpo)) return 'resumen_del_cuerpo';
  const firmadas = firmadasTxt.split(';');
  const canonica = [req.method, u.pathname, consultaCanonica(pares), firmadas.map((h) => `${h}:${valorDe(h)}\n`).join(''), firmadasTxt, resumen].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', String(req.headers['x-amz-date']), `${dia}/${region}/s3/aws4_request`, sha(canonica)].join('\n');
  return createHmac('sha256', claveDeFirma(secreto, dia, region)).update(aFirmar).digest('hex') === firma ? null : 'firma';
};

/* ═══ El doble S3 ═════════════════════════════════════════════════════════ */

const SECRETO = 'c0ffee'.repeat(10) + 'abcd';
const CONFIG = { accountId: 'b'.repeat(32), accessKeyId: 'AKIAEJEMPLOLOCAL', secretAccessKey: SECRETO, bucket: 'wee-media-pruebas' };
const HOST = anfitrionDeR2(CONFIG.accountId);
let reloj = Date.UTC(2026, 9, 12, 12, 0, 0);
const ahora = () => reloj;

const objetos = new Map();
const vistas = [];
const fallos = [];
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const servidor = http.createServer((req, res) => {
  const trozos = [];
  req.on('data', (c) => trozos.push(c));
  req.on('end', () => {
    const cuerpo = Buffer.concat(trozos);
    const host = String(req.headers['x-prueba-host'] ?? req.headers.host);
    const u = new URL(req.url, 'http://x');
    const motivo = verificar(req, cuerpo, host, SECRETO, ahora);
    vistas.push({ metodo: req.method, ruta: u.pathname, motivo });
    if (host !== HOST) { res.writeHead(400); return res.end(); }
    if (motivo) { res.writeHead(403); return res.end(`<Error><Code>SignatureDoesNotMatch</Code><Message>${motivo}</Message></Error>`); }
    const fallo = fallos.shift();
    if (fallo === '503') { res.writeHead(503); return res.end(); }
    const prefijo = `/${CONFIG.bucket}/`;
    if (req.method === 'GET' && u.pathname === `/${CONFIG.bucket}` && u.searchParams.get('list-type') === '2') {
      const pre = u.searchParams.get('prefix') ?? '';
      const max = Number(u.searchParams.get('max-keys') ?? 1000);
      const desde = Number(u.searchParams.get('continuation-token') ?? 0);
      const todas = [...objetos.keys()].filter((k) => k.startsWith(pre)).sort();
      const pagina = todas.slice(desde, desde + max);
      const mas = desde + max < todas.length;
      res.writeHead(200, { 'content-type': 'application/xml' });
      return res.end(`<?xml version="1.0"?><ListBucketResult><IsTruncated>${mas}</IsTruncated>${mas ? `<NextContinuationToken>${desde + max}</NextContinuationToken>` : ''}${pagina.map((k) => `<Contents><Key>${xml(k)}</Key><Size>${objetos.get(k).cuerpo.length}</Size><ETag>&quot;${objetos.get(k).etag}&quot;</ETag><LastModified>2026-10-12T12:00:00.000Z</LastModified></Contents>`).join('')}</ListBucketResult>`);
    }
    if (!u.pathname.startsWith(prefijo)) { res.writeHead(404); return res.end(); }
    const clave = decodeURIComponent(u.pathname.slice(prefijo.length));
    const o = objetos.get(clave);
    if (req.method === 'PUT') {
      if (req.headers['if-none-match'] === '*' && o) { res.writeHead(412); return res.end(); }
      const etag = sha(cuerpo).slice(0, 32);
      objetos.set(clave, { cuerpo, contentType: String(req.headers['content-type'] ?? 'application/octet-stream'), etag });
      if (fallo === 'cortar') { req.socket.destroy(); return; }
      res.writeHead(200, { etag: `"${etag}"` }); return res.end();
    }
    if (!o) { res.writeHead(req.method === 'DELETE' ? 204 : 404); return res.end(); }
    if (req.method === 'HEAD') { res.writeHead(200, { 'content-length': o.cuerpo.length, 'content-type': o.contentType, etag: `"${o.etag}"` }); return res.end(); }
    if (req.method === 'GET') { res.writeHead(200, { 'content-type': o.contentType, etag: `"${o.etag}"` }); return res.end(o.cuerpo); }
    if (req.method === 'DELETE') { objetos.delete(clave); res.writeHead(204); return res.end(); }
    res.writeHead(405); return res.end();
  });
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

/* El `fetch` real de Node, desviado a 127.0.0.1. El host firmado viaja aparte porque `fetch` pone el suyo. */
const local = async (url, init = {}) => {
  const u = new URL(url);
  const cabeceras = { ...(init.headers ?? {}) };
  const host = cabeceras.host ?? u.host;
  delete cabeceras.host;
  return fetch(`${BASE}${u.pathname}${u.search}`, { ...init, headers: { ...cabeceras, 'x-prueba-host': host } });
};

const r2 = crearAdaptadorDeR2({ config: () => CONFIG, fetch: local, ahora });
const r2Mudo = crearAdaptadorDeR2({ config: () => CONFIG, fetch: async () => { throw new Error('no debía llamar a nadie'); }, ahora });
const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const refDe = (cuenta, asset, pieza = 'original') => ({ provider: R2_PROVIDER_ID, bucket: CONFIG.bucket, objectKey: claveDelObjeto(cuenta, asset, pieza) });

try {
/* ═══ A · VECTORES OFICIALES DE AWS ═══════════════════════════════════════ */
console.log('\n── A · La firma, contra los ejemplos publicados por AWS ──');
{
  /* «Signature Calculations for the Authorization Header: Transferring Payload in a Single Chunk», S3 API Reference. */
  /*
   * Las credenciales DE EJEMPLO que AWS publica en su documentación (no son de nadie). El identificador se compone en
   * dos trozos para que `scripts/escaneo-secretos.mjs` no lo confunda con una clave de acceso real.
   */
  const cred = { accessKeyId: 'AKIA' + 'IOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1', servicio: 's3' };
  const t = Date.UTC(2013, 4, 24, 0, 0, 0);
  const get = firmar({ metodo: 'GET', host: 'examplebucket.s3.amazonaws.com', ruta: '/test.txt', cabeceras: { range: 'bytes=0-9' } }, cred, t);
  check('A1 · GET Object: la firma es la del ejemplo oficial',
    get.Authorization.endsWith('Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41')
    && get.Authorization.includes('SignedHeaders=host;range;x-amz-content-sha256;x-amz-date'), get.Authorization);
  const put = firmar({
    metodo: 'PUT', host: 'examplebucket.s3.amazonaws.com', ruta: '/test%24file.text', cuerpo: Buffer.from('Welcome to Amazon S3.'),
    cabeceras: { date: 'Fri, 24 May 2013 00:00:00 GMT', 'x-amz-storage-class': 'REDUCED_REDUNDANCY' },
  }, cred, t);
  check('A2 · PUT Object: resumen del cuerpo y firma del ejemplo oficial',
    put['x-amz-content-sha256'] === '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072'
    && put.Authorization.endsWith('Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd'), put.Authorization);
  /* «Authenticating Requests: Using Query Parameters», mismo documento. */
  const q = firmarConsulta({ metodo: 'GET', host: 'examplebucket.s3.amazonaws.com', ruta: '/test.txt', vigenciaSegundos: 86400 }, cred, t);
  check('A3 · URL prefirmada: la firma del ejemplo oficial',
    q.url.endsWith('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404') && q.expiraEn === t + 86_400_000, q.url);
}

/* ═══ B · EL CICLO DE UN OBJETO ═══════════════════════════════════════════ */
console.log('\n── B · Guardar, mirar, traer, listar y borrar por la red de verdad ──');
{
  const ref = refDe(ANA, 'asset_ciclo01');
  const cuerpo = Buffer.from('bytes de una prueba de Weë');
  const g = await r2.guardar({ destino: ref, cuerpo, contentType: 'image/png', siNoExiste: true, metadatos: { assetid: 'asset_ciclo01', pieza: 'original' } });
  check('B1 · guardar: 200 con la firma aceptada por el doble', g.ok && !g.yaExistia && g.objeto.bytes === cuerpo.length && !!g.objeto.etiquetaDelProveedor);
  const m = await r2.mirar(ref);
  check('B2 · mirar: tamaño y tipo reales', m.ok && m.objeto.bytes === cuerpo.length && m.objeto.contentType === 'image/png');
  const t = await r2.traer(ref);
  check('B3 · traer: los MISMOS bytes', t.ok && Buffer.compare(t.cuerpo, cuerpo) === 0);
  await r2.guardar({ destino: refDe(ANA, 'asset_ciclo02'), cuerpo, contentType: 'image/png', siNoExiste: true });
  await r2.guardar({ destino: refDe(BEA, 'asset_ciclo03'), cuerpo, contentType: 'image/png', siNoExiste: true });
  const p1 = await r2.listar({ prefijo: `accounts/${ANA}/`, limite: 1 });
  const p2 = p1.ok && p1.cursor ? await r2.listar({ prefijo: `accounts/${ANA}/`, limite: 1, cursor: p1.cursor }) : { ok: false };
  check('B4 · listar por páginas: dos de Ana, con cursor, y ninguna de Bea',
    p1.ok && p1.objetos.length === 1 && !!p1.cursor && p2.ok && p2.objetos.length === 1 && !p2.cursor
    && [...p1.objetos, ...p2.objetos].every((o) => o.objectKey.startsWith(`accounts/${ANA}/`)));
  const b = await r2.borrar(ref);
  const tras = await r2.mirar(ref);
  check('B5 · borrar y volver a mirar: ya no está, y no es un fallo', b.ok && tras.ok === false && tras.motivo === 'no_existe');
  check('B6 · ninguna petición rechazada por firma en todo el ciclo', vistas.every((v) => v.motivo === null), JSON.stringify(vistas.filter((v) => v.motivo)));
}

/* ═══ C · ERRORES Y RECUPERACIÓN ══════════════════════════════════════════ */
console.log('\n── C · Lo que pasa cuando el proveedor falla, y cómo se recupera sin duplicar ──');
{
  const ref = refDe(ANA, 'asset_fallo01');
  const cuerpo = Buffer.from('resultado que no se puede perder');
  fallos.push('503');
  const a = await r2.guardar({ destino: ref, cuerpo, contentType: 'image/jpeg', siNoExiste: true });
  check('C1 · un 503 es «proveedor_no_disponible» y no deja nada escrito',
    !a.ok && a.error.details.reason === 'proveedor_no_disponible' && !objetos.has(ref.objectKey));
  const b = await r2.guardar({ destino: ref, cuerpo, contentType: 'image/jpeg', siNoExiste: true });
  check('C2 · el reintento con la MISMA clave escribe una vez', b.ok && !b.yaExistia && objetos.size >= 1);

  const ref2 = refDe(ANA, 'asset_fallo02');
  fallos.push('cortar');
  const c = await r2.guardar({ destino: ref2, cuerpo, contentType: 'image/jpeg', siNoExiste: true });
  check('C3 · el proveedor escribió y la respuesta se perdió: el adaptador no puede saberlo y dice «reinténtalo»',
    !c.ok && c.error.details.reason === 'proveedor_no_disponible' && objetos.has(ref2.objectKey));
  const d = await r2.guardar({ destino: ref2, cuerpo: Buffer.from('OTROS bytes'), contentType: 'image/jpeg', siNoExiste: true });
  check('C4 · el reintento recibe 412, mira, y devuelve lo que YA estaba sin pisarlo',
    d.ok && d.yaExistia && d.objeto.bytes === cuerpo.length && Buffer.compare(objetos.get(ref2.objectKey).cuerpo, cuerpo) === 0);

  /* La misma recuperación, un piso más arriba: guardarMaterial deja UN objeto y UNA ficha. */
  const fichas = new Map();
  const db = falsoFirestore(fichas);
  const registro = crearRegistroDeMedios([DESCRIPTOR_DE_R2]).registro;
  fallos.push('cortar');
  const deps = { db, registro, adaptadores: { [R2_PROVIDER_ID]: r2 }, proveedor: R2_PROVIDER_ID, ahora };
  const e1 = await guardarMaterial(deps, { accountId: ANA, assetId: 'asset_fallo03', cuerpo, contentType: 'image/jpeg' });
  const e2 = await guardarMaterial(deps, { accountId: ANA, assetId: 'asset_fallo03', cuerpo, contentType: 'image/jpeg' });
  const e3 = await guardarMaterial(deps, { accountId: ANA, assetId: 'asset_fallo03', cuerpo, contentType: 'image/jpeg' });
  check('C5 · guardarMaterial: falla, reintenta y vuelve a llamar → un objeto, una ficha, misma identidad',
    !e1.ok && e2.ok && e3.ok && e3.yaEstaba && e2.objeto.objectRef === e3.objeto.objectRef && fichas.size === 1);
}

/* ═══ D · METADATOS QUE NO VIAJAN ═════════════════════════════════════════ */
console.log('\n── D · Metadatos que no caben en una cabecera: rechazo antes de la red ──');
{
  const ref = refDe(ANA, 'asset_meta01');
  const conEnie = await r2Mudo.guardar({ destino: ref, cuerpo: Buffer.from('x'), contentType: 'image/png', metadatos: { nombre: 'año' } });
  check('D1 · un valor con «ñ» es `peticion_invalida` (antes salía como proveedor caído) y no llama a nadie',
    !conEnie.ok && conEnie.error.details.reason === 'peticion_invalida' && conEnie.error.details.field === 'metadatos');
  const salto = await r2Mudo.guardar({ destino: ref, cuerpo: Buffer.from('x'), contentType: 'image/png', metadatos: { nota: 'a\r\nx-amz-acl: public-read' } });
  check('D2 · un salto de línea (inyección de cabeceras) tampoco', !salto.ok && salto.error.details.field === 'metadatos');
  const espacio = await r2Mudo.guardar({ destino: ref, cuerpo: Buffer.from('x'), contentType: 'image/png', metadatos: { 'mi clave': 'v' } });
  check('D3 · ni un nombre con espacios', !espacio.ok && espacio.error.details.field === 'metadatos');
  const dobles = await r2Mudo.guardar({ destino: ref, cuerpo: Buffer.from('x'), contentType: 'image/png', metadatos: { nota: 'a  b' } });
  check('D5 · dos espacios seguidos dentro del valor (SigV4 los colapsa y `firmar` no): rechazo, no una firma que falla siempre',
    !dobles.ok && dobles.error.details.field === 'metadatos' && !metadatosTransmisibles({ 'x-amz-meta-nota': 'a  b' }) && metadatosTransmisibles({ 'x-amz-meta-nota': 'a b' }));
  const muchos = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`x-amz-meta-k${i}`, 'v'.repeat(250)]));
  check('D4 · el total respeta el límite publicado (8.192 bytes)', !metadatosTransmisibles(muchos) && metadatosTransmisibles({ 'x-amz-meta-assetid': 'asset_1' }));
}

/* ═══ E · URLs FIRMADAS DE LECTURA ════════════════════════════════════════ */
console.log('\n── E · Una llave temporal abre UN objeto, con UN método, durante UN rato ──');
{
  const refA = refDe(ANA, 'asset_url01');
  const refB = refDe(BEA, 'asset_url02');
  await r2.guardar({ destino: refA, cuerpo: Buffer.from('de Ana'), contentType: 'image/png', siNoExiste: true });
  await r2.guardar({ destino: refB, cuerpo: Buffer.from('de Bea'), contentType: 'image/png', siNoExiste: true });
  const f = await r2.urlFirmada(refA, 300);
  const ok = await local(f.url);
  check('E1 · la URL firmada lee el objeto', ok.status === 200 && (await ok.text()) === 'de Ana');
  const otra = f.url.replace(encodeURIComponent(ANA), BEA).replace('asset_url01', 'asset_url02');
  check('E2 · cambiarle el objeto la invalida: no sirve para leer lo de otra cuenta', otra !== f.url && (await local(otra)).status === 403);
  check('E3 · con otro método (PUT con una llave de GET) tampoco', (await local(f.url, { method: 'PUT', body: 'pisar', headers: { 'content-type': 'image/png' } })).status === 403);
  const masTiempo = f.url.replace('X-Amz-Expires=300', 'X-Amz-Expires=604800');
  check('E4 · alargarle la vigencia a mano rompe la firma', (await local(masTiempo)).status === 403);
  reloj += 301_000;
  check('E5 · caducada, deja de abrir', (await local(f.url)).status === 403);
  reloj -= 301_000;
  check('E6 · y la vigencia fuera del tope del proveedor ni se firma', !(await r2.urlFirmada(refA, 604_801)).ok && !(await r2.urlFirmada(refA, 0)).ok);
}

/* ═══ F · URLs FIRMADAS DE ESCRITURA ══════════════════════════════════════ */
console.log('\n── F · Una llave de escritura: el tipo, el tamaño y una sola vez ──');
{
  const ref = refDe(ANA, 'asset_sube01');
  const p = await r2.urlDeSubida({ destino: ref, contentType: 'image/png', vigenciaSegundos: 900, maxBytes: 5, bytesExactos: 5, siNoExiste: true });
  check('F1 · el tamaño exacto va FIRMADO y se devuelve como cabecera obligatoria',
    p.ok && new URL(p.url).searchParams.get('X-Amz-SignedHeaders') === 'content-length;content-type;host;if-none-match' && p.cabeceras['content-length'] === '5');
  const otroTipo = await local(p.url, { method: 'PUT', headers: { ...p.cabeceras, 'content-type': 'text/html' }, body: '12345' });
  check('F2 · con otro tipo de contenido, rechazada', otroTipo.status === 403 && !objetos.has(ref.objectKey));
  const sinLargo = { ...p.cabeceras }; delete sinLargo['content-length'];
  const deMas = await local(p.url, { method: 'PUT', headers: sinLargo, body: '123456' });
  check('F3 · con MÁS bytes de los autorizados, rechazada (en el doble; en R2 real, pendiente del canary)', deMas.status === 403 && !objetos.has(ref.objectKey));
  const bien = await local(p.url, { method: 'PUT', headers: sinLargo, body: '12345' });
  check('F4 · con el tipo y el tamaño autorizados, escrita', bien.status === 200 && objetos.get(ref.objectKey)?.cuerpo.toString() === '12345');
  const otraVez = await local(p.url, { method: 'PUT', headers: sinLargo, body: '54321' });
  check('F5 · repetirla NO pisa: 412 y los bytes de antes intactos', otraVez.status === 412 && objetos.get(ref.objectKey).cuerpo.toString() === '12345');
  const sinExactos = await r2.urlDeSubida({ destino: refDe(ANA, 'asset_sube02'), contentType: 'image/png', vigenciaSegundos: 900, maxBytes: 5, siNoExiste: true });
  check('F6 · sin `bytesExactos` sigue siendo la llave de siempre (compatible con el canary verificado)',
    sinExactos.ok && new URL(sinExactos.url).searchParams.get('X-Amz-SignedHeaders') === 'content-type;host;if-none-match');
  const mayor = await r2.urlDeSubida({ destino: refDe(ANA, 'asset_sube03'), contentType: 'image/png', vigenciaSegundos: 900, maxBytes: 5, bytesExactos: 6 });
  check('F7 · un tamaño exacto mayor que el máximo concedido no se firma', !mayor.ok && mayor.error.details.field === 'bytesExactos');
}

/* ═══ G · EL FLUJO DE MEDIA CLOUD ═════════════════════════════════════════ */
console.log('\n── G · Subir, confirmar y entregar, con la red de verdad y R2 detrás del puerto ──');
{
  const fichas = new Map();
  const materiales = new Map();
  const registro = crearRegistroDeMedios([DESCRIPTOR_DE_R2]).registro;
  const objetosDeWee = almacenDeObjetosDeMedios(falsoFirestore(fichas));
  const deps = {
    db: {},
    cuentaDelPrincipal: async (p) => ({ accountId: p }),
    crearMaterial: async (d) => {
      const previo = materiales.get(d.assetId);
      if (previo) return previo.ownerAccountId === d.ownerAccountId ? { status: 'ya_estaba', material: previo } : { status: 'no_es_tuyo' };
      const m = { contract: 1, assetId: d.assetId, ownerAccountId: d.ownerAccountId, kind: d.kind, status: 'uploading', storageRef: d.storageRef, mimeType: d.mimeType, provenance: d.provenance, createdAt: reloj, updatedAt: reloj };
      materiales.set(d.assetId, m);
      return { status: 'creado', material: m };
    },
    anotarPermiso: async () => {},
    leerMaterial: async (id) => materiales.get(id) ?? null,
    marcarSubido: async (accountId, assetId, medido) => {
      const m = materiales.get(assetId);
      if (!m || m.ownerAccountId !== accountId) return { status: 'no_es_tuyo' };
      if (m.status === 'ready') return { status: 'ya_estaba_listo', material: m };
      const nuevo = { ...m, status: 'ready', bytes: medido.bytes, mimeType: medido.mimeType ?? m.mimeType };
      materiales.set(assetId, nuevo);
      return { status: 'listo', material: nuevo };
    },
    objetos: objetosDeWee, registro, adaptadores: { [R2_PROVIDER_ID]: r2 }, proveedor: R2_PROVIDER_ID, ahora,
  };
  const cuerpo = Buffer.from('una foto de Ana, 31 bytes exactos');
  const pide = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-foto-0001', kind: 'image', contentType: 'image/jpeg', bytes: cuerpo.length });
  check('G1 · el permiso sale para la carpeta de SU cuenta, con el tamaño declarado firmado',
    pide.ok && materiales.get(pide.intento.assetId)?.storageRef.objectKey.startsWith(`accounts/${ANA}/`) && pide.intento.cabeceras['content-length'] === String(cuerpo.length));
  const antes = await confirmarSubida(deps, { principalId: ANA, assetId: pide.intento.assetId });
  check('G2 · confirmar antes de subir es «pendiente», no un fallo (subida a medias)', !antes.ok && antes.motivo === 'pendiente');
  const cab = { ...pide.intento.cabeceras }; delete cab['content-length'];
  const sube = await local(pide.intento.url, { method: pide.intento.metodo, headers: cab, body: cuerpo });
  check('G3 · el cliente sube directamente al proveedor con la llave', sube.status === 200);
  const conf = await confirmarSubida(deps, { principalId: ANA, assetId: pide.intento.assetId });
  const conf2 = await confirmarSubida(deps, { principalId: ANA, assetId: pide.intento.assetId });
  check('G4 · confirmar mira el objeto real, escribe UNA ficha y es idempotente',
    conf.ok && conf.bytes === cuerpo.length && conf2.ok && conf2.objectRef === conf.objectRef && fichas.size === 1);
  const ajena = await confirmarSubida(deps, { principalId: BEA, assetId: pide.intento.assetId });
  check('G5 · otra cuenta no puede confirmar lo de Ana', !ajena.ok && ajena.traza.detalle === 'no_es_tuyo');

  const depsEntrega = { db: {}, cuentaDelPrincipal: deps.cuentaDelPrincipal, leerMaterial: deps.leerMaterial, objetos: objetosDeWee, registro, adaptadores: deps.adaptadores, ahora };
  const ent = await solicitarEntrega(depsEntrega, { principalId: ANA, assetId: pide.intento.assetId });
  const leido = ent.ok ? await local(ent.entrega.url) : null;
  check('G6 · la entrega da una URL firmada de 300 s que devuelve los mismos bytes',
    ent.ok && ent.entrega.vigenciaSegundos === 300 && leido.status === 200 && Buffer.compare(Buffer.from(await leido.arrayBuffer()), cuerpo) === 0);
  const deBea = await solicitarEntrega(depsEntrega, { principalId: BEA, assetId: pide.intento.assetId });
  check('G7 · Bea pide el material de Ana: «no disponible», sin decir si existe', !deBea.ok && deBea.motivo === 'no_disponible' && deBea.traza.detalle === 'no_es_tuyo');
  check('G8 · la URL firmada no se guarda en ninguna parte (ni ficha ni material)',
    ent.ok && ![...fichas.values(), ...materiales.values()].some((x) => JSON.stringify(x).includes('X-Amz-Signature')));

  const html = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-html-0001', kind: 'image', contentType: 'text/html', bytes: 10 });
  const svg = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-svg-00001', kind: 'image', contentType: 'image/svg+xml', bytes: 10 });
  const cruzado = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-cruz-0001', kind: 'image', contentType: 'video/mp4', bytes: 10 });
  const xmlImagen = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-xml-00001', kind: 'image', contentType: 'image/foo+xml', bytes: 10 });
  const xmlModelo = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-xml-00002', kind: 'model3d', contentType: 'model/x3d+xml', bytes: 10 });
  check('G9 · ni HTML, ni SVG, ni `…+xml`, ni un tipo de otra clase: rechazo ANTES de crear material o firmar',
    [html, svg, cruzado, xmlImagen, xmlModelo].every((r) => !r.ok && r.motivo === 'peticion_invalida' && r.traza.detalle === 'tipo') && materiales.size === 1);
  check('G10 · la política por clase admite lo normal de cada una',
    tipoAdmitidoParaLaClase('image', 'image/webp') && tipoAdmitidoParaLaClase('video', 'video/mp4') && tipoAdmitidoParaLaClase('audio', 'audio/mp4')
    && tipoAdmitidoParaLaClase('document', 'application/pdf') && tipoAdmitidoParaLaClase('model3d', 'model/gltf-binary')
    && !tipoAdmitidoParaLaClase('document', 'text/html') && !tipoAdmitidoParaLaClase('inventada', 'image/png') && !tipoAdmitidoParaLaClase('toString', 'image/png'));
  check('G10b · cualquier subtipo `…+xml` se rechaza en toda clase, también en mayúsculas o con parámetros',
    [['image', 'image/foo+xml'], ['image', 'image/vnd.svg+xml'], ['video', 'video/x+xml'], ['model3d', 'model/x3d+xml'], ['model3d', 'model/vnd.collada+xml'],
      ['world', 'model/x3d+xml'], ['image', 'IMAGE/SVG+XML'], ['image', 'Image/Foo+XML'], ['image', 'image/svg+xml; charset=utf-8'], ['video', 'video/x+xml;charset=utf-8']]
      .every(([k, t]) => !tipoAdmitidoParaLaClase(k, t)));

  /* B-2 · repetir un operationId no puede firmar un tipo que no es el del material ya creado. */
  const otroTipo = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-foto-0002', kind: 'image', contentType: 'image/png', bytes: 10 });
  const otraClase = await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-foto-0002', kind: 'model3d', contentType: 'application/octet-stream', bytes: 10 });
  const mismoOpOtroMime = otroTipo.ok ? await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-foto-0002', kind: 'image', contentType: 'image/webp', bytes: 10 }) : { ok: true };
  const mismoOpIgual = otroTipo.ok ? await solicitarSubida(deps, { principalId: ANA, operationId: 'op-ana-foto-0002', kind: 'image', contentType: 'image/png', bytes: 10 }) : { ok: false };
  check('G11 · mismo operationId con otra clase u otro tipo: no se firma (se cruza con el material guardado); con el mismo, sí',
    !otraClase.ok && otraClase.traza.detalle === 'tipo' && otroTipo.ok && !mismoOpOtroMime.ok && mismoOpOtroMime.traza.detalle === 'tipo' && mismoOpIgual.ok
    && materiales.get(otroTipo.intento.assetId).mimeType === 'image/png');
  const sinMime = { ...materiales.get(otroTipo.intento.assetId) }; delete sinMime.mimeType;
  const dec = (contentType) => decidirSubida({ accountId: ANA, material: sinMime, objeto: undefined, registro, providerId: R2_PROVIDER_ID, contentType, bytes: 10 });
  check('G12 · la decisión cruza el tipo con la CLASE del material aunque no tenga `mimeType`',
    dec('application/octet-stream').permitida === false && dec('application/octet-stream').detalle === 'tipo' && dec('image/png').permitida === true);
}

/* ═══ H · COMPATIBILIDAD CON LO HISTÓRICO ═════════════════════════════════ */
console.log('\n── H · Lo que ya existe sigue por donde iba: Media Cloud no lo intercepta ──');
{
  const registro = crearRegistroDeMedios([DESCRIPTOR_DE_R2]).registro;
  const legado = {
    'asset_cloudinary1': { contract: 1, assetId: 'asset_cloudinary1', ownerAccountId: ANA, kind: 'image', status: 'ready', storageRef: { provider: 'cloudinary', bucket: 'dnrj1guvs/image', objectKey: 'posts/uid/abc.jpg' }, provenance: { createdAt: 1 }, createdAt: 1, updatedAt: 1, delivery: { url: 'https://res.cloudinary.com/dnrj1guvs/image/upload/posts/uid/abc.jpg', kind: 'public' } },
    'asset_storagewee1': { contract: 1, assetId: 'asset_storagewee1', ownerAccountId: ANA, kind: 'image', status: 'ready', storageRef: { provider: 'wee', bucket: 'get-wee.firebasestorage.app', objectKey: `users/${ANA}/ai-generations/1-result.png` }, provenance: { createdAt: 1 }, createdAt: 1, updatedAt: 1, delivery: { url: 'https://firebasestorage.googleapis.com/v0/b/x/o/y?alt=media&token=t', kind: 'bearer_token' } },
  };
  const copia = JSON.stringify(legado);
  const llamadas = [];
  const espia = crearAdaptadorDeR2({ config: () => CONFIG, fetch: async (...a) => { llamadas.push(a); return local(...a); }, ahora });
  const dep = { db: {}, cuentaDelPrincipal: async (p) => ({ accountId: p }), leerMaterial: async (id) => legado[id], objetos: almacenDeObjetosDeMedios(falsoFirestore(new Map())), registro, adaptadores: { [R2_PROVIDER_ID]: espia }, ahora };
  const c = await solicitarEntrega(dep, { principalId: ANA, assetId: 'asset_cloudinary1' });
  const w = await solicitarEntrega(dep, { principalId: ANA, assetId: 'asset_storagewee1' });
  check('H1 · un material de Cloudinary o del Storage de Weë NO se firma por Media Cloud (sin ficha de objeto)',
    !c.ok && !w.ok && c.traza.detalle === 'sin_ficha' && w.traza.detalle === 'sin_ficha');
  check('H2 · y no se toca: ni una llamada al proveedor, ni un cambio en su `delivery.url`', llamadas.length === 0 && JSON.stringify(legado) === copia);
  check('H3 · la identidad de un objeto de R2 no puede coincidir con la de uno histórico (el proveedor va dentro de la huella)',
    referenciaDelObjeto(huellaDeMedios, { provider: 'cloudinary', objectKey: 'accounts/a/assets/b/original' }) !== referenciaDelObjeto(huellaDeMedios, { provider: R2_PROVIDER_ID, objectKey: 'accounts/a/assets/b/original' }));
}
} finally {
  servidor.close();
}

/* Un Firestore mínimo: `create` falla si existe, que es lo único que el almacén de fichas necesita. */
function falsoFirestore(mapa) {
  return {
    collection: () => ({
      doc: (id) => ({
        async create(d) { if (mapa.has(id)) throw new Error('ALREADY_EXISTS'); mapa.set(id, structuredClone(d)); },
        async get() { return { exists: mapa.has(id), data: () => structuredClone(mapa.get(id)) }; },
        async update(p) { if (!mapa.has(id)) throw new Error('NOT_FOUND'); mapa.set(id, { ...mapa.get(id), ...p }); },
      }),
    }),
  };
}

console.log(`\n${n - failures}/${n} comprobaciones`);
if (failures) { console.error(`✘ ${failures} fallaron`); process.exit(1); }
console.log('✔ media-r2-integracion: el adaptador R2 habla S3 de verdad detrás del puerto');
