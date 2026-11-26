import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdtemp, rm, stat } from 'fs/promises';
import * as binarioDeFfmpeg from 'ffmpeg-static';
import { tmpdir } from 'os';
import * as path from 'path';
import { AssetVariant, AttemptReport, JobDispatch, JobExecutor, WeeErrorCode, errorDelCore, esTareaGeneral } from '../core';
import { AssetDoc, PROVEEDOR_WEE, anotarVariante, crearMaterialDesdeUrl, esDeLaCuenta, leerMaterial } from '../content';
import { MARCA_DE_MATERIAL, rutaDelResultado } from '../content/materializador';
import { downloadUrlFor, storageBucket } from '../engine/http';
import { ManifiestoDeMontaje } from './composicion';
import { argumentosDeFfmpeg } from './ffmpeg';
import {
  LIMITES_DEL_POSTER,
  TAREA_DE_POSTER,
  leerPaqueteDePoster,
  marcaDelPoster,
  porQueNoHayPoster,
  posterDelMaterial,
  rutaDelPoster,
  tienePosterAjeno,
} from './poster';
import { LIMITES_DEL_RENDER, TAREA_DE_RENDER, leerPaqueteDeRender } from './render';

/**
 * WEË FILMMAKER ENGINE · FASE 8 — EL RENDERIZADOR: LA OTRA IMPLEMENTACIÓN DEL
 * ÚNICO PUERTO DEL TRABAJADOR.
 *
 * El trabajador del Job Engine (`job/worker.ts`) tiene un solo puerto que toca
 * el mundo, `JobExecutor`. Para una operación de IA lo implementa la composición
 * Router → Gateway; para una miniatura, MC-4 (`media/proceso.ts`); para el
 * montaje final, esto. Mismos estados, mismas concesiones, mismos plazos, mismos
 * reintentos: no hay un segundo motor, hay un tercer ejecutor.
 *
 * ── En orden, y el orden es el contrato ─────────────────────────────────────
 *
 *   1. leer el paquete        del trabajo guardado, recalculando identidad y huella
 *   2. ¿ya está?              el material, o su objeto sin ficha: se adopta
 *   3. bajar los planos       solo materiales de ESTA cuenta, del Storage de Weë
 *   4. montar                 FFmpeg sin shell, con la concesión renovada
 *   5. comprobar              duración, cuadro, códec y pista de sonido
 *   6. guardar                SOLO SI NO EXISTE, en la carpeta de la cuenta
 *   7. el material            `asset_` calculado, con sus planos como origen
 *   8. su póster              del archivo que ya está en disco (Fase 11); si no
 *                             sale, el render sigue hecho y el póster se pide después
 *
 * Si algo falla antes de guardar, no hay nada que limpiar; si falla después, el
 * objeto está y el siguiente intento lo adopta en vez de montar otra vez.
 *
 * Desde la Fase 11 hay un cuarto ejecutor en este archivo, el del PÓSTER de un
 * vídeo (`crearEjecutorDePoster`): mismo binario, mismo almacén, mismo latido.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No decide nada: qué montar, para quién y con qué formato venía decidido y
 * autorizado en el paquete. No cobra ni reserva: el render es gratis (decisión
 * del usuario, 2026-09-28). No llama a ningún proveedor de IA. Y no acepta una
 * sola URL: los planos se leen por su referencia de almacén, de la cuenta dueña.
 */

/* ── Los puertos ───────────────────────────────────────────────────────────── */

/** El almacén de objetos, en lo que un render necesita. El de verdad es el Storage de Weë. */
export interface AlmacenDelRender {
  /** El nombre del contenedor, para la URL de descarga de la ficha. */
  contenedor(): string;
  /** Trae un objeto a disco. Solo claves del Storage de Weë. */
  bajar(objectKey: string, destino: string): Promise<void>;
  /** Sube un archivo SOLO SI NO EXISTE. `ya_estaba`: había objeto, y no se pisó. */
  subir(origen: string, ruta: string, datos: { contentType: string; token: string; marca: string }): Promise<'subido' | 'ya_estaba'>;
  /** Lo que dice un objeto de sí mismo: su marca de material y su token. `null` si no existe. */
  mirar(ruta: string): Promise<{ marca?: string; token?: string; bytes?: number } | null>;
}

/** Un FFmpeg en marcha. `matar` para parar uno que ya no es de nadie. */
export interface ProcesoDeFfmpeg {
  terminado: Promise<{ codigo: number | null; stderr: string }>;
  matar(): void;
}
export type LanzarFfmpeg = (argv: readonly string[]) => ProcesoDeFfmpeg;

/**
 * EL BINARIO. El de `ffmpeg-static` (decisión del usuario, 2026-09-28), que lo
 * instala para la plataforma donde corre `npm ci`: el ordenador en local y
 * Linux en Cloud Build.
 *
 * Se importa arriba, como cualquier otra dependencia —nada de cargas perezosas,
 * que el mapa del runtime no ve (`f1d-generacion` AE)—, y cuesta poco: el
 * paquete solo calcula una ruta, no carga el binario. Lo que exporta ES esa ruta
 * (`module.exports = ruta`), y por eso se lee como texto. Si el binario no está
 * donde dice —una instalación que no lo bajó—, no hay FFmpeg, y se dice.
 */
export const rutaDeFfmpeg = (): string | null => {
  const ruta: unknown = binarioDeFfmpeg;
  return typeof ruta === 'string' && ruta.length > 0 && existsSync(ruta) ? ruta : null;
};

/** Lo que se guarda de lo que FFmpeg escribe: la cola, que es donde está el error. */
const COLA_DE_STDERR = 8 * 1024;

/**
 * LANZAR FFMPEG: `spawn` con la lista de argumentos y SIN SHELL. Una ruta con
 * espacios o comillas es un argumento, no una orden; y el grafo de filtros solo
 * lleva números y nombres fijos (`creator/ffmpeg.ts`).
 */
export const lanzarFfmpegDeWee = (binario: string): LanzarFfmpeg => (argv) => {
  const hijo = spawn(binario, [...argv], { shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let cola = '';
  hijo.stderr?.on('data', (trozo: Buffer) => { cola = (cola + trozo.toString('utf8')).slice(-COLA_DE_STDERR); });
  const terminado = new Promise<{ codigo: number | null; stderr: string }>((resolver) => {
    let hecho = false;
    const acabar = (codigo: number | null) => { if (!hecho) { hecho = true; resolver({ codigo, stderr: cola }); } };
    hijo.on('error', () => acabar(null));
    hijo.on('close', (codigo) => acabar(codigo));
  });
  return { terminado, matar: () => { try { hijo.kill('SIGKILL'); } catch { /* ya no estaba */ } } };
};

/** El Storage de Weë, por el mismo contenedor que usa el materializador. */
export const almacenDelRenderDeWee = (): AlmacenDelRender => ({
  contenedor: () => storageBucket().name,
  async bajar(objectKey, destino) {
    await storageBucket().file(objectKey).download({ destination: destino });
  },
  async subir(origen, ruta, datos) {
    try {
      await storageBucket().upload(origen, {
        destination: ruta,
        resumable: false,
        metadata: { contentType: datos.contentType, metadata: { firebaseStorageDownloadTokens: datos.token, [MARCA_DE_MATERIAL]: datos.marca } },
        /* SOLO SI NO EXISTE. Quien llegue segundo recibe un 412 y no pisa el objeto del primero. */
        preconditionOpts: { ifGenerationMatch: 0 },
      });
      return 'subido';
    } catch (error) {
      if ((error as { code?: number })?.code === 412) return 'ya_estaba';
      throw error;
    }
  },
  async mirar(ruta) {
    try {
      const [meta] = await storageBucket().file(ruta).getMetadata() as unknown as [{ size?: string | number; metadata?: Record<string, unknown> }];
      const propios = meta?.metadata ?? {};
      const token = String(propios.firebaseStorageDownloadTokens ?? '').split(',')[0].trim();
      const marca = typeof propios[MARCA_DE_MATERIAL] === 'string' ? propios[MARCA_DE_MATERIAL] as string : undefined;
      const bytes = Number(meta?.size);
      return { ...(marca ? { marca } : {}), ...(token ? { token } : {}), ...(Number.isSafeInteger(bytes) ? { bytes } : {}) };
    } catch (error) {
      if ((error as { code?: number })?.code === 404) return null;
      throw error;
    }
  },
});

/* ── Lo que se sabe de un vídeo sin abrirlo con otra herramienta ───────────── */

export interface SondaDeVideo {
  duracionSec?: number;
  ancho?: number;
  alto?: number;
  video?: string;
  conSonido: boolean;
}

/**
 * LEER LO QUE FFMPEG DICE DE UN ARCHIVO. `ffmpeg -i` sin salida escribe la
 * cabecera en stderr —duración, códec, cuadro, pistas— y termina con un error
 * porque no se le pidió nada: esa cabecera es lo único que se lee. Sin un
 * segundo binario (`ffprobe` no viene en `ffmpeg-static`).
 */
export const leerSonda = (stderr: string): SondaDeVideo => {
  const dur = /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(stderr);
  const vid = /Stream #\d+:\d+[^\n]*?: Video: (\w+)[^\n]*?, (\d{2,5})x(\d{2,5})[ ,\n]/.exec(stderr);
  return {
    ...(dur ? { duracionSec: Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) } : {}),
    ...(vid ? { video: vid[1], ancho: Number(vid[2]), alto: Number(vid[3]) } : {}),
    conSonido: /Stream #\d+:\d+[^\n]*?: Audio: /.test(stderr),
  };
};

const sondear = async (lanzar: LanzarFfmpeg, ruta: string): Promise<SondaDeVideo> => {
  const p = lanzar(['-hide_banner', '-nostdin', '-i', ruta]);
  const reloj = setTimeout(() => p.matar(), 30_000);
  try {
    return leerSonda((await p.terminado).stderr);
  } finally {
    clearTimeout(reloj);
  }
};

/** Lo que se tolera entre la duración pedida y la que sale: el sonido AAC añade su arranque. */
export const TOLERANCIA_DE_DURACION_SEC = 0.25;
/** Cada cuánto se dice «sigo vivo» mientras FFmpeg trabaja: un tercio de la concesión. */
export const RENOVAR_CADA_MS = 20_000;
/** Lo que se deja, del tiempo del intento, para guardar y crear la ficha después de montar. */
const MARGEN_PARA_GUARDAR_MS = 60_000;

/* ── El latido ─────────────────────────────────────────────────────────────── */

/** Lo que un ejecutor sabe de su latido: si perdió el trabajo, y qué FFmpeg parar si lo pierde. */
export interface Latido {
  readonly perdida: boolean;
  vigilar(p: ProcesoDeFfmpeg): void;
  soltar(): void;
  parar(): void;
}

/**
 * EL LATIDO: «sigo vivo» cada tercio de la concesión durante TODO el intento
 * —bajar, montar, comprobar, guardar—, no solo mientras FFmpeg trabaja.
 *
 * Hasta la Fase 11 empezaba al lanzar FFmpeg, y bajar sesenta planos también se
 * come una concesión de un minuto: el trabajo quedaba sin dueño a mitad de las
 * descargas, otra pasada lo recuperaba, y el primer intento seguía montando para
 * nada. Convergía —el material es la verdad y el informe del zombi no mueve
 * nada—, pero montando dos veces. Ahora la concesión se sostiene desde el primer
 * byte, y si el trabajo deja de ser nuestro se para lo que haya en marcha.
 */
export const latir = (control: { renovar(): Promise<boolean> }, cadaMs: number): Latido => {
  let perdida = false;
  let enMarcha: ProcesoDeFfmpeg | undefined;
  const reloj = setInterval(() => {
    control.renovar().then((sigo) => { if (!sigo) { perdida = true; enMarcha?.matar(); } }, () => undefined);
  }, cadaMs);
  return {
    get perdida() { return perdida; },
    vigilar(p) { enMarcha = p; if (perdida) p.matar(); },
    soltar() { enMarcha = undefined; },
    parar() { clearInterval(reloj); },
  };
};

/* ── El póster: un fotograma, sacado con el mismo FFmpeg (Fase 11) ──────────── */

/** De qué segundo se saca: el de los topes, o la mitad de un vídeo que dure menos del doble. */
export const segundoDelPoster = (duracionSec: number | undefined): number => {
  const s = LIMITES_DEL_POSTER.segundo;
  if (duracionSec === undefined || !(duracionSec > 0)) return 0;
  return duracionSec >= 2 * s ? s : Math.floor(duracionSec * 500) / 1000;
};

/**
 * EL TAMAÑO: el lado mayor, como mucho `ladoMayor` y par; el otro, en proporción
 * (`-2`, par también). Solo números en el filtro, como en el montaje: nada que
 * venga de fuera llega a FFmpeg como texto.
 */
export const escalaDelPoster = (ancho: number, alto: number): { filtro: string; ancho?: number; alto?: number } => {
  const lado = LIMITES_DEL_POSTER.ladoMayor;
  const par = (n: number): number => Math.max(2, Math.floor(Math.min(lado, n) / 2) * 2);
  if (ancho >= alto) {
    const w = par(ancho);
    return { filtro: `scale=${w}:-2`, ancho: w };
  }
  const h = par(alto);
  return { filtro: `scale=-2:${h}`, alto: h };
};

/** Los argumentos: buscar el segundo, un solo fotograma, escalar y un JPEG. Lista, no línea de órdenes. */
export const argumentosDelPoster = (entrada: string, salida: string, segundo: number, filtro: string): string[] =>
  ['-hide_banner', '-nostdin', '-y', '-ss', segundo.toFixed(3), '-i', entrada, '-frames:v', '1', '-vf', filtro, '-q:v', '3', '-update', '1', salida];

export interface PosterSacado {
  ruta: string;
  bytes: number;
  ancho: number;
  alto: number;
}

/** ¿Es un póster? Un JPEG con cuadro, que no pesa más de la cuenta ni pasa del lado mayor. */
const esPoster = (visto: SondaDeVideo, bytes: number): boolean =>
  visto.video === 'mjpeg' && !!visto.ancho && !!visto.alto && bytes > 0 && bytes <= LIMITES_DEL_POSTER.maxBytesDelPoster
  && Math.max(visto.ancho, visto.alto) <= LIMITES_DEL_POSTER.ladoMayor;

/**
 * SACAR EL PÓSTER DE UN VÍDEO QUE YA ESTÁ EN DISCO, y comprobarlo. No sube nada.
 * Con latido, un trabajo perdido para también este FFmpeg.
 */
export const sacarPoster = async (
  lanzar: LanzarFfmpeg,
  entrada: string,
  carpeta: string,
  sonda: SondaDeVideo,
  limiteMs: number,
  latido?: Latido,
): Promise<PosterSacado | { motivo: string }> => {
  if (!sonda.video || !sonda.ancho || !sonda.alto) return { motivo: 'source_unreadable' };
  if (!(limiteMs > 0)) return { motivo: 'no_time_for_poster' };
  const escala = escalaDelPoster(sonda.ancho, sonda.alto);
  const salida = path.join(carpeta, 'poster.jpg');
  const proceso = lanzar(argumentosDelPoster(entrada, salida, segundoDelPoster(sonda.duracionSec), escala.filtro));
  latido?.vigilar(proceso);
  let vencido = false;
  const reloj = setTimeout(() => { vencido = true; proceso.matar(); }, limiteMs);
  let fin: { codigo: number | null; stderr: string };
  try {
    fin = await proceso.terminado;
  } finally {
    clearTimeout(reloj);
    latido?.soltar();
  }
  if (latido?.perdida) return { motivo: 'lease_lost' };
  if (vencido) return { motivo: 'poster_timeout' };
  if (fin.codigo !== 0) return { motivo: 'poster_failed' };
  const visto = await sondear(lanzar, salida);
  const bytes = (await stat(salida).catch(() => undefined))?.size ?? 0;
  if (!esPoster(visto, bytes) || (escala.ancho !== undefined && visto.ancho !== escala.ancho) || (escala.alto !== undefined && visto.alto !== escala.alto)) {
    return { motivo: 'poster_unverifiable' };
  }
  return { ruta: salida, bytes, ancho: visto.ancho as number, alto: visto.alto as number };
};

/** Escribir la variante en el material, con la referencia de SU sitio. Nada de URL: la calcula quien lee. */
const anotarElPoster = async (
  almacen: AlmacenDelRender,
  anotar: typeof anotarVariante,
  accountId: string,
  assetId: string,
  medido: { bytes: number; ancho: number; alto: number },
): Promise<'anotado' | { motivo: string }> => {
  const variante: AssetVariant = {
    kind: 'poster',
    storageRef: { provider: PROVEEDOR_WEE, bucket: almacen.contenedor(), objectKey: rutaDelPoster(accountId, assetId) },
    mimeType: 'image/jpeg',
    bytes: medido.bytes,
    width: medido.ancho,
    height: medido.alto,
  };
  const ok = await anotar(accountId, assetId, variante).catch(() => false);
  return ok ? 'anotado' : { motivo: 'poster_not_annotated' };
};

/**
 * GUARDAR EL PÓSTER Y ANOTARLO. Solo si no existe: si otro intento lo guardó
 * antes, es el mismo fotograma del mismo vídeo, y se anota el suyo —si lleva la
 * marca de ESTE póster; si no, no se toca—.
 */
export const guardarPoster = async (
  almacen: AlmacenDelRender,
  anotar: typeof anotarVariante,
  accountId: string,
  assetId: string,
  sacado: PosterSacado,
): Promise<'anotado' | { motivo: string }> => {
  const ruta = rutaDelPoster(accountId, assetId);
  const marca = marcaDelPoster(assetId);
  let subido: 'subido' | 'ya_estaba';
  try {
    subido = await almacen.subir(sacado.ruta, ruta, { contentType: 'image/jpeg', token: randomUUID(), marca });
  } catch {
    return { motivo: 'poster_upload_failed' };
  }
  let bytes = sacado.bytes;
  if (subido === 'ya_estaba') {
    const otro = await almacen.mirar(ruta).catch(() => null);
    if (!otro || otro.marca !== marca) return { motivo: 'object_conflict' };
    if (otro.bytes) bytes = otro.bytes;
  }
  return anotarElPoster(almacen, anotar, accountId, assetId, { bytes, ancho: sacado.ancho, alto: sacado.alto });
};

/** Lo que tarda como mucho el póster del montaje: el vídeo ya está en disco, y es un fotograma. */
const TOPE_DEL_POSTER_DEL_MONTAJE_MS = 30_000;

/* ── El ejecutor ───────────────────────────────────────────────────────────── */

export interface DepsDelRenderizador {
  almacen?: AlmacenDelRender;
  /** Sin él se usa el binario de `ffmpeg-static`. */
  lanzar?: LanzarFfmpeg;
  leer?: (assetId: string) => Promise<AssetDoc | null>;
  crearMaterial?: typeof crearMaterialDesdeUrl;
  /** Cómo se escribe la variante del póster del montaje. Sin él, la del Content Core. */
  anotar?: typeof anotarVariante;
  ahora?: () => number;
  /** Cuándo muere la invocación que aloja al trabajador: FFmpeg se para antes. */
  limite?: () => number;
  /** Dónde se crean las carpetas temporales. */
  temporal?: string;
  /** Cada cuánto se renueva la concesión durante el intento. Sin él, `RENOVAR_CADA_MS`. */
  renovarCadaMs?: number;
}

const fallo = (dispatch: JobDispatch, codigo: WeeErrorCode, reason: string, salio: boolean): AttemptReport => ({
  attemptId: dispatch.attemptId,
  outcome: 'failed',
  /*
   * «Salió» aquí no es hacia un proveedor —el render es nuestro— sino si ya se
   * empezó a trabajar. Da igual para reintentar: un intento con desenlace
   * conocido siempre se puede repetir, y repetir un render converge en el mismo
   * material. Se dice para que la traza lo cuente como es.
   */
  dispatched: salio,
  error: errorDelCore(codigo, 'render', { details: { reason } }),
});

const hecho = (dispatch: JobDispatch, material: { assetId: string; bytes?: number; durationSec?: number }): AttemptReport => ({
  attemptId: dispatch.attemptId,
  outcome: 'succeeded',
  dispatched: true,
  /* El resultado, en el contrato del Job Engine: una REFERENCIA —el material—, nunca una URL. */
  result: {
    outputRefs: [material.assetId],
    metadata: { assetId: material.assetId, bytes: material.bytes ?? 0, durationSec: material.durationSec ?? 0 },
  },
});

const listo = (m: AssetDoc | null | undefined, cuenta: string): m is AssetDoc =>
  !!m && m.ownerAccountId === cuenta && m.status === 'ready' && m.kind === 'video';

export const crearEjecutorDeRender = (deps: DepsDelRenderizador = {}): JobExecutor => {
  const ahora = deps.ahora ?? (() => Date.now());
  const leer = deps.leer ?? ((assetId: string) => leerMaterial(assetId).catch(() => null));
  const crearMaterial = deps.crearMaterial ?? crearMaterialDesdeUrl;
  const anotar = deps.anotar ?? anotarVariante;

  const ejecutarUno = async (dispatch: JobDispatch, control: { renovar(): Promise<boolean> }): Promise<AttemptReport> => {
    /* 1 · EL PAQUETE. De quién es lo dice la traza del trabajo, que armó el Job Engine desde lo guardado. */
    if (!esTareaGeneral(dispatch) || dispatch.task?.name !== TAREA_DE_RENDER) return fallo(dispatch, 'INVALID_REQUEST', 'not_a_render', false);
    const leido = leerPaqueteDeRender(dispatch.input, dispatch.trace.userId);
    if (!leido.ok) return fallo(dispatch, 'INVALID_REQUEST', `package_${leido.motivo}`, false);
    if (dispatch.trace.requestId !== leido.paquete.requestId) return fallo(dispatch, 'INVALID_REQUEST', 'package_identity', false);
    const { accountId, assetId, manifiesto } = leido.paquete;
    const ruta = rutaDelResultado(accountId, assetId, 'video/mp4');
    const almacen = deps.almacen ?? almacenDelRenderDeWee();

    /* 2 · ¿YA ESTÁ? Un intento anterior pudo guardarlo y morir antes de contarlo. */
    const yaEsta = await leer(assetId);
    if (yaEsta) {
      if (listo(yaEsta, accountId)) return hecho(dispatch, { assetId, bytes: yaEsta.bytes, durationSec: yaEsta.durationSec });
      return fallo(dispatch, 'INVALID_REQUEST', 'material_conflict', false);
    }

    const procedencia = {
      jobId: dispatch.jobId,
      requestId: leido.paquete.requestId,
      traceId: dispatch.trace.traceId,
      /* De qué salió: los planos, sin repetir. Es lo que hace de esto un derivado y no una subida. */
      sourceAssetIds: [...new Set(manifiesto.clips.map((c) => c.assetId))],
    };
    const ficha = async (token: string, medido: { durationSec?: number; ancho?: number; alto?: number }): Promise<AttemptReport> => {
      const material = await crearMaterial({
        ownerAccountId: accountId,
        assetId,
        url: downloadUrlFor(almacen.contenedor(), ruta, token),
        kind: 'video',
        mimeType: 'video/mp4',
        ...(medido.durationSec !== undefined ? { durationSec: medido.durationSec } : {}),
        ...(medido.ancho ? { width: medido.ancho } : {}),
        ...(medido.alto ? { height: medido.alto } : {}),
        provenance: { ...procedencia, createdAt: ahora() },
        metadata: { experienceId: 'studio', productionId: leido.paquete.productionId, revision: leido.paquete.revision, montage: manifiesto.huella },
      });
      if (!listo(material, accountId)) return fallo(dispatch, 'PROVIDER_ERROR', 'material_not_created', true);
      return hecho(dispatch, { assetId, bytes: material.bytes, durationSec: material.durationSec });
    };

    /* 2b · El objeto sin ficha: se adopta, sin montar otra vez. Solo si lleva la marca de ESTE material. */
    const objeto = await almacen.mirar(ruta).catch(() => undefined);
    if (objeto === undefined) return fallo(dispatch, 'PROVIDER_ERROR', 'storage_unavailable', false);
    if (objeto) {
      if (objeto.marca !== assetId || !objeto.token) return fallo(dispatch, 'INVALID_REQUEST', 'object_conflict', false);
      return ficha(objeto.token, { durationSec: manifiesto.duracionSec, ancho: manifiesto.salida.ancho, alto: manifiesto.salida.alto });
    }

    const binario = deps.lanzar ? 'inyectado' : rutaDeFfmpeg();
    if (!binario) return fallo(dispatch, 'PROVIDER_UNAVAILABLE', 'ffmpeg_missing', false);
    const lanzar = deps.lanzar ?? lanzarFfmpegDeWee(binario);

    const carpeta = await mkdtemp(path.join(deps.temporal ?? tmpdir(), 'wee-render-'));
    /* El latido, desde aquí hasta el final: bajar los planos también se come la concesión. */
    const latido = latir(control, deps.renovarCadaMs ?? RENOVAR_CADA_MS);
    try {
      /* 3 · LOS PLANOS. De esta cuenta, listos, de vídeo y en el Storage de Weë. Nada que venga por URL. */
      const entradas: Record<string, string> = {};
      let total = 0;
      for (const clip of manifiesto.clips) {
        if (entradas[clip.assetId]) continue;
        const m = await leer(clip.assetId);
        if (!listo(m, accountId) || !m.storageRef) return fallo(dispatch, 'INVALID_REQUEST', 'clip_not_available', false);
        if (m.storageRef.provider !== PROVEEDOR_WEE || !esDeLaCuenta(m.storageRef, accountId)) return fallo(dispatch, 'INVALID_REQUEST', 'clip_not_supported', false);
        if (m.bytes !== undefined && m.bytes > LIMITES_DEL_RENDER.maxBytesPorPlano) return fallo(dispatch, 'INVALID_REQUEST', 'clip_too_large', false);
        const destino = path.join(carpeta, `plano-${Object.keys(entradas).length}.mp4`);
        try {
          await almacen.bajar(m.storageRef.objectKey, destino);
        } catch {
          return fallo(dispatch, 'PROVIDER_ERROR', 'clip_download_failed', false);
        }
        /* Ya no es nuestro: bajar el resto sería trabajar para nadie. */
        if (latido.perdida) return fallo(dispatch, 'PROVIDER_ERROR', 'lease_lost', true);
        const pesa = (await stat(destino)).size;
        total += pesa;
        if (pesa > LIMITES_DEL_RENDER.maxBytesPorPlano || total > LIMITES_DEL_RENDER.maxBytesDeEntrada) return fallo(dispatch, 'INVALID_REQUEST', 'clip_too_large', false);
        entradas[clip.assetId] = destino;
      }

      /*
       * Un plano que pidió sonido y cuyo vídeo no trae pista se monta con
       * silencio: pedirle a FFmpeg la pista que no existe pararía el montaje
       * entero. Se mira cada archivo una vez, y el manifiesto guardado no se
       * toca: lo que cambia es la copia que se le da a FFmpeg.
       */
      const sondas: Record<string, SondaDeVideo> = {};
      for (const [id, destino] of Object.entries(entradas)) {
        sondas[id] = await sondear(lanzar, destino);
        if (!sondas[id].video) return fallo(dispatch, 'INVALID_REQUEST', 'clip_unreadable', true);
      }
      const aMontar: ManifiestoDeMontaje = {
        ...manifiesto,
        clips: manifiesto.clips.map((c) => (c.conSonido && !sondas[c.assetId].conSonido ? { ...c, conSonido: false } : c)),
      };
      if (latido.perdida) return fallo(dispatch, 'PROVIDER_ERROR', 'lease_lost', true);

      /* 4 · MONTAR, con la concesión renovada mientras tanto y un tope que no pasa del intento ni de la invocación. */
      const salida = path.join(carpeta, 'montaje.mp4');
      const argv = argumentosDeFfmpeg(aMontar, entradas, salida);
      const tope = Math.min(ahora() + Math.max(0, dispatch.timeoutMs - MARGEN_PARA_GUARDAR_MS), deps.limite ? deps.limite() - MARGEN_PARA_GUARDAR_MS : Infinity);
      if (tope <= ahora()) return fallo(dispatch, 'TIMEOUT', 'no_time_to_render', false);
      const proceso = lanzar(argv);
      latido.vigilar(proceso);
      let vencido = false;
      const reloj = setTimeout(() => { vencido = true; proceso.matar(); }, Math.max(0, tope - ahora()));
      let fin: { codigo: number | null; stderr: string };
      try {
        fin = await proceso.terminado;
      } finally {
        latido.soltar();
        clearTimeout(reloj);
      }
      /* Ya no es nuestro: lo que contemos no moverá nada. Se para y se dice. */
      if (latido.perdida) return fallo(dispatch, 'PROVIDER_ERROR', 'lease_lost', true);
      if (vencido) return fallo(dispatch, 'TIMEOUT', 'render_timeout', true);
      if (fin.codigo !== 0) return fallo(dispatch, 'PROVIDER_ERROR', 'render_failed', true);

      /* 5 · COMPROBAR lo que salió, no creérselo. */
      const visto = await sondear(lanzar, salida);
      const pesa = (await stat(salida).catch(() => undefined))?.size ?? 0;
      const conSonido = manifiesto.salida.audio === 'aac';
      if (!pesa || visto.video !== 'h264' || visto.ancho !== manifiesto.salida.ancho || visto.alto !== manifiesto.salida.alto
        || visto.duracionSec === undefined || Math.abs(visto.duracionSec - manifiesto.duracionSec) > TOLERANCIA_DE_DURACION_SEC
        || visto.conSonido !== conSonido) {
        return fallo(dispatch, 'PROVIDER_ERROR', 'render_unverifiable', true);
      }

      /* 6 · GUARDAR, solo si no existe. Si otro intento se adelantó, su objeto es el mismo montaje: se adopta. */
      const token = randomUUID();
      let subido: 'subido' | 'ya_estaba';
      try {
        subido = await almacen.subir(salida, ruta, { contentType: 'video/mp4', token, marca: assetId });
      } catch {
        return fallo(dispatch, 'PROVIDER_ERROR', 'upload_failed', true);
      }
      let tokenDeLaFicha: string = token;
      if (subido === 'ya_estaba') {
        const otro = await almacen.mirar(ruta).catch(() => null);
        if (!otro || otro.marca !== assetId || !otro.token) return fallo(dispatch, 'PROVIDER_ERROR', 'object_conflict', true);
        tokenDeLaFicha = otro.token;
      }

      /* 7 · LA FICHA, en el Content Core: con identidad calculada se crea solo si no existe. */
      const informe = await ficha(tokenDeLaFicha, { durationSec: Math.round(visto.duracionSec * 1000) / 1000, ancho: visto.ancho, alto: visto.alto });

      /*
       * 8 · SU PÓSTER (Fase 11), del archivo que ya está en disco: sin bajarlo
       * otra vez. Es lo último y no cambia el desenlace: si no sale, el render
       * está hecho igual —su vídeo es lo que se pidió— y el póster se pide
       * después como el de cualquier otro vídeo.
       */
      const paraElPoster = Math.min(TOPE_DEL_POSTER_DEL_MONTAJE_MS, deps.limite ? deps.limite() - ahora() : Infinity);
      if (informe.outcome === 'succeeded' && !latido.perdida && paraElPoster > 0) {
        const sacado = await sacarPoster(lanzar, salida, carpeta, visto, paraElPoster, latido).catch(() => null);
        if (sacado && !('motivo' in sacado)) await guardarPoster(almacen, anotar, accountId, assetId, sacado).catch(() => undefined);
      }
      return informe;
    } finally {
      latido.parar();
      await rm(carpeta, { recursive: true, force: true }).catch(() => undefined);
    }
  };

  return {
    async ejecutar(dispatch: JobDispatch, control: { renovar(): Promise<boolean> }): Promise<AttemptReport> {
      try {
        return await ejecutarUno(dispatch, control);
      } catch {
        /*
         * Lo que no se esperaba no se inventa: un fallo con motivo, y el siguiente
         * intento converge en el mismo material. Lanzar aquí haría que el
         * trabajador lo contara como «salió y no se sabe», y el render se quedaría
         * esperando a que alguien lo reconcilie por algo que sí se sabe.
         */
        return fallo(dispatch, 'PROVIDER_ERROR', 'render_error', true);
      }
    },
  };
};

/* ── El ejecutor del póster (Fase 11) ──────────────────────────────────────── */

export interface DepsDelPoster {
  almacen?: AlmacenDelRender;
  /** Sin él se usa el binario de `ffmpeg-static`. */
  lanzar?: LanzarFfmpeg;
  leer?: (assetId: string) => Promise<AssetDoc | null>;
  /** Cómo se escribe la variante. Sin él, la del Content Core. */
  anotar?: typeof anotarVariante;
  ahora?: () => number;
  /** Cuándo muere la invocación que aloja al trabajador. */
  limite?: () => number;
  temporal?: string;
  renovarCadaMs?: number;
}

/** Lo que se deja, del tiempo del intento, para guardar y anotar después de sacar el fotograma. */
const MARGEN_PARA_ANOTAR_MS = 30_000;

const falloDelPoster = (dispatch: JobDispatch, codigo: WeeErrorCode, reason: string, salio: boolean): AttemptReport => ({
  attemptId: dispatch.attemptId,
  outcome: 'failed',
  /* Como en el render: «salió» es si ya se empezó a trabajar, no si se llamó a nadie. */
  dispatched: salio,
  error: errorDelCore(codigo, 'poster', { details: { reason } }),
});

const posterHecho = (dispatch: JobDispatch, assetId: string, v: { bytes?: number; width?: number; height?: number }): AttemptReport => ({
  attemptId: dispatch.attemptId,
  outcome: 'succeeded',
  dispatched: true,
  /* El resultado es el MATERIAL que ahora tiene póster: una referencia, nunca una URL. */
  result: { outputRefs: [assetId], metadata: { assetId, bytes: v.bytes ?? 0, width: v.width ?? 0, height: v.height ?? 0 } },
});

/**
 * EL EJECUTOR DEL PÓSTER DE UN VÍDEO. Otra implementación del mismo puerto.
 *
 *   1. leer el paquete      del trabajo guardado, recalculando la identidad
 *   2. el vídeo             de ESTA cuenta, listo, del Storage de Weë
 *   3. ¿ya lo tiene?        su variante, o su objeto sin anotar: se anota
 *   4. bajar el vídeo       por su referencia de almacén, nunca por una URL
 *   5. sacar y comprobar    un fotograma, JPEG, del tamaño pedido
 *   6. guardar y anotar     solo si no existe; la variante, en el Content Core
 *
 * Todo el intento con el latido puesto. Nada de Credits ni de proveedores.
 */
export const crearEjecutorDePoster = (deps: DepsDelPoster = {}): JobExecutor => {
  const ahora = deps.ahora ?? (() => Date.now());
  const leer = deps.leer ?? ((assetId: string) => leerMaterial(assetId).catch(() => null));
  const anotar = deps.anotar ?? anotarVariante;

  const ejecutarUno = async (dispatch: JobDispatch, control: { renovar(): Promise<boolean> }): Promise<AttemptReport> => {
    /* 1 · EL PAQUETE. De quién es lo dice la traza del trabajo, que armó el Job Engine desde lo guardado. */
    if (!esTareaGeneral(dispatch) || dispatch.task?.name !== TAREA_DE_POSTER) return falloDelPoster(dispatch, 'INVALID_REQUEST', 'not_a_poster', false);
    const leido = leerPaqueteDePoster(dispatch.input, dispatch.trace.userId);
    if (!leido.ok) return falloDelPoster(dispatch, 'INVALID_REQUEST', `package_${leido.motivo}`, false);
    if (dispatch.trace.requestId !== leido.paquete.requestId) return falloDelPoster(dispatch, 'INVALID_REQUEST', 'package_identity', false);
    const { accountId, assetId } = leido.paquete;

    /* 2 · EL VÍDEO. Lo ajeno contesta lo mismo que lo que no existe, y no se baja. */
    const m = await leer(assetId);
    const no = porQueNoHayPoster(m, accountId);
    if (no || !m || !m.storageRef) return falloDelPoster(dispatch, 'INVALID_REQUEST', `source_${no ?? 'not_found'}`, false);

    /* 3 · ¿YA TIENE EL SUYO? Un intento anterior pudo anotarlo y morir antes de contarlo. */
    const ya = posterDelMaterial(m, accountId);
    if (ya) return posterHecho(dispatch, assetId, { bytes: ya.bytes, width: ya.width, height: ya.height });
    if (tienePosterAjeno(m, accountId)) return falloDelPoster(dispatch, 'INVALID_REQUEST', 'foreign_poster', false);
    const almacen = deps.almacen ?? almacenDelRenderDeWee();
    const ruta = rutaDelPoster(accountId, assetId);
    const objeto = await almacen.mirar(ruta).catch(() => undefined);
    if (objeto === undefined) return falloDelPoster(dispatch, 'PROVIDER_ERROR', 'storage_unavailable', false);
    if (objeto && objeto.marca !== marcaDelPoster(assetId)) return falloDelPoster(dispatch, 'INVALID_REQUEST', 'object_conflict', false);

    const binario = deps.lanzar ? 'inyectado' : rutaDeFfmpeg();
    if (!binario) return falloDelPoster(dispatch, 'PROVIDER_UNAVAILABLE', 'ffmpeg_missing', false);
    const lanzar = deps.lanzar ?? lanzarFfmpegDeWee(binario);
    const tope = Math.min(ahora() + dispatch.timeoutMs, deps.limite ? deps.limite() : Infinity) - MARGEN_PARA_ANOTAR_MS;
    /* Sin tiempo para hacerlo entero, ni se baja nada. */
    if (tope <= ahora()) return falloDelPoster(dispatch, 'TIMEOUT', 'no_time_for_poster', false);

    const carpeta = await mkdtemp(path.join(deps.temporal ?? tmpdir(), 'wee-poster-'));
    const latido = latir(control, deps.renovarCadaMs ?? RENOVAR_CADA_MS);
    try {
      /* 3b · Su objeto está y la variante no: se comprueba que ES un póster y se anota, sin sacarlo otra vez. */
      if (objeto) {
        const local = path.join(carpeta, 'guardado.jpg');
        try {
          await almacen.bajar(ruta, local);
        } catch {
          return falloDelPoster(dispatch, 'PROVIDER_ERROR', 'poster_download_failed', true);
        }
        const visto = await sondear(lanzar, local);
        const bytes = (await stat(local).catch(() => undefined))?.size ?? 0;
        if (!esPoster(visto, bytes)) return falloDelPoster(dispatch, 'INVALID_REQUEST', 'object_conflict', false);
        const medido = { bytes: objeto.bytes ?? bytes, ancho: visto.ancho as number, alto: visto.alto as number };
        const a = await anotarElPoster(almacen, anotar, accountId, assetId, medido);
        if (a !== 'anotado') return falloDelPoster(dispatch, 'PROVIDER_ERROR', a.motivo, true);
        return posterHecho(dispatch, assetId, { bytes: medido.bytes, width: medido.ancho, height: medido.alto });
      }

      /* 4 · EL VÍDEO, por su referencia y de la carpeta de la cuenta. */
      const entrada = path.join(carpeta, 'video.mp4');
      try {
        await almacen.bajar(m.storageRef.objectKey, entrada);
      } catch {
        return falloDelPoster(dispatch, 'PROVIDER_ERROR', 'source_download_failed', true);
      }
      if (latido.perdida) return falloDelPoster(dispatch, 'PROVIDER_ERROR', 'lease_lost', true);
      if ((await stat(entrada)).size > LIMITES_DEL_POSTER.maxBytesDelVideo) return falloDelPoster(dispatch, 'INVALID_REQUEST', 'source_too_large', false);
      const sonda = await sondear(lanzar, entrada);
      if (!sonda.video || !sonda.ancho || !sonda.alto) return falloDelPoster(dispatch, 'INVALID_REQUEST', 'source_unreadable', false);
      if (latido.perdida) return falloDelPoster(dispatch, 'PROVIDER_ERROR', 'lease_lost', true);

      /* 5 · SACAR Y COMPROBAR, con un tope que no pasa del intento ni de la invocación. */
      const queda = tope - ahora();
      if (queda <= 0) return falloDelPoster(dispatch, 'TIMEOUT', 'no_time_for_poster', false);
      const sacado = await sacarPoster(lanzar, entrada, carpeta, sonda, queda, latido);
      if ('motivo' in sacado) {
        const codigo: WeeErrorCode = sacado.motivo === 'poster_timeout' ? 'TIMEOUT' : 'PROVIDER_ERROR';
        return falloDelPoster(dispatch, codigo, sacado.motivo, true);
      }

      /* 6 · GUARDAR Y ANOTAR. Si otro intento se adelantó, su póster es el mismo fotograma: se anota el suyo. */
      const g = await guardarPoster(almacen, anotar, accountId, assetId, sacado);
      if (g !== 'anotado') return falloDelPoster(dispatch, g.motivo === 'object_conflict' ? 'INVALID_REQUEST' : 'PROVIDER_ERROR', g.motivo, true);
      return posterHecho(dispatch, assetId, { bytes: sacado.bytes, width: sacado.ancho, height: sacado.alto });
    } finally {
      latido.parar();
      await rm(carpeta, { recursive: true, force: true }).catch(() => undefined);
    }
  };

  return {
    async ejecutar(dispatch: JobDispatch, control: { renovar(): Promise<boolean> }): Promise<AttemptReport> {
      try {
        return await ejecutarUno(dispatch, control);
      } catch {
        /* Como en el render: un fallo con motivo, nunca «salió y no se sabe» por algo que sí se sabe. */
        return falloDelPoster(dispatch, 'PROVIDER_ERROR', 'poster_error', true);
      }
    },
  };
};
