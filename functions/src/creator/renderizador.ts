import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import { AttemptReport, JobDispatch, JobExecutor, WeeErrorCode, errorDelCore, esTareaGeneral } from '../core';
import { AssetDoc, PROVEEDOR_WEE, crearMaterialDesdeUrl, esDeLaCuenta, leerMaterial } from '../content';
import { MARCA_DE_MATERIAL, rutaDelResultado } from '../content/materializador';
import { downloadUrlFor, storageBucket } from '../engine/http';
import { ManifiestoDeMontaje } from './composicion';
import { argumentosDeFfmpeg } from './ffmpeg';
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
 *
 * Si algo falla antes de guardar, no hay nada que limpiar; si falla después, el
 * objeto está y el siguiente intento lo adopta en vez de montar otra vez.
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
 * Linux en Cloud Build. Se busca al usarlo, no al cargar: una Function que no
 * monta nada no tiene por qué tenerlo.
 */
export const rutaDeFfmpeg = (): string | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ruta: unknown = require('ffmpeg-static');
    return typeof ruta === 'string' && ruta.length > 0 ? ruta : null;
  } catch {
    return null;
  }
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

/* ── El ejecutor ───────────────────────────────────────────────────────────── */

export interface DepsDelRenderizador {
  almacen?: AlmacenDelRender;
  /** Sin él se usa el binario de `ffmpeg-static`. */
  lanzar?: LanzarFfmpeg;
  leer?: (assetId: string) => Promise<AssetDoc | null>;
  crearMaterial?: typeof crearMaterialDesdeUrl;
  ahora?: () => number;
  /** Cuándo muere la invocación que aloja al trabajador: FFmpeg se para antes. */
  limite?: () => number;
  /** Dónde se crean las carpetas temporales. */
  temporal?: string;
  /** Cada cuánto se renueva la concesión mientras FFmpeg trabaja. Sin él, `RENOVAR_CADA_MS`. */
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

      /* 4 · MONTAR, con la concesión renovada mientras tanto y un tope que no pasa del intento ni de la invocación. */
      const salida = path.join(carpeta, 'montaje.mp4');
      const argv = argumentosDeFfmpeg(aMontar, entradas, salida);
      const tope = Math.min(ahora() + Math.max(0, dispatch.timeoutMs - MARGEN_PARA_GUARDAR_MS), deps.limite ? deps.limite() - MARGEN_PARA_GUARDAR_MS : Infinity);
      if (tope <= ahora()) return fallo(dispatch, 'TIMEOUT', 'no_time_to_render', false);
      const proceso = lanzar(argv);
      let perdida = false;
      let vencido = false;
      const latido = setInterval(() => {
        control.renovar().then((sigo) => { if (!sigo) { perdida = true; proceso.matar(); } }, () => undefined);
      }, deps.renovarCadaMs ?? RENOVAR_CADA_MS);
      const reloj = setTimeout(() => { vencido = true; proceso.matar(); }, Math.max(0, tope - ahora()));
      let fin: { codigo: number | null; stderr: string };
      try {
        fin = await proceso.terminado;
      } finally {
        clearInterval(latido);
        clearTimeout(reloj);
      }
      /* Ya no es nuestro: lo que contemos no moverá nada. Se para y se dice. */
      if (perdida) return fallo(dispatch, 'PROVIDER_ERROR', 'lease_lost', true);
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
      return await ficha(tokenDeLaFicha, { durationSec: Math.round(visto.duracionSec * 1000) / 1000, ancho: visto.ancho, alto: visto.alto });
    } finally {
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
