import type { CreatorJob, JobStatus, JobResult, ResultKind } from '../services/creatorService';
import { claveDelEstado } from '../services/creatorService';
import { CLAVE_DE_TIPO } from '../services/vistaDeAsset';
import { textoDeObjetivo } from '../i18n/servidor';
import type { Traductor } from '../i18n/traducir';
import type { CreacionEnLaFila } from '../components/creator/FilaDeCreaciones';
import { TODAS_LAS_ENTRADAS } from '../constants/studioExperiences';

/**
 * «MIS CREACIONES» DE WEË STUDIO, DE VERDAD (R9 · E2, trazabilidad).
 *
 * La fila del Studio enseñaba cuatro piezas de muestra (`constants/studioMocks.ts`) como si fueran de la persona. Ahora
 * enseña sus trabajos de la cuenta —los mismos `creatorJobs` que lista «Mis creaciones» y la portada de Weë AI—, leídos
 * por el camino que ya existe (`creatorService.getMyJobsDe`, paginado, sin índice nuevo).
 *
 * QUÉ ES DEL STUDIO: lo creado en las experiencias a las que llevan sus puertas (Imágenes → Weë Photo, Videos → Weë
 * Studio, Texto → Weë Writer, Voz → Weë Music, Beauty y Moda → Weë Beauty). Se deduce del propio catálogo de puertas,
 * así que una puerta nueva entra sola y ninguna lista se copia a mano.
 *
 * QUÉ ES UNA CREACIÓN: un trabajo terminado o en marcha. Una conversación a medias (`asking`) o un plan sin crear
 * (`planned`) todavía no es nada que enseñar; un trabajo fallido, tampoco.
 */
export const EXPERIENCIAS_DEL_STUDIO: readonly string[] = [
  ...new Set(TODAS_LAS_ENTRADAS.map((e) => e.experienceId).filter((id): id is string => typeof id === 'string' && id.length > 0)),
];

export const ESTADOS_QUE_SON_CREACION: readonly JobStatus[] = ['done', 'running'];

/** Cuántas se enseñan en la fila y de cuánto en cuánto se pide la lista. */
export const CUANTAS_CREACIONES = 8;
export const TAMANO_DE_PAGINA = 20;

export const esUnaCreacionDelStudio = (job: Pick<CreatorJob, 'experienceId' | 'status'>): boolean =>
  EXPERIENCIAS_DEL_STUDIO.includes(job.experienceId) && ESTADOS_QUE_SON_CREACION.includes(job.status);

/** El icono de cada tipo de resultado, de la misma familia que el resto del Studio. Identificadores: no se traducen. */
const ICONO_DEL_TIPO: Readonly<Record<ResultKind, string>> = {
  text: 'document-text-outline',
  document: 'document-text-outline',
  image: 'image-outline',
  video: 'play',
  audio: 'pulse-outline',
  world: 'planet-outline',
  model3d: 'cube-outline',
};

/** El tono de la lámina mientras no hay miniatura. Es color, no idioma. */
export const TONO_DE_UNA_CREACION = '#EEF0F3';

const resultadoPrincipal = (resultados: readonly JobResult[]): JobResult | undefined =>
  resultados.find((r) => r.kind !== 'text') ?? resultados[0];

/** La primera imagen del trabajo, si la hay: es la miniatura. Un vídeo o un audio no tienen imagen que enseñar aquí. */
export const miniaturaDe = (job: Pick<CreatorJob, 'results'>): string | undefined => {
  for (const r of job.results ?? []) {
    if (r.kind !== 'image') continue;
    const direccion = r.urls?.[0] ?? r.url;
    if (typeof direccion === 'string' && direccion.length > 0) return direccion;
  }
  return undefined;
};

/**
 * Un trabajo, en la forma que pide la fila común. La etiqueta es una CLAVE (la resuelve la fila) y el título es lo que
 * la persona pidió, pintado en su idioma por `textoDeObjetivo`: es contenido, no interfaz.
 */
export const creacionDeLaFila = (job: CreatorJob, t: Traductor): CreacionEnLaFila => {
  const principal = resultadoPrincipal(job.results ?? []);
  const miniatura = miniaturaDe(job);
  return {
    id: job.id,
    claveTipo: job.status !== 'done' ? claveDelEstado[job.status] : principal ? CLAVE_DE_TIPO[principal.kind] : claveDelEstado.done,
    icono: principal ? ICONO_DEL_TIPO[principal.kind] : 'sparkles-outline',
    titulo: textoDeObjetivo(t, job.experienceId, job.goal ?? ''),
    tono: TONO_DE_UNA_CREACION,
    ...(miniatura ? { uri: miniatura } : {}),
  };
};
