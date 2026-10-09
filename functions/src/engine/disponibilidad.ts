import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { CapabilityId } from '../creator/types';
import { MODEL_SECRETS } from '../secrets';
import { EngineConfig, loadConfigEstricta } from './config';
import { engine } from './index';
import { EngineRequest, RouteDecision } from './types';

/**
 * DISPONIBILIDAD DE CAPACIDADES, por cuenta (DEC-06).
 *
 * Responde «¿hay una ruta real y ejecutable para esta cuenta?». No es el catálogo: una capacidad puede estar en el
 * catálogo y no tener proveedor activo, o no poder usarla esta cuenta por el interruptor o por las reglas de su país.
 *
 * Solo LEE y DECIDE. No cobra Credits, no reserva cupo, no crea Jobs, no genera nada y no llama a ningún proveedor.
 * Pregunta al Router (`engine.route`) con la configuración leída de forma estricta: lo territorial lo resuelve el
 * Router con su única fuente, y esta lectura no la copia. Cualquier duda cierra: no disponible.
 */

/**
 * LO QUE SE CONSULTA. Lista de permitidos, no de excluidos: una capacidad que no figura aquí cierra por defecto, también
 * una que llegue al Router más adelante. Lo que no figura hoy (la generación de mundos 3D) no tiene camino por esta lectura:
 * su única puerta es el conductor del runtime (`creator/mundo.ts`), y la configuración de esa puerta no la lee esta función.
 * Abrir una capacidad es una decisión de producto, y se toma añadiéndola aquí; la prueba D6b exige que todas las demás estén.
 */
export const CAPACIDADES_ABIERTAS: ReadonlySet<string> = new Set([
  'text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split', 'subtitle.generate', 'vision.describe',
  'doc.read', 'doc.render', 'audio.transcribe', 'audio.sfx', 'music.generate', 'voice.tts',
  'image.generate', 'image.reference', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit',
  'image.space_restyle', 'image.try_on', 'image.upscale',
  'video.generate', 'video.image_to_video', 'video.reference', 'video.compose', 'video.montage', 'video.vertical',
]);

/** Lo único que se devuelve: la capacidad, si está disponible y, si no, un motivo público. Nada de proveedores. */
export interface DisponibilidadDeCapacidad {
  capacidad: string;
  disponible: boolean;
  motivo?: 'no_disponible';
}

/** Las dependencias de la decisión. Las reales están abajo; los tests inyectan las suyas. */
export interface DepsDeDisponibilidad {
  cargarConfig: () => Promise<EngineConfig>;
  ruta: (request: EngineRequest, config: EngineConfig) => Promise<RouteDecision>;
}

const cerrada = (capacidad: string): DisponibilidadDeCapacidad => ({ capacidad, disponible: false, motivo: 'no_disponible' });

/**
 * La disponibilidad de varias capacidades para UNA cuenta.
 *
 * Primero la configuración (si no se puede leer, todo cierra) y el interruptor; después cada capacidad, por la ruta.
 * El mock cuenta como nada: si es lo único que queda, no hay ruta real y la capacidad no está disponible.
 */
export const disponibilidadDe = async (
  uid: string,
  capacidades: readonly string[],
  deps: DepsDeDisponibilidad,
): Promise<DisponibilidadDeCapacidad[]> => {
  let config: EngineConfig;
  try {
    config = await deps.cargarConfig();
  } catch {
    return capacidades.map(cerrada);
  }
  // El interruptor de la IA cierra para todos.
  if (config.settings.iaDetenida === true) return capacidades.map(cerrada);

  return Promise.all(
    capacidades.map(async (capacidad): Promise<DisponibilidadDeCapacidad> => {
      try {
        if (!CAPACIDADES_ABIERTAS.has(capacidad)) return cerrada(capacidad);
        const decision = await deps.ruta({ capability: capacidad as CapabilityId, input: {}, userId: uid }, config);
        const hayRutaReal = decision.candidates.some((candidato) => candidato.provider !== 'mock');
        return hayRutaReal ? { capacidad, disponible: true } : cerrada(capacidad);
      } catch {
        return cerrada(capacidad);
      }
    }),
  );
};

const DEPS_REALES: DepsDeDisponibilidad = {
  cargarConfig: loadConfigEstricta,
  ruta: (request, config) => engine.route(request, config),
};

const LIMITE_DE_CAPACIDADES = 40;

/**
 * El callable. La cuenta sale SIEMPRE de la sesión: el cliente no la envía. Lo único que trae el cliente es la lista
 * de identificadores de capacidad que quiere saber.
 */
export const disponibilidadDeCapacidades = onCall(
  { region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: MODEL_SECRETS },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    const entrada = (request.data || {}) as { capacidades?: unknown };
    if (!Array.isArray(entrada.capacidades) || entrada.capacidades.some((x) => typeof x !== 'string')) {
      throw new HttpsError('invalid-argument', 'Falta algo en tu pedido. Revísalo e inténtalo de nuevo.');
    }
    const unicas = [...new Set(entrada.capacidades as string[])];
    if (unicas.length === 0 || unicas.length > LIMITE_DE_CAPACIDADES) {
      throw new HttpsError('invalid-argument', 'Falta algo en tu pedido. Revísalo e inténtalo de nuevo.');
    }
    return { capacidades: await disponibilidadDe(request.auth.uid, unicas, DEPS_REALES) };
  },
);
