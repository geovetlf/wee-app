import type { CapacidadesDeModelo, FuenteDeCapacidad, ResolucionDeModelo, RolDeReferencia } from '../../core/model-capability';
import { MODEL_CAPABILITIES_VERSION, ROLES_DE_REFERENCIA } from '../../core/model-capability';
import { SEEDANCE_MODEL_IDS } from './seedance';

/**
 * OLA 3b · LAS CAPACIDADES DE LA FAMILIA SEEDANCE, COMO DATOS.
 *
 * Una entrada por modelo para el contrato `CapacidadesDeModelo` (`core/model-capability.ts`). El adaptador
 * (`seedance.ts`) sigue siendo quien SABE hablar con ModelArk; esto es lo que declara hacia arriba para que el
 * router, el servidor y la app lean un solo sitio en vez de repetir 15 y 30 en seis archivos.
 *
 * ── Qué dice cada valor, y de dónde sale ────────────────────────────────────
 *
 *   · Los números que YA tiene el adaptador (`SEEDANCE_SPECS`: resoluciones, duración, cupos de referencia) se
 *     repiten aquí y una prueba los compara uno a uno (`ola3b-capacidades.test.mjs`): dos verdades vigiladas.
 *   · `total` de referencias y los modos (extender, editar, fotogramas…) vienen de la documentación oficial leída
 *     el 2026-11-17 (BENCHMARK-FILMMAKER §9) y se marcan con su `Soporte`: `si` solo si el adaptador lo hace;
 *     `no_implementado` si el modelo lo sabe y el adaptador no; `no_verificado` si no hay fuente oficial legible.
 *   · Seedance 2.5 Flash vive SOLO aquí: sin id en `SEEDANCE_MODEL_IDS`, sin especificación en el adaptador, sin
 *     tarifa verificada y en `NOT_CONFIGURED`. Es un dato que se puede leer (la app puede enseñarlo cerrado) y
 *     nada más: activarlo es otro lote, con el adaptador, el precio y su canary.
 *
 * Los estados son los de partida: la lista de modelos validados con un canary real la sigue llevando
 * `MODELOS_VALIDADOS_PARA_TOMAS` (`creator/video.ts`) y es quien promueve un modelo a `ENABLED`.
 */

const FECHA = '2026-11-17';
const OFI_25 = 'docs.byteplus.com/docs/en/modelark/seedance-2-5.md';
const PORTRAIT = 'docs.byteplus.com/docs/en/modelark/seedance-portrait-asset-guide.md';

const RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const;
const ROLES: readonly RolDeReferencia[] = ROLES_DE_REFERENCIA;

const fuente = (campo: string, documento: string, nivel: FuenteDeCapacidad['nivel']): FuenteDeCapacidad => ({ campo, documento, nivel, fecha: FECHA });

const base = {
  version: MODEL_CAPABILITIES_VERSION,
  proveedor: 'seedance',
  proporciones: RATIOS,
  asincronia: { sondeo: true, webhook: true },
  personasReales: 'activo_autorizado' as const,
  precio: { unidad: 'token' as const, fuente: 'credits/aiPricing#priceVideo', verificado: false },
} as const;

const serie20 = (modeloId: string, nombreVisible: string, estado: CapacidadesDeModelo['estado'], resoluciones: readonly ResolucionDeModelo[]): CapacidadesDeModelo => ({
  ...base,
  modeloId, familia: 'seedance-2.0', nombreVisible, estado,
  duracion: { minSec: 4, maxSec: 15, automatica: true },
  resoluciones,
  referencias: { imagenes: 9, videos: 3, audios: 3, total: 15, segundosDeVideo: 15, segundosDeAudio: 15, audioSinImagenNiVideo: 'no', roles: ROLES },
  fotogramas: { primero: 'si', ultimo: 'si', conReferencias: 'no_verificado' },
  /* El adaptador solo manda `omni_reference_task_type` a la 2.5 (R19): en la serie 2.0 «lo dice el texto», y eso no es un contrato. */
  extender: { soporte: 'no_verificado', direcciones: [], segundosMax: 15 },
  editar: { soporte: 'no_verificado' },
  origen: { formatos: ['mp4'], maxSecDeVideo: 15, ventanaDeConfianzaDias: 30 },
  audioNativo: 'si', lipSync: 'no_verificado', borrador: 'no', semilla: 'si',
  fuentes: [
    fuente('duracion', OFI_25, 'OFI'), fuente('referencias', OFI_25, 'OFI'), fuente('extender', 'seedance.ts R19 (el parámetro solo existe en 2.5)', 'NV'),
    fuente('personasReales', PORTRAIT, 'OFI'),
  ],
});

export const seedanceCapacidades: readonly CapacidadesDeModelo[] = Object.freeze([
  {
    ...base,
    modeloId: SEEDANCE_MODEL_IDS.SEEDANCE_2_5, familia: 'seedance-2.5', nombreVisible: 'Seedance 2.5', estado: 'CONFIGURED',
    duracion: { minSec: 4, maxSec: 30, automatica: true },
    /* OFI dice 480p a 4K; el adaptador implementa hasta 1080p. El contrato declara lo que se ejecuta. */
    resoluciones: ['480p', '720p', '1080p'],
    referencias: { imagenes: 30, videos: 10, audios: 10, total: 50, segundosDeVideo: 30, segundosDeAudio: 30, audioSinImagenNiVideo: 'si', roles: ROLES },
    fotogramas: { primero: 'si', ultimo: 'si', conReferencias: 'no_verificado' },
    extender: { soporte: 'si', direcciones: ['forward'], segundosMax: 30 },
    editar: { soporte: 'si' },
    origen: { formatos: ['mp4', 'mov'], maxSecDeVideo: 30, ventanaDeConfianzaDias: 30 },
    audioNativo: 'si', lipSync: 'no_verificado', borrador: 'no_implementado', semilla: 'si',
    fuentes: [
      fuente('duracion', OFI_25, 'OFI'), fuente('referencias', OFI_25, 'OFI'), fuente('extender', OFI_25, 'OFI'), fuente('editar', OFI_25, 'OFI'),
      fuente('resoluciones', `${OFI_25} (480p–4K) frente a seedance.ts (480p–1080p)`, 'OFI'), fuente('personasReales', PORTRAIT, 'OFI'),
      fuente('extender.direcciones', 'backward: OFI lo cita, el adaptador no lo implementa', 'OFI'),
    ],
  } satisfies CapacidadesDeModelo,
  serie20(SEEDANCE_MODEL_IDS.SEEDANCE_2_0, 'Seedance 2.0', 'CONFIGURED', ['480p', '720p', '1080p', '4k']),
  serie20(SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST, 'Seedance 2.0 rápido', 'VALIDATED', ['480p', '720p']),
  serie20(SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI, 'Seedance 2.0 mini', 'CONFIGURED', ['480p', '720p']),
  {
    ...base,
    /* Id oficial `dreamina-seedance-2-5-flash-261115` (OFI, 2026-11-17). Sin variable de entorno: no está cableado. */
    modeloId: 'dreamina-seedance-2-5-flash-261115', familia: 'seedance-2.5', nombreVisible: 'Seedance 2.5 Flash', estado: 'NOT_CONFIGURED',
    duracion: { minSec: 4, maxSec: 30, automatica: true },
    resoluciones: ['480p', '720p'],
    referencias: { imagenes: 10, videos: 5, audios: 5, total: 20, segundosDeVideo: 15, segundosDeAudio: 15, audioSinImagenNiVideo: 'si', roles: ROLES },
    fotogramas: { primero: 'no_implementado', ultimo: 'no_implementado', conReferencias: 'no_verificado' },
    extender: { soporte: 'no_implementado', direcciones: [], segundosMax: 30 },
    editar: { soporte: 'no_implementado' },
    origen: { formatos: ['mp4', 'mov'], maxSecDeVideo: 15, ventanaDeConfianzaDias: 30 },
    audioNativo: 'no_implementado', lipSync: 'no_verificado', borrador: 'no', semilla: 'no_implementado',
    fuentes: [
      fuente('duracion', OFI_25, 'OFI'), fuente('resoluciones', OFI_25, 'OFI'), fuente('referencias', OFI_25, 'OFI'),
      fuente('referencias.segundosDeVideo', 'sin fuente: se usa el valor prudente de la serie 2.0', 'NV'),
      fuente('precio', 'cifras de terceros (cometapi, llmreference): no se usan para cobrar', '3P'),
    ],
  } satisfies CapacidadesDeModelo,
]);
