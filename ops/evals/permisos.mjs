/*
 * WEE AI EVALUATION ENGINE — PERMISOS (F2-B).
 *
 * Quién puede hacer qué con las evaluaciones. Lógica PURA (una matriz rol × acción); el enganche real con la
 * identidad de WEE (callable admin + `assertAdmin`, claim/rol de holdout) vive en el corredor de producción (F2-C).
 * Aquí se decide, en un solo sitio, la política: el holdout está MÁS restringido que el resto, y aprobar un
 * resultado es siempre de una persona, no automático.
 */

export const ACCIONES = [
  'crear-dataset', 'modificar-dataset', 'modificar-grader', 'cambiar-umbrales',
  'ejecutar-eval', 'cancelar-eval', 'ver-resultados', 'acceder-holdout', 'aprobar-resultado',
];

/* Roles y lo que cada uno puede. El holdout solo lo toca `eval-holdout` (un rol aparte, deliberadamente escaso). */
const MATRIZ = {
  admin: new Set(['crear-dataset', 'modificar-dataset', 'modificar-grader', 'cambiar-umbrales', 'ejecutar-eval', 'cancelar-eval', 'ver-resultados', 'aprobar-resultado']),
  'eval-holdout': new Set(['acceder-holdout', 'ejecutar-eval', 'ver-resultados']),
  viewer: new Set(['ver-resultados']),
};

/** ¿El rol puede la acción? Un rol desconocido no puede nada (fail-closed). */
export const puede = (rol, accion) => MATRIZ[rol]?.has(accion) === true;

/**
 * Puerta de acceso al HOLDOUT. Además del rol `eval-holdout`, exige un `motivo` y comprueba que no se esté
 * AJUSTANDO repetidamente sobre él: una misma versión de candidato no puede consumir el holdout más de
 * `maxUsosPorCandidato` veces (anti-overfitting). `historial` = usos previos [{candidateVersion}]. FAIL-CLOSED.
 */
export const accederHoldout = ({ rol, motivo, candidateVersion, historial = [], maxUsosPorCandidato = 1 } = {}) => {
  if (!puede(rol, 'acceder-holdout')) return { permite: false, motivo: 'rol_sin_acceso_al_holdout' };
  if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 3) return { permite: false, motivo: 'falta_motivo' };
  if (!candidateVersion) return { permite: false, motivo: 'falta_version_de_candidato' };
  const usos = historial.filter((h) => h.candidateVersion === candidateVersion).length;
  if (usos >= maxUsosPorCandidato) return { permite: false, motivo: 'holdout_ya_consumido_para_este_candidato', usos };
  return { permite: true, motivo: 'acceso_concedido', usos };
};

export const ROLES = Object.keys(MATRIZ);
