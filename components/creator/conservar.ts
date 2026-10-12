/**
 * CONSERVAR UN RESULTADO EN «MIS CREACIONES» — lo que deciden las pantallas, sin React (R9, línea B).
 *
 * Mis creaciones = los resultados terminados que la persona DECIDIÓ conservar. La decisión la guarda el contrato
 * (`services/cicloDeTrabajo.ts` · `finalizarCreacion`); aquí solo se decide QUÉ materiales se conservan y con qué
 * `requestId`, para que el resultado (`ResultCard`) y el proyecto (`ProjectScreen`) pidan exactamente lo mismo:
 *
 *   · se conserva lo que se está mirando: de un resultado con varias propuestas, la elegida; si nadie eligió (el
 *     proyecto no enseña las propuestas), la decisión no se toma por la persona y no se ofrece guardar desde allí;
 *   · lo de muestra (`demo`) y lo que no tiene material (texto) no se conserva: no hay archivo que referenciar;
 *   · el `requestId` sale del trabajo y del conjunto de materiales, ordenado: el doble toque, el reintento y el mismo
 *     resultado guardado desde el proyecto o desde el resultado son la MISMA petición, y el contrato no duplica.
 */

/** Lo mínimo de un resultado de Weë AI que hace falta para decidir (espejo de `JobResult`). */
export interface ResultadoConMateriales {
  stepId: string;
  urls?: string[];
  assetIds?: string[];
  demo?: boolean;
}

export const materialesParaConservar = (
  resultados: ResultadoConMateriales[],
  elegidos?: Record<string, number>,
): string[] | null => {
  const ids: string[] = [];
  for (const r of resultados) {
    if (r.demo || !r.assetIds || r.assetIds.length === 0) continue;
    if (r.urls && r.urls.length > 1) {
      if (!elegidos) return null;
      const id = r.assetIds[elegidos[r.stepId] ?? 0];
      if (id) ids.push(id);
    } else {
      ids.push(r.assetIds[0]);
    }
  }
  return ids.length > 0 ? ids : null;
};

export const peticionDeConservar = (jobId: string, assetIds: string[]): string =>
  `conservar:${jobId}:${[...assetIds].sort().join(',')}`;

/**
 * ¿El contrato dice que esto todavía no existe? `pendiente` (sin implementar) y `no_disponible` (la Function no está
 * desplegada) se dicen con honestidad —«todavía no está disponible»— y nunca como un éxito ni como un fallo de red.
 */
export const esNoDisponible = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return code === 'pendiente' || code === 'no_disponible';
};
