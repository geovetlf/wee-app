import { createHash, createHmac } from 'node:crypto';

/**
 * FIRMA AWS SIGNATURE V4 — lo único que hace falta para hablar S3 con R2.
 *
 * ── Por qué escrito a mano y no con el SDK ──────────────────────────────────
 *
 * `@aws-sdk/client-s3` son decenas de megas de dependencia en un bundle de
 * Functions que hoy tiene seis paquetes y que se despliega entero en cada
 * cambio. Para tres operaciones —guardar, mirar, borrar— la firma es unas
 * ochenta líneas deterministas, sin red y sin estado, y se puede probar exacta.
 *
 * ── Lo que esto cuesta, dicho aquí ──────────────────────────────────────────
 *
 * Una firma escrita a mano no está verificada hasta que un proveedor real la
 * acepta. Por eso el adaptador se declara `UNVERIFIED` y el canary real contra
 * R2 es un paso aparte que pide autorización. No se finge lo contrario.
 *
 * Nada de este archivo toca la red, el reloj ni un secreto más allá del que se
 * le pasa, y **nunca** registra nada.
 */

const sha256Hex = (datos: string | Buffer): string => createHash('sha256').update(datos).digest('hex');
const hmac = (clave: Buffer | string, datos: string): Buffer => createHmac('sha256', clave).update(datos, 'utf8').digest();

/**
 * Codificación de URI de AWS. NO es `encodeURIComponent`: hay que escapar
 * también `!`, `'`, `(`, `)` y `*`, y dejar sin escapar `-`, `_`, `.` y `~`.
 * Una sola diferencia aquí y la firma no coincide.
 */
export const codificarParaFirma = (valor: string, conservarBarras: boolean): string => {
  const crudo = encodeURIComponent(valor).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return conservarBarras ? crudo.replace(/%2F/g, '/') : crudo;
};

/* ── La ruta: UNA sola vez, y la misma que viaja ───────────────────────────── */

/**
 * LA RUTA CODIFICADA. Este tipo existe para que no se pueda pasar una cruda.
 *
 * Solo `rutaCanonicaDeObjeto` la produce, así que quien firme y quien llame
 * usan por construcción **la misma cadena**. Antes no era así: se firmaba la
 * ruta codificada y se enviaba la cruda, y con una clave que llevara `(`, `'`,
 * `*`, `!`, `+` o `%` las dos dejaban de coincidir —la firma no cuadraba— y con
 * `?` o `#` era peor todavía: el objeto acababa guardado bajo OTRA clave sin
 * que nadie se enterase.
 */
export type RutaCanonica = string & { readonly __rutaCanonica: unique symbol };

/** Los segmentos que un analizador de URL RESUELVE en vez de transmitir. */
const SEGMENTO_QUE_SE_RESUELVE = (s: string): boolean => s === '.' || s === '..';

/**
 * DE UN CONTENEDOR Y UNA CLAVE A LA RUTA QUE SE FIRMA **Y** SE ENVÍA.
 *
 * Codifica una sola vez, con las reglas de AWS —que no son las de
 * `encodeURIComponent`—, conservando las barras de la clave porque ahí SÍ
 * separan segmentos, y escapando las del contenedor porque ahí no.
 *
 * Devuelve `undefined` cuando la clave no se puede transmitir con fidelidad:
 * un segmento `.` o `..` lo resuelve el analizador de URL antes de salir por el
 * cable —y escaparlo no sirve, porque `%2E` cuenta como punto para esa misma
 * norma—, así que la petición terminaría en una clave distinta de la pedida.
 * Ante eso se dice que no; escribir en el sitio equivocado en silencio sería
 * mucho peor que fallar.
 */
/**
 * MC-9 · LA RUTA DEL CONTENEDOR, sin objeto detrás.
 *
 * Enumerar no se le pide a un objeto: se le pide al contenedor, y por eso hace
 * falta una ruta que termine ahí. Separada de la de objeto a propósito —
 * dejar pasar una clave vacía por `rutaCanonicaDeObjeto` habría convertido un
 * error de quien llama en una petición al contenedor entero.
 */
export const rutaCanonicaDeContenedor = (contenedor: string): RutaCanonica | undefined => {
  if (typeof contenedor !== 'string' || !contenedor) return undefined;
  const ruta = `/${codificarParaFirma(contenedor, false)}`;
  return ruta.split('/').some(SEGMENTO_QUE_SE_RESUELVE) ? undefined : (ruta as RutaCanonica);
};

export const rutaCanonicaDeObjeto = (contenedor: string, objectKey: string): RutaCanonica | undefined => {
  if (typeof contenedor !== 'string' || !contenedor) return undefined;
  if (typeof objectKey !== 'string' || !objectKey || objectKey.startsWith('/')) return undefined;
  const ruta = `/${codificarParaFirma(contenedor, false)}/${codificarParaFirma(objectKey, true)}`;
  if (ruta.split('/').some(SEGMENTO_QUE_SE_RESUELVE)) return undefined;
  return ruta as RutaCanonica;
};

/** `20260920T191500Z` y `20260920`, que es lo que pide el protocolo. */
export const marcasDeTiempo = (ahora: number): { completa: string; dia: string } => {
  const iso = new Date(ahora).toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { completa: iso, dia: iso.slice(0, 8) };
};

export interface PeticionAFirmar {
  metodo: 'PUT' | 'GET' | 'HEAD' | 'DELETE';
  /** El host, sin esquema. Va firmado: la firma ata la petición a su destino. */
  host: string;
  /**
   * La ruta YA codificada, salida de `rutaCanonicaDeObjeto`. Se firma tal cual,
   * sin tocarla: quien llame tiene que enviar **esta misma cadena**, y el tipo
   * está para que no pueda pasar otra cosa.
   */
  ruta: RutaCanonica;
  /** Cabeceras que se firman, además de las obligatorias. Minúsculas. */
  cabeceras?: Readonly<Record<string, string>>;
  /** El cuerpo, para el resumen. Sin cuerpo se firma el resumen del vacío. */
  cuerpo?: Buffer;
  /**
   * MC-9 · LA CONSULTA, YA CANÓNICA. Salida de `consultaCanonicaDe`.
   *
   * Mismo trato que la ruta y por el mismo motivo: se construye UNA vez, se
   * firma tal cual y se envía tal cual. Dejar que quien llama componga la URL
   * por su cuenta es cómo se acaba firmando una cadena y mandando otra — que es
   * exactamente el fallo que costó cuatro PUT reales en la fase del incidente.
   */
  consulta?: ConsultaCanonica;
}

/** Una consulta ya ordenada y codificada. El tipo existe para que no pueda entrar otra cosa. */
export type ConsultaCanonica = string & { readonly __canonica: unique symbol };

/**
 * MC-9 · DE UNOS PARÁMETROS A LA CADENA QUE SE FIRMA Y SE ENVÍA.
 *
 * Ordenada por nombre y codificada, que es parte del protocolo y no una
 * preferencia. Es la misma construcción que ya hacía `firmarConsulta`, sacada
 * aquí para que las dos formas de firmar usen una sola.
 */
export const consultaCanonicaDe = (
  parametros: readonly (readonly [string, string])[],
): ConsultaCanonica =>
  parametros
    .map(([k, v]) => `${codificarParaFirma(k, false)}=${codificarParaFirma(v, false)}`)
    .sort()
    .join('&') as ConsultaCanonica;

export interface CredencialesDeFirma {
  accessKeyId: string;
  secretAccessKey: string;
  /** R2 usa `auto`. Va dentro del ámbito de la firma. */
  region: string;
  servicio: 's3';
}

/**
 * FIRMAR. Devuelve las cabeceras que hay que mandar, ya completas.
 *
 * El resumen del cuerpo viaja en `x-amz-content-sha256` y va firmado, así que
 * un cuerpo alterado por el camino invalida la firma — que es justo lo que se
 * quiere de una operación que escribe bytes.
 */
/* ── Lo que comparten los dos modos de firma ───────────────────────────────── */

/**
 * SigV4 SE FIRMA DE DOS MANERAS, PERO ES UNA SOLA FIRMA.
 *
 * Con cabecera —`Authorization`— para una petición que hace el servidor, y con
 * parámetros de consulta para una URL que se le da a otro. Cambia DÓNDE viajan
 * el algoritmo, la credencial y la fecha; no cambia nada de lo que sigue: el
 * ámbito, la clave derivada, la cadena a firmar ni el resumen.
 *
 * Por eso esto vive aquí una vez. Dos implementaciones de SigV4 en el mismo
 * repositorio terminan divergiendo, y la que se use menos es la que se rompe
 * sin que nadie lo note.
 */
const ambitoDe = (dia: string, c: CredencialesDeFirma): string =>
  `${dia}/${c.region}/${c.servicio}/aws4_request`;

/** La clave de firma: el secreto amasado con la fecha, la región y el servicio. */
const claveDeFirma = (c: CredencialesDeFirma, dia: string): Buffer => {
  const kDia = hmac(`AWS4${c.secretAccessKey}`, dia);
  const kRegion = hmac(kDia, c.region);
  const kServicio = hmac(kRegion, c.servicio);
  return hmac(kServicio, 'aws4_request');
};

/** `AWS4-HMAC-SHA256 | fecha | ámbito | resumen de la petición canónica` → la firma. */
const firmaDe = (c: CredencialesDeFirma, dia: string, completa: string, peticionCanonica: string): string => {
  const aFirmar = [ALGORITMO, completa, ambitoDe(dia, c), sha256Hex(peticionCanonica)].join('\n');
  return createHmac('sha256', claveDeFirma(c, dia)).update(aFirmar, 'utf8').digest('hex');
};

export const ALGORITMO = 'AWS4-HMAC-SHA256';

export const firmar = (
  peticion: PeticionAFirmar,
  credenciales: CredencialesDeFirma,
  ahora: number,
): Record<string, string> => {
  const { completa, dia } = marcasDeTiempo(ahora);
  const resumenDelCuerpo = sha256Hex(peticion.cuerpo ?? Buffer.alloc(0));

  const cabeceras: Record<string, string> = {
    host: peticion.host,
    'x-amz-content-sha256': resumenDelCuerpo,
    'x-amz-date': completa,
    ...Object.fromEntries(Object.entries(peticion.cabeceras ?? {}).map(([k, v]) => [k.toLowerCase(), String(v).trim()])),
  };

  /* Las cabeceras firmadas van ordenadas por nombre; el orden es parte de la firma. */
  const nombres = Object.keys(cabeceras).sort();
  const cabecerasCanonicas = nombres.map((n) => `${n}:${cabeceras[n]}\n`).join('');
  const firmadas = nombres.join(';');

  /* Sin codificar aquí: llega codificada y es la misma que se va a enviar. */
  const peticionCanonica = [
    peticion.metodo,
    peticion.ruta,
    /* Las tres operaciones de MC-1 no llevan; el listado de MC-9 sí, y ya llega canónica. */
    peticion.consulta ?? '',
    cabecerasCanonicas,
    firmadas,
    resumenDelCuerpo,
  ].join('\n');

  const ambito = ambitoDe(dia, credenciales);
  const firma = firmaDe(credenciales, dia, completa, peticionCanonica);

  return {
    ...cabeceras,
    Authorization: `${ALGORITMO} Credential=${credenciales.accessKeyId}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
  };
};

/* ── Firma en la consulta: la llave que se le da a otro ────────────────────── */

/**
 * UNA URL FIRMADA PARA UN GET. Lo verificado en la documentación oficial de
 * Cloudflare R2 (`/r2/api/s3/presigned-urls/`, 2026-09-20):
 *
 *   · algoritmo   `AWS4-HMAC-SHA256`
 *   · vigencia    de 1 segundo a 7 días (604.800 s) en `X-Amz-Expires`
 *   · resumen     `UNSIGNED-PAYLOAD`: no hay cuerpo que firmar en un GET
 *   · cabeceras   `X-Amz-SignedHeaders=host` — solo el destino va firmado
 *   · región      `auto`
 *   · parámetros  `X-Amz-Algorithm`, `X-Amz-Credential`, `X-Amz-Date`,
 *                 `X-Amz-Expires`, `X-Amz-SignedHeaders` y, al final y FUERA
 *                 de lo firmado, `X-Amz-Signature`
 *
 * ── La misma lección que la ruta ────────────────────────────────────────────
 *
 * La consulta canónica se construye UNA vez y esa misma cadena es la que se
 * pega a la URL. Firmar una y enviar otra es exactamente el fallo que costó el
 * endurecimiento de MC-1, y en una consulta es más fácil todavía de cometer:
 * los parámetros van ORDENADOS por nombre, y basta reordenarlos al escribir la
 * URL para que la firma deje de valer.
 */
export interface ConsultaAFirmar {
  metodo: 'GET' | 'PUT';
  host: string;
  ruta: RutaCanonica;
  vigenciaSegundos: number;
  /**
   * Cabeceras que van FIRMADAS además del destino. Quien use la URL tiene que
   * mandarlas exactamente así o el proveedor rechaza la petición — y eso es
   * justamente para lo que se usan: en una subida, firmar `content-type`
   * convierte una declaración del cliente en una restricción que aplica el
   * proveedor, sin que Weë mire un solo byte.
   */
  cabeceras?: Readonly<Record<string, string>>;
}

export const firmarConsulta = (
  peticion: ConsultaAFirmar,
  credenciales: CredencialesDeFirma,
  ahora: number,
): { url: string; expiraEn: number; cabecerasObligatorias: Readonly<Record<string, string>> } => {
  const { completa, dia } = marcasDeTiempo(ahora);
  const ambito = ambitoDe(dia, credenciales);

  /* `host` siempre; lo demás, lo que pida quien firma. Minúsculas y ordenadas. */
  const extra = Object.entries(peticion.cabeceras ?? {}).map(([k, v]) => [k.toLowerCase(), String(v).trim()] as const);
  const cabeceras: Record<string, string> = { host: peticion.host, ...Object.fromEntries(extra) };
  const nombres = Object.keys(cabeceras).sort();
  const firmadas = nombres.join(';');

  /*
   * Ordenados por nombre, que es parte del protocolo y no una preferencia.
   * `X-Amz-Signature` no está: es el resultado, no una entrada.
   */
  const parametros: readonly (readonly [string, string])[] = [
    ['X-Amz-Algorithm', ALGORITMO],
    ['X-Amz-Credential', `${credenciales.accessKeyId}/${ambito}`],
    ['X-Amz-Date', completa],
    ['X-Amz-Expires', String(peticion.vigenciaSegundos)],
    ['X-Amz-SignedHeaders', firmadas],
  ];
  const consultaCanonica = parametros
    .map(([k, v]) => `${codificarParaFirma(k, false)}=${codificarParaFirma(v, false)}`)
    .sort()
    .join('&');

  const peticionCanonica = [
    peticion.metodo,
    peticion.ruta,
    consultaCanonica,
    nombres.map((nombre) => `${nombre}:${cabeceras[nombre]}\n`).join(''),
    firmadas,
    /* Firmada por consulta, la petición no lleva resumen del cuerpo. Así lo dice el protocolo. */
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const firma = firmaDe(credenciales, dia, completa, peticionCanonica);

  return {
    /* La MISMA consulta canónica que se firmó, más la firma al final. */
    url: `https://${peticion.host}${peticion.ruta}?${consultaCanonica}&X-Amz-Signature=${firma}`,
    expiraEn: ahora + peticion.vigenciaSegundos * 1000,
    /* Lo que quien use la URL está OBLIGADO a mandar, porque va dentro de la firma. */
    cabecerasObligatorias: Object.freeze(Object.fromEntries(extra)),
  };
};
