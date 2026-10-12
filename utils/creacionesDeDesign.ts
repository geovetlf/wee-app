import type { CreatorJob, JobStatus, JobResult } from '../services/creatorService';
import { claveDelEstado } from '../services/creatorService';
import { CLAVE_DE_TIPO } from '../services/vistaDeAsset';
import { textoDeObjetivo } from '../i18n/servidor';
import type { Traductor } from '../i18n/traducir';
import type { CreacionEnLaFila } from '../components/creator/FilaDeCreaciones';
import { ICONO_DE_UNA_CREACION, TONO_DE_UNA_CREACION } from '../constants/designTools';

/**
 * LO QUE SE ENSEÑA EN «MIS CREACIONES» DE WEË DESIGN, DECIDIDO EN UN SOLO SITIO.
 *
 * Es puro: no sabe de Firebase ni de pantallas. Recibe trabajos de Weë AI (`creatorJobs`, los mismos que ya lee Weë Chef con
 * `getMyJobsDe`) y dice cuáles son una creación de Weë Design, cómo se llama, qué miniatura lleva y qué etiqueta. La pantalla lo
 * pinta; el gancho `useCreacionesDeDesign` lo pide.
 *
 * ── Por qué trabajos y no materiales ─────────────────────────────────────────
 *
 * Weë Chef ya resuelve «lo que ha hecho esta persona» con `creatorService.getMyJobsDe`, y la fila de Weë Studio se escribió
 * pensando en `creatorJobs` (`constants/studioMocks.ts`: «se cambia por lo que devuelva `creatorJobs`»). Los materiales
 * (`assetsService.listar`) no sirven aquí por tres motivos: la consulta no puede filtrar por experiencia (`metadata.experienceId`
 * no tiene índice, y filtrar en el cliente sobre una página de 24 pierde creaciones, que es justo lo que `buscarTrabajos` evita
 * para los trabajos); en demostración no se crea ningún material; y un trabajo trae lo que la persona escribió —su título— y
 * sus resultados, con la dirección de la imagen cuando la hay.
 *
 * ── Qué cuenta como creación ─────────────────────────────────────────────────
 *
 * Lo que ya está hecho y lo que se está haciendo. Una conversación a medias, un plan que no se confirmó, un intento fallido o uno
 * cancelado no son creaciones y no se enseñan bajo ese título: cada vez que alguien toca «Crear» nace un trabajo, y llenar la fila
 * con lo abandonado empujaría fuera lo que sí se hizo. Es un criterio de este archivo y se cambia aquí (`ESTADOS_QUE_SON_CREACION`).
 */

/** Las experiencias de Weë AI que se ven desde Weë Design: el propio Design y Hogar & Diseño. */
export const EXPERIENCIAS_DE_DESIGN: readonly string[] = ['design', 'home'];

/** Los estados de un trabajo que ya son una creación: la que está hecha y la que se está haciendo ahora. */
export const ESTADOS_QUE_SON_CREACION: readonly JobStatus[] = ['done', 'running'];

/** Cuántas caben en la fila, y de cuántos en cuántos documentos se busca: lo mismo que Weë Chef (`ChefScreen`). */
export const CUANTAS_CREACIONES = 8;
export const TAMANO_DE_PAGINA = 20;

/** Para `getMyJobsDe`: lo que hay que reunir de entre todos los trabajos de la cuenta. */
export const esUnaCreacionDeDesign = (job: Pick<CreatorJob, 'experienceId' | 'status'>): boolean =>
  EXPERIENCIAS_DE_DESIGN.includes(job.experienceId) && ESTADOS_QUE_SON_CREACION.includes(job.status);

/**
 * La miniatura: la primera imagen del primer resultado que la trae. Un texto, un video o una dirección vacía no son una
 * miniatura (un video no trae su póster), y entonces la lámina se queda lisa, con su icono.
 */
export const miniaturaDe = (job: Pick<CreatorJob, 'results'>): string | undefined => {
  for (const resultado of job.results ?? []) {
    if (resultado.kind !== 'image') continue;
    const direccion = resultado.urls?.[0] ?? resultado.url;
    if (typeof direccion === 'string' && direccion.length > 0) return direccion;
  }
  return undefined;
};

/** El resultado que da nombre a lo hecho: el primero que no es un texto (el concepto) y, si no hay otro, el primero. */
const resultadoPrincipal = (resultados: readonly JobResult[]): JobResult | undefined =>
  resultados.find((r) => r.kind !== 'text') ?? resultados[0];

/**
 * La etiqueta de la lámina, como CLAVE de i18n (el catálogo guarda claves, quien pinta las resuelve): lo hecho dice qué es
 * —«Imagen»— y lo que se está haciendo, que se está haciendo. Un estado que se ve siempre deja de decir nada, así que lo hecho
 * no repite «Listo» sobre cada miniatura; solo si no hay nada que enseñar dice «Lista».
 */
export const claveDeLaEtiqueta = (job: Pick<CreatorJob, 'status' | 'results'>): string => {
  if (job.status !== 'done') return claveDelEstado[job.status];
  const principal = resultadoPrincipal(job.results ?? []);
  return principal ? CLAVE_DE_TIPO[principal.kind] : claveDelEstado.done;
};

/** Un trabajo, en la forma que pide la fila común de creaciones (`components/creator/FilaDeCreaciones.tsx`). */
export const creacionDeLaFila = (job: CreatorJob, t: Traductor): CreacionEnLaFila => {
  const miniatura = miniaturaDe(job);
  return {
    id: job.id,
    claveTipo: claveDeLaEtiqueta(job),
    icono: ICONO_DE_UNA_CREACION[job.experienceId] ?? ICONO_DE_UNA_CREACION.design,
    /* Lo que escribió la persona es contenido, no interfaz: no se traduce; solo el objetivo por defecto de la experiencia. */
    titulo: textoDeObjetivo(t, job.experienceId, job.goal ?? ''),
    tono: TONO_DE_UNA_CREACION,
    ...(miniatura ? { uri: miniatura } : {}),
  };
};
