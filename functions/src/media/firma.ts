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
}

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
    /* Sin parámetros: las tres operaciones de MC-1 no los usan. */
    '',
    cabecerasCanonicas,
    firmadas,
    resumenDelCuerpo,
  ].join('\n');

  const ambito = `${dia}/${credenciales.region}/${credenciales.servicio}/aws4_request`;
  const aFirmar = ['AWS4-HMAC-SHA256', completa, ambito, sha256Hex(peticionCanonica)].join('\n');

  const kDia = hmac(`AWS4${credenciales.secretAccessKey}`, dia);
  const kRegion = hmac(kDia, credenciales.region);
  const kServicio = hmac(kRegion, credenciales.servicio);
  const kFirma = hmac(kServicio, 'aws4_request');
  const firma = createHmac('sha256', kFirma).update(aFirmar, 'utf8').digest('hex');

  return {
    ...cabeceras,
    Authorization: `AWS4-HMAC-SHA256 Credential=${credenciales.accessKeyId}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
  };
};
