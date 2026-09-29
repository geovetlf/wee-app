/**
 * LAS PUERTAS RÁPIDAS DE WEË AI DIRECTOR (Filmmaker Engine, Fase 34).
 *
 * Cada una RELLENA la caja de Weë Brain con una petición —nunca la envía—: enviarla sigue siendo de la persona, con su
 * precio a la vista (Fase 22). No son asistentes distintos: es el mismo Weë Brain con la producción abierta, y lo único
 * que cambia es lo que se le pide y dónde se está (regla 10). Por eso aquí solo se decide QUÉ puertas se enseñan y con
 * qué palabras, según la producción y lo elegido:
 *
 *   · sin escenas todavía, empezar: proponer las escenas o convertir un guion (las dos, destacadas);
 *   · siempre: proponer escenas, proponer planos (de la escena elegida, si la hay), revisar la producción, explicar
 *     qué le falta, y convertir un guion;
 *   · con dos unidades o más: revisar la continuidad entre ellas;
 *   · con un plano elegido: mejorar ese plano y proponer su cobertura (otros ángulos de la misma acción).
 */
export interface SitioElegido {
  readonly escena: number;
  readonly plano?: number;
}

export interface AtajoDelDirector {
  readonly id: 'escenas' | 'planos' | 'revisar' | 'explicar' | 'continuidad' | 'mejorar' | 'cobertura' | 'guion';
  /** La etiqueta del botón. */
  readonly clave: string;
  /** La petición con la que rellena la caja, y sus valores. */
  readonly texto: string;
  readonly valores?: Readonly<Record<string, number>>;
  readonly icono: string;
  /** Destacada: el primer paso en una producción vacía. */
  readonly principal?: boolean;
}

export const atajosDelDirector = (
  produccion: { readonly scenes: readonly { readonly shots: readonly unknown[] }[] },
  sitio: SitioElegido | null,
): readonly AtajoDelDirector[] => {
  const escenas: AtajoDelDirector = { id: 'escenas', clave: 'filmmaker.wsBrainQuickScenes', texto: 'filmmaker.wsBrainQuickScenesText', icono: 'albums-outline' };
  const guion: AtajoDelDirector = { id: 'guion', clave: 'filmmaker.wsBrainQuickScript', texto: 'filmmaker.wsBrainQuickScriptText', icono: 'document-text-outline' };
  if (!produccion.scenes.length) return [{ ...escenas, principal: true }, { ...guion, principal: true }];
  const unidades = produccion.scenes.reduce((n, s) => n + Math.max(1, s.shots.length), 0);
  return [
    escenas,
    sitio
      ? { id: 'planos', clave: 'filmmaker.wsBrainQuickShots', texto: 'filmmaker.wsBrainQuickShotsSceneText', valores: { escena: sitio.escena }, icono: 'film-outline' }
      : { id: 'planos', clave: 'filmmaker.wsBrainQuickShots', texto: 'filmmaker.wsBrainQuickShotsText', icono: 'film-outline' },
    { id: 'revisar', clave: 'filmmaker.wsBrainQuickReview', texto: 'filmmaker.wsBrainQuickReviewText', icono: 'search-outline' },
    { id: 'explicar', clave: 'filmmaker.wsBrainQuickExplain', texto: 'filmmaker.wsBrainQuickExplainText', icono: 'help-circle-outline' },
    ...(unidades >= 2 ? [{ id: 'continuidad', clave: 'filmmaker.wsBrainQuickContinuity', texto: 'filmmaker.wsBrainQuickContinuityText', icono: 'git-merge-outline' } as AtajoDelDirector] : []),
    ...(sitio?.plano !== undefined
      ? [
        { id: 'mejorar', clave: 'filmmaker.wsBrainQuickImproveShot', texto: 'filmmaker.wsBrainQuickImproveShotText', valores: { escena: sitio.escena, plano: sitio.plano }, icono: 'create-outline' } as AtajoDelDirector,
        { id: 'cobertura', clave: 'filmmaker.wsBrainQuickCoverage', texto: 'filmmaker.wsBrainQuickCoverageText', valores: { escena: sitio.escena, plano: sitio.plano }, icono: 'copy-outline' } as AtajoDelDirector,
      ]
      : []),
    guion,
  ];
};
